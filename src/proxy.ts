import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, JWT_SECRET_KEY } from './lib/auth/config';
import { getHomeRoute } from './lib/routes';
import { jwtVerify } from 'jose';
const publicPaths = ['/login', '/forgot-password', '/api/auth/login', '/api/health', '/logo.png', '/favicon.ico'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (publicPaths.some(p => pathname.startsWith(p)) || pathname.startsWith('/_next') || pathname.match(/\.(png|jpg|jpeg|svg|ico)$/)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let payload: any = null;

  if (token) {
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, JWT_SECRET_KEY);
      payload = verifiedPayload;
    } catch (error) {
      payload = null;
    }
  }

  // Handle unauthenticated state
  if (!payload) {
    if (pathname.startsWith('/api/')) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL('/login', request.url));
    if (token) res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Check for proxy loops (3 hops limit) - prevent infinite redirects
  const hops = parseInt(request.headers.get('x-redirect-hops') || '0', 10);
  if (hops > 3) {
    return NextResponse.json({ error: 'Too many redirects' }, { status: 500 });
  }

  if (payload.mustChangePassword && !pathname.startsWith('/change-password') && !pathname.startsWith('/api/auth/logout')) {
    const res = NextResponse.redirect(new URL('/change-password', request.url));
    res.headers.set('x-redirect-hops', (hops + 1).toString());
    return res;
  }

  // Handle authenticated root redirect or visiting /login when logged in
  if (pathname === '/' || pathname === '/login') {
    if (pathname === '/login' && payload.mustChangePassword) return NextResponse.next();
    const dest = getHomeRoute(payload);
    if (pathname !== dest) {
      const res = NextResponse.redirect(new URL(dest, request.url));
      res.headers.set('x-redirect-hops', (hops + 1).toString());
      return res;
    }
  }

  // Role-based protection
  const isAdminPath = pathname.startsWith('/admin');
  const isTeacherPath = pathname.startsWith('/teacher');
  const isStudentPath = pathname.startsWith('/student');
  const isHodPath = pathname.startsWith('/hod');

  if (isAdminPath && payload.role !== 'ADMIN') return NextResponse.redirect(new URL('/login', request.url));
  if (isTeacherPath && payload.role !== 'TEACHER' && payload.role !== 'ADMIN') return NextResponse.redirect(new URL('/login', request.url));
  if (isStudentPath && payload.role !== 'STUDENT') return NextResponse.redirect(new URL('/login', request.url));
  if (isHodPath && !payload.isHod && payload.role !== 'ADMIN') return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
