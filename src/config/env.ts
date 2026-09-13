import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI est requise (voir backend/.env.example)'),
  JWT_SECRET: z.string().min(1).default('dev-jwt-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev-jwt-refresh-secret-change-me'),
  JWT_ACCESS_EXPIRES_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  JWT_REFRESH_EXPIRES_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Montée en charge (voir docs/scale.md)
  MONGODB_POOL_SIZE: z.coerce.number().int().positive().default(50),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),

  // Cluster (production) : CLUSTER_ENABLED=true active le multi-cœur
  CLUSTER_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  CLUSTER_WORKERS: z.coerce.number().int().nonnegative().default(0),
  CLUSTER_MAX_FAST_EXITS: z.coerce.number().int().positive().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[config] Variables d\'environnement invalides :');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;