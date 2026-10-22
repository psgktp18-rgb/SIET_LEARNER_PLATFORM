import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { calculateClassroomHealth } from '@/lib/classroom-health';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};
    if (user.role === 'HOD' || user.isHod) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
      if (dbUser?.departmentId) where.departmentId = dbUser.departmentId;
    } else if (user.role === 'TEACHER') {
      where.OR = [
        { teacherId: user.userId },
        { teachers: { some: { teacherId: user.userId } } }
      ];
    }

    const classrooms = await prisma.classroom.findMany({
      where,
      include: {
        subject: true,
        department: true,
        teacher: true,
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const rows = [
      ['Name', 'Join Code', 'Subject Code', 'Subject Name', 'Department', 'Year', 'Section', 'Main Teacher', 'Type', 'Category', 'Students', 'Status', 'Health Score', 'Created At']
    ];

    for (const cls of classrooms) {
      const health = await calculateClassroomHealth(cls.id);
      rows.push([
        `"${cls.name.replace(/"/g, '""')}"`,
        cls.joinCode,
        cls.subject.code,
        `"${cls.subject.name.replace(/"/g, '""')}"`,
        cls.department.code,
        cls.year.toString(),
        cls.section,
        `"${cls.teacher.name.replace(/"/g, '""')}"`,
        cls.type,
        cls.category || 'N/A',
        cls._count.enrollments.toString(),
        cls.isArchived ? 'Archived' : 'Active',
        `${health.score}% (${health.status})`,
        cls.createdAt.toISOString().split('T')[0]
      ]);
    }

    const csvContent = rows.map(r => r.join(',')).join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="classrooms-${new Date().toISOString().split('T')[0]}.csv"`,
      }
    });
  } catch (error: any) {
    console.error('[GET /api/classrooms/export]', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
