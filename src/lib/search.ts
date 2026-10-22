import { prisma } from './prisma';
import { ai } from './ai';
import { AiError } from './ai/types';

// Simple cosine similarity since SQLite doesn't have pgvector out of the box
function cosineSimilarity(A: number[], B: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchChunks(query: string, classroomId: string, limit = 5) {
  try {
    const queryEmbedding = await ai.embed(query);
    
    // Get all chunks for the classroom
    // In a real app with large data, we need pgvector. For local SQLite, we pull and sort.
    const chunks = await prisma.noteChunk.findMany({
      where: {
        note: { classroomId, status: 'READY' }
      },
      include: { note: true }
    });

    const scored = chunks.map(chunk => {
      let score = 0;
      if (chunk.embedding) {
        try {
          const emb = JSON.parse(chunk.embedding);
          score = cosineSimilarity(queryEmbedding, emb);
        } catch { }
      }
      return { ...chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);

  } catch (err: any) {
    if (err instanceof AiError) {
      console.warn('Embedding failed, falling back to keyword search:', err.message);
      // Fallback to basic keyword search
      const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
      
      const chunks = await prisma.noteChunk.findMany({
        where: { note: { classroomId, status: 'READY' } },
        include: { note: true }
      });

      const scored = chunks.map(chunk => {
        let score = 0;
        const text = chunk.content.toLowerCase();
        for (const kw of keywords) {
          if (text.includes(kw)) score += 1;
        }
        return { ...chunk, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).filter(c => c.score > 0);
    }
    throw err;
  }
}
