/**
 * BullMQ queue definitions.
 * Import these queues anywhere you need to enqueue work.
 * Workers are defined in their respective engine files.
 */

import { Queue } from 'bullmq';
import { redis } from './redis.js';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail:    { count: 200 },
};

/** All inbound messages from every channel. */
export const messageQueue = new Queue('messages', {
  connection: redis,
  defaultJobOptions,
});

/** AI intent classification + decision engine. */
export const aiQueue = new Queue('ai-processing', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 1 },
});

/** Outbound notifications (SSE, Twilio SMS, WA, Telegram). */
export const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions,
});

/** Heavy report generation (PDF, XLSX). */
export const reportQueue = new Queue('reports', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, attempts: 1 },
});

/** Automation rule actions. */
export const automationQueue = new Queue('automations', {
  connection: redis,
  defaultJobOptions,
});

export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    messageQueue.close(),
    aiQueue.close(),
    notificationQueue.close(),
    reportQueue.close(),
    automationQueue.close(),
  ]);
}
