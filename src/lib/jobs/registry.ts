import { processNoteHandler } from './handlers/note-processing';
import { generateQuestionsHandler } from './handlers/generate-questions';
import { generateFlashcardsHandler } from './handlers/generate-flashcards';
import { gradeTestHandler } from './handlers/grade-test';
import { checkPlagiarismHandler } from './handlers/check-plagiarism';
import { prisma } from '../prisma';

type JobHandler = (payload: any) => Promise<void>;

export const jobRegistry: Record<string, JobHandler> = {
  'PROCESS_NOTE': processNoteHandler,
  'GENERATE_QUESTIONS': generateQuestionsHandler,
  'GENERATE_FLASHCARDS': generateFlashcardsHandler,
  'GRADE_TEST': gradeTestHandler,
  'CHECK_PLAGIARISM': checkPlagiarismHandler,
};

export async function dispatchJob(type: string, payload: any, runAt?: Date) {
  await prisma.job.create({
    data: {
      type,
      payload: JSON.stringify(payload),
      runAt: runAt || new Date()
    }
  });
}
