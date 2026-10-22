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

    const { studentId } = await req.json();
    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const student = await prisma.user.findUnique({ where: { id: studentId, role: 'STUDENT' } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify teacher scope
    const teacherClassrooms = await prisma.classroom.findMany({ where: { teacherId: payload.userId } });
    const classroomIds = teacherClassrooms.map(c => c.id);
    
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: studentId, classroomId: { in: classroomIds } }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'You can only unblock students enrolled in your classrooms' }, { status: 403 });
    }

    // Check if blocked by Admin
    if (student.isBlocked && student.blockedBy) {
      const blocker = await prisma.user.findUnique({ where: { id: student.blockedBy } });
      if (blocker && blocker.role === 'ADMIN') {
        return NextResponse.json({ error: 'This student was blocked by an Admin. Only an Admin can unblock them.' }, { status: 403 });
      }
    }

    // Unblock the student
    await prisma.user.update({
      where: { id: studentId },
      data: { isBlocked: false, blockedBy: null, blockReason: null }
    });

    // Notify the student
    await prisma.notification.create({
      data: {
        userId: studentId,
        title: 'Account Unblocked',
        message: 'Your account has been unblocked by a teacher.',
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        targetUserId: studentId,
        action: 'UNBLOCK_STUDENT',
        details: 'Teacher removed block'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
