import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { compare } from '@/lib/bcrypt-limit';
import { signSession, loginLockout } from '@/lib/auth';
import { COOKIE_NAME, getCookieOptions } from '@/lib/auth/config';
import { getHomeRoute } from '@/lib/routes';
import { isStudentRolloutEnabled } from '@/lib/rollout';
import { cookies } from 'next/headers';
// @ts-ignore
import { after } from 'next/server';
import { logAudit } from '@/lib/audit'; // We assume this exists and doesn't throw

const schema = z.object({
  identifier: z.string().min(1).transform(s => s.trim()),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = schema.parse(body);

    const now = Date.now();
    const lockout = loginLockout.get(identifier);
    if (lockout && lockout.attempts >= 5 && now < lockout.lockedUntil) {
       const waitMins = Math.ceil((lockout.lockedUntil - now) / 60000);
       return NextResponse.json({ error: `Too many attempts. Try again in ${waitMins} minute(s).` }, { status: 429 });
    }

    // Use findFirst with insensitive mode so IDs like T101/t101/HOD-CSE all work on PostgreSQL
    const user = await prisma.user.findFirst({
      where: { loginId: { equals: identifier, mode: 'insensitive' } },
      select: { 
        id: true, loginId: true, role: true, isHod: true, name: true, passwordHash: true, 
        isActive: true, isBlocked: true, year: true, departmentId: true, mustChangePassword: true 
      }
    });

    const isMatch = user ? await compare(password, user.passwordHash) : await compare(password, '$2b$10$dummyHashToPreventTimingAttacks12345678901234567');

    if (!user || !isMatch) {
       const attempts = (lockout?.attempts || 0) + 1;
       loginLockout.set(identifier, {
         attempts,
         lockedUntil: attempts >= 5 ? now + 5 * 60 * 1000 : 0
       });
       return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    loginLockout.delete(identifier); // Reset on success

    if (!user.isActive) {
      return NextResponse.json({ error: 'Your account is deactivated. Contact the admin.' }, { status: 403 });
    }
    if (user.isBlocked) {
      return NextResponse.json({ error: 'Your account has been blocked. Contact your teacher or admin.' }, { status: 403 });
    }

    // Check rollout year for students
    if (user.role === 'STUDENT' && user.year) {
      const settings = await prisma.systemSetting.findFirst({ select: { enabledYears: true } });
      const isAllowed = isStudentRolloutEnabled(settings?.enabledYears, user.year, user.departmentId);
      if (!isAllowed) {
         return NextResponse.json({ error: 'Lecture Lens is not yet open for your year or department.' }, { status: 403 });
      }
    }

    const token = await signSession({
      userId: user.id,
      loginId: user.loginId,
      role: user.role,
      isHod: user.isHod,
      name: user.name,
      mustChangePassword: user.mustChangePassword
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, getCookieOptions(req.url, req.headers));

    const redirectTo = getHomeRoute(user);

    after(async () => {
       try {
         await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
         await logAudit({
           userId: user.id,
           action: 'LOGIN',
           details: 'User logged in successfully'
         });
         // Award point and streak logic can go here
       } catch (err) {
         console.error('After-login tasks failed:', err);
       }
    });

    return NextResponse.json({ redirectTo });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    return NextResponse.json({ error: err.stack || err.message || 'Internal server error' }, { status: 500 });
  }
}
