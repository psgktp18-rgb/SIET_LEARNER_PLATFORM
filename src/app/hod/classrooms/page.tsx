import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { HodClassroomsClient } from './client';
import { calculateClassroomHealth } from '@/lib/classroom-health';

export const instant = false;

export default async function HodClassroomsPage() {
  const payload = await getUser();
  if (!payload || (payload.role !== 'HOD' && !payload.isHod && payload.role !== 'ADMIN')) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { department: true }
  });

  if (!user || !user.departmentId || !user.department) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold">No Department Configured</h2>
        <p className="text-muted-foreground mt-2">Your account is not assigned to a department yet. Contact an administrator.</p>
      </div>
    );
  }

  const departmentId = user.departmentId;

  const [classroomsRaw, deptSubjects, deptTeachers, requests] = await Promise.all([
    prisma.classroom.findMany({
      where: { departmentId },
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
      orderBy: [{ year: 'asc' }, { section: 'asc' }, { name: 'asc' }]
    }),
    prisma.subject.findMany({
      where: {
        classrooms: { some: { departmentId } }
      },
      orderBy: { name: 'asc' }
    }).then(async (subs) => {
      // If no subs in classrooms yet, get all subjects
      if (subs.length === 0) return await prisma.subject.findMany({ orderBy: { name: 'asc' } });
      return subs;
    }),
    prisma.user.findMany({
      where: {
        role: 'TEACHER',
        isActive: true,
        OR: [
          { departmentId },
          { departments: { some: { id: departmentId } } }
        ]
      },
      select: { id: true, name: true, loginId: true, email: true },
      orderBy: { name: 'asc' }
    }),
    prisma.classroomRequest.findMany({
      where: { departmentId },
      include: {
        proposedTeacher: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  // Calculate live health score for each department classroom
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

  const totalStudents = classrooms.reduce((acc, c) => acc + c.studentCount, 0);
  const avgHealth = classrooms.length > 0
    ? Math.round(classrooms.reduce((acc, c) => acc + c.health.score, 0) / classrooms.length)
    : 100;

  const stats = {
    total: classrooms.length,
    official: classrooms.filter(c => c.type === 'OFFICIAL').length,
    extra: classrooms.filter(c => c.type === 'EXTRA').length,
    totalStudents,
    avgHealth,
  };

  return (
    <HodClassroomsClient
      department={user.department}
      classrooms={classrooms}
      deptSubjects={deptSubjects}
      deptTeachers={deptTeachers}
      requests={requests}
      stats={stats}
    />
  );
}
