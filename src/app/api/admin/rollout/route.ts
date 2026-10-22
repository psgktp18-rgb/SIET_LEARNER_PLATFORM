import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ll_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await getUser();
  if (payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { enabledYearsConfig } = await req.json();
  
  const settings = await prisma.systemSetting.findFirst();
  if (settings) {
    await prisma.systemSetting.update({
      where: { id: settings.id },
      data: { enabledYears: JSON.stringify(enabledYearsConfig) }
    });
  } else {
    await prisma.systemSetting.create({
      data: { enabledYears: JSON.stringify(enabledYearsConfig) }
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: payload.userId,
      action: 'UPDATE_ROLLOUT',
      details: JSON.stringify(enabledYearsConfig)
    }
  });

  return NextResponse.json({ success: true });
}
