import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pointsEntry = await prisma.pointLedger.create({
      data: {
        userId: user.userId,
        points: 15,
        reason: 'Completed 25-minute Pomodoro study focus session',
      },
    });

    return NextResponse.json({ success: true, points: 15, entry: pointsEntry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to award points' }, { status: 500 });
  }
}
