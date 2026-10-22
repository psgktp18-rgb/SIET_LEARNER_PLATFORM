import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { revokedUsers } from '@/lib/auth';
import { publish } from '@/lib/realtime';
import bcrypt from 'bcrypt';

const patchSchema = z.object({
  action: z.enum(['edit', 'block', 'unblock', 'reset-password']),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  year: z.coerce.number().min(1).max(4).optional(),
  section: z.string().optional(),
  reason: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUser();
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, ...rest } = patchSchema.parse(body);

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (action === 'edit') {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(rest.name && { name: rest.name }),
          ...(rest.email !== undefined && { email: rest.email }),
          ...(rest.phone !== undefined && { phone: rest.phone }),
          ...(rest.departmentId !== undefined && { departmentId: rest.departmentId || null }),
          ...(rest.year !== undefined && { year: rest.year }),
          ...(rest.section !== undefined && { section: rest.section }),
        },
        include: { department: true }
      });
      await logAudit({ userId: payload.userId, targetUserId: id, action: 'EDIT_USER', details: `Admin edited student ${target.loginId}` });
      return NextResponse.json({ success: true, user: updated });
    }

    if (action === 'block') {
      await prisma.user.update({
        where: { id },
        data: { isBlocked: true, blockedBy: payload.userId, blockReason: rest.reason || 'Blocked by admin' }
      });
      revokedUsers.add(id);
      publish(`user:${id}`, { type: 'force-logout', payload: { message: 'Your account has been blocked by the administrator.' } });
      await logAudit({ userId: payload.userId, targetUserId: id, action: 'BLOCK_USER', details: `Admin blocked student ${target.loginId}` });
      return NextResponse.json({ success: true });
    }

    if (action === 'unblock') {
      await prisma.user.update({
        where: { id },
        data: { isBlocked: false, blockedBy: null, blockReason: null }
      });
      revokedUsers.delete(id);
      await logAudit({ userId: payload.userId, targetUserId: id, action: 'UNBLOCK_USER', details: `Admin unblocked student ${target.loginId}` });
      return NextResponse.json({ success: true });
    }

    if (action === 'reset-password') {
      const newHash = await bcrypt.hash(target.loginId, 10);
      await prisma.user.update({
        where: { id },
        data: { passwordHash: newHash, mustChangePassword: true }
      });
      revokedUsers.add(id);
      publish(`user:${id}`, { type: 'force-logout', payload: { message: 'Your password was reset by an administrator.' } });
      await logAudit({ userId: payload.userId, targetUserId: id, action: 'RESET_PASSWORD', details: `Admin reset password for ${target.loginId}` });
      return NextResponse.json({ success: true, defaultPassword: target.loginId });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[PATCH /api/admin/students/[id]]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getUser();
  if (!payload || payload.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { department: true }
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ user });
}
