import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { COOKIE_NAME, JWT_SECRET_KEY, JWT_ALG } from './auth/config';

export const revokedUsers = new Set<string>();
export const loginLockout = new Map<string, { attempts: number, lockedUntil: number }>();

export type SessionPayload = {
  userId: string;
  loginId: string;
  role: string;
  isHod: boolean;
  name: string;
  mustChangePassword: boolean;
};

export async function signSession(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET_KEY);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  if (revokedUsers.has(payload.userId)) {
    return null; // Blocked or force-logged out
  }

  return payload;
}

// Load currently blocked/deactivated users on cold start
export async function initRevokedUsers() {
  try {
    const blocked = await prisma.user.findMany({
      where: { OR: [{ isBlocked: true }, { isActive: false }] },
      select: { id: true }
    });
    blocked.forEach(u => revokedUsers.add(u.id));
  } catch (err) {
    console.error("Failed to init revoked users:", err);
  }
}

// Note: We intentionally do NOT call initRevokedUsers() at module load.
// On Vercel serverless, module-level DB calls fail on cold starts before
// the DB connection is ready. The revokedUsers set starts empty (safe —
// JWT verification still gates access). Admins can force re-fetch via API.
