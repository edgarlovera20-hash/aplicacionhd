/**
 * Central Message Router.
 * Normalizes messages from all channels → persists to DB → enqueues for AI.
 */

import { aiQueue } from '../infra/queues.js';
import { eventBus, IncomingMessage } from '../infra/eventBus.js';

export type { IncomingMessage };

/** DB pool injected at startup from server.ts to avoid circular deps. */
let _pool: import('pg').Pool | null = null;

export function injectPool(pool: import('pg').Pool): void {
  _pool = pool;
}

/** Find or create a conversation row. Returns conversation id. */
async function upsertConversation(msg: IncomingMessage): Promise<string | null> {
  if (!_pool) return null;
  try {
    const res = await _pool.query<{ id: string }>(
      `INSERT INTO conversations (channel, external_id, metadata)
       VALUES ($1, $2, $3)
       ON CONFLICT (channel, external_id) DO UPDATE
         SET updated_at = NOW()
       RETURNING id`,
      [msg.channel, msg.from, JSON.stringify(msg.channelMeta || {})]
    );
    return res.rows[0]?.id || null;
  } catch {
    return null;
  }
}

/** Persist raw inbound message. */
async function saveMessage(conversationId: string, msg: IncomingMessage): Promise<void> {
  if (!_pool) return;
  try {
    await _pool.query(
      `INSERT INTO conv_messages (conversation_id, direction, content, media_url)
       VALUES ($1, 'inbound', $2, $3)`,
      [conversationId, msg.text, msg.media || null]
    );
  } catch {}
}

/**
 * Main entry point — call this from every channel engine when a message arrives.
 */
export async function routeIncoming(msg: IncomingMessage): Promise<void> {
  // 1. Upsert conversation
  const conversationId = await upsertConversation(msg);
  if (conversationId) {
    msg.conversationId = conversationId;
    await saveMessage(conversationId, msg);
  }

  // 2. Enqueue for AI processing (Phase 3 worker picks this up)
  try {
    await aiQueue.add('process', msg, { priority: 1 });
  } catch (err) {
    // Redis not yet available (dev without Redis) — degrade gracefully
    console.warn('[MessageRouter] aiQueue unavailable, processing skipped:', (err as Error).message);
  }

  // 3. Publish event for automation engine
  try {
    await eventBus.publish({ type: 'message.received', payload: msg });
  } catch {}
}
