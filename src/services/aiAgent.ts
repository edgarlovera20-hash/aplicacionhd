import { api } from '../api';

export interface CustomerData {
  nombre: string;
  deuda: number;
  diasAtraso: number;
  esNuevo: boolean;
  telefono: string;
  prioridad?: string;
}

export type EventType = 'BIENVENIDA' | 'COBRANZA_MOROSO' | 'FALLA_TECNICA' | 'RECUPERACION_CHURN' | 'ATENCION_GENERAL';

export class CRM_AI_Agent {
  private getGoalByEvent(evento: EventType): string {
    const goals: Record<EventType, string> = {
      'BIENVENIDA': "Dar la bienvenida y confirmar activación de cuenta.",
      'COBRANZA_MOROSO': "Lograr compromiso de pago y ofrecer domiciliación bancaria.",
      'FALLA_TECNICA': "Dar soporte, calmar al cliente y escalar el ticket.",
      'RECUPERACION_CHURN': "Evitar la cancelación indagando el motivo y ofreciendo opciones.",
      'ATENCION_GENERAL': "Atención al cliente general"
    };
    return goals[evento] || goals['ATENCION_GENERAL'];
  }

  public async generateResponse(cliente: CustomerData, evento: EventType, mensajeUsuario: string = ""): Promise<string> {
    const systemPrompt = `
Eres un Agente de Éxito y Cobranza de la empresa de telecomunicaciones HDreamsApp (Telmex). 
Tu objetivo actual es: ${this.getGoalByEvent(evento)}.
Datos del cliente:
- Nombre: ${cliente.nombre}
- Estado Pago: ${cliente.deuda > 0 ? 'MOROSO' : 'AL DÍA'}
- Saldo: $${cliente.deuda}
- Días de atraso: ${cliente.diasAtraso}
${cliente.prioridad ? `- Prioridad del Ticket: ${cliente.prioridad}` : ''}

REGLAS:
- Si es MOROSO: Sé empático pero persuasivo. Sugiere domiciliar el pago para evitar cortes.
- Si es NUEVO: Da una bienvenida cálida y explica los primeros pasos.
- Si quiere CANCELAR: Haz labor de recuperación ofreciendo una solución técnica o descuento.
- Si la PRIORIDAD es ALTA: Muestra extrema urgencia, discúlpate por los inconvenientes y asegura que el equipo técnico o especializado lo está atendiendo de inmediato.
- Usa emojis y lenguaje de WhatsApp (breve, directo, amigable).
- No uses formato markdown complejo, solo texto plano con emojis, ya que es para WhatsApp.`;

    const userMessage = mensajeUsuario || `Inicia conversación por evento: ${evento}`;

    try {
      const data = await api.post('/generate-response', {
        systemPrompt,
        userMessage
      });

      return data.text || "No se pudo generar una respuesta.";
    } catch (error) {
      console.error("Error en IA:", error);
      return "Hubo un error al conectar con el agente de IA (ChatGPT). Por favor, asegúrate de haber configurado la API Key.";
    }
  }
}

export const aiAgent = new CRM_AI_Agent();
