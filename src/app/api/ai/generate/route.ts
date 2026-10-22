import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { ai } from '@/lib/ai';
import { checkAiConfigured } from '@/lib/ai/status';
import { sanitizePromptForAi } from '@/lib/ai/privacy';
import { z } from 'zod';
import { TaskType } from '@/lib/ai/types';

const generateSchema = z.object({
  tool: z.string(),
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  classroomId: z.string().optional(),
  assignmentId: z.string().optional(),
  formatJson: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check AI Provider Configuration
    const aiStatus = await checkAiConfigured();
    if (!aiStatus.isConfigured) {
      return NextResponse.json(
        {
          error: 'AI is not configured yet',
          status: 'not_configured',
          reason: aiStatus.reason,
        },
        { status: 503 }
      );
    }

    const settings = await prisma.systemSetting.findFirst();

    // 2. Exam Mode Check for Students
    if (user.role === 'STUDENT' && settings?.examMode) {
      return NextResponse.json(
        {
          error: 'AI tools are temporarily disabled during active Exam Mode.',
          status: 'exam_mode_blocked',
        },
        { status: 403 }
      );
    }

    // 3. User Daily Quota Check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyQuota = settings?.aiDailyQuotaPerUser ?? 50;

    const usedToday = await prisma.aiUsageLog.count({
      where: {
        userId: user.userId,
        timestamp: { gte: today },
      },
    });

    if (usedToday >= dailyQuota) {
      return NextResponse.json(
        {
          error: `Daily AI quota of ${dailyQuota} requests reached. Resets at midnight.`,
          status: 'quota_exceeded',
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { tool, prompt, systemPrompt, classroomId, assignmentId } = generateSchema.parse(body);

    // 4. Assignment AI Rule Enforcement (for students)
    if (assignmentId && user.role === 'STUDENT') {
      const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
      if (assignment) {
        if (assignment.aiHelpRule === 'OFF') {
          return NextResponse.json(
            { error: 'The instructor has disabled AI assistance for this assignment.' },
            { status: 403 }
          );
        }
      }
    }

    // 5. Sanitize Prompt (Zero PII transmitted)
    const sanitizedPrompt = sanitizePromptForAi(prompt);

    // 6. Map tool to taskType for router & fallback policies
    let taskType: TaskType = 'studyDoubtBot';
    if (tool.includes('QUIZ') || tool.includes('QUESTION')) taskType = 'quizGeneration';
    else if (tool.includes('FLASHCARD')) taskType = 'flashcardGeneration';
    else if (tool.includes('RECAP') || tool.includes('INSIGHT')) taskType = 'classInsights';
    else if (tool.includes('RUBRIC') || tool.includes('FEEDBACK')) taskType = 'assignmentFeedback';

    const defaultSystem = systemPrompt || `You are an expert academic AI assistant for "Lecture Lens" at Sri Shakthi Institute of Engineering and Technology (SIET). User role: ${user.role}. Provide clear, high-quality, structured academic outputs. Follow engineering standards. Label any assumptions clearly.`;

    // 7. Streaming Response (SSE)
    const encoder = new TextEncoder();
    let accumulatedOutput = '';
    const startTime = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        let isDisconnected = false;

        req.signal.addEventListener('abort', () => {
          isDisconnected = true;
          controller.close();
        });

        try {
          await ai.chatStream(
            {
              taskType,
              messages: [
                { role: 'system', content: defaultSystem },
                { role: 'user', content: sanitizedPrompt },
              ],
            },
            (chunk: string) => {
              if (isDisconnected) return;
              accumulatedOutput += chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
          );

          if (!isDisconnected) {
            // Log usage with zero prompt text stored
            try {
              await prisma.aiUsageLog.create({
                data: {
                  userId: user.userId,
                  taskType,
                  provider: aiStatus.provider,
                  model: 'router',
                  latencyMs: Date.now() - startTime,
                  success: true,
                  fallbackUsed: false,
                },
              });
            } catch (err) {
              console.error('Failed to record AI usage log', err);
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        } catch (err: any) {
          if (!isDisconnected) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: err.message || 'AI is temporarily unavailable' })}\n\n`)
            );
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
