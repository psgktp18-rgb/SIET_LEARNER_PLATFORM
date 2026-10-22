import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ll_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await getUser();
    if (!payload || payload.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentId, reason } = await req.json();
    if (!studentId || !reason) {
      return NextResponse.json({ error: 'Missing studentId or reason' }, { status: 400 });
    }

    // Verify student exists
    const student = await prisma.user.findUnique({ where: { id: studentId, role: 'STUDENT' } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify teacher scope (student must be in one of teacher's classrooms)
    const teacherClassrooms = await prisma.classroom.findMany({ where: { teacherId: payload.userId } });
    const classroomIds = teacherClassrooms.map(c => c.id);
    
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: studentId, classroomId: { in: classroomIds } }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'You can only block students enrolled in your classrooms' }, { status: 403 });
    }

    // Block the student
    await prisma.user.update({
      where: { id: studentId },
      data: { isBlocked: true, blockedBy: payload.userId, blockReason: reason }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        targetUserId: studentId,
        action: 'BLOCK_STUDENT',
        details: reason
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
