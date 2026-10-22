import { prisma } from '../../prisma';

export async function gradeTestHandler(payload: { attemptId: string }) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: payload.attemptId },
    include: {
      answers: { include: { attempt: { include: { test: { include: { questions: true } } } } } } // This is a bit nested, let's simplify
    }
  });

  if (!attempt) return;
  
  const test = await prisma.test.findUnique({ where: { id: attempt.testId } });
  if (!test) return;

  const answers = await prisma.testAnswer.findMany({ where: { attemptId: attempt.id } });
  
  let totalScore = 0;

  for (const ans of answers) {
    // Find the original question
    const q = await prisma.question.findUnique({ where: { id: ans.questionId } });
    if (!q) continue;

    if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
      if (ans.answer === q.correctAnswer) {
        totalScore += test.marksPerQuestion;
        await prisma.testAnswer.update({
          where: { id: ans.id },
          data: { isCorrect: true, marks: test.marksPerQuestion }
        });
      } else {
        totalScore -= test.negativeMarking;
        await prisma.testAnswer.update({
          where: { id: ans.id },
          data: { isCorrect: false, marks: -test.negativeMarking }
        });
      }
    } else {
      // Short answers require teacher grading or AI grading later
      await prisma.testAnswer.update({
        where: { id: ans.id },
        data: { isCorrect: null, marks: null } // pending
      });
    }
  }

  // Cap score to 0 if negative grading pushes it below 0? Let's just store the exact total.
  await prisma.testAttempt.update({
    where: { id: attempt.id },
    data: { score: totalScore }
  });
}
