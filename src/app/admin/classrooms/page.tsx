import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminClassroomsClient } from './client';
import { calculateClassroomHealth } from '@/lib/classroom-health';

export const instant = false;

export default async function AdminClassroomsPage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'ADMIN') {
    redirect('/login');
  }

  const [classroomsRaw, departments, subjects, teachers, requests, totalEnrolled] = await Promise.all([
    prisma.classroom.findMany({
      include: {
        subject: true,
        department: true,
        teacher: { select: { id: true, name: true, loginId: true, email: true } },
        teachers: {
          include: {
            teacher: { select: { id: true, name: true, loginId: true } }
          }
        },
        classRep: { select: { id: true, name: true, loginId: true } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.subject.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { role: 'TEACHER', isActive: true },
      select: { id: true, name: true, loginId: true, email: true },
      orderBy: { name: 'asc' }
    }),
    prisma.classroomRequest.findMany({
      include: {
        department: true,
        requester: { select: { id: true, name: true, loginId: true } },
        proposedTeacher: { select: { id: true, name: true, loginId: true } },
        classroom: {
          include: {
            subject: true,
            teacher: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.enrollment.count()
  ]);

  // Calculate live health score for all classrooms
  const classrooms = await Promise.all(
    classroomsRaw.map(async (cls) => {
      const health = await calculateClassroomHealth(cls.id);
      return {
        ...cls,
        studentCount: cls._count.enrollments,
        health,
      };
    })
  );

  const stats = {
    total: classrooms.length,
    official: classrooms.filter(c => c.type === 'OFFICIAL').length,
    extra: classrooms.filter(c => c.type === 'EXTRA').length,
    totalEnrolled,
  };

  return (
    <AdminClassroomsClient
      initialClassrooms={classrooms}
      departments={departments}
      subjects={subjects}
      teachers={teachers}
      requests={requests}
      stats={stats}
    />
  );
}
