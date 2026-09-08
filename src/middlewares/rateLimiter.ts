import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Limite générique des requêtes API par IP.
 * En cluster, chaque worker possède son propre compteur — en multi-instance,
 * passer à un store partagé (Redis) si nécessaire (voir docs/scale.md).
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
  },
});