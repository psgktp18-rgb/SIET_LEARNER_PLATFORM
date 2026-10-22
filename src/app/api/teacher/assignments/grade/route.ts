import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const gradeSchema = z.object({
  submissionId: z.string(),
  marks: z.number().min(0),
  feedback: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ll_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await getUser();
    if (!payload || payload.role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const data = gradeSchema.parse(body);

    const submission = await prisma.submission.findUnique({ 
      where: { id: data.submissionId },
      include: { assignment: true }
    });

    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    if (submission.assignment.teacherId !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (data.marks > submission.assignment.maxMarks) {
      return NextResponse.json({ error: 'Marks cannot exceed max marks' }, { status: 400 });
    }

    const updated = await prisma.submission.update({
      where: { id: data.submissionId },
      data: {
        marks: data.marks,
        feedback: data.feedback,
        status: 'GRADED'
      }
    });

    await logAudit({ userId: payload.userId, targetUserId: submission.studentId, action: 'GRADE_ASSIGNMENT', details: `Graded submission ${submission.id}` });

    return NextResponse.json({ success: true, submission: updated }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
