/**
 * Analytics Collector — records time-series events in Redis sorted sets.
 * Pattern: ZINCRBY metrics:<metric>:<YYYY-MM-DD> 1 "hour:<HH>"
 *           ZINCRBY metrics:<metric>:<YYYY-MM>   1 "day:<DD>"
 */

import { redis } from '../infra/redis.js';

type MetricName =
  | 'messages_received'
  | 'messages_sent'
  | 'leads_created'
  | 'conversations_opened'
  | 'automations_fired';

export async function recordMetric(metric: MetricName, value = 1): Promise<void> {
  try {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);      // YYYY-MM-DD
    const ym  = now.toISOString().slice(0, 7);       // YYYY-MM
    const hh  = String(now.getUTCHours()).padStart(2, '0');
    const dd  = String(now.getUTCDate()).padStart(2, '0');

    await Promise.all([
      redis.zincrby(`metrics:${metric}:${ymd}`, value, `hour:${hh}`),
      redis.zincrby(`metrics:${metric}:${ym}`,  value, `day:${dd}`),
    ]);

    // Set TTL: hourly keys expire in 7 days, monthly in 90 days
    await redis.expire(`metrics:${metric}:${ymd}`, 7 * 86400);
    await redis.expire(`metrics:${metric}:${ym}`,  90 * 86400);
  } catch {
    // Redis unavailable — degrade gracefully
  }
}

/** Query hourly breakdown for a specific day. */
export async function getHourlyMetric(
  metric: MetricName,
  date: string  // YYYY-MM-DD
): Promise<Array<{ hour: string; count: number }>> {
  try {
    const raw = await redis.zrange(`metrics:${metric}:${date}`, 0, -1, 'WITHSCORES');
    const result: Array<{ hour: string; count: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ hour: raw[i].replace('hour:', ''), count: parseFloat(raw[i + 1]) });
    }
    return result.sort((a, b) => a.hour.localeCompare(b.hour));
  } catch {
    return [];
  }
}

/** Query daily breakdown for a specific month. */
export async function getDailyMetric(
  metric: MetricName,
  month: string  // YYYY-MM
): Promise<Array<{ day: string; count: number }>> {
  try {
    const raw = await redis.zrange(`metrics:${metric}:${month}`, 0, -1, 'WITHSCORES');
    const result: Array<{ day: string; count: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ day: raw[i].replace('day:', ''), count: parseFloat(raw[i + 1]) });
    }
    return result.sort((a, b) => a.day.localeCompare(b.day));
  } catch {
    return [];
  }
}
