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

    const enrollments = await prisma.enrollment.findMany({
      where: { classroomId: id },
      include: {
        user: {
          select: { id: true, name: true, loginId: true, email: true, year: true, section: true }
        }
      },
      orderBy: { user: { loginId: 'asc' } }
    });

    return NextResponse.json({ enrollments });
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
      where: { id },
      include: { department: true }
    });
    if (!classroom) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

    const access = await getClassroomAccess(user.userId, classroom.id);
    if (!access.isAdmin && (!access.isMainTeacher || classroom.type !== 'EXTRA')) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify roster for this classroom' }, { status: 403 });
    }

    const body = await req.json();
    const { mode } = body; // 'individual' | 'rule' | 'csv'

    let enrolledCount = 0;
    let errors: string[] = [];

    if (mode === 'individual') {
      const { studentIdentifier } = body; // loginId or id
      if (!studentIdentifier) {
        return NextResponse.json({ error: 'Student Reg No or Name is required' }, { status: 400 });
      }

      const student = await prisma.user.findFirst({
        where: {
          role: 'STUDENT',
          OR: [
            { id: studentIdentifier },
            { loginId: { equals: studentIdentifier, mode: 'insensitive' } },
            { name: { equals: studentIdentifier, mode: 'insensitive' } }
          ]
        }
      });

      if (!student) {
        return NextResponse.json({ error: `Student "${studentIdentifier}" not found` }, { status: 404 });
      }

      // Check existing
      const existing = await prisma.enrollment.findUnique({
        where: { userId_classroomId: { userId: student.id, classroomId: classroom.id } }
      });
      if (existing) {
        return NextResponse.json({ error: `Student "${student.name}" (${student.loginId}) is already enrolled` }, { status: 400 });
      }

      await prisma.enrollment.create({
        data: {
          userId: student.id,
          classroomId: classroom.id,
        }
      });
      enrolledCount = 1;
    } else if (mode === 'rule') {
      // "All Year 3 CSE Sec A students"
      const year = body.year !== undefined ? parseInt(body.year.toString()) : classroom.year;
      const section = body.section || classroom.section;
      const departmentId = body.departmentId || classroom.departmentId;

      const matchingStudents = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          isActive: true,
          departmentId,
          year,
          section: { equals: section, mode: 'insensitive' }
        },
        select: { id: true, loginId: true, name: true }
      });

      if (matchingStudents.length === 0) {
        return NextResponse.json({
          error: `No matching active students found for Year ${year} ${classroom.department.code} Section ${section}`
        }, { status: 400 });
      }

      // Get existing enrollments
      const existingEnrollments = await prisma.enrollment.findMany({
        where: {
          classroomId: classroom.id,
          userId: { in: matchingStudents.map(s => s.id) }
        },
        select: { userId: true }
      });
      const existingSet = new Set(existingEnrollments.map(e => e.userId));

      const toEnroll = matchingStudents.filter(s => !existingSet.has(s.id));

      if (toEnroll.length > 0) {
        await prisma.enrollment.createMany({
          data: toEnroll.map(s => ({
            userId: s.id,
            classroomId: classroom.id,
          })),
          skipDuplicates: true,
        });
      }
      enrolledCount = toEnroll.length;
    } else if (mode === 'csv') {
      const { regNumbers } = body; // Array of strings
      if (!Array.isArray(regNumbers) || regNumbers.length === 0) {
        return NextResponse.json({ error: 'No Reg Numbers provided in CSV' }, { status: 400 });
      }

      const cleanRegs = regNumbers
        .map(r => String(r).trim())
        .filter(r => r.length > 0);

      const foundStudents = await prisma.user.findMany({
        where: {
          role: 'STUDENT',
          loginId: { in: cleanRegs, mode: 'insensitive' }
        },
        select: { id: true, loginId: true, name: true }
      });

      const foundSet = new Set(foundStudents.map(s => s.loginId.toUpperCase()));
      for (const reg of cleanRegs) {
        if (!foundSet.has(reg.toUpperCase())) {
          errors.push(`Reg No "${reg}" not found in database.`);
        }
      }

      if (foundStudents.length > 0) {
        const existing = await prisma.enrollment.findMany({
          where: {
            classroomId: classroom.id,
            userId: { in: foundStudents.map(s => s.id) }
          },
          select: { userId: true }
        });
        const existingIds = new Set(existing.map(e => e.userId));
        const newStudents = foundStudents.filter(s => !existingIds.has(s.id));

        if (newStudents.length > 0) {
          await prisma.enrollment.createMany({
            data: newStudents.map(s => ({
              userId: s.id,
              classroomId: classroom.id,
            })),
            skipDuplicates: true,
          });
        }
        enrolledCount = newStudents.length;
      }
    } else {
      return NextResponse.json({ error: 'Invalid enrollment mode' }, { status: 400 });
    }

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'ENROLL_STUDENTS',
      details: `Enrolled ${enrolledCount} students in classroom "${classroom.name}" via mode "${mode}".`
    });

    return NextResponse.json({
      success: true,
      enrolledCount,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error('[POST /api/classrooms/[id]/enrollments]', error);
    return NextResponse.json({ error: error.message || 'Failed to enroll students' }, { status: 500 });
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
    if (!access.isAdmin && (!access.isMainTeacher || classroom.type !== 'EXTRA')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    await prisma.enrollment.deleteMany({
      where: { classroomId: classroom.id, userId: studentId }
    });

    // If student was class representative, clear that too
    if (classroom.classRepId === studentId) {
      await prisma.classroom.update({
        where: { id: classroom.id },
        data: { classRepId: null }
      });
    }

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'REMOVE_STUDENT_ENROLLMENT',
      details: `Removed student ID "${studentId}" from classroom "${classroom.name}"`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/classrooms/[id]/enrollments]', error);
    return NextResponse.json({ error: error.message || 'Failed to remove enrollment' }, { status: 500 });
  }
}
