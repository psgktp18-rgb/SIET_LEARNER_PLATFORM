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

    const access = await getClassroomAccess(user.userId, id);
    if (!access.isAdmin && !access.isMainTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requests = await prisma.classroomJoinRequest.findMany({
      where: { classroomId: id, status: 'PENDING' },
      include: {
        student: {
          select: { id: true, name: true, loginId: true, email: true, year: true, section: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can request to join a classroom' }, { status: 403 });
    }

    const classroom = await prisma.classroom.findUnique({ where: { id } });
    if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

    // Check if already enrolled
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_classroomId: { userId: user.userId, classroomId: classroom.id } }
    });
    if (enrolled) {
      return NextResponse.json({ error: 'You are already enrolled in this classroom' }, { status: 400 });
    }

    if (!classroom.requiresApproval) {
      // Direct enrollment
      await prisma.enrollment.create({
        data: { userId: user.userId, classroomId: classroom.id }
      });
      return NextResponse.json({ success: true, enrolled: true, message: 'Enrolled successfully' });
    }

    // Requires approval: create or update join request
    const joinReq = await prisma.classroomJoinRequest.upsert({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: user.userId,
        }
      },
      create: {
        classroomId: classroom.id,
        studentId: user.userId,
        status: 'PENDING'
      },
      update: {
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      success: true,
      enrolled: false,
      pendingApproval: true,
      message: 'Join request submitted. Pending teacher approval.',
      request: joinReq
    });
  } catch (error: any) {
    console.error('[POST /api/classrooms/[id]/requests]', error);
    return NextResponse.json({ error: error.message || 'Failed to submit join request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const access = await getClassroomAccess(user.userId, id);
    if (!access.isAdmin && !access.isMainTeacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action } = body; // action: 'approve' | 'reject'

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    const joinReq = await prisma.classroomJoinRequest.findUnique({
      where: { id: requestId },
      include: { classroom: true, student: true }
    });

    if (!joinReq || joinReq.classroomId !== id) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    if (action === 'approve') {
      await prisma.$transaction([
        prisma.classroomJoinRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED' }
        }),
        prisma.enrollment.upsert({
          where: {
            userId_classroomId: {
              userId: joinReq.studentId,
              classroomId: joinReq.classroomId,
            }
          },
          create: {
            userId: joinReq.studentId,
            classroomId: joinReq.classroomId,
          },
          update: {}
        }),
        prisma.notification.create({
          data: {
            userId: joinReq.studentId,
            title: 'Classroom Join Request Approved',
            message: `Your request to join "${joinReq.classroom.name}" was approved!`,
            link: `/student/classroom/${joinReq.classroomId}`
          }
        })
      ]);

      await logAudit({
        userId: user.userId,
        actorRole: user.role,
        action: 'APPROVE_JOIN_REQUEST',
        details: `Approved student "${joinReq.student.name}" into "${joinReq.classroom.name}"`
      });

      return NextResponse.json({ success: true, message: 'Student join request approved.' });
    } else if (action === 'reject') {
      await prisma.$transaction([
        prisma.classroomJoinRequest.update({
          where: { id: requestId },
          data: { status: 'REJECTED' }
        }),
        prisma.notification.create({
          data: {
            userId: joinReq.studentId,
            title: 'Classroom Join Request Declined',
            message: `Your request to join "${joinReq.classroom.name}" was declined.`,
          }
        })
      ]);

      await logAudit({
        userId: user.userId,
        actorRole: user.role,
        action: 'REJECT_JOIN_REQUEST',
        details: `Rejected student "${joinReq.student.name}" from "${joinReq.classroom.name}"`
      });

      return NextResponse.json({ success: true, message: 'Student join request declined.' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[PATCH /api/classrooms/[id]/requests]', error);
    return NextResponse.json({ error: error.message || 'Failed to update request' }, { status: 500 });
  }
}
