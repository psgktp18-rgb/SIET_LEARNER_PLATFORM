import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getClassroomAccess } from '@/lib/permissions/classroom';
import { calculateClassroomHealth } from '@/lib/classroom-health';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id },
      include: {
        subject: true,
        department: true,
        teacher: {
          select: { id: true, name: true, email: true, loginId: true, phone: true }
        },
        teachers: {
          include: {
            teacher: {
              select: { id: true, name: true, email: true, loginId: true }
            }
          }
        },
        classRep: {
          select: { id: true, name: true, loginId: true, email: true }
        },
        enrollments: {
          include: {
            user: {
              select: { id: true, name: true, loginId: true, email: true, year: true, section: true }
            }
          },
          orderBy: { user: { loginId: 'asc' } }
        },
        joinRequests: {
          where: { status: 'PENDING' },
          include: {
            student: {
              select: { id: true, name: true, loginId: true, email: true }
            }
          }
        },
        _count: {
          select: { notes: true, assignments: true, meetings: true, tests: true, doubtTickets: true }
        }
      }
    });

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    const access = await getClassroomAccess(user.userId, classroom.id);

    // Students only see classrooms they are enrolled in
    if (user.role === 'STUDENT' && !access.isEnrolledStudent && !access.isClassRep) {
      return NextResponse.json({ error: 'Access denied: You are not enrolled in this classroom' }, { status: 403 });
    }

    const health = await calculateClassroomHealth(classroom.id);

    return NextResponse.json({
      classroom: {
        ...classroom,
        studentCount: classroom.enrollments.length,
        health,
      },
      access,
    });
  } catch (error: any) {
    console.error('[GET /api/classrooms/[id]]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch classroom' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id }
    });

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    const access = await getClassroomAccess(user.userId, classroom.id);
    const body = await req.json();

    const data: any = {};

    // 1. Regenerate Join Code
    if (body.action === 'regenerate-code') {
      if (!access.isAdmin && !access.isMainTeacher) {
        return NextResponse.json({ error: 'Forbidden: Cannot regenerate join code' }, { status: 403 });
      }
      let newCode = generateJoinCode();
      let exists = await prisma.classroom.findUnique({ where: { joinCode: newCode } });
      while (exists) {
        newCode = generateJoinCode();
        exists = await prisma.classroom.findUnique({ where: { joinCode: newCode } });
      }
      data.joinCode = newCode;
    }

    // 2. Archive / Unarchive
    if (typeof body.isArchived === 'boolean') {
      if (!access.isAdmin && (!access.isMainTeacher || classroom.type !== 'EXTRA')) {
        return NextResponse.json({ error: 'Forbidden: You cannot archive this classroom' }, { status: 403 });
      }
      data.isArchived = body.isArchived;
    }

    // 3. Assign or Change Main Teacher (Admin only)
    if (body.teacherId) {
      if (!access.isAdmin) {
        return NextResponse.json({ error: 'Only Administrators can reassign main teachers directly' }, { status: 403 });
      }
      const newTeacher = await prisma.user.findUnique({ where: { id: body.teacherId } });
      if (!newTeacher || newTeacher.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Invalid teacher ID' }, { status: 400 });
      }
      data.teacherId = body.teacherId;
    }

    // 4. Update name or banner
    if (body.name) {
      if (!access.isAdmin && !access.isMainTeacher) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      data.name = body.name;
    }
    if (body.bannerColor) {
      data.bannerColor = body.bannerColor;
    }

    // 5. Toggle requiresApproval
    if (typeof body.requiresApproval === 'boolean') {
      if (!access.isAdmin && !access.isMainTeacher) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      data.requiresApproval = body.requiresApproval;
    }

    const updated = await prisma.classroom.update({
      where: { id: classroom.id },
      data,
      include: {
        subject: true,
        department: true,
        teacher: { select: { id: true, name: true, email: true } }
      }
    });

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'UPDATE_CLASSROOM',
      details: `Updated classroom "${classroom.name}" (ID: ${classroom.id}) with: ${Object.keys(data).join(', ')}`
    });

    return NextResponse.json({ success: true, classroom: updated });
  } catch (error: any) {
    console.error('[PATCH /api/classrooms/[id]]', error);
    return NextResponse.json({ error: error.message || 'Failed to update classroom' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can delete classrooms' }, { status: 403 });
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id }
    });

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Typed confirmation check
    const body = await req.json().catch(() => ({}));
    if (body.confirmName !== classroom.name) {
      return NextResponse.json({
        error: `Confirmation mismatch. You must type exactly "${classroom.name}" to delete.`
      }, { status: 400 });
    }

    await prisma.classroom.delete({
      where: { id: classroom.id }
    });

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'DELETE_CLASSROOM',
      details: `Deleted classroom "${classroom.name}" (ID: ${classroom.id})`
    });

    return NextResponse.json({ success: true, message: `Classroom "${classroom.name}" deleted successfully.` });
  } catch (error: any) {
    console.error('[DELETE /api/classrooms/[id]]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete classroom' }, { status: 500 });
  }
}
