import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import mongoose from 'mongoose';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';

function startWorker(): void {
  void (async () => {
    try {
      await connectDatabase();
    } catch (err) {
      console.error('[server] Connexion MongoDB impossible :', err);
      process.exit(1);
    }

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      console.log(
        `[server] API (pid ${process.pid}) — http://localhost:${env.PORT} (${env.NODE_ENV})`,
      );
    });

    const shutdown = (signal: string): void => {
      console.log(`[server] ${signal} reçu, arrêt du worker ${process.pid}...`);
      server.close(() => {
        void mongoose.disconnect().then(() => process.exit(0));
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })();
}

function startPrimary(): void {
  const workers = env.CLUSTER_WORKERS > 0 ? env.CLUSTER_WORKERS : availableParallelism();
  const startedAt = new Map<number, number>();
  let consecutiveFastExits = 0;

  console.log(`[cluster] primary ${process.pid} — forking ${workers} worker(s)`);

  const forkWorker = (): void => {
    const worker = cluster.fork();
    const pid = worker.process?.pid;
    if (pid !== undefined) startedAt.set(pid, Date.now());
  };

  for (let i = 0; i < workers; i++) forkWorker();

  cluster.on('exit', (worker, code, signal) => {
    const reason = signal ?? code;
    const pid = worker.process?.pid;

    const start = pid !== undefined ? startedAt.get(pid) : undefined;
    if (pid !== undefined) startedAt.delete(pid);

    const isFastExit = start !== undefined && Date.now() - start < 15_000;
    consecutiveFastExits = isFastExit ? consecutiveFastExits + 1 : 0;

    if (consecutiveFastExits >= env.CLUSTER_MAX_FAST_EXITS) {
      console.error(
        `[cluster] worker ${worker.process.pid} arrêté (${reason}) — trop de redémarrages rapides, respawn désactivé`,
      );
      return;
    }

    console.warn(`[cluster] worker ${worker.process.pid} arrêté (${reason}), respawn...`);
    forkWorker();
  });

  const shutdown = (signal: string): void => {
    console.log(`[cluster] ${signal} reçu, arrêt des workers...`);
    for (const id in cluster.workers) {
      cluster.workers[id]?.kill('SIGTERM');
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (env.CLUSTER_ENABLED && cluster.isPrimary) {
  startPrimary();
} else {
  startWorker();
}