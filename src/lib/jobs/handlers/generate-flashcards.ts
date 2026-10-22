import { prisma } from '../../prisma';
import { ai } from '../../ai';
import { z } from 'zod';

const FlashcardSchema = z.object({
  flashcards: z.array(z.object({
    type: z.enum(['TERM', 'CONCEPT', 'FORMULA']),
    front: z.string(),
    back: z.string()
  }))
});

export async function generateFlashcardsHandler(payload: { noteId: string }) {
  const note = await prisma.note.findUnique({ where: { id: payload.noteId } });
  if (!note) return;

  const chunks = await prisma.noteChunk.findMany({
    where: { noteId: payload.noteId },
    take: 5 
  });

  if (!chunks.length) return;

  const combinedText = chunks.map(c => c.content).join('\n\n');
  
  const prompt = `
Extract 5 key concepts, terms, or formulas from the following text and create flashcards.
Return JSON matching this schema:
{
  "flashcards": [
    {
      "type": "TERM" | "CONCEPT" | "FORMULA",
      "front": "The term or question",
      "back": "The definition or answer"
    }
  ]
}

Text:
${combinedText.substring(0, 4000)}
`;

  try {
    const result = await ai.generateJSON(prompt, FlashcardSchema, 'flashcardGeneration') as any;
    
    // Save to DB
    for (const fc of result.flashcards) {
      await prisma.flashcard.create({
        data: {
          noteId: payload.noteId,
          type: fc.type,
          front: fc.front,
          back: fc.back,
          creatorId: note.uploaderId, // Owned by the uploader initially
        }
      });
    }
  } catch (err: any) {
    console.error(`Failed to generate flashcards for note ${payload.noteId}`, err);
    throw err;
  }
}
