import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ACCESS_COOKIE, parseCookies } from '../utils/cookies';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const token = bearer ?? parseCookies(req.headers.cookie)[ACCESS_COOKIE];

  if (!token) {
    res.status(401).json({ success: false, message: 'Non authentifié' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Session expirée, veuillez vous reconnecter' });
  }
}