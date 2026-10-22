import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { getClassroomAccess } from '@/lib/permissions/classroom';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const classroom = await prisma.classroom.findUnique({ where: { id } });
    if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

    const access = await getClassroomAccess(user.userId, classroom.id);
    if (!access.isAdmin && !access.isHod) {
      return NextResponse.json({ error: 'Forbidden: Only Admin or HOD can assign co-teachers and substitutes' }, { status: 403 });
    }

    const body = await req.json();
    const { teacherId, role, endDate } = body; // role: 'CO_TEACHER' | 'SUBSTITUTE'

    if (!teacherId || !role) {
      return NextResponse.json({ error: 'Teacher ID and Role are required' }, { status: 400 });
    }

    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.role !== 'TEACHER') {
      return NextResponse.json({ error: 'User is not a teacher' }, { status: 400 });
    }

    if (classroom.teacherId === teacherId) {
      return NextResponse.json({ error: 'Teacher is already the main teacher of this classroom' }, { status: 400 });
    }

    const staffRecord = await prisma.classroomTeacher.upsert({
      where: {
        classroomId_teacherId_role: {
          classroomId: classroom.id,
          teacherId,
          role,
        }
      },
      create: {
        classroomId: classroom.id,
        teacherId,
        role,
        endDate: role === 'SUBSTITUTE' && endDate ? new Date(endDate) : null,
      },
      update: {
        endDate: role === 'SUBSTITUTE' && endDate ? new Date(endDate) : null,
      },
      include: {
        teacher: { select: { id: true, name: true, loginId: true, email: true } }
      }
    });

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'ASSIGN_CLASSROOM_STAFF',
      details: `Assigned ${role} (${teacher.name}) to classroom "${classroom.name}"${endDate ? ` until ${endDate}` : ''}`
    });

    return NextResponse.json({ success: true, staff: staffRecord });
  } catch (error: any) {
    console.error('[POST /api/classrooms/[id]/staff]', error);
    return NextResponse.json({ error: error.message || 'Failed to assign staff' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const classroom = await prisma.classroom.findUnique({ where: { id } });
    if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

    const access = await getClassroomAccess(user.userId, classroom.id);
    if (!access.isAdmin && !access.isHod) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const teacherId = searchParams.get('teacherId');
    const role = searchParams.get('role');

    if (staffId) {
      await prisma.classroomTeacher.delete({ where: { id: staffId } });
    } else if (teacherId && role) {
      await prisma.classroomTeacher.deleteMany({
        where: { classroomId: classroom.id, teacherId, role }
      });
    } else {
      return NextResponse.json({ error: 'Missing staff identifier' }, { status: 400 });
    }

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'REMOVE_CLASSROOM_STAFF',
      details: `Removed staff from classroom "${classroom.name}"`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/classrooms/[id]/staff]', error);
    return NextResponse.json({ error: error.message || 'Failed to remove staff' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const classroom = await prisma.classroom.findUnique({ where: { id } });
    if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

    const access = await getClassroomAccess(user.userId, classroom.id);
    if (!access.isAdmin && !access.isMainTeacher && !access.isHod) {
      return NextResponse.json({ error: 'Forbidden: Only Admin, Main Teacher, or HOD can designate Class Representative' }, { status: 403 });
    }

    const body = await req.json();
    const { classRepId } = body; // null to remove, or userId

    if (classRepId) {
      // Verify student is enrolled in this classroom
      const enrolled = await prisma.enrollment.findUnique({
        where: { userId_classroomId: { userId: classRepId, classroomId: classroom.id } },
        include: { user: true }
      });
      if (!enrolled) {
        return NextResponse.json({ error: 'Class Representative must be an enrolled student in this classroom' }, { status: 400 });
      }

      await prisma.classroom.update({
        where: { id: classroom.id },
        data: { classRepId }
      });

      await logAudit({
        userId: user.userId,
        actorRole: user.role,
        action: 'DESIGNATE_CLASS_REP',
        details: `Designated "${enrolled.user.name}" (${enrolled.user.loginId}) as Class Representative for "${classroom.name}"`
      });

      return NextResponse.json({ success: true, classRep: enrolled.user });
    } else {
      await prisma.classroom.update({
        where: { id: classroom.id },
        data: { classRepId: null }
      });

      await logAudit({
        userId: user.userId,
        actorRole: user.role,
        action: 'REMOVE_CLASS_REP',
        details: `Removed Class Representative for "${classroom.name}"`
      });

      return NextResponse.json({ success: true, classRep: null });
    }
  } catch (error: any) {
    console.error('[PATCH /api/classrooms/[id]/staff]', error);
    return NextResponse.json({ error: error.message || 'Failed to update Class Representative' }, { status: 500 });
  }
}
