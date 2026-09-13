export const ACCESS_COOKIE = 'accessToken';
export const REFRESH_COOKIE = 'refreshToken';

const ACCESS_MAX_AGE = 15 * 60 * 1000;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function accessCookieOptions() {
  return cookieOptions(ACCESS_MAX_AGE);
}

export function refreshCookieOptions() {
  return cookieOptions(REFRESH_MAX_AGE);
}

/**
 * Parse minimaliste de l'en-tête `Cookie` (sans dépendance cookie-parser) :
 * « a=1; b=2 » → { a: '1', b: '2' }
 */
export function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && value) out[name] = decodeURIComponent(value);
  }
  return out;
}