import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getClassroomAccess } from '@/lib/permissions/classroom';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const announcements = await prisma.announcement.findMany({
      where: { classroomId: id },
      include: {
        author: {
          select: { id: true, name: true, loginId: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ announcements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const classroom = await prisma.classroom.findUnique({
      where: { id }
    });

    if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

    const access = await getClassroomAccess(user.userId, classroom.id);
    if (!access.canPostStream) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to post announcements' }, { status: 403 });
    }

    const body = await req.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const isFromClassRep = access.isClassRep && user.role === 'STUDENT';

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        classroomId: classroom.id,
        authorId: user.userId,
        isFromClassRep,
      },
      include: {
        author: { select: { id: true, name: true, role: true } }
      }
    });

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'POST_CLASSROOM_ANNOUNCEMENT',
      details: `Posted announcement "${title}" in "${classroom.name}"${isFromClassRep ? ' (From Class Rep)' : ''}`
    });

    return NextResponse.json({ success: true, announcement });
  } catch (error: any) {
    console.error('[POST /api/classrooms/[id]/announcements]', error);
    return NextResponse.json({ error: error.message || 'Failed to post announcement' }, { status: 500 });
  }
}
