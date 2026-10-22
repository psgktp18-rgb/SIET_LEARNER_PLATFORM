import { defineRoute } from '@/lib/action-wrapper';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getTestDeadline, isPastDeadline } from '@/lib/test-engine';
import { dispatchJob } from '@/lib/jobs/registry';

export const POST = defineRoute(
  z.object({
    attemptId: z.string().min(1),
    idempotencyKey: z.string().optional()
  }),
  async (input, session) => {
    const { attempt, deadline } = await getTestDeadline(input.attemptId);

    if (attempt.studentId !== session.userId) throw new Error('Not your attempt');
    
    // Idempotent success if already submitted
    if (attempt.status === 'SUBMITTED') {
      return { success: true, message: 'Already submitted' };
    }
    
    // Allow submit even after deadline in case of late flush, but we can strictly reject if it's way past.
    // The prompt says: "Submit: idempotent, accepted inside the deadline plus grace, locks the attempt, and auto-grades..."
    if (isPastDeadline(deadline, 15)) { // slightly larger grace for submit
      // We lock it as AUTO_SUBMITTED if it's past grace
       await prisma.testAttempt.update({
         where: { id: attempt.id },
         data: { status: 'AUTO_SUBMITTED', endTime: new Date() }
       });
       // Queue grading job
       await dispatchJob('GRADE_TEST', { attemptId: attempt.id });
       throw new Error('Test automatically submitted due to time limit.');
    }

    // Lock attempt
    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: { status: 'SUBMITTED', endTime: new Date() }
    });

    // We dispatch a job for grading so it doesn't block the request for large tests
    await dispatchJob('GRADE_TEST', { attemptId: attempt.id });

    return { success: true };
  },
  { roles: ['STUDENT'], auditAction: 'SUBMIT_TEST' }
);
