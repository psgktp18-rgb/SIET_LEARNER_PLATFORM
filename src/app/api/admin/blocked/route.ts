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

  const { userId } = await req.json();
  
  await prisma.user.update({
    where: { id: userId },
    data: { isBlocked: false, blockedBy: null, blockReason: null }
  });

  await prisma.auditLog.create({
    data: {
      userId: payload.userId,
      targetUserId: userId,
      action: 'UNBLOCK_USER',
      details: 'Admin unblocked user'
    }
  });

  return NextResponse.json({ success: true });
}
