import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('ll_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await getUser();
  if (payload?.role !== 'TEACHER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { students } = await req.json();

  const classroom = await prisma.classroom.findUnique({
    where: { id: resolvedParams.classroomId }
  });
  
  if (classroom?.teacherId !== payload.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Save marks
  for (const s of students) {
    for (const [compId, marks] of Object.entries(s.marks)) {
      if (marks !== null) {
        await prisma.studentMark.upsert({
          where: {
            componentId_studentId_classroomId: {
              componentId: compId,
              studentId: s.id,
              classroomId: resolvedParams.classroomId
            }
          },
          update: { marks: Number(marks) },
          create: {
            componentId: compId,
            studentId: s.id,
            classroomId: resolvedParams.classroomId,
            marks: Number(marks)
          }
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
