/**
 * Facebook Messenger Engine.
 * Handles webhook verification (GET) and incoming events (POST).
 * Sends replies via the Graph API.
 */

import https from 'https';

export type FacebookMessage = {
  senderId: string;    // PSID (Page-Scoped ID)
  text: string;
  messageId?: string;
  timestamp: number;
};

type IncomingListener = (msg: FacebookMessage) => void;

class FacebookEngine {
  private listeners = new Set<IncomingListener>();
  private verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'hdreams_fb_verify';
  private pageToken = process.env.FACEBOOK_PAGE_TOKEN || '';

  /** Verify webhook challenge from Facebook. Returns challenge string or null on failure. */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('[Facebook] Webhook verificado ✓');
      return challenge;
    }
    console.warn('[Facebook] Token de verificación incorrecto.');
    return null;
  }

  /** Process raw webhook body from POST /api/webhooks/facebook/events */
  processEvent(body: Record<string, unknown>): void {
    if (body.object !== 'page') return;

    const entries = (body.entry as any[]) || [];
    for (const entry of entries) {
      const messaging: any[] = entry.messaging || [];
      for (const event of messaging) {
        if (!event.message) continue;
        const msg: FacebookMessage = {
          senderId: event.sender?.id || '',
          text: event.message.text || '',
          messageId: event.message.mid,
          timestamp: event.timestamp || Date.now(),
        };
        this.listeners.forEach((cb) => { try { cb(msg); } catch {} });
      }
    }
  }

  onIncoming(cb: IncomingListener): void {
    this.listeners.add(cb);
  }

  /** Send a text reply via the Send API. */
  async sendMessage(recipientId: string, text: string): Promise<boolean> {
    if (!this.pageToken) {
      console.warn('[Facebook] FACEBOOK_PAGE_TOKEN no configurado — mensaje descartado.');
      return false;
    }
    const body = JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
    });
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'graph.facebook.com',
        path: `/v19.0/me/messages?access_token=${this.pageToken}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on('error', (err) => {
        console.error('[Facebook] sendMessage error:', err.message);
        resolve(false);
      });
      req.write(body);
      req.end();
    });
  }

  isConfigured(): boolean {
    return Boolean(this.pageToken);
  }
}

export const facebookEngine = new FacebookEngine();
