import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { checkAiConfigured } from '@/lib/ai/status';
import { HodAiInsightsClient } from './client';

export const instant = false;

export default async function HodAiInsightsPage() {
  const payload = await getUser();
  if (!payload || (!payload.isHod && payload.role !== 'HOD' && payload.role !== 'ADMIN')) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { department: true }
  });

  const departmentId = user?.departmentId;

  if (!departmentId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No department assigned. Please contact the administrator.
      </div>
    );
  }

  const [classrooms, departmentTeachers, finalisedMarks, aiStatus] = await Promise.all([
    prisma.classroom.findMany({
      where: { departmentId, isArchived: false },
      include: {
        subject: true,
        teacher: true,
        _count: { select: { enrollments: true, notes: true, assignments: true } }
      },
      orderBy: [{ year: 'asc' }, { section: 'asc' }]
    }),
    prisma.user.findMany({
      where: { departmentId, role: 'TEACHER' },
      select: { id: true, name: true, email: true }
    }),
    prisma.finalisedSubjectMarks.findMany({
      where: {
        classroom: { departmentId }
      }
    }),
    checkAiConfigured()
  ]);

  return (
    <HodAiInsightsClient
      department={user.department}
      classrooms={classrooms}
      teachers={departmentTeachers}
      finalisedMarks={finalisedMarks}
      aiStatus={aiStatus}
    />
  );
}
