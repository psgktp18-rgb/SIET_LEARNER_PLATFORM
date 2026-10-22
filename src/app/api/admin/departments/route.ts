import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const deptSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(10)
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ll_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await getUser();
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const data = deptSchema.parse(body);

    const existing = await prisma.department.findUnique({ where: { code: data.code } });
    if (existing) return NextResponse.json({ error: 'Department code already exists' }, { status: 400 });

    const department = await prisma.department.create({
      data: {
        name: data.name,
        code: data.code
      }
    });

    await logAudit({ userId: payload.userId, targetUserId: payload.userId, action: 'CREATE_DEPARTMENT', details: `Created department ${data.code}` });

    return NextResponse.json({ success: true, department }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 });
  }
}
