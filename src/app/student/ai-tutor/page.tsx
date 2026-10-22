import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { checkAiConfigured } from '@/lib/ai/status';
import { StudentAiTutorClient } from './client';

export const instant = false;

export default async function StudentAiTutorPage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') {
    redirect('/login');
  }

  const [enrollments, aiStatus, conversations] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: payload.userId },
      include: {
        classroom: {
          include: {
            subject: true,
            notes: {
              select: { id: true, title: true, unit: true }
            }
          }
        }
      }
    }),
    checkAiConfigured(),
    prisma.aiConversation.findMany({
      where: { userId: payload.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })
  ]);

  const classrooms = enrollments.map(e => e.classroom);

  return (
    <StudentAiTutorClient
      classrooms={classrooms}
      aiStatus={aiStatus}
      pastConversations={conversations}
      studentName={payload.name}
    />
  );
}
