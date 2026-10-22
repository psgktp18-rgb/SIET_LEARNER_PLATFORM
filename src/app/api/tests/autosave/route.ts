import { defineRoute } from '@/lib/action-wrapper';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTestDeadline, isPastDeadline } from '@/lib/test-engine';

export const POST = defineRoute(
  z.object({
    attemptId: z.string().min(1),
    answers: z.array(z.object({
      questionId: z.string(),
      answer: z.string()
    })),
    idempotencyKey: z.string().optional()
  }),
  async (input, session) => {
    const { attempt, deadline } = await getTestDeadline(input.attemptId);

    // Security checks
    if (attempt.studentId !== session.userId) {
      throw new Error('Not your attempt');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new Error('Test already submitted');
    }
    if (isPastDeadline(deadline, 10)) { // 10s grace
      throw new Error('Deadline exceeded');
    }

    // Upsert answers (Prisma doesn't easily upsert many, so we use a transaction of updates since the rows were created on Start)
    await prisma.$transaction(
      input.answers.map(ans => 
        prisma.testAnswer.update({
          where: { attemptId_questionId: { attemptId: input.attemptId, questionId: ans.questionId } },
          data: { answer: ans.answer }
        })
      )
    );

    const remainingMs = Math.max(0, deadline.getTime() - Date.now());
    return { remainingTimeSecs: Math.floor(remainingMs / 1000) };
  },
  { roles: ['STUDENT'] }
);
