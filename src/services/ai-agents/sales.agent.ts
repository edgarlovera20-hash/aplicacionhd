import { generateResponse } from "../ai.service";

export async function salesAgent(message: string, context: any) {
  const prompt = `Eres un asesor de ventas experto.\nCliente: ${message}\nContexto: ${JSON.stringify(context)}`;

  return generateResponse(prompt);
}