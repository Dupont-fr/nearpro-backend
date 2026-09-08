import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log(`[db] MongoDB connecté — base "${mongoose.connection.name}"`);
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] Erreur MongoDB :', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB déconnecté');
  });

  await mongoose.connect(env.MONGODB_URI, {
    // Pool de connexions : chaque worker cluster possède le sien.
    maxPoolSize: env.MONGODB_POOL_SIZE,
    serverSelectionTimeoutMS: 10_000,
  });
}

export function getDbStatus(): { connected: boolean; name?: string } {
  return {
    connected: mongoose.connection.readyState === 1,
    name: mongoose.connection.name || undefined,
  };
}