import { prisma } from '../../prisma';
import { ai } from '../../ai';
import { z } from 'zod';

const QuestionSchema = z.object({
  questions: z.array(z.object({
    type: z.enum(['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER']),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    text: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string(),
    explanation: z.string(),
    topicTag: z.string()
  }))
});

export async function generateQuestionsHandler(payload: { noteId: string }) {
  const chunks = await prisma.noteChunk.findMany({
    where: { noteId: payload.noteId },
    take: 5 // Just take the first few chunks for generating a summary batch to save tokens/time in this demo
  });

  if (!chunks.length) return;

  const combinedText = chunks.map(c => c.content).join('\n\n');
  
  const prompt = `
Generate 5 academic questions based on the following text.
Include a mix of MCQ and SHORT_ANSWER.
Ensure difficulty varies (EASY, MEDIUM, HARD).
Return JSON matching this schema:
{
  "questions": [
    {
      "type": "MCQ" | "TRUE_FALSE" | "FILL_BLANK" | "SHORT_ANSWER",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "text": "The question text",
      "options": ["A", "B", "C", "D"], // Only for MCQ
      "correctAnswer": "The exact correct answer or option text",
      "explanation": "Why this is correct",
      "topicTag": "Main topic keyword"
    }
  ]
}

Text:
${combinedText.substring(0, 4000)}
`;

  try {
    const result = await ai.generateJSON(prompt, QuestionSchema, 'quizGeneration') as any;
    
    // Save to DB
    for (const q of result.questions) {
      // Basic deduplication check
      const exists = await prisma.question.findFirst({
        where: { noteId: payload.noteId, text: q.text }
      });
      
      if (!exists) {
        await prisma.question.create({
          data: {
            noteId: payload.noteId,
            type: q.type,
            difficulty: q.difficulty,
            text: q.text,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            topicTag: q.topicTag,
            status: 'DRAFT', // Teacher must approve
            importance: 1.0
          }
        });
      }
    }
  } catch (err: any) {
    console.error(`Failed to generate questions for note ${payload.noteId}`, err);
    throw err; // Let the worker retry
  }
}
