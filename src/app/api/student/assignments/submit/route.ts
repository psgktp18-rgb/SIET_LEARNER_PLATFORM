import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const submitSchema = z.object({
  assignmentId: z.string(),
  textContent: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ll_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await getUser();
    if (!payload || payload.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const data = submitSchema.parse(body);

    const assignment = await prisma.assignment.findUnique({ where: { id: data.assignmentId } });
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_classroomId: { userId: payload.userId, classroomId: assignment.classroomId } }
    });
    if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 });

    const isLate = new Date() > assignment.dueDate;
    if (isLate && !assignment.allowLate) {
      return NextResponse.json({ error: 'Assignment is past due date and late submissions are not allowed' }, { status: 400 });
    }

    const submission = await prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId: data.assignmentId, studentId: payload.userId } },
      update: {
        textContent: data.textContent,
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date()
      },
      create: {
        assignmentId: data.assignmentId,
        studentId: payload.userId,
        textContent: data.textContent,
        status: isLate ? 'LATE' : 'SUBMITTED'
      }
    });

    await logAudit({ userId: payload.userId, targetUserId: payload.userId, action: 'SUBMIT_ASSIGNMENT', details: `Submitted assignment ${assignment.id}` });

    return NextResponse.json({ success: true, submission }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
