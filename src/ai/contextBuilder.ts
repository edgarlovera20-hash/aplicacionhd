/**
 * Context Builder — assembles conversation context for the AI decision engine.
 * Fetches last N messages + client profile from the DB.
 */

import type { Pool } from 'pg';
import type { IncomingMessage } from '../infra/eventBus.js';

export interface ConversationContext {
  incoming: IncomingMessage;
  conversationId: string | null;
  intent: string;
  confidence: number;
  lastMessages: Array<{ direction: string; content: string; created_at: string }>;
  clientProfile: Record<string, unknown> | null;
  channel: string;
}

let _pool: Pool | null = null;

export function injectPool(pool: Pool): void {
  _pool = pool;
}

export async function buildContext(
  incoming: IncomingMessage,
  intent: string,
  confidence: number
): Promise<ConversationContext> {
  const ctx: ConversationContext = {
    incoming,
    conversationId: incoming.conversationId || null,
    intent,
    confidence,
    lastMessages: [],
    clientProfile: null,
    channel: incoming.channel,
  };

  if (!_pool || !incoming.conversationId) return ctx;

  try {
    // Fetch last 10 messages
    const msgs = await _pool.query(
      `SELECT direction, content, created_at
       FROM conv_messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [incoming.conversationId]
    );
    ctx.lastMessages = msgs.rows.reverse();

    // Try to find a matching client profile by phone number
    const phone = incoming.from.replace(/\D/g, '');
    if (phone.length >= 10) {
      const client = await _pool.query(
        `SELECT id, nombre, telefono, email, status
         FROM clientes_seguimiento
         WHERE REGEXP_REPLACE(telefono, '\\D', '', 'g') LIKE $1
         LIMIT 1`,
        [`%${phone.slice(-10)}`]
      );
      if (client.rows[0]) ctx.clientProfile = client.rows[0];
    }
  } catch (err) {
    console.warn('[ContextBuilder] Error fetching context:', (err as Error).message);
  }

  return ctx;
}
