import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where: any = {};
    if (user.role === 'ADMIN') {
      // Admin sees all
    } else if (user.role === 'HOD' || user.isHod) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
      if (dbUser?.departmentId) {
        where.departmentId = dbUser.departmentId;
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requests = await prisma.classroomRequest.findMany({
      where,
      include: {
        department: true,
        requester: { select: { id: true, name: true, loginId: true, role: true } },
        proposedTeacher: { select: { id: true, name: true, loginId: true, email: true } },
        classroom: {
          include: {
            subject: true,
            teacher: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('[GET /api/classrooms/requests]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'HOD' && !user.isHod && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only HOD or Admin can submit classroom requests' }, { status: 403 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
    if (!dbUser || !dbUser.departmentId) {
      return NextResponse.json({ error: 'User department not configured' }, { status: 400 });
    }

    const body = await req.json();
    const { type, classroomId, subjectId, year, section, proposedTeacherId, name, reason } = body;

    if (type !== 'CREATE_OFFICIAL' && type !== 'CHANGE_TEACHER') {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    if (type === 'CREATE_OFFICIAL') {
      if (!subjectId || !year || !section || !proposedTeacherId) {
        return NextResponse.json({ error: 'Subject, Year, Section, and Proposed Teacher are required' }, { status: 400 });
      }
    } else if (type === 'CHANGE_TEACHER') {
      if (!classroomId || !proposedTeacherId) {
        return NextResponse.json({ error: 'Classroom and Proposed Teacher are required' }, { status: 400 });
      }
    }

    const request = await prisma.classroomRequest.create({
      data: {
        type,
        departmentId: dbUser.departmentId,
        requesterId: user.userId,
        classroomId: classroomId || null,
        subjectId: subjectId || null,
        year: year ? parseInt(year.toString()) : null,
        section: section ? section.toString().toUpperCase() : null,
        proposedTeacherId: proposedTeacherId || null,
        name: name || null,
        reason: reason || null,
        status: 'PENDING',
      },
      include: {
        department: true,
        requester: { select: { id: true, name: true } },
        proposedTeacher: { select: { id: true, name: true } }
      }
    });

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'SUBMIT_CLASSROOM_REQUEST',
      details: `HOD submitted ${type} request (ID: ${request.id})`
    });

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/classrooms/requests]', error);
    return NextResponse.json({ error: error.message || 'Failed to submit request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can approve or reject requests' }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action, adminComment } = body; // action: 'approve' | 'reject'

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    const reqItem = await prisma.classroomRequest.findUnique({
      where: { id: requestId },
      include: {
        department: true,
        requester: true,
        proposedTeacher: true,
        classroom: true,
      }
    });

    if (!reqItem) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (action === 'approve') {
      if (reqItem.type === 'CREATE_OFFICIAL') {
        const subject = await prisma.subject.findUnique({ where: { id: reqItem.subjectId! } });
        const subjectShort = subject ? subject.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4) : '';
        const name = reqItem.name || `${reqItem.department.code}-${reqItem.year}${reqItem.section}-${subject?.code || ''}${subjectShort ? '-' + subjectShort : ''}`;

        let joinCode = generateJoinCode();
        let exists = await prisma.classroom.findUnique({ where: { joinCode } });
        while (exists) {
          joinCode = generateJoinCode();
          exists = await prisma.classroom.findUnique({ where: { joinCode } });
        }

        const classroom = await prisma.classroom.create({
          data: {
            name,
            subjectId: reqItem.subjectId!,
            departmentId: reqItem.departmentId,
            year: reqItem.year!,
            section: reqItem.section!,
            teacherId: reqItem.proposedTeacherId!,
            joinCode,
            type: 'OFFICIAL',
            createdById: user.userId,
          }
        });

        await prisma.classroomRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            adminComment: adminComment || 'Approved by Admin',
            classroomId: classroom.id,
          }
        });

        await prisma.notification.create({
          data: {
            userId: reqItem.requesterId,
            title: 'Classroom Request Approved',
            message: `Your request for official classroom "${name}" has been approved!`,
            link: `/hod/classrooms`
          }
        });

        await logAudit({
          userId: user.userId,
          actorRole: user.role,
          action: 'APPROVE_CLASSROOM_REQUEST',
          details: `Admin approved request ${requestId}: created classroom "${name}"`
        });

        return NextResponse.json({ success: true, message: 'Classroom created and request approved.', classroom });
      } else if (reqItem.type === 'CHANGE_TEACHER') {
        await prisma.classroom.update({
          where: { id: reqItem.classroomId! },
          data: { teacherId: reqItem.proposedTeacherId! }
        });

        await prisma.classroomRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            adminComment: adminComment || 'Approved by Admin',
          }
        });

        await prisma.notification.create({
          data: {
            userId: reqItem.requesterId,
            title: 'Teacher Change Request Approved',
            message: `Your request to assign "${reqItem.proposedTeacher?.name}" as teacher for "${reqItem.classroom?.name}" was approved!`,
            link: `/hod/classrooms`
          }
        });

        await logAudit({
          userId: user.userId,
          actorRole: user.role,
          action: 'APPROVE_TEACHER_CHANGE_REQUEST',
          details: `Admin approved teacher change for classroom "${reqItem.classroom?.name}" to "${reqItem.proposedTeacher?.name}"`
        });

        return NextResponse.json({ success: true, message: 'Teacher changed and request approved.' });
      }
    } else if (action === 'reject') {
      await prisma.classroomRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          adminComment: adminComment || 'Request declined by Admin',
        }
      });

      await prisma.notification.create({
        data: {
          userId: reqItem.requesterId,
          title: 'Classroom Request Declined',
          message: `Your request for ${reqItem.type === 'CREATE_OFFICIAL' ? 'new classroom' : 'teacher change'} was declined: ${adminComment || 'No reason provided'}.`,
        }
      });

      await logAudit({
        userId: user.userId,
        actorRole: user.role,
        action: 'REJECT_CLASSROOM_REQUEST',
        details: `Admin rejected request ${requestId}: ${adminComment || 'No reason'}`
      });

      return NextResponse.json({ success: true, message: 'Request rejected.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/classrooms/requests]', error);
    return NextResponse.json({ error: error.message || 'Failed to update request' }, { status: 500 });
  }
}
