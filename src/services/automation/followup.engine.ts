import { getSession } from "../whatsapp/sessionManager";

export async function scheduleFollowUp(phone: string, message: string, delayMs: number, sessionId: string) {
  setTimeout(async () => {
    const client = getSession(sessionId);
    if (!client) return;

    try {
      await client.sendMessage(phone, message);
      console.log("Follow-up sent to", phone);
    } catch (err) {
      console.error("Follow-up error", err);
    }
  }, delayMs);
}
