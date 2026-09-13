import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../modules/auth/types';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Non authentifié' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Accès refusé' });
      return;
    }
    next();
  };
}