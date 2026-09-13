import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import { sanitizeNoSql } from './middlewares/sanitizeNoSql';
import { healthRouter } from './modules/health/routes';
import { authRouter } from './modules/auth/routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(sanitizeNoSql);
  app.use('/api', apiLimiter);

  // Routes de l'API
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);

  // 404 + gestion d'erreurs
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}