import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { ai } from '@/lib/ai';

export async function GET(req: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('ll_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await getUser();
  if (payload?.role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const classroom = await prisma.classroom.findUnique({
    where: { id: resolvedParams.classroomId }
  });
  
  if (classroom?.teacherId !== payload.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const marks = await prisma.studentMark.findMany({
    where: { classroomId: resolvedParams.classroomId },
    include: { component: true }
  });

  const agg = marks.map(m => `${m.component.name}: ${m.marks}/${m.component.maxMarks}`).join(', ');
  
  let aiInsight = '';
  try {
    aiInsight = await ai.chat({
      messages: [
        { role: 'system', content: 'You are an educational assistant. Analyze the following aggregated marks and give 2 sentences of insight on class performance and what to re-teach. No student names.' },
        { role: 'user', content: `Marks summary: ${agg}` }
      ],
      taskType: 'classInsights'
    });
  } catch(e) {
    aiInsight = 'AI insights temporarily unavailable.';
  }

  return NextResponse.json({ insight: aiInsight });
}
