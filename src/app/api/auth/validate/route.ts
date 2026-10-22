import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { isStudentRolloutEnabled } from '@/lib/rollout';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ll_token')?.value;
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const payload = await getUser();
  if (!payload) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  
  if (!user || !user.isActive) {
    return NextResponse.json({ valid: false, reason: 'inactive' }, { status: 401 });
  }

  if (user.isBlocked) {
    return NextResponse.json({ valid: false, reason: 'blocked' }, { status: 403 });
  }

  if (user.role === 'STUDENT' && user.year) {
    const settings = await prisma.systemSetting.findFirst({ select: { enabledYears: true } });
    const isAllowed = isStudentRolloutEnabled(settings?.enabledYears, user.year, user.departmentId);
    
    if (!isAllowed) {
      return NextResponse.json({ valid: false, reason: 'year_disabled' }, { status: 403 });
    }
  }

  return NextResponse.json({ valid: true });
}
