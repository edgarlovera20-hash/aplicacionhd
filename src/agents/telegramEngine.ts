/**
 * Telegram Multi-Bot Engine.
 * Mirrors the whatsappEngine.ts singleton pattern.
 *
 * Supports:
 *  - Multiple bots (one per TELEGRAM_BOTS entry)
 *  - Long-polling in development
 *  - Webhook mode in production (set via POST /api/webhooks/telegram/:botId/set)
 *  - Graceful shutdown
 */

import TelegramBot from 'node-telegram-bot-api';

export type TelegramBotConfig = {
  botId: string;
  token: string;
  username?: string;
};

export type TelegramMessage = {
  botId: string;
  chatId: string;
  from: string;         // username or id
  text: string;
  messageId: number;
  date: number;
  raw: TelegramBot.Message;
};

type BotEntry = {
  bot: TelegramBot;
  config: TelegramBotConfig;
  listeners: Set<(msg: TelegramMessage) => void>;
};

class TelegramEngine {
  private bots = new Map<string, BotEntry>();

  /** Start a bot in polling mode. Call this at startup for each configured token. */
  async start(config: TelegramBotConfig): Promise<void> {
    if (this.bots.has(config.botId)) {
      console.log(`[Telegram] Bot ${config.botId} ya está activo.`);
      return;
    }

    const bot = new TelegramBot(config.token, { polling: true });

    const entry: BotEntry = { bot, config, listeners: new Set() };
    this.bots.set(config.botId, entry);

    bot.on('message', (msg) => {
      const normalized: TelegramMessage = {
        botId: config.botId,
        chatId: String(msg.chat.id),
        from: msg.from?.username || String(msg.from?.id || msg.chat.id),
        text: msg.text || msg.caption || '',
        messageId: msg.message_id,
        date: msg.date,
        raw: msg,
      };
      entry.listeners.forEach((cb) => { try { cb(normalized); } catch {} });
    });

    bot.on('polling_error', (err) => {
      console.error(`[Telegram:${config.botId}] polling_error:`, err.message);
    });

    // Fetch bot info to populate username
    try {
      const me = await bot.getMe();
      config.username = me.username;
      console.log(`[Telegram] Bot @${me.username} (${config.botId}) iniciado.`);
    } catch (err) {
      console.warn(`[Telegram:${config.botId}] No se pudo obtener info del bot:`, (err as Error).message);
    }
  }

  onIncoming(botId: string, cb: (msg: TelegramMessage) => void): void {
    const entry = this.bots.get(botId);
    if (entry) entry.listeners.add(cb);
  }

  async sendMessage(botId: string, chatId: string, text: string): Promise<boolean> {
    const entry = this.bots.get(botId);
    if (!entry) { console.warn(`[Telegram] Bot ${botId} no encontrado.`); return false; }
    try {
      await entry.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      return true;
    } catch (err) {
      console.error(`[Telegram:${botId}] sendMessage error:`, (err as Error).message);
      return false;
    }
  }

  /** Process a webhook update (for production webhook mode). */
  processWebhookUpdate(botId: string, update: TelegramBot.Update): void {
    const entry = this.bots.get(botId);
    if (!entry) return;
    entry.bot.processUpdate(update);
  }

  getActiveBots(): TelegramBotConfig[] {
    return Array.from(this.bots.values()).map((e) => e.config);
  }

  async stopAll(): Promise<void> {
    for (const [id, entry] of this.bots) {
      try { await entry.bot.stopPolling(); } catch {}
      console.log(`[Telegram] Bot ${id} detenido.`);
    }
    this.bots.clear();
  }
}

export const telegramEngine = new TelegramEngine();

/** Initialize all bots from TELEGRAM_BOTS env var.
 *  Format: "token1:botId1,token2:botId2"
 */
export async function initTelegramBots(): Promise<void> {
  const raw = process.env.TELEGRAM_BOTS || '';
  if (!raw.trim()) {
    console.log('[Telegram] TELEGRAM_BOTS no configurado — motor inactivo.');
    return;
  }
  const pairs = raw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [token, botId] = pair.split(':');
    if (token && botId) {
      await telegramEngine.start({ token: token.trim(), botId: botId.trim() });
    }
  }
}
