import { prisma } from '../../prisma';
import { ai } from '../../ai';
import { storage } from '../../storage';
import { dispatchJob } from '../registry';
import * as pdfParseModule from 'pdf-parse';
import crypto from 'crypto';

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

// Very basic text chunker
function chunkText(text: string, maxChars = 2000, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + maxChars);
    chunks.push(chunk);
    i += maxChars - overlap;
  }
  return chunks;
}

export async function processNoteHandler(payload: { noteId: string }) {
  const note = await prisma.note.findUnique({
    where: { id: payload.noteId }
  });

  if (!note) throw new Error("Note not found");
  
  // Note: we can use a hash check to see if the file was processed before, but we are just using the note's status.
  if (note.status === 'READY') return;

  try {
    // 1. Download file
    const buffer = await storage.downloadFile(note.fileUrl); // note.fileUrl is the storage key

    // 2. Extract text
    let extractedText = "";
    if (note.fileType === 'application/pdf') {
       const pdfData = await pdfParse(buffer);
       extractedText = pdfData.text;
    } else {
       // Fallback text extraction
       extractedText = buffer.toString('utf-8');
    }

    // Clean text (basic)
    extractedText = extractedText.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();

    if (!extractedText) throw new Error("No text could be extracted from the file");

    // 3. Chunking
    const chunks = chunkText(extractedText);

    // 4. Embedding
    await prisma.noteChunk.deleteMany({ where: { noteId: note.id } }); // Clear old chunks if retrying

    for (const chunkContent of chunks) {
       let embeddingStr = null;
       try {
         // Embed using the AI router
         const vector = await ai.embed(chunkContent);
         embeddingStr = JSON.stringify(vector);
       } catch (err: any) {
         console.warn("Failed to embed chunk, saving without embedding", err.message);
       }

       await prisma.noteChunk.create({
         data: {
           noteId: note.id,
           content: chunkContent,
           embedding: embeddingStr,
           // these will come from env in a real scenario, mock values for now
           embedProvider: 'router', 
           embedModel: 'dynamic',
           embedDimension: 768
         }
       });
    }

    // 5. Update Status
    await prisma.note.update({
      where: { id: note.id },
      data: { status: 'READY', error: null }
    });

    // 6. Trigger subsequent generation jobs
    await dispatchJob('GENERATE_QUESTIONS', { noteId: note.id });
    await dispatchJob('GENERATE_FLASHCARDS', { noteId: note.id });

  } catch (err: any) {
    await prisma.note.update({
      where: { id: note.id },
      data: { status: 'FAILED', error: err.message }
    });
    throw err;
  }
}
