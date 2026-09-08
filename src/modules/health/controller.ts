import type { Request, Response } from 'express';
import { getDbStatus } from '../../config/database';
import { env } from '../../config/env';

export function getHealth(_req: Request, res: Response): void {
  const db = getDbStatus();

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'nearpro-backend',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: db.connected ? 'connected' : 'disconnected',
      databaseName: db.name ?? null,
    },
  });
}