/**
 * WhatsApp Multi-Session Engine — QR-based authentication.
 *
 * Strategy:
 *  - Try to load `whatsapp-web.js` at runtime via dynamic import.
 *  - If installed, spin up a real Client per agent with LocalAuth (persistent session in `.wwebjs_auth/<agentId>`).
 *  - If not installed, run in STUB mode: simulate QR/connection so the UI is fully functional for development.
 *
 * To enable real WhatsApp:
 *   npm install whatsapp-web.js qrcode
 *
 * Future drop-in replacement: baileys (`@whiskeysockets/baileys`) with the same SessionState contract.
 */

import path from 'path';
import fs from 'fs';

export type SessionStatus =
  | 'desconectado'    // no client running
  | 'esperando_qr'    // client booting, no QR yet
  | 'qr_listo'        // QR available, waiting for scan
  | 'autenticando'    // QR scanned, finalizing auth
  | 'conectado'       // ready to send/receive
  | 'error';          // crashed

export type SessionState = {
  agentId: string;
  status: SessionStatus;
  qr?: string;           // raw QR string (frontend renders to image)
  phoneNumber?: string;  // E.164 once connected
  lastEvent?: string;
  lastEventAt?: string;
  error?: string;
};

type EngineMode = 'real' | 'stub';

class WhatsAppEngine {
  private sessions = new Map<string, SessionState>();
  private clients = new Map<string, any>(); // whatsapp-web.js Client instances
  private mode: EngineMode = 'stub';
  private wwebLib: any = null;
  private initialized = false;
  private authDir = path.join(process.cwd(), '.wwebjs_auth');

  private listeners = new Map<string, Set<(msg: any) => void>>();

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      // @ts-ignore — optional dep, may not be installed
      const lib = await import('whatsapp-web.js').catch(() => null);
      if (lib && (lib as any).Client) {
        this.wwebLib = lib;
        this.mode = 'real';
        if (!fs.existsSync(this.authDir)) fs.mkdirSync(this.authDir, { recursive: true });
        console.log('[WA Engine] whatsapp-web.js detectado — modo REAL activado.');
      } else {
        console.log('[WA Engine] whatsapp-web.js no instalado — modo STUB (QR simulado). Instala con: npm install whatsapp-web.js qrcode');
      }
    } catch (err) {
      console.warn('[WA Engine] Error inicializando, fallback a stub:', err);
    }
  }

  getMode(): EngineMode { return this.mode; }

  getStatus(agentId: string): SessionState {
    return this.sessions.get(agentId) || { agentId, status: 'desconectado' };
  }

  getAllStatuses(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  onIncoming(agentId: string, cb: (msg: any) => void) {
    if (!this.listeners.has(agentId)) this.listeners.set(agentId, new Set());
    this.listeners.get(agentId)!.add(cb);
  }

  private setState(agentId: string, patch: Partial<SessionState>) {
    const cur = this.sessions.get(agentId) || { agentId, status: 'desconectado' as SessionStatus };
    const next = { ...cur, ...patch, lastEventAt: new Date().toISOString() };
    this.sessions.set(agentId, next);
  }

  async start(agentId: string): Promise<SessionState> {
    await this.init();

    if (this.clients.has(agentId)) {
      return this.getStatus(agentId);
    }

    this.setState(agentId, { status: 'esperando_qr', lastEvent: 'starting' });

    if (this.mode === 'real' && this.wwebLib) {
      try {
        const { Client, LocalAuth } = this.wwebLib;
        const client = new Client({
          authStrategy: new LocalAuth({ clientId: agentId, dataPath: this.authDir }),
          puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
        });

        client.on('qr', (qr: string) => {
          this.setState(agentId, { status: 'qr_listo', qr, lastEvent: 'qr' });
        });
        client.on('authenticated', () => {
          this.setState(agentId, { status: 'autenticando', lastEvent: 'authenticated' });
        });
        client.on('ready', () => {
          const phone = client.info?.wid?.user || undefined;
          this.setState(agentId, { status: 'conectado', qr: undefined, phoneNumber: phone, lastEvent: 'ready' });
        });
        client.on('disconnected', (reason: string) => {
          this.setState(agentId, { status: 'desconectado', qr: undefined, lastEvent: `disconnected:${reason}` });
          this.clients.delete(agentId);
        });
        client.on('auth_failure', (msg: string) => {
          this.setState(agentId, { status: 'error', error: msg, lastEvent: 'auth_failure' });
        });
        client.on('message', (msg: any) => {
          const cbs = this.listeners.get(agentId);
          if (cbs) cbs.forEach(cb => { try { cb(msg); } catch {} });
        });

        this.clients.set(agentId, client);
        client.initialize().catch((e: any) => {
          this.setState(agentId, { status: 'error', error: String(e), lastEvent: 'init_error' });
        });
      } catch (err: any) {
        this.setState(agentId, { status: 'error', error: String(err?.message || err) });
      }
    } else {
      // STUB mode: simulate QR after 1.5s, auto-connect after 30s if not externally "connected"
      setTimeout(() => {
        if (this.sessions.get(agentId)?.status === 'esperando_qr') {
          const fakeQr = `STUB-QR-${agentId}-${Date.now()}`;
          this.setState(agentId, { status: 'qr_listo', qr: fakeQr, lastEvent: 'stub_qr' });
        }
      }, 1500);
    }

    return this.getStatus(agentId);
  }

  /** Stub-only: simulate a successful scan from the UI. */
  stubMarkConnected(agentId: string, fakeNumber = '52' + Math.floor(1000000000 + Math.random() * 8999999999)) {
    if (this.mode !== 'stub') return false;
    this.setState(agentId, { status: 'conectado', qr: undefined, phoneNumber: fakeNumber, lastEvent: 'stub_connected' });
    return true;
  }

  async sendText(agentId: string, to: string, text: string): Promise<{ ok: boolean; error?: string }> {
    const state = this.getStatus(agentId);
    if (state.status !== 'conectado') return { ok: false, error: 'Agente no conectado' };
    if (this.mode === 'real') {
      const client = this.clients.get(agentId);
      if (!client) return { ok: false, error: 'Cliente no inicializado' };
      try {
        const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`;
        await client.sendMessage(chatId, text);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: String(err?.message || err) };
      }
    }
    // Stub: just log
    console.log(`[WA STUB] ${agentId} -> ${to}: ${text}`);
    return { ok: true };
  }

  async disconnect(agentId: string): Promise<void> {
    const client = this.clients.get(agentId);
    if (client) {
      try { await client.logout(); } catch {}
      try { await client.destroy(); } catch {}
      this.clients.delete(agentId);
    }
    this.setState(agentId, { status: 'desconectado', qr: undefined, phoneNumber: undefined, lastEvent: 'disconnect' });
  }
}

export const whatsappEngine = new WhatsAppEngine();
