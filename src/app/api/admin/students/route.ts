import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcrypt';

const studentSchema = z.object({
  loginId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  year: z.coerce.number().min(1).max(4),
  section: z.string().optional()
});

import { NextRequest } from 'next/server';
export async function GET(req: NextRequest) {
  const token = req.cookies.get('ll_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await getUser();
  if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 25;
  const skip = (page - 1) * limit;

  const where = {
    role: 'STUDENT',
    ...(q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { loginId: { contains: q, mode: 'insensitive' } }
      ]
    } : {})
  };

  const [total, students] = await Promise.all([
    prisma.user.count({ where: where as any }),
    prisma.user.findMany({
      where: where as any,
      skip,
      take: limit,
      include: { department: true },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return NextResponse.json({ students, total, page, limit });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ll_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await getUser();
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const data = studentSchema.parse(body);

    const existing = await prisma.user.findFirst({ where: { OR: [{ loginId: data.loginId }, { email: data.email }] } });
    if (existing) return NextResponse.json({ error: 'Register No or Email already exists' }, { status: 400 });

    const passwordHash = await bcrypt.hash(data.loginId, 10);

    const student = await prisma.user.create({
      data: {
        loginId: data.loginId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        departmentId: data.departmentId || null,
        year: data.year,
        section: data.section || 'A',
        role: 'STUDENT',
        passwordHash,
        mustChangePassword: true,
        isActive: true
      }
    });

    await logAudit({ userId: payload.userId, targetUserId: student.id, action: 'CREATE_STUDENT', details: `Created student account ${data.loginId}` });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 });
  }
}
