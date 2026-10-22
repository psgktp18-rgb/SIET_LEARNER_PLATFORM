import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { canUserCreateClassroom } from '@/lib/permissions/classroom';
import { calculateClassroomHealth } from '@/lib/classroom-health';
import crypto from 'crypto';

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const section = searchParams.get('section');
    const teacherId = searchParams.get('teacherId');
    const type = searchParams.get('type'); // OFFICIAL, EXTRA
    const status = searchParams.get('status'); // active, archived
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role-based visibility
    if (user.role === 'ADMIN') {
      // Admin sees everything
    } else if (user.role === 'HOD' || user.isHod) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
      if (dbUser?.departmentId) {
        where.departmentId = dbUser.departmentId;
      }
    } else if (user.role === 'TEACHER') {
      // Classes where they are main teacher, or co/sub teacher
      where.OR = [
        { teacherId: user.userId },
        { teachers: { some: { teacherId: user.userId } } }
      ];
    } else if (user.role === 'STUDENT') {
      // Only classrooms where student is enrolled
      where.enrollments = { some: { userId: user.userId } };
    }

    // Filters
    if (departmentId && user.role === 'ADMIN') {
      where.departmentId = departmentId;
    }
    if (year) {
      where.year = year;
    }
    if (section) {
      where.section = section;
    }
    if (teacherId && (user.role === 'ADMIN' || user.isHod)) {
      where.teacherId = teacherId;
    }
    if (type) {
      where.type = type.toUpperCase();
    }
    if (status) {
      where.isArchived = status === 'archived';
    }

    // Search query
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { joinCode: { contains: search, mode: 'insensitive' } },
            { subject: { name: { contains: search, mode: 'insensitive' } } },
            { subject: { code: { contains: search, mode: 'insensitive' } } },
            { teacher: { name: { contains: search, mode: 'insensitive' } } },
          ]
        }
      ];
    }

    const [total, classrooms] = await Promise.all([
      prisma.classroom.count({ where }),
      prisma.classroom.findMany({
        where,
        include: {
          subject: true,
          department: true,
          teacher: {
            select: { id: true, name: true, email: true, loginId: true }
          },
          teachers: {
            include: {
              teacher: {
                select: { id: true, name: true, loginId: true }
              }
            }
          },
          classRep: {
            select: { id: true, name: true, loginId: true }
          },
          _count: {
            select: { enrollments: true, notes: true, assignments: true, meetings: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      })
    ]);

    // Live health score calculations
    const itemsWithHealth = await Promise.all(
      classrooms.map(async (cls) => {
        const health = await calculateClassroomHealth(cls.id);
        return {
          ...cls,
          studentCount: cls._count.enrollments,
          health,
        };
      })
    );

    return NextResponse.json({
      classrooms: itemsWithHealth,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[GET /api/classrooms]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch classrooms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    let isOfficial = body.type === 'OFFICIAL' || !body.type;

    // Check permissions
    const perm = await canUserCreateClassroom(user, isOfficial);
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.reason || 'Forbidden' }, { status: 403 });
    }

    let {
      subjectId,
      subjectName,
      subjectCode,
      departmentId,
      year,
      section,
      teacherId,
      name,
      category,
      requiresApproval,
      bannerColor,
    } = body;

    let subject: any = null;
    if (subjectId) {
      subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    }

    if (!subject && subjectName && typeof subjectName === 'string' && subjectName.trim()) {
      const trimmedName = subjectName.trim();
      const codeProvided = typeof subjectCode === 'string' && subjectCode.trim() ? subjectCode.trim().toUpperCase() : null;

      subject = await prisma.subject.findFirst({
        where: {
          OR: [
            { name: { equals: trimmedName, mode: 'insensitive' as const } },
            ...(codeProvided ? [{ code: { equals: codeProvided, mode: 'insensitive' as const } }] : [])
          ]
        }
      });

      if (!subject) {
        let targetCode = codeProvided;
        if (!targetCode) {
          const initials = trimmedName
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 5);
          const baseCode = initials.length >= 2 ? initials : trimmedName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
          targetCode = baseCode || 'CRS';
        }

        let uniqueCode = targetCode;
        let suffix = 1;
        while (await prisma.subject.findUnique({ where: { code: uniqueCode } })) {
          uniqueCode = `${targetCode}${suffix}`;
          suffix++;
        }

        subject = await prisma.subject.create({
          data: {
            name: trimmedName,
            code: uniqueCode,
          }
        });
      }
      subjectId = subject.id;
    }

    // Validation
    if (!subject) {
      return NextResponse.json({ error: 'Subject / Course is required' }, { status: 400 });
    }

    // Role-specific defaults and checks
    if (user.role === 'ADMIN') {
      if (!departmentId) return NextResponse.json({ error: 'Department is required' }, { status: 400 });
      if (!year) return NextResponse.json({ error: 'Year is required' }, { status: 400 });
      if (!section) return NextResponse.json({ error: 'Section is required' }, { status: 400 });
      if (!teacherId) return NextResponse.json({ error: 'Main teacher is required' }, { status: 400 });
    } else {
      // HOD or Teacher creating extra class
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        include: { department: true }
      });
      if (!dbUser || !dbUser.departmentId) {
        return NextResponse.json({ error: 'User department not configured' }, { status: 400 });
      }

      departmentId = dbUser.departmentId;
      teacherId = user.userId;
      year = year || 3;
      section = section || 'A';
      isOfficial = false;
    }

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Generate unique name if not provided (e.g. "CSE-3A-CS8591-CN")
    if (!name) {
      const subjectShort = subject.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 4);
      name = `${department.code}-${year}${section}-${subject.code}${subjectShort ? '-' + subjectShort : ''}`;
    }

    // Generate guaranteed unique join code
    let joinCode = generateJoinCode();
    let existingCode = await prisma.classroom.findUnique({ where: { joinCode } });
    let attempts = 0;
    while (existingCode && attempts < 10) {
      joinCode = generateJoinCode();
      existingCode = await prisma.classroom.findUnique({ where: { joinCode } });
      attempts++;
    }

    const classroom = await prisma.classroom.create({
      data: {
        name,
        subjectId,
        departmentId,
        year: parseInt(year.toString()),
        section: section.toString().toUpperCase(),
        teacherId,
        joinCode,
        type: isOfficial ? 'OFFICIAL' : 'EXTRA',
        category: !isOfficial ? category || 'REMEDIAL' : null,
        requiresApproval: !!requiresApproval,
        createdById: user.userId,
        bannerColor: bannerColor || '#004d00',
      },
      include: {
        subject: true,
        department: true,
        teacher: { select: { id: true, name: true, email: true } }
      }
    });

    await logAudit({
      userId: user.userId,
      actorRole: user.role,
      action: 'CREATE_CLASSROOM',
      details: `Created ${classroom.type} classroom "${classroom.name}" (Code: ${classroom.joinCode})`
    });

    return NextResponse.json({ success: true, classroom }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/classrooms]', error);
    return NextResponse.json({ error: error.message || 'Failed to create classroom' }, { status: 500 });
  }
}
