import { salesAgent } from "../ai-agents/sales.agent";
import { saveConversation } from "../crm.service";

export async function handleIncomingMessage(message: string, phone: string) {
  const ai = await salesAgent(message, { phone });

  await saveConversation(phone, message, ai.text);

  return ai.text;
}
