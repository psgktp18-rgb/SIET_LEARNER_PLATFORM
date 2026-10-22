import { prisma } from './prisma';
import { ai } from './ai';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
// Simplified extraction for phase 2. 
// A real PPTX parser would be used here, but mammoth/pdf-parse/tesseract cover 90% of use cases.

function cleanText(text: string): string {
  // Remove excessive whitespace, non-printable characters
  return text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E\n]/g, '').trim();
}

function chunkText(text: string, maxTokens = 500, overlap = 50): string[] {
  // Rough token estimation: 1 token ~= 4 characters
  const chunkSize = maxTokens * 4;
  const overlapSize = overlap * 4;
  
  if (text.length <= chunkSize) return [text];
  
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
    i += chunkSize - overlapSize;
  }
  return chunks;
}

export async function processUploadedNote(noteId: string, fileBuffer: Buffer, fileType: string) {
  try {
    await prisma.note.update({ where: { id: noteId }, data: { status: 'PROCESSING' } });
    
    let extractedText = '';

    if (fileType === 'application/pdf') {
      const data = await pdfParse(fileBuffer);
      extractedText = data.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value;
    } else if (fileType.startsWith('image/')) {
      const result = await Tesseract.recognize(fileBuffer, 'eng');
      extractedText = result.data.text;
    } else if (fileType === 'text/plain') {
      extractedText = fileBuffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    extractedText = cleanText(extractedText);
    const chunks = chunkText(extractedText);

    // Process chunks concurrently with limit to prevent overloading AI
    // Normally use p-limit, simulating batch processing here
    const BATCH_SIZE = 5;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (content, index) => {
        try {
          const embedding = await ai.embed(content);
          await prisma.noteChunk.create({
            data: {
              noteId,
              content,
              pageNumber: Math.floor((i + index) / 2) + 1, // rough estimate
              embedding: JSON.stringify(embedding),
              embedProvider: 'router',
              embedModel: 'auto',
              embedDimension: embedding.length,
            }
          });
        } catch (err) {
          console.error('Failed to embed chunk:', err);
          // Store chunk anyway for keyword fallback
          await prisma.noteChunk.create({
            data: {
              noteId,
              content,
              pageNumber: Math.floor((i + index) / 2) + 1,
            }
          });
        }
      }));
    }

    await prisma.note.update({ where: { id: noteId }, data: { status: 'READY' } });

    // Trigger async Quiz Generation if required
    generateQuizForNote(noteId).catch(console.error);
    generateFlashcardsForNote(noteId).catch(console.error);

  } catch (error: any) {
    console.error('Note processing failed:', error);
    await prisma.note.update({ 
      where: { id: noteId }, 
      data: { status: 'FAILED', error: error.message } 
    });
  }
}

import { z } from 'zod';

const quizSchema = z.object({
  questions: z.array(z.object({
    type: z.enum(['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER']),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    text: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string(),
    explanation: z.string(),
    topicTag: z.string(),
    importance: z.number().min(1).max(10),
  }))
});

export async function generateQuizForNote(noteId: string) {
  const note = await prisma.note.findUnique({ where: { id: noteId }, include: { chunks: true } });
  if (!note || note.chunks.length === 0) return;

  // Use the first few chunks to generate questions as a demo
  const sampleText = note.chunks.map(c => c.content).join(' ').substring(0, 4000);

  const prompt = `Generate a 5-question quiz based on the following notes. Focus on the most important concepts.
  The output MUST be valid JSON matching the exact schema. Include MCQ, True/False, and Fill in the Blank.
  
  Notes:
  ${sampleText}`;

  try {
    const result = await ai.generateJSON<z.infer<typeof quizSchema>>(prompt, quizSchema, 'quizGeneration');
    
    // Save to DB
    for (const q of result.questions) {
      await prisma.question.create({
        data: {
          noteId: note.id,
          type: q.type,
          difficulty: q.difficulty,
          text: q.text,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          topicTag: q.topicTag,
          importance: q.importance,
          status: 'DRAFT'
        }
      });
    }
  } catch (err) {
    console.error('Failed to generate quiz:', err);
  }
}

const flashcardSchema = z.object({
  flashcards: z.array(z.object({
    front: z.string(),
    back: z.string(),
    type: z.enum(['TERM', 'CONCEPT', 'FORMULA']),
  }))
});

export async function generateFlashcardsForNote(noteId: string) {
  const note = await prisma.note.findUnique({ where: { id: noteId }, include: { chunks: true } });
  if (!note || note.chunks.length === 0) return;

  const sampleText = note.chunks.map(c => c.content).join(' ').substring(0, 4000);

  const prompt = `Generate 10 flashcards (Term/Concept) based on the following notes.
  The output MUST be valid JSON matching the exact schema. Keep fronts short and backs concise.
  
  Notes:
  ${sampleText}`;

  try {
    const result = await ai.generateJSON<z.infer<typeof flashcardSchema>>(prompt, flashcardSchema, 'flashcardGeneration');
    
    // Save to DB
    for (const f of result.flashcards) {
      await prisma.flashcard.create({
        data: {
          noteId: note.id,
          front: f.front,
          back: f.back,
          type: f.type,
          creatorId: note.uploaderId, // Owned by the uploader/system
        }
      });
    }
  } catch (err) {
    console.error('Failed to generate flashcards:', err);
  }
}
