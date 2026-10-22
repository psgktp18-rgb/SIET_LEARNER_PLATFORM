import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TeacherClassroomsClient } from './client';
import { calculateClassroomHealth } from '@/lib/classroom-health';
import { canUserCreateClassroom } from '@/lib/permissions/classroom';

export const instant = false;

export default async function TeacherClassroomsPage() {
  const payload = await getUser();
  if (!payload || (payload.role !== 'TEACHER' && payload.role !== 'HOD' && payload.role !== 'ADMIN')) {
    redirect('/login');
  }

  const teacherId = payload.userId;

  const [dbUser, createPermission, allTeacherClassesRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: teacherId },
      include: { department: true }
    }),
    canUserCreateClassroom(payload, false),
    prisma.classroom.findMany({
      where: {
        OR: [
          { teacherId },
          { teachers: { some: { teacherId } } }
        ]
      },
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
        joinRequests: {
          where: { status: 'PENDING' },
          include: {
            student: { select: { id: true, name: true, loginId: true, year: true, section: true } }
          }
        },
        _count: { select: { enrollments: true, notes: true, assignments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const departmentId = dbUser?.departmentId;

  const deptSubjects = departmentId
    ? await prisma.subject.findMany({
        where: { classrooms: { some: { departmentId } } },
        orderBy: { name: 'asc' }
      }).then(async (subs) => {
        if (subs.length === 0) return await prisma.subject.findMany({ orderBy: { name: 'asc' } });
        return subs;
      })
    : await prisma.subject.findMany({ orderBy: { name: 'asc' } });

  // Calculate live health score and pending assignments to grade
  const classesWithHealth = await Promise.all(
    allTeacherClassesRaw.map(async (cls) => {
      const [health, pendingGradingCount] = await Promise.all([
        calculateClassroomHealth(cls.id),
        prisma.submission.count({
          where: {
            assignment: { classroomId: cls.id },
            marks: null,
            status: 'SUBMITTED'
          }
        })
      ]);

      return {
        ...cls,
        studentCount: cls._count.enrollments,
        pendingGradingCount,
        health,
      };
    })
  );

  const myClasses = classesWithHealth;
  const extraClasses = classesWithHealth.filter(c => c.type === 'EXTRA');

  const mainCount = classesWithHealth.filter(c => c.teacherId === teacherId).length;
  const coSubCount = classesWithHealth.filter(c => c.teacherId !== teacherId).length;
  const totalStudents = classesWithHealth.reduce((acc, c) => acc + c.studentCount, 0);

  const stats = {
    total: classesWithHealth.length,
    mainCount,
    coSubCount,
    totalStudents,
  };

  return (
    <TeacherClassroomsClient
      userId={teacherId}
      myClasses={myClasses}
      extraClasses={extraClasses}
      deptSubjects={deptSubjects}
      canCreateExtra={createPermission.allowed}
      stats={stats}
    />
  );
}
