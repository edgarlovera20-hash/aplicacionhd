/**
 * Redis singleton — ioredis client shared across the app.
 * BullMQ requires maxRetriesPerRequest: null.
 * lazyConnect: true → connection happens on first command, not at import time.
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

function makeClient(name: string): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  client.on('connect', () => console.log(`[Redis:${name}] conectado`));
  client.on('error', (err) => console.error(`[Redis:${name}] error:`, err.message));
  client.on('reconnecting', () => console.log(`[Redis:${name}] reconectando...`));
  return client;
}

/** Shared pub/publish client — also used by BullMQ queues. */
export const redis = makeClient('main');

/** Dedicated subscriber connection (subscribe() is exclusive). */
export const redisSub = makeClient('sub');

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    await redisSub.connect();
    console.log('[Redis] Ambas conexiones listas.');
  } catch (err) {
    console.warn('[Redis] No se pudo conectar al iniciar — se reintentará automáticamente:', (err as Error).message);
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    await redisSub.quit();
    console.log('[Redis] Conexiones cerradas.');
  } catch {}
}
