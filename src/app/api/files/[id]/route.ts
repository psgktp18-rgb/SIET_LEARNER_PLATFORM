import { getSession } from '@/lib/action-wrapper';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const { id } = await params;

    const file = await prisma.fileRecord.findUnique({
      where: { id },
      include: { classroom: true }
    });

    if (!file) return new NextResponse('Not found', { status: 404 });

    // Access control
    let canAccess = false;
    if (session.role === 'ADMIN') canAccess = true;
    else if (file.ownerId === session.userId) canAccess = true;
    else if (file.classroomId) {
      if (session.role === 'TEACHER' && file.classroom?.teacherId === session.userId) {
        canAccess = true;
      } else if (session.role === 'STUDENT') {
         const enrolled = await prisma.enrollment.findUnique({
           where: { userId_classroomId: { userId: session.userId, classroomId: file.classroomId } }
         });
         if (enrolled && (file.purpose === 'note' || file.purpose === 'assignment_attachment')) {
            canAccess = true; // Students can see notes and attachments
         }
         // Students CANNOT see other students' submissions, even in the same class.
      }
    }

    if (!canAccess) return new NextResponse('Forbidden', { status: 403 });

    try {
       const buffer = await storage.downloadFile(file.key);
       return new NextResponse(buffer as any, {
         headers: {
           'Content-Type': file.type,
           'Content-Disposition': `inline; filename="${file.name}"`,
         }
       });
    } catch (e) {
       return new NextResponse('Storage error', { status: 500 });
    }
  } catch (error: any) {
    if (error.message === 'NOT_AUTHENTICATED') return new NextResponse('Unauthorized', { status: 401 });
    return new NextResponse('Internal Error', { status: 500 });
  }
}
