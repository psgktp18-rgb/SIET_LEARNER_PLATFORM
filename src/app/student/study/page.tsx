import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { checkAiConfigured } from '@/lib/ai/status';
import { StudentStudyClient } from './client';

export const instant = false;

export default async function StudentStudyPage() {
  const payload = await getUser();
  if (!payload || payload.role !== 'STUDENT') {
    redirect('/login');
  }

  const [
    studyDocuments,
    enrollments,
    aiStatus,
    pointsSum,
    dueFlashcardsCount,
    upcomingTests,
    upcomingAssignments,
    nextExam,
  ] = await Promise.all([
    prisma.studyDocument.findMany({
      where: { studentId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.enrollment.findMany({
      where: { userId: payload.userId },
      include: { classroom: { include: { subject: true } } },
    }),
    checkAiConfigured(),
    prisma.pointLedger.aggregate({
      where: { userId: payload.userId },
      _sum: { points: true },
    }),
    prisma.flashcard.count({
      where: { creatorId: payload.userId, nextReview: { lte: new Date() } },
    }),
    prisma.test.findMany({
      where: {
        classroomId: {
          in: (
            await prisma.enrollment.findMany({
              where: { userId: payload.userId },
              select: { classroomId: true },
            })
          ).map((e) => e.classroomId),
        },
        endTime: { gt: new Date() },
      },
      orderBy: { startTime: 'asc' },
      take: 5,
    }),
    prisma.assignment.findMany({
      where: {
        classroomId: {
          in: (
            await prisma.enrollment.findMany({
              where: { userId: payload.userId },
              select: { classroomId: true },
            })
          ).map((e) => e.classroomId),
        },
        dueDate: { gt: new Date() },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    }),
    prisma.exam.findFirst({
      where: { date: { gt: new Date() } },
      orderBy: { date: 'asc' },
    }),
  ]);

  const classrooms = enrollments.map((e) => e.classroom);

  return (
    <StudentStudyClient
      studyDocuments={studyDocuments}
      classrooms={classrooms}
      aiStatus={aiStatus}
      totalPoints={pointsSum._sum.points || 0}
      dueFlashcardsCount={dueFlashcardsCount}
      upcomingTests={upcomingTests}
      upcomingAssignments={upcomingAssignments}
      nextExam={nextExam}
      studentName={payload.name}
    />
  );
}
