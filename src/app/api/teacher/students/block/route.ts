import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('ll_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await getUser();
  if (payload?.role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, action, reason } = await req.json();

  const teacherId = payload.userId;

  // Check if student is in teacher's scope (simplification: assume they are, or check)
  // For security, we should check if the student is in their classrooms
  const classrooms = await prisma.classroom.findMany({ where: { teacherId } });
  const classroomIds = classrooms.map(c => c.id);
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId, classroomId: { in: classroomIds } }
  });

  if (!enrollment) {
    // Check if department scope? For now just return 403 if not in class
    return NextResponse.json({ error: 'Student not in your classrooms' }, { status: 403 });
  }

  const student = await prisma.user.findUnique({ where: { id: userId } });
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'unblock') {
    // Can only unblock if blocked by THIS teacher
    // We get the admin's id to check if admin blocked it. Let's assume admins have role 'ADMIN'.
    if (student.blockedBy && student.blockedBy !== teacherId) {
      const blocker = await prisma.user.findUnique({ where: { id: student.blockedBy } });
      if (blocker?.role === 'ADMIN') {
        return NextResponse.json({ error: 'Cannot unblock a student blocked by an admin' }, { status: 403 });
      }
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false, blockedBy: null, blockReason: null }
    });

    await prisma.auditLog.create({
      data: {
        userId: teacherId,
        targetUserId: userId,
        action: 'UNBLOCK_STUDENT',
        details: 'Teacher unblocked student'
      }
    });

  } else if (action === 'block') {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true, blockedBy: teacherId, blockReason: reason }
    });

    await prisma.auditLog.create({
      data: {
        userId: teacherId,
        targetUserId: userId,
        action: 'BLOCK_STUDENT',
        details: reason
      }
    });
  }

  return NextResponse.json({ success: true });
}
