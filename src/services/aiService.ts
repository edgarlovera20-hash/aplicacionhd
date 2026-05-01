import { api } from '../api';

export const MODELS = {
  COMPLEX: 'COMPLEX',
  GENERAL: 'GENERAL',
  FAST:    'FAST',
} as const;

export type ModelType = keyof typeof MODELS;

export interface ChatMessage { role: 'user' | 'model'; text: string; }

const SYSTEM_PROMPTS: Record<ModelType, string> = {
  COMPLEX: 'Eres un asistente experto de Heavenly Dreams (distribuidor Telmex/Infinitum). Analiza con detalle y precisión, apoya en ventas, seguimiento de clientes, reclutamiento y gestión interna.',
  GENERAL: 'Eres el asistente inteligente de Heavenly Dreams. Responde de forma clara, útil y concisa. Conoces el negocio: ventas Telmex, seguimiento de clientes, cobranza y reclutamiento.',
  FAST:    'Eres el asistente de Heavenly Dreams. Da respuestas breves y directas al punto.',
};

/**
 * Genera una respuesta de IA incluyendo el historial de conversación como contexto.
 * El servidor ya inyecta la base de conocimiento y la memoria del agente.
 */
export async function generateResponse(
  prompt: string,
  modelType: ModelType = 'GENERAL',
  history: ChatMessage[] = []
): Promise<string> {
  const data = await api.post('/generate-response', {
    systemPrompt: SYSTEM_PROMPTS[modelType],
    userMessage:  prompt,
    history:      history.slice(-10), // últimas 10 interacciones como contexto
  });
  return data.text as string;
}

/** Guarda una interacción en la memoria del agente de chat principal */
export async function saveInteraction(userText: string, aiText: string): Promise<void> {
  try {
    await api.post('/agents/CHAT_PRINCIPAL/memory', {
      content:  `Usuario: ${userText}\nAsistente: ${aiText}`,
      kind:     'interaction',
      metadata: { ts: new Date().toISOString() },
    });
  } catch { /* no bloquear si falla */ }
}

/** Carga el contexto aprendido del agente de chat principal */
export async function loadChatContext(): Promise<string> {
  try {
    const data = await api.get('/agents/CHAT_PRINCIPAL/memory?limit=20');
    return data.summary || '';
  } catch { return ''; }
}

/** Solicita auto-compresión cuando hay muchas interacciones acumuladas */
export async function maybeAutoCompress(): Promise<void> {
  try {
    await api.post('/agents/CHAT_PRINCIPAL/memory/compress', {});
  } catch { /* silencioso */ }
}
