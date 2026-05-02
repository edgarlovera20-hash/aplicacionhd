/**
 * Typed event bus over Redis Pub/Sub.
 * All app events flow through channel 'hdreams:events'.
 */

import { redis, redisSub } from './redis.js';

// ── Payload types ──────────────────────────────────────────────────────────────

export interface IncomingMessage {
  channel: 'whatsapp' | 'telegram' | 'facebook' | 'sms' | 'voice';
  from: string;        // E.164 phone or chat_id
  text: string;
  media?: string;      // URL or base64
  channelMeta?: Record<string, unknown>;
  conversationId?: string;
}

export interface LeadPayload {
  id: string;
  nombre: string;
  canal: string;
  score: number;
  stage: string;
  conversationId?: string;
}

export type AppEvent =
  | { type: 'message.received';  payload: IncomingMessage }
  | { type: 'lead.created';      payload: LeadPayload }
  | { type: 'chat.assigned';     payload: { chatId: string; agentId: string } }
  | { type: 'payment.failed';    payload: { clienteId: string; monto: number } }
  | { type: 'automation.fired';  payload: { automationId: string; trigger: string } };

const CHANNEL = 'hdreams:events';

let _subscribed = false;

export const eventBus = {
  async publish(event: AppEvent): Promise<void> {
    try {
      await redis.publish(CHANNEL, JSON.stringify(event));
    } catch (err) {
      console.error('[EventBus] publish error:', (err as Error).message);
    }
  },

  subscribe(handler: (event: AppEvent) => void): void {
    if (_subscribed) return;
    _subscribed = true;
    redisSub.subscribe(CHANNEL, (err) => {
      if (err) console.error('[EventBus] subscribe error:', err.message);
    });
    redisSub.on('message', (_ch: string, msg: string) => {
      try {
        handler(JSON.parse(msg) as AppEvent);
      } catch (err) {
        console.error('[EventBus] message parse error:', err);
      }
    });
  },
};
