/**
 * Decision Engine — maps classified intent → action.
 * Returns a typed Decision that the worker then executes.
 */

import type { ConversationContext } from './contextBuilder.js';

export type Decision =
  | { action: 'respond';          message: string; aiGenerated: true }
  | { action: 'escalate';         reason: string;  agentRole?: string }
  | { action: 'create_lead';      leadData: LeadDraft }
  | { action: 'trigger_workflow'; workflowId: string; params: Record<string, unknown> }
  | { action: 'noop' };

export interface LeadDraft {
  nombre: string;
  telefono: string;
  email?: string;
  canal: string;
  score: number;
  source: string;
  conversationId?: string;
  notes?: string;
}

let _aiGenerate: ((prompt: string) => Promise<string>) | null = null;

export function injectAI(fn: (prompt: string) => Promise<string>): void {
  _aiGenerate = fn;
}

const SYSTEM_PROMPT = `Eres el asistente virtual de Heavenly Dreams, distribuidor autorizado Telmex/Infinitum en CDMX.
Responde en español mexicano, de forma profesional y amable.
Si el usuario quiere información de planes, menciona que un asesor lo contactará pronto.
Si tiene una queja, muestra empatía y ofrece escalar con un supervisor.
Mantén las respuestas breves (máximo 3 oraciones).`;

async function generateAIResponse(ctx: ConversationContext): Promise<string> {
  if (!_aiGenerate) return '¡Hola! Gracias por contactarnos. Un asesor te atenderá en breve.';

  const history = ctx.lastMessages
    .slice(-5)
    .map((m) => `${m.direction === 'inbound' ? 'Cliente' : 'Asesor'}: ${m.content}`)
    .join('\n');

  const prompt = `${SYSTEM_PROMPT}\n\nHistorial reciente:\n${history}\n\nCliente: ${ctx.incoming.text}\n\nAsesor:`;
  try {
    return (await _aiGenerate(prompt)).trim();
  } catch {
    return '¡Hola! Gracias por contactarnos. Un asesor te atenderá en breve.';
  }
}

function buildLeadDraft(ctx: ConversationContext): LeadDraft {
  const profile = ctx.clientProfile as any;
  return {
    nombre: profile?.nombre || `Lead ${ctx.incoming.channel}`,
    telefono: ctx.incoming.from,
    email: profile?.email || undefined,
    canal: ctx.incoming.channel,
    score: 30, // base score for reclutamiento intent
    source: `${ctx.incoming.channel}_bot`,
    conversationId: ctx.conversationId || undefined,
    notes: ctx.incoming.text.slice(0, 300),
  };
}

export async function decide(ctx: ConversationContext): Promise<Decision> {
  const { intent, confidence } = ctx;

  // Low confidence → escalate to a human agent
  if (confidence < 0.55) {
    return { action: 'escalate', reason: 'baja_confianza', agentRole: 'SUPERVISOR' };
  }

  switch (intent) {
    case 'reclutamiento':
      return { action: 'create_lead', leadData: buildLeadDraft(ctx) };

    case 'queja':
      return { action: 'escalate', reason: 'queja', agentRole: 'SUPERVISOR' };

    case 'pago': {
      const msg = await generateAIResponse(ctx);
      return { action: 'respond', message: msg, aiGenerated: true };
    }

    case 'consulta_servicio':
    case 'soporte_tecnico':
    case 'otro':
    default: {
      const msg = await generateAIResponse(ctx);
      return { action: 'respond', message: msg, aiGenerated: true };
    }
  }
}
