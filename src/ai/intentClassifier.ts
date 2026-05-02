/**
 * Intent Classifier — classifies inbound messages for the AI decision engine.
 * Uses the injected aiGenerate function (Claude → Gemini → OpenAI fallback chain).
 */

export type IntentResult = {
  intent: string;
  confidence: number;
};

export type IntentType =
  | 'consulta_servicio'
  | 'queja'
  | 'pago'
  | 'reclutamiento'
  | 'soporte_tecnico'
  | 'otro';

const INTENT_PROMPT = `Eres un clasificador de intenciones para un CRM de telecomunicaciones (Telmex/Infinitum).
Clasifica el mensaje del usuario en EXACTAMENTE uno de los siguientes intents:
- consulta_servicio: preguntas sobre planes, precios, cobertura, internet
- queja: inconformidades, problemas, reclamaciones
- pago: pagos, facturas, domiciliación, adeudos
- reclutamiento: interés en trabajar, ser asesor, vendedor, unirse al equipo
- soporte_tecnico: problemas técnicos, configuración, fallas de servicio
- otro: cualquier cosa que no encaje en las categorías anteriores

Responde ÚNICAMENTE con JSON válido en el formato: {"intent": "<intent>", "confidence": <0.0-1.0>}
No incluyas texto adicional, solo el JSON.`;

let _aiGenerate: ((prompt: string) => Promise<string>) | null = null;

export function injectAI(fn: (prompt: string) => Promise<string>): void {
  _aiGenerate = fn;
}

export async function classifyIntent(text: string): Promise<IntentResult> {
  const defaultResult: IntentResult = { intent: 'otro', confidence: 0.5 };

  if (!_aiGenerate) {
    console.warn('[IntentClassifier] aiGenerate no inyectado — usando default.');
    return defaultResult;
  }

  const prompt = `${INTENT_PROMPT}\n\nMensaje del usuario: "${text.slice(0, 500)}"`;

  try {
    const raw = await _aiGenerate(prompt);
    // Extract JSON even if wrapped in markdown
    const match = raw.match(/\{[^}]+\}/);
    if (!match) return defaultResult;
    const parsed = JSON.parse(match[0]) as { intent: string; confidence: number };
    return {
      intent: parsed.intent || 'otro',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    };
  } catch (err) {
    console.warn('[IntentClassifier] Error clasificando intent:', (err as Error).message);
    return defaultResult;
  }
}
