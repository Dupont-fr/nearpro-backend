import type { Request, Response } from 'express';
import { env } from '../../config/env';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  parseCookies,
  refreshCookieOptions,
} from '../../utils/cookies';
import { authService } from './service';
import { loginSchema, registerSchema } from './schema';
import type { TokenPair } from './types';

function attachAuthCookies(res: Response, tokens: TokenPair): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { httpOnly: true, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, path: '/', secure: env.NODE_ENV === 'production' });
}

export async function handleRegister(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const { user, tokens } = await authService.register(input);
  attachAuthCookies(res, tokens);
  res.status(201).json({ success: true, data: { user } });
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const { user, tokens } = await authService.login(input);
  attachAuthCookies(res, tokens);
  res.status(200).json({ success: true, data: { user } });
}

export async function handleRefresh(req: Request, res: Response): Promise<void> {
  const refreshToken = parseCookies(req.headers.cookie)[REFRESH_COOKIE];
  if (!refreshToken) {
    res.status(401).json({ success: false, message: 'Session expirée, veuillez vous reconnecter' });
    return;
  }
  const { user, tokens } = await authService.refresh(refreshToken);
  attachAuthCookies(res, tokens);
  res.status(200).json({ success: true, data: { user } });
}

export async function handleLogout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.user?.id);
  clearAuthCookies(res);
  res.status(200).json({ success: true, data: null });
}

export async function handleMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Non authentifié' });
    return;
  }
  const user = await authService.me(req.user.id);
  res.status(200).json({ success: true, data: { user } });
}