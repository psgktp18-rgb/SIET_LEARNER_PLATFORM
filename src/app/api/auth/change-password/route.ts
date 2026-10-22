import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hash } from '@/lib/bcrypt-limit';
import { getUser, signSession } from '@/lib/auth';
import { COOKIE_NAME, getCookieOptions } from '@/lib/auth/config';
import { getHomeRoute } from '@/lib/routes';
import { cookies } from 'next/headers';

const schema = z.object({
  newPassword: z.string().min(8)
});

export async function POST(req: Request) {
  try {
    const payload = await getUser();
    if (!payload) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { newPassword } = schema.parse(body);

    const passwordHash = await hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash, mustChangePassword: false }
    });

    // Sign new session
    const token = await signSession({
      userId: updated.id,
      loginId: updated.loginId,
      role: updated.role,
      isHod: updated.isHod,
      name: updated.name,
      mustChangePassword: false
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, getCookieOptions(req.url, req.headers));

    const redirectTo = getHomeRoute(updated);

    return NextResponse.json({ success: true, redirectTo });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
