import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth/config';
// @ts-ignore
import { after } from 'next/server';
import { logAudit } from '@/lib/audit';
import { getUser } from '@/lib/auth';

async function handleLogout() {
  const user = await getUser();
  
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);

  if (user) {
    after(async () => {
      try {
        await logAudit({
          userId: user.userId,
          action: 'LOGOUT',
          details: 'User logged out'
        });
      } catch (e) {}
    });
  }

  return user;
}

// GET: handles logout via <a href='/api/auth/logout'> links
export async function GET() {
  await handleLogout();
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const response = NextResponse.redirect(new URL('/login', baseUrl));
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

// POST: handles logout via fetch/form POST
export async function POST() {
  await handleLogout();
  return NextResponse.json({ success: true, redirectTo: '/login' }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}
