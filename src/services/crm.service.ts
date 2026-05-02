import { query } from "./db";

export async function saveConversation(phone: string, message: string, response: string) {
  return query(
    "INSERT INTO conversaciones (lead_id, mensaje, respuesta) VALUES ((SELECT id FROM leads WHERE telefono=$1 LIMIT 1), $2, $3)",
    [phone, message, response]
  );
}

export async function createLead(phone: string) {
  return query(
    "INSERT INTO leads (telefono, estado) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [phone, "nuevo"]
  );
}
