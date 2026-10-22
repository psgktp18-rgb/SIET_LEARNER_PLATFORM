import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StudentClassroomsClient } from './client';

export const instant = false;

export default async function StudentClassroomsPage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') {
    redirect('/login');
  }

  const [enrollments, pendingRequests] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: payload.userId },
      include: {
        classroom: {
          include: {
            subject: true,
            teacher: { select: { id: true, name: true, loginId: true, email: true } },
            classRep: { select: { id: true, name: true, loginId: true } },
            _count: { select: { notes: true, assignments: true } }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    }),
    prisma.classroomJoinRequest.findMany({
      where: { studentId: payload.userId, status: 'PENDING' },
      include: {
        classroom: {
          include: {
            subject: true,
            teacher: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const enrolledClasses = enrollments.map(en => en.classroom);

  return (
    <StudentClassroomsClient
      userId={payload.userId}
      enrolledClasses={enrolledClasses}
      pendingRequests={pendingRequests}
    />
  );
}
