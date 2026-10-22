import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const joinCode = (body.joinCode || '').toString().trim().toUpperCase();

    if (!joinCode) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { joinCode },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true } },
        _count: { select: { notes: true, assignments: true } }
      }
    });

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found with this join code.' }, { status: 404 });
    }

    if (classroom.isArchived) {
      return NextResponse.json({ error: 'This classroom is archived and cannot be joined.' }, { status: 400 });
    }

    // Check if student already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_classroomId: {
          userId: user.userId,
          classroomId: classroom.id,
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'You are already enrolled in this classroom.' }, { status: 400 });
    }

    if (classroom.requiresApproval) {
      const existingReq = await prisma.classroomJoinRequest.findUnique({
        where: {
          classroomId_studentId: {
            classroomId: classroom.id,
            studentId: user.userId,
          }
        }
      });

      if (existingReq && existingReq.status === 'PENDING') {
        return NextResponse.json({
          success: true,
          pendingApproval: true,
          message: 'Your join request is already pending teacher approval.'
        });
      }

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
        },
        include: {
          classroom: {
            include: { subject: true, teacher: true }
          }
        }
      });

      // Notify teacher
      await prisma.notification.create({
        data: {
          userId: classroom.teacherId,
          title: 'Classroom Join Request',
          message: `${user.name} (${user.loginId}) requested to join "${classroom.name}".`,
          link: `/teacher/classrooms`
        }
      });

      await logAudit({
        userId: user.userId,
        actorRole: user.role,
        action: 'SUBMIT_JOIN_REQUEST',
        details: `Student submitted join request for "${classroom.name}" (Code: ${joinCode})`
      });

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        message: 'Request pending teacher approval.',
        request: joinReq
      });
    }

    // Direct enrollment
    await prisma.enrollment.create({
      data: {
        userId: user.userId,
        classroomId: classroom.id,
      }
    });

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'JOIN_CLASSROOM',
      details: `Student joined classroom "${classroom.name}" with code "${joinCode}"`
    });

    return NextResponse.json({
      success: true,
      enrolled: true,
      classroom,
      message: `Enrolled in "${classroom.name}" successfully!`
    });
  } catch (error: any) {
    console.error('[POST /api/student/join-classroom]', error);
    return NextResponse.json({ error: error.message || 'Failed to join classroom' }, { status: 500 });
  }
}
