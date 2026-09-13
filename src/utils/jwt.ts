import jsonwebtoken from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import { env } from '../config/env';
import type { AuthUserPayload } from '../modules/auth/types';

export function signAccessToken(payload: AuthUserPayload): string {
  return jsonwebtoken.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_SECONDS,
  });
}

export function signRefreshToken(userId: string): string {
  return jsonwebtoken.sign(
    { sub: userId, jti: randomUUID() },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_SECONDS,
    },
  );
}

export function verifyAccessToken(token: string): AuthUserPayload {
  return jsonwebtoken.verify(token, env.JWT_SECRET) as AuthUserPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  const payload = jsonwebtoken.verify(token, env.JWT_REFRESH_SECRET) as { sub?: unknown };
  if (typeof payload?.sub !== 'string') {
    throw new Error('Token invalide');
  }
  return { sub: payload.sub };
}

/** Empreinte SHA-256 : le refresh token n'est jamais stocké en clair. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function toBearerToken(raw: string): string {
  return raw.replace(/^Bearer\s+/i, '');
}