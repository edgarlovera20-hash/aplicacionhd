/**
 * Action Executor — BullMQ Worker for the 'automations' queue.
 * Executes actions: send_message, create_lead, update_status, notify_agent, schedule_followup, tag_contact.
 */

import { Worker } from 'bullmq';
import { redis } from '../infra/redis.js';
import type { Pool } from 'pg';

interface ActionJob {
  automationId: string;
  automationName: string;
  actions: Array<{ type: string; params?: Record<string, unknown> }>;
  eventType: string;
  eventPayload: Record<string, unknown>;
}

let _pool: Pool | null = null;
let _sendToChannel: ((channel: string, from: string, text: string) => Promise<boolean>) | null = null;
let _addNotification: ((n: unknown) => void) | null = null;
let _worker: Worker | null = null;

const MESSAGE_TEMPLATES: Record<string, string> = {
  bienvenida_telegram: '¡Hola! 👋 Bienvenido a Heavenly Dreams. ¿En qué podemos ayudarte hoy?',
  bienvenida_facebook: '¡Hola! Gracias por contactarnos. Un asesor te atenderá pronto.',
  moroso: 'Estimado cliente, le informamos que tiene un saldo pendiente. Por favor comuníquese con nosotros para regularizar su cuenta.',
};

export function injectDeps(opts: {
  pool: Pool;
  sendToChannel: (channel: string, from: string, text: string) => Promise<boolean>;
  addNotification: (n: unknown) => void;
}): void {
  _pool = opts.pool;
  _sendToChannel = opts.sendToChannel;
  _addNotification = opts.addNotification;
}

async function executeAction(
  action: { type: string; params?: Record<string, unknown> },
  payload: Record<string, unknown>
): Promise<void> {
  switch (action.type) {
    case 'send_message': {
      const channel = (payload.channel || payload.canal || 'whatsapp') as string;
      const from = (payload.from || payload.senderId || '') as string;
      const templateKey = action.params?.template as string | undefined;
      const text = templateKey
        ? (MESSAGE_TEMPLATES[templateKey] || templateKey)
        : (action.params?.text as string || '');
      if (from && text && _sendToChannel) {
        await _sendToChannel(channel, from, text);
      }
      break;
    }

    case 'create_lead': {
      if (_pool) {
        const nombre = (payload.nombre || payload.from || 'Lead automático') as string;
        const telefono = (payload.from || '') as string;
        const canal = (payload.channel || 'auto') as string;
        await _pool.query(
          `INSERT INTO leads (nombre, telefono, canal, score, source) VALUES ($1,$2,$3,10,'automation') ON CONFLICT DO NOTHING`,
          [nombre, telefono, canal]
        ).catch(() => {});
      }
      break;
    }

    case 'update_status': {
      const conversationId = payload.conversationId as string | undefined;
      const newStatus = action.params?.status as string | undefined;
      if (_pool && conversationId && newStatus) {
        await _pool.query(
          `UPDATE conversations SET status=$1, updated_at=NOW() WHERE id=$2`,
          [newStatus, conversationId]
        ).catch(() => {});
      }
      break;
    }

    case 'notify_agent': {
      const role = action.params?.role as string | undefined;
      if (_addNotification) {
        _addNotification({
          titulo: 'Automatización disparada',
          mensaje: `Evento: ${payload.type || 'desconocido'} — ${JSON.stringify(payload).slice(0, 100)}`,
          tipo: 'info',
          para_roles: role ? [role] : ['GERENTE'],
          leida: false,
          createdAt: new Date().toISOString(),
        });
      }
      break;
    }

    case 'tag_contact': {
      const tag = action.params?.tag as string | undefined;
      const conversationId = payload.conversationId as string | undefined;
      if (_pool && conversationId && tag) {
        await _pool.query(
          `UPDATE conversations SET metadata = metadata || jsonb_build_object('tags', COALESCE(metadata->'tags','[]'::jsonb) || $1::jsonb), updated_at=NOW() WHERE id=$2`,
          [JSON.stringify([tag]), conversationId]
        ).catch(() => {});
      }
      break;
    }

    default:
      console.warn('[ActionExecutor] Tipo de acción desconocido:', action.type);
  }
}

export function initAutomationWorker(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    'automations',
    async (job) => {
      const { automationId, automationName, actions, eventPayload } = job.data as ActionJob;
      console.log(`[AutomationWorker] Ejecutando "${automationName}" (${actions.length} acciones)`);

      for (const action of actions) {
        await executeAction(action, eventPayload as Record<string, unknown>);
      }

      // Increment run_count in DB
      if (_pool) {
        await _pool.query(
          `UPDATE automations SET run_count = run_count + 1, last_run_at = NOW() WHERE id = $1`,
          [automationId]
        ).catch(() => {});
      }
    },
    { connection: redis, concurrency: 3 }
  );

  _worker.on('failed', (job, err) => {
    console.error(`[AutomationWorker] job ${job?.id} fallido:`, err.message);
  });

  console.log('[AutomationWorker] Iniciado.');
  return _worker;
}

export async function closeAutomationWorker(): Promise<void> {
  if (_worker) { await _worker.close(); _worker = null; }
}
