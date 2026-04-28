/**
 * twilioService.ts
 * Servicio frontend para interactuar con los endpoints Twilio del servidor.
 * Todas las llamadas reales se hacen desde el backend (las credenciales nunca salen al cliente).
 */

const BASE = "/api/twilio";

export interface TwilioStatus {
  configured: boolean;
  hasSms: boolean;
  hasWhatsApp: boolean;
  fromNumber: string | null;
}

export interface TwilioResult {
  sid: string;
  status: string;
  to?: string;
}

/** Verifica si Twilio está configurado en el servidor */
export async function getTwilioStatus(): Promise<TwilioStatus> {
  const r = await fetch(`${BASE}/status`);
  if (!r.ok) throw new Error("Error consultando estado Twilio");
  return r.json();
}

/** Envía SMS al número indicado */
export async function sendSMS(to: string, message: string): Promise<TwilioResult> {
  const r = await fetch(`${BASE}/sms`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ to, message }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Error enviando SMS");
  return data;
}

/** Envía mensaje de WhatsApp al número indicado */
export async function sendWhatsApp(to: string, message: string): Promise<TwilioResult> {
  const r = await fetch(`${BASE}/whatsapp`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ to, message }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Error enviando WhatsApp");
  return data;
}

/** Inicia una llamada de voz saliente */
export async function makeCall(to: string, twiml?: string): Promise<TwilioResult> {
  const r = await fetch(`${BASE}/call`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ to, twiml }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Error iniciando llamada");
  return data;
}

/** Formatea número mexicano para Twilio (+52XXXXXXXXXX) */
export function formatMxNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("52") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  return `+${digits}`;
}

/** Plantillas de mensajes predefinidas */
export const MESSAGE_TEMPLATES = {
  confirmacionContrato: (clientName: string, folio: string, megas: string, price: string) =>
    `Hola ${clientName}, te confirmamos que tu contrato Infinitum (${megas} Megas) ha sido registrado exitosamente. Folio: ${folio}. Renta mensual: $${price}. El tecnico se comunicara contigo en 3-5 dias habiles. Heavenly Dreams.`,

  recordatorioCita: (clientName: string, date: string, time: string) =>
    `Hola ${clientName}, te recordamos tu cita de instalacion Telmex el ${date} a las ${time}. Por favor ten a la mano un ID oficial. Heavenly Dreams.`,

  bienvenida: (clientName: string, megas: string) =>
    `Bienvenido a Infinitum, ${clientName}! Tu servicio de ${megas} Megas ya esta activo. Para soporte llama al 800 123 2222 o visita telmex.com. Gracias por elegir Heavenly Dreams.`,

  validacionLlamada: (clientName: string, agentName: string) =>
    `Hola ${clientName}, soy ${agentName} de Heavenly Dreams. Necesitamos validar tu contrato Infinitum. Te llamaremos en unos momentos desde nuestro numero oficial. Gracias.`,

  seguimientoCandidato: (name: string, date: string, time: string, place: string) =>
    `Hola ${name}, te confirmamos tu entrevista el ${date} a las ${time} en ${place}. Lleva 2 copias de tu ID y CV. Heavenly Dreams Reclutamiento.`,
};
