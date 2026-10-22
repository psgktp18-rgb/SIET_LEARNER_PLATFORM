export const COOKIE_NAME = 'll_token';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE !== 'phase-development-server') {
    // Only strictly throw if we are actually starting the server
    throw new Error('CRITICAL ERROR: JWT_SECRET environment variable is missing or less than 32 characters long.');
  }
}

export const JWT_SECRET_KEY = new TextEncoder().encode(jwtSecret || 'fallback_secret_must_be_32_chars_long_minimum');
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
