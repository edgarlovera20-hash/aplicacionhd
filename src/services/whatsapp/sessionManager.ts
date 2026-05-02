import { Client, LocalAuth } from 'whatsapp-web.js';

const sessions: Record<string, any> = {};

export async function createWhatsAppSession(id: string) {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: id })
  });

  client.on('qr', (qr) => {
    console.log(`QR for ${id}:`, qr);
  });

  client.on('ready', () => {
    console.log(`WhatsApp ${id} ready`);
  });

  await client.initialize();
  sessions[id] = client;

  return client;
}

export function getSession(id: string) {
  return sessions[id];
}
