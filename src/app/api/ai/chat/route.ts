import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ai } from '@/lib/ai';
import { z } from 'zod';
import { getSession } from '@/lib/action-wrapper';
import { TaskType } from '@/lib/ai/types';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const body = await req.json();
    const schema = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string()
      })),
      taskType: z.string().default('studyDoubtBot'),
      classroomId: z.string().optional()
    });

    const { messages, taskType, classroomId } = schema.parse(body);

    if (taskType === 'studyDoubtBot' && classroomId) {
       // Validate enrollment
       const enrolled = await prisma.enrollment.findUnique({
         where: { userId_classroomId: { userId: session.userId, classroomId } }
       });
       // Teachers can also use it
       const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
       if (!enrolled && classroom?.teacherId !== session.userId) {
         return NextResponse.json({ error: 'Not enrolled in this classroom' }, { status: 403 });
       }

       // Perform retrieval
       const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
       let contextText = '';
       
       if (lastUserMessage) {
         try {
           const queryEmbedding = await ai.embed(lastUserMessage);
           // PGVector similarity search would go here. For demo, we fallback to keyword search using Prisma full text
           // We'll mock the retrieval step to return some chunks, but in reality we'd do a cosine similarity query.
           
           // Mocked Keyword Fallback Retrieval:
           const chunks = await prisma.noteChunk.findMany({
             where: {
               note: { classroomId },
               content: { contains: lastUserMessage.split(' ')[0] } // Super basic keyword match
             },
             take: 3,
             include: { note: true }
           });

           if (chunks.length > 0) {
             contextText = chunks.map((c: any) => `[From Note: ${c.note.title}]: ${c.content}`).join('\n\n');
           }
         } catch (err) {
           console.error("Retrieval failed", err);
         }
       }

       // Inject context
       if (contextText) {
          messages.unshift({
            role: 'system',
            content: `You are a Study Doubt Bot. Answer the user's question ONLY using the following context. If the answer is not in the context, say "I cannot find the answer in the class notes. Would you like me to Notify the Teacher?". Context:\n\n${contextText}`
          });
       } else {
          messages.unshift({
            role: 'system',
            content: `You are a Study Doubt Bot. The user's query did not match any class notes. Reply exactly with: "I cannot find the answer in the class notes. Would you like me to Notify the Teacher?"`
          });
       }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let isDisconnected = false;
        
        req.signal.addEventListener('abort', () => {
          isDisconnected = true;
          controller.close();
        });

        try {
          await ai.chatStream({
            messages,
            taskType: taskType as TaskType
          }, (chunk) => {
            if (isDisconnected) return;
            // Send Server-Sent Events format
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          });
          
          if (!isDisconnected) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        } catch (error: any) {
          if (!isDisconnected) {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`));
            controller.close();
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
