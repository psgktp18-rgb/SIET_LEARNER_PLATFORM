import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('ll_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await getUser();
  if (payload?.role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const classroom = await prisma.classroom.findUnique({
    where: { id: resolvedParams.classroomId }
  });
  
  if (classroom?.teacherId !== payload.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.finalisedSubjectMarks.upsert({
    where: {
      subjectId_classroomId: {
        subjectId: classroom.subjectId,
        classroomId: classroom.id
      }
    },
    update: { isLocked: true, lockedAt: new Date(), teacherId: payload.userId },
    create: {
      subjectId: classroom.subjectId,
      classroomId: classroom.id,
      teacherId: payload.userId,
      isLocked: true,
      lockedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: payload.userId,
      action: 'LOCK_MARKS',
      details: `Locked marks for classroom ${classroom.id}`
    }
  });

  return NextResponse.json({ success: true });
}
