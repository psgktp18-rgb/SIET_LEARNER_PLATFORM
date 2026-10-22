import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { checkAiConfigured } from '@/lib/ai/status';
import { TeacherAiStudioClient } from './client';

export const instant = false;

export default async function TeacherAiStudioPage() {
  const payload = await getUser();
  if (!payload || (payload.role !== 'TEACHER' && payload.role !== 'HOD' && payload.role !== 'ADMIN')) {
    redirect('/login');
  }

  const [classrooms, notes, aiStatus, savedLibrary] = await Promise.all([
    prisma.classroom.findMany({
      where: {
        OR: [
          { teacherId: payload.userId },
          { teachers: { some: { teacherId: payload.userId } } }
        ]
      },
      include: { subject: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.note.findMany({
      where: { uploaderId: payload.userId },
      select: { id: true, title: true, unit: true, classroomId: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    checkAiConfigured(),
    prisma.aiGeneration.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  ]);

  return (
    <TeacherAiStudioClient
      userRole={payload.role}
      classrooms={classrooms}
      notes={notes}
      aiStatus={aiStatus}
      savedLibrary={savedLibrary}
    />
  );
}
