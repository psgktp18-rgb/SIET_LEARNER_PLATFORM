import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { z } from 'zod';

const createDoubtSchema = z.object({
  classroomId: z.string().min(1, 'Classroom is required'),
  question: z.string().min(1, 'Question is required'),
  botContext: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createDoubtSchema.parse(body);

    const ticket = await prisma.doubtTicket.create({
      data: {
        classroomId: data.classroomId,
        studentId: user.userId,
        question: data.question,
        botContext: data.botContext || 'Question submitted from AI Tutor session.',
        status: 'OPEN',
      },
    });

    return NextResponse.json({ ticket, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit doubt' }, { status: 400 });
  }
}
