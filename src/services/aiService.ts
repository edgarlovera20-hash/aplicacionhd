import { api } from '../api';

export const MODELS = {
  COMPLEX: 'COMPLEX',
  GENERAL: 'GENERAL',
  FAST: 'FAST',
} as const;

const SYSTEM_PROMPTS: Record<keyof typeof MODELS, string> = {
  COMPLEX: 'Eres un asistente experto de Heavenly Dreams. Analiza con detalle y precisión.',
  GENERAL: 'Eres un asistente de Heavenly Dreams. Responde de forma clara, útil y concisa.',
  FAST: 'Eres un asistente de Heavenly Dreams. Da respuestas breves y directas.',
};

export async function generateResponse(
  prompt: string,
  modelType: keyof typeof MODELS = 'GENERAL',
  _history: unknown[] = []
): Promise<string> {
  const data = await api.post('/generate-response', {
    systemPrompt: SYSTEM_PROMPTS[modelType],
    userMessage: prompt,
  });
  return data.text as string;
}
