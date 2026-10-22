import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const assignmentSchema = z.object({
  title: z.string().min(3),
  instructions: z.string(),
  dueDate: z.string().datetime(),
  maxMarks: z.number().int().min(1),
  classroomId: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ll_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await getUser();
    if (!payload || payload.role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const data = assignmentSchema.parse(body);

    // Verify teacher owns this classroom
    const classroom = await prisma.classroom.findUnique({ where: { id: data.classroomId } });
    if (!classroom || classroom.teacherId !== payload.userId) {
      return NextResponse.json({ error: 'Classroom not found or forbidden' }, { status: 403 });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: data.title,
        instructions: data.instructions,
        dueDate: new Date(data.dueDate),
        maxMarks: data.maxMarks,
        classroomId: data.classroomId,
        teacherId: payload.userId,
      }
    });

    await logAudit({ userId: payload.userId, targetUserId: payload.userId, action: 'CREATE_ASSIGNMENT', details: `Created assignment ${assignment.id}` });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
