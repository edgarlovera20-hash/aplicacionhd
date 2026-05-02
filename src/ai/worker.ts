/**
 * AI Processing Worker — BullMQ Worker for the 'ai-processing' queue.
 * Concurrency: 5. Processes messages, classifies intent, decides action, executes.
 *
 * Injected at startup via initAIWorker().
 */

import { Worker } from 'bullmq';
import { redis } from '../infra/redis.js';
import type { IncomingMessage } from '../infra/eventBus.js';
import { classifyIntent, injectAI as injectAIClassifier } from './intentClassifier.js';
import { buildContext, injectPool as injectPoolContext } from './contextBuilder.js';
import { decide, injectAI as injectAIDecision } from './decisionEngine.js';
import type { Pool } from 'pg';
import type { Decision, LeadDraft } from './decisionEngine.js';

let _pool: Pool | null = null;
let _sendToChannel: ((channel: string, from: string, text: string) => Promise<boolean>) | null = null;
let _addNotification: ((n: unknown) => void) | null = null;
let _worker: Worker | null = null;

/** Inject dependencies before calling initAIWorker(). */
export function injectWorkerDeps(opts: {
  pool: Pool;
  aiGenerate: (prompt: string) => Promise<string>;
  sendToChannel: (channel: string, from: string, text: string) => Promise<boolean>;
  addNotification: (n: unknown) => void;
}): void {
  _pool = opts.pool;
  injectAIClassifier(opts.aiGenerate);
  injectAIDecision(opts.aiGenerate);
  injectPoolContext(opts.pool);
  _sendToChannel = opts.sendToChannel;
  _addNotification = opts.addNotification;
}

async function executeDecision(decision: Decision, incoming: IncomingMessage): Promise<void> {
  switch (decision.action) {
    case 'respond': {
      if (_sendToChannel) {
        await _sendToChannel(incoming.channel, incoming.from, decision.message);
      }
      // Persist outbound message
      if (_pool && incoming.conversationId) {
        await _pool.query(
          `INSERT INTO conv_messages (conversation_id, direction, content, ai_generated) VALUES ($1,'outbound',$2,true)`,
          [incoming.conversationId, decision.message]
        ).catch(() => {});
      }
      break;
    }

    case 'create_lead': {
      if (_pool) {
        const ld: LeadDraft = decision.leadData;
        await _pool.query(
          `INSERT INTO leads (nombre,telefono,email,canal,score,source,conversation_id,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT DO NOTHING`,
          [ld.nombre, ld.telefono, ld.email || null, ld.canal, ld.score,
           ld.source, ld.conversationId || null, ld.notes || null]
        ).catch(() => {});
      }
      if (_addNotification) {
        _addNotification({
          id: `lead_${Date.now()}`,
          titulo: 'Nuevo Lead',
          mensaje: `Lead capturado de ${incoming.channel}: ${incoming.from}`,
          tipo: 'lead',
          leida: false,
          para_roles: ['GERENTE','RECLUTADORA'],
          createdAt: new Date().toISOString(),
        });
      }
      break;
    }

    case 'escalate': {
      if (_addNotification) {
        _addNotification({
          id: `escalate_${Date.now()}`,
          titulo: 'Escalada requerida',
          mensaje: `Mensaje de ${incoming.channel}:${incoming.from} requiere atención (${decision.reason})`,
          tipo: 'alerta',
          leida: false,
          para_roles: decision.agentRole ? [decision.agentRole] : ['SUPERVISOR'],
          createdAt: new Date().toISOString(),
        });
      }
      // Update conversation status
      if (_pool && incoming.conversationId) {
        await _pool.query(
          `UPDATE conversations SET status='assigned', updated_at=NOW() WHERE id=$1`,
          [incoming.conversationId]
        ).catch(() => {});
      }
      break;
    }

    case 'noop':
    default:
      break;
  }
}

export function initAIWorker(): Worker {
  if (_worker) return _worker;

  _worker = new Worker(
    'ai-processing',
    async (job) => {
      const msg = job.data as IncomingMessage;

      try {
        // 1. Classify intent
        const { intent, confidence } = await classifyIntent(msg.text);

        // 2. Build context
        const context = await buildContext(msg, intent, confidence);

        // 3. Decide action
        const decision = await decide(context);

        // 4. Execute
        await executeDecision(decision, msg);

        return { intent, confidence, action: decision.action };
      } catch (err: any) {
        console.error('[AIWorker] job error:', err.message);
        throw err; // BullMQ will retry per backoff config
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  _worker.on('completed', (job, result) => {
    console.log(`[AIWorker] job ${job.id} completado — intent:${result?.intent} action:${result?.action}`);
  });

  _worker.on('failed', (job, err) => {
    console.error(`[AIWorker] job ${job?.id} fallido:`, err.message);
  });

  console.log('[AIWorker] Iniciado con concurrencia 5.');
  return _worker;
}

export async function closeAIWorker(): Promise<void> {
  if (_worker) { await _worker.close(); _worker = null; }
}
