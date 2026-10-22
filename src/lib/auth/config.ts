export const COOKIE_NAME = 'll_token';

const jwtSecret = process.env.JWT_SECRET;

// During Next.js build (static generation), NEXT_PHASE is 'phase-production-build'.
// We must NOT throw during build — only at actual server runtime.
// At runtime, JWT_SECRET must be set; at build time we use a fallback so pages can render.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const isDev = process.env.NODE_ENV !== 'production';

if (!isBuildPhase && !isDev && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('CRITICAL ERROR: JWT_SECRET environment variable is missing or less than 32 characters. Set it in your Vercel environment variables.');
}

export const JWT_SECRET_KEY = new TextEncoder().encode(
  jwtSecret || 'fallback_secret_must_be_32_chars_long_minimum'
);
export const JWT_ALG = 'HS256';

export function getCookieOptions(reqUrl: string, headers: Headers) {
  const isHttps = headers.get('x-forwarded-proto') === 'https' || reqUrl.startsWith('https://');
  
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 8 * 60 * 60 // 8 hours
  };
}
