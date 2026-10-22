import { prisma } from './prisma';

export async function getTestDeadline(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: true }
  });
  if (!attempt) throw new Error('Attempt not found');
  
  // Base deadline is start time + duration
  let deadline = new Date(attempt.startTime.getTime() + attempt.test.durationMins * 60000);
  
  // But it cannot exceed the test's absolute end time
  if (deadline > attempt.test.endTime) {
    deadline = attempt.test.endTime;
  }
  
  // Plus any extensions (we would add extensionMins to the DB if we implemented it, assuming it's not yet in schema)
  return { attempt, deadline };
}

export function isPastDeadline(deadline: Date, graceSeconds = 10) {
  const now = new Date();
  const cutoff = new Date(deadline.getTime() + graceSeconds * 1000);
  return now > cutoff;
}
