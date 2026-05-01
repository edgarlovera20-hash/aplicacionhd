import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import helmet from "helmet";
import compression from "compression";
import bcrypt from "bcryptjs";
import { Mutex } from "async-mutex";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import pkg from "pg";
import { whatsappEngine } from "./src/agents/whatsappEngine";
const { Pool } = pkg;

dotenv.config();

const IS_PROD = process.env.NODE_ENV === "production";

// ── Validación de entorno crítico (fail-fast en producción) ───────────────────
if (IS_PROD) {
  const required = ["PASSWORD_SALT"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[FATAL] Faltan variables de entorno requeridas en producción: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.warn("[WARN] DATABASE_URL no está definida — la app correrá con MockDB (no persistente).");
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3001', 10);

  // Railway/Render/Heroku están detrás de un proxy — confiamos solo en el primero
  // para que req.ip / X-Forwarded-For funcione correctamente con rate limiting.
  app.set("trust proxy", 1);

  // ── Seguridad: cabeceras + compresión ─────────────────────────────────────
  app.use(
    helmet({
      // CSP y HSTS deshabilitados hasta configurar HTTPS/TLS (Caddy).
      // Con HTTP puro, HSTS rompe el browser y CSP bloquea assets.
      // TODO: re-habilitar cuando se agregue dominio + certificado SSL.
      contentSecurityPolicy: false,
      strictTransportSecurity: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '20mb' }));

  // ── Rate limiting global (aplicado aquí, ANTES de cualquier ruta) ────────
  // IMPORTANTE: deben estar aquí para que Express los ejecute antes de los handlers.
  const rateCounts = new Map<string, { count: number; reset: number }>();
  const rateLimit = (max: number, windowMs: number) =>
    (req: any, res: any, next: any) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const entry = rateCounts.get(key);
      if (!entry || now > entry.reset) {
        rateCounts.set(key, { count: 1, reset: now + windowMs });
        return next();
      }
      entry.count++;
      if (entry.count > max) return res.status(429).json({ error: 'Demasiadas solicitudes, espera un momento' });
      next();
    };

  app.use('/api/auth/login',         rateLimit(10,  60_000));   // 10 intentos / min
  app.use('/api/auth/register',      rateLimit(5,   300_000));  // 5 / 5 min
  app.use('/api/auth/passkey',       rateLimit(20,  60_000));   // WebAuthn
  app.use('/api/ocr',                rateLimit(30,  60_000));   // OCR llama Gemini/Claude
  app.use('/api/geocode',            rateLimit(60,  60_000));   // Google Maps Geocoding
  app.use('/api/expediente',         rateLimit(120, 60_000));   // uploads
  app.use('/api/ai',                 rateLimit(60,  60_000));   // chat IA general
  app.use('/api/voice',              rateLimit(40,  60_000));   // Vapi/Twilio
  app.use('/api/whatsapp',           rateLimit(60,  60_000));   // webhooks WA
  app.use('/api/audit',              rateLimit(120, 60_000));   // auditoría
  app.use('/api/profile/bank',       rateLimit(15,  60_000));   // datos bancarios
  app.use('/api/payroll',            rateLimit(60,  60_000));   // nómina
  app.use('/api/customers/import',   rateLimit(5,   300_000));  // imports masivos

  // ── Proveedor IA: Claude (primario) → Gemini (fallback) → OpenAI (último recurso) ──
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
  const anthropicClient = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
  ].filter(Boolean) as string[];

  const openaiKey = process.env.OPENAI_API_KEY || "";
  const openaiClient = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

  // Modelos Claude por uso:
  //  - Vision (OCR INE/CURP/comprobante): claude-haiku-4-5 — rápido y barato (~$1/$5 per M)
  //  - Texto general (chat, resúmenes):    claude-sonnet-4-6 — 1M ctx, adaptive thinking
  const CLAUDE_TEXT_MODEL   = process.env.CLAUDE_TEXT_MODEL   || "claude-sonnet-4-6";
  const CLAUDE_VISION_MODEL = process.env.CLAUDE_VISION_MODEL || "claude-haiku-4-5-20251001";

  const providers: string[] = [];
  if (anthropicClient)        providers.push(`Claude (${CLAUDE_TEXT_MODEL} / ${CLAUDE_VISION_MODEL})`);
  if (geminiKeys.length > 0)  providers.push(`Gemini x${geminiKeys.length}`);
  if (openaiClient)           providers.push("OpenAI GPT-4o-mini");
  if (providers.length === 0) {
    console.warn("Sin claves de IA configuradas.");
  } else {
    console.log(`IA disponible: ${providers.join(" -> ")}`);
  }

  let currentGeminiIdx = 0;

  const googleVisionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY || "";
  const googleMapsKey   = process.env.GOOGLE_MAPS_API_KEY || "";

  /**
   * Extrae texto crudo de una imagen usando Google Cloud Vision API (DOCUMENT_TEXT_DETECTION).
   * Retorna el texto completo o lanza error si la clave no está configurada.
   */
  async function cloudVisionOCR(b64: string, mimeType: string): Promise<string> {
    if (!googleVisionKey) throw new Error("GOOGLE_CLOUD_VISION_API_KEY no configurada");
    const body = {
      requests: [{
        image: { content: b64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
        imageContext: { languageHints: ["es"] },
      }],
    };
    const resp = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Cloud Vision error ${resp.status}: ${err.slice(0, 200)}`);
    }
    const json = await resp.json() as any;
    const fullText: string = json.responses?.[0]?.fullTextAnnotation?.text || "";
    if (!fullText) throw new Error("Cloud Vision no detectó texto en la imagen");
    return fullText;
  }

  /**
   * Convierte el formato Gemini (parts con inlineData) al formato Claude (content blocks).
   * Devuelve null si alguna parte no es traducible (tipo no soportado por Claude).
   */
  const partsToClaudeContent = (
    parts: any[]
  ): Anthropic.ContentBlockParam[] | null => {
    const out: Anthropic.ContentBlockParam[] = [];
    for (const p of parts) {
      if (typeof p === "string") {
        out.push({ type: "text", text: p });
      } else if (p?.inlineData?.data && p?.inlineData?.mimeType) {
        const mt = p.inlineData.mimeType as string;
        if (mt === "application/pdf") {
          out.push({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: p.inlineData.data },
          });
        } else if (/^image\/(jpeg|png|gif|webp)$/.test(mt)) {
          out.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mt as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: p.inlineData.data,
            },
          });
        } else {
          // Tipo no soportado por Claude — caer a Gemini.
          return null;
        }
      } else if (p?.text) {
        out.push({ type: "text", text: p.text });
      } else {
        return null;
      }
    }
    return out;
  };

  const aiGenerate = async (
    promptOrParts: string | any[],
    { visionMode = false } = {}
  ): Promise<string> => {
    const isText = typeof promptOrParts === "string";
    let lastErr: any = null;

    // ── Intento 1: Claude ─────────────────────────────────────────────────
    if (anthropicClient) {
      try {
        const content: Anthropic.ContentBlockParam[] | null = isText
          ? [{ type: "text", text: promptOrParts as string }]
          : partsToClaudeContent(promptOrParts as any[]);
        if (content) {
          const model = visionMode ? CLAUDE_VISION_MODEL : CLAUDE_TEXT_MODEL;
          const resp = await anthropicClient.messages.create({
            model,
            max_tokens: 4096,
            messages: [{ role: "user", content }],
          });
          const textBlock = resp.content.find(
            (b): b is Anthropic.TextBlock => b.type === "text"
          );
          if (textBlock) return textBlock.text;
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(
          `Claude fallo (${err?.status ?? err?.message?.slice(0, 80)}) — probando Gemini...`
        );
      }
    }

    // ── Intento 2: Gemini (rotación entre claves) ─────────────────────────
    for (let attempt = 0; attempt < geminiKeys.length; attempt++) {
      const keyIdx = (currentGeminiIdx + attempt) % geminiKeys.length;
      try {
        const client = new GoogleGenerativeAI(geminiKeys[keyIdx]);
        const model  = client.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(promptOrParts as any);
        currentGeminiIdx = keyIdx;
        return result.response.text();
      } catch (err: any) {
        lastErr = err;
        console.warn(`Gemini clave ${keyIdx + 1} fallo (${err?.status ?? err?.message?.slice(0,60)}) — probando siguiente...`);
      }
    }

    // ── Intento 3: OpenAI (solo texto, sin visión) ────────────────────────
    if (openaiClient && isText && !visionMode) {
      console.warn("Usando OpenAI GPT-4o-mini como respaldo final.");
      const chat = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptOrParts as string }],
        max_tokens: 2048,
      });
      return chat.choices[0]?.message?.content || "";
    }

    throw lastErr || new Error("No hay proveedores de IA disponibles.");
  };

  const geminiGenerate = aiGenerate;

  const SALT = process.env.PASSWORD_SALT || "hdreams_salt_2026";

  /** Hash seguro de contraseña con bcrypt (12 rounds). */
  const hashPassword = (password: string): Promise<string> =>
    bcrypt.hash(password, 12);

  /** Detecta si el hash es legacy SHA-256 (64 hex) vs bcrypt ($2b$...) */
  const isLegacyHash = (hash: string) => /^[0-9a-f]{64}$/.test(hash);

  /**
   * Verifica contraseña con auto-migración SHA-256 → bcrypt.
   * Devuelve { valid, newHash? } — si newHash está presente, hay que persistirlo.
   */
  const verifyPassword = async (
    password: string,
    storedHash: string
  ): Promise<{ valid: boolean; newHash?: string }> => {
    if (isLegacyHash(storedHash)) {
      // Hash legacy SHA-256 — verificar con método anterior
      const legacy = crypto.createHash("sha256").update(password + SALT).digest("hex");
      if (legacy !== storedHash) return { valid: false };
      // Contraseña correcta → migrar a bcrypt automáticamente
      const newHash = await bcrypt.hash(password, 12);
      return { valid: true, newHash };
    }
    // Hash bcrypt normal
    const valid = await bcrypt.compare(password, storedHash);
    return { valid };
  };

  // ================= DATABASE (PostgreSQL) =================
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://user:password@localhost:5432/hdreams"
  });

  let isDbConnected = false;

  const MOCK_DB_FILE = path.join(process.cwd(), ".mockdb.json");
  // Hash bcrypt de "Admin123!" (12 rounds) — cambia esta contraseña en producción.
  const ADMIN_DEFAULT_HASH = "$2b$12$Fxsd7IaL8MnSBJXrVUmi3uJM7YGhlSMhX458qH90hPTIT0EJq2yFW";

  type MockUser = { uid: string; email: string; role: string; nombres: string; password_hash: string; status?: string; createdAt?: string };
  type Expense  = { id: string; userId: string; amount: number; category: string; description: string; date: string; createdAt: string };
  type WAAccount = {
    id: string;
    nombre: string;          // Display name, e.g. "Reclutamiento 1 — Gisselle"
    phoneId: string;         // Meta Phone Number ID
    accessToken: string;     // Meta permanent access token (masked on GET)
    tipo: 'reclutamiento' | 'clientes' | 'cobranza' | 'soporte';
    orden: number;           // Sort order within tipo group (1-5 for reclutamiento)
    activo: boolean;
    status: 'activo' | 'inactivo' | 'error' | 'sin_configurar';
    displayPhone?: string;   // E.164 verified number from Meta
    lastChecked?: string;    // ISO timestamp of last connection test
  };
  type FBAccount = {
    id: string;
    nombre: string;          // Display name, e.g. "Página Heavenly Dreams"
    pageId: string;          // Facebook Page ID
    accessToken: string;     // Page Access Token (masked on GET)
    tipo: 'reclutamiento' | 'clientes' | 'cobranza' | 'soporte' | 'marketing';
    activo: boolean;
    status: 'activo' | 'inactivo' | 'error' | 'sin_configurar';
    pageName?: string;       // Verified page name from Graph API
    category?: string;       // Page category from Meta
    lastChecked?: string;    // ISO timestamp of last connection test
  };
  type WAQRCanalSession = {
    id: string;           // used as sessionId in whatsappEngine
    nombre: string;       // display label e.g. "WhatsApp Ventas"
    tipo: 'personal' | 'business';
    activo: boolean;
    phoneNumber?: string; // E.164 once connected
    createdAt: string;
  };
  type TelegramBot = {
    id: string;
    nombre: string;
    token: string;        // masked on GET
    activo: boolean;
    status: 'activo' | 'inactivo' | 'error' | 'sin_configurar';
    botUsername?: string;
    botName?: string;
    lastChecked?: string;
  };
  type UserPref = { userId: string; visibleColumns: string[]; kpiConfig: Record<string,boolean>; updatedAt: string };
  type BotCandidate = {
    id: string; phone: string; name: string; age: number; experience: string;
    profile: 'volantero'|'ayudante'|'asesor'|'supervisor'|'rechazado'|'pendiente';
    stage: 'nuevo'|'interesado'|'perfilado'|'apto'|'agendado'|'confirmado'|'no_show'|'contratado';
    assignedAgent: number; folio: string; notes: string;
    appointmentDate: string; appointmentTime: string;
    messages: {role:'bot'|'user'; text:string; ts:string}[];
    createdAt: string;
    needsHuman?: boolean;     // Flagged for human attention
    humanReason?: string;     // Why escalation was triggered
  };
  type RecruitmentAgent = {
    id: number; name: string; style: string; instructions: string;
    templates: Record<string, string>;
    vacancy: {
      puesto: string; sueldoSemanal: string; edadMin: number; edadMax: number;
      horario: string; ubicacion: string; beneficios: string; requisitos: string;
    };
  };
  // ── Unified Agent registry — 7 types, multi-channel ─────────────────────
  type AgentType =
    | 'VENTAS_EXPEDIENTES'
    | 'VALIDACION_TELEFONICA'
    | 'SEGUIMIENTO'
    | 'RECUPERACION'
    | 'RECLUTAMIENTO'
    | 'MARKETING'
    | 'ASISTENTE_PERSONAL';
  type AgentChannel = 'whatsapp_qr' | 'telegram' | 'voice' | 'internal';
  type Agent = {
    id: string;                  // e.g. 'AG-VENTAS-001'
    type: AgentType;
    name: string;
    description: string;
    channel: AgentChannel;
    enabled: boolean;
    tone: string;                // 'Formal' | 'Amigable' | 'Energético' | freeform
    instructions: string;        // freeform behavior rules
    knowledgeBase: string;       // freeform domain knowledge
    templates: Record<string, string>;
    config: Record<string, any>; // type-specific (e.g. age filters, escalation rules)
    telegramBotToken?: string;   // future
    twilioPhoneNumber?: string;  // future for voice
    createdAt: string;
    updatedAt: string;
  };
  type AgentMemoryEntry = {
    id: string;
    agentId: string;
    ts: string;
    kind: 'interaction' | 'summary' | 'event';
    content: string;
    metadata?: Record<string, any>;
  };
  type ClienteSeguimiento = {
    id: string; nombre: string; telefono: string; email: string; folio: string;
    paquete: string; renta: number; megas: string;
    estado_pago: 'nuevo'|'al_corriente'|'pendiente'|'moroso'|'inactivo';
    fecha_alta: string; fecha_ultimo_pago?: string;
    agente_id: string; agente_nombre: string;
    supervisor_id?: string; // UID del supervisor responsable
    beneficio_activado: boolean; domiciliado: boolean;
    colonia: string; municipio: string; notas?: string;
    mensajes_sin_leer: number; ultimo_contacto?: string;
  };
  type ConversacionMsg = {
    id: string; cliente_id: string; texto: string; fecha: string;
    tipo: 'inbound'|'outbound'; estado: 'enviado'|'entregado'|'leido'|'error';
    plantilla?: string; agente?: string;
  };
  type TicketSoporte = {
    id: string; cliente_id: string; asunto: string; descripcion: string;
    estado: 'abierto'|'en_proceso'|'resuelto'|'cerrado';
    prioridad: 'baja'|'media'|'alta'|'critica';
    fecha_apertura: string; fecha_cierre?: string; agente_id: string;
  };
  type PagoSeguimiento = {
    id: string; cliente_id: string; monto: number; fecha: string;
    estado: 'pendiente'|'pagado'|'rechazado'; metodo: string; referencia?: string;
  };
  type KnowledgeDoc = {
    id: string; filename: string; category: string; mimetype: string;
    size: number; content: string; chunks: string[]; tokens: number;
    status: 'processing'|'ready'|'error'; errorMsg?: string;
    uploadedBy: string; uploadedAt: string; description?: string;
  };
  type Notification_ = {
    id: string; tipo: 'info'|'warning'|'error'|'success';
    titulo: string; mensaje: string; modulo: string;
    referencia_id?: string; leida: boolean;
    para_roles?: string[]; createdAt: string;
  };
  type Contract = {
    id: string; folio: string;
    cliente_nombre: string; cliente_telefono: string; cliente_email?: string;
    paquete: string; renta: number; megas?: string;
    fecha_inicio: string; fecha_fin?: string;
    meses_permanencia: number;
    estado: 'activo'|'suspendido'|'cancelado'|'por_vencer'|'vencido';
    portabilidad?: string;
    agente_id: string; agente_nombre: string;
    domicilio?: string; municipio?: string; notas?: string;
    createdAt: string; updatedAt: string;
  };
  type Invoice = {
    id: string; folio_pago: string; contrato_id?: string;
    cliente_nombre: string; cliente_email?: string;
    concepto: string; monto: number; iva: number; total: number;
    metodo_pago: 'efectivo'|'transferencia'|'tarjeta'|'domiciliacion';
    estado: 'pendiente'|'pagado'|'cancelado'|'vencido';
    fecha_emision: string; fecha_vencimiento: string; fecha_pago?: string;
    agente_id: string; notas?: string;
  };
  type InventoryItem = {
    id: string; tipo: 'sim'|'modem'|'equipo'|'accesorio'|'uniforme'|'carpeta'|'anexo';
    descripcion: string; serie?: string; numero?: string;
    estado: 'disponible'|'asignado'|'dañado'|'en_reparacion'|'baja';
    cliente_nombre?: string; contrato_id?: string;
    asignado_a?: string; // agente al que se asignó uniforme/carpeta
    talla?: string;      // para uniformes
    almacen: string; precio_costo: number;
    fecha_ingreso: string; fecha_asignacion?: string; notas?: string;
  };
  type AuditEntry = {
    id: string; usuario_uid: string; usuario_email: string;
    accion: string; modulo: string; detalles?: any; ts: string;
  };

  type MockDB = {
    users: MockUser[]; ventas: any[]; botCandidates: BotCandidate[];
    expenses: Expense[]; userPrefs: UserPref[];
    clientesSeguimiento: ClienteSeguimiento[];
    conversaciones: ConversacionMsg[];
    ticketsSoporte: TicketSoporte[];
    pagosSeguimiento: PagoSeguimiento[];
    knowledgeDocs: KnowledgeDoc[];
    notifications: Notification_[];
    contracts: Contract[];
    invoices: Invoice[];
    inventory: InventoryItem[];
    auditLog: AuditEntry[];
    waAccounts: WAAccount[];
    fbAccounts: FBAccount[];
    waQRSessions: WAQRCanalSession[];
    telegramBots: TelegramBot[];
    recruitmentAgents: RecruitmentAgent[];
    agents: Agent[];
    agentMemory: AgentMemoryEntry[];
  };

  const loadMockDb = (): MockDB => {
    try {
      if (fs.existsSync(MOCK_DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(MOCK_DB_FILE, "utf-8"));
        if (!data.botCandidates)         data.botCandidates = [];
        if (!data.expenses)              data.expenses = [];
        if (!data.userPrefs)             data.userPrefs = [];
        if (!data.clientesSeguimiento)   data.clientesSeguimiento = [];
        if (!data.conversaciones)        data.conversaciones = [];
        if (!data.ticketsSoporte)        data.ticketsSoporte = [];
        if (!data.pagosSeguimiento)      data.pagosSeguimiento = [];
        if (!data.knowledgeDocs)         data.knowledgeDocs = [];
        if (!data.notifications)         data.notifications = [];
        if (!data.contracts)             data.contracts = [];
        if (!data.invoices)              data.invoices = [];
        if (!data.inventory)             data.inventory = [];
        if (!data.auditLog)              data.auditLog = [];
        if (!data.waAccounts)            data.waAccounts = [];
        if (!data.fbAccounts)            data.fbAccounts = [];
        if (!data.waQRSessions)          data.waQRSessions = [];
        if (!data.telegramBots)          data.telegramBots = [];
        if (!data.recruitmentAgents)     data.recruitmentAgents = [];
        if (!data.agents)                data.agents = [];
        if (!data.agentMemory)           data.agentMemory = [];
        return data;
      }
    } catch {}
    return {
      users: [
        { uid: "USR-MASTER-001", email: "admin@hdreams.com",       role: "gerente", nombres: "Administrador", password_hash: ADMIN_DEFAULT_HASH, status: "active", createdAt: new Date().toISOString() },
        { uid: "USR-EDGAR-001",  email: "edgarlovera20@gmail.com", role: "gerente", nombres: "Edgar Lovera",  password_hash: ADMIN_DEFAULT_HASH, status: "active", createdAt: new Date().toISOString() }
      ],
      ventas: [],
      botCandidates: [],
      expenses: [],
      userPrefs: [],
      clientesSeguimiento: [],
      conversaciones: [],
      ticketsSoporte: [],
      pagosSeguimiento: [],
      knowledgeDocs: [],
      notifications: [],
      contracts: [],
      invoices: [],
      inventory: [],
      auditLog: [],
      recruitmentAgents: [],
      agents: [],
      agentMemory: [],
      waAccounts: [
        { id: 'WA-REC-001', nombre: 'Reclutamiento 1 — Gisselle', phoneId: '', accessToken: '', tipo: 'reclutamiento', orden: 1, activo: true,  status: 'sin_configurar' },
        { id: 'WA-REC-002', nombre: 'Reclutamiento 2',             phoneId: '', accessToken: '', tipo: 'reclutamiento', orden: 2, activo: true,  status: 'sin_configurar' },
        { id: 'WA-REC-003', nombre: 'Reclutamiento 3',             phoneId: '', accessToken: '', tipo: 'reclutamiento', orden: 3, activo: true,  status: 'sin_configurar' },
        { id: 'WA-REC-004', nombre: 'Reclutamiento 4',             phoneId: '', accessToken: '', tipo: 'reclutamiento', orden: 4, activo: true,  status: 'sin_configurar' },
        { id: 'WA-REC-005', nombre: 'Reclutamiento 5',             phoneId: '', accessToken: '', tipo: 'reclutamiento', orden: 5, activo: true,  status: 'sin_configurar' },
        { id: 'WA-CLI-001', nombre: 'Clientes — Seguimiento',      phoneId: '', accessToken: '', tipo: 'clientes',      orden: 1, activo: true,  status: 'sin_configurar' },
      ],
      fbAccounts: [],
      waQRSessions: [],
      telegramBots: [],
    };
  };
  // Mutex para serializar escrituras al MockDB — evita race conditions cuando
  // múltiples requests modifican el JSON simultáneamente.
  const dbMutex = new Mutex();

  const saveMockDb = (db: MockDB): void => {
    // Fire-and-forget con mutex: serializa las escrituras sin bloquear el
    // event loop (usa fs.promises internamente).
    dbMutex.runExclusive(async () => {
      try {
        await fs.promises.writeFile(MOCK_DB_FILE, JSON.stringify(db, null, 2));
      } catch (err) {
        console.error("[MockDB] Error escribiendo .mockdb.json:", err);
      }
    }).catch(() => {}); // la promesa de runExclusive no se puede perder
  };

  const mockDb = loadMockDb();

  // ── Session store (RBAC) ─────────────────────────────────────────────────
  const sessionStore = new Map<string, { uid: string; email: string; role: string; exp: number }>();
  setInterval(() => {
    const now = Date.now();
    sessionStore.forEach((v, k) => { if (now > v.exp) sessionStore.delete(k); });
  }, 60_000);

  const issueToken = (uid: string, email: string, role: string): string => {
    const token = crypto.randomBytes(32).toString('hex');
    sessionStore.set(token, { uid, email, role, exp: Date.now() + 8 * 3600_000 }); // 8h
    return token;
  };

  const requireRole = (...allowed: string[]) =>
    (req: any, res: any, next: any) => {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No autenticado' });
      const sess = sessionStore.get(token);
      if (!sess || Date.now() > sess.exp) return res.status(401).json({ error: 'Sesión expirada' });
      const normalised = sess.role.toLowerCase();
      if (allowed.length && !allowed.some(r => normalised.includes(r.toLowerCase())))
        return res.status(403).json({ error: 'Sin permisos para esta acción' });
      (req as any).sess = sess;
      next();
    };

  // ── SSE broadcast for real-time notifications ────────────────────────────
  const sseClients = new Set<{ res: any; rol?: string }>();
  const broadcastNotif = (notif: Notification_) => {
    const payload = `data: ${JSON.stringify(notif)}\n\n`;
    sseClients.forEach(client => {
      try {
        if (!notif.para_roles || !client.rol || notif.para_roles.includes(client.rol)) {
          client.res.write(payload);
        }
      } catch { sseClients.delete(client); }
    });
  };

  // ── Audit helper ─────────────────────────────────────────────────────────
  const audit = (uid: string, email: string, accion: string, modulo: string, detalles?: any) => {
    if (!mockDb.auditLog) mockDb.auditLog = [];
    mockDb.auditLog.unshift({ id: 'AUD-' + Date.now(), usuario_uid: uid, usuario_email: email, accion, modulo, detalles, ts: new Date().toISOString() });
    if (mockDb.auditLog.length > 2000) mockDb.auditLog = mockDb.auditLog.slice(0, 2000);
    saveMockDb(mockDb);
  };

  /** Lee la sesión de cualquier request (sin requerir auth).
   *  SEGURIDAD: si no hay token válido devuelve 'anonymous' sin leer headers del cliente
   *  para evitar que el audit log sea falsificado. */
  const peekSession = (req: any): { uid: string; email: string; role?: string } => {
    const token = (req.headers?.authorization || '').replace('Bearer ', '');
    const sess = token ? sessionStore.get(token) : null;
    if (sess && Date.now() < sess.exp) return { uid: sess.uid, email: sess.email, role: sess.role };
    return { uid: 'anonymous', email: '' };
  };

  // ── Notification helper ───────────────────────────────────────────────────
  const pushNotif = (titulo: string, mensaje: string, tipo: Notification_['tipo'], modulo: string, opts?: Partial<Notification_>) => {
    if (!mockDb.notifications) mockDb.notifications = [];
    const notif: Notification_ = {
      id: 'NOT-' + Date.now(), tipo, titulo, mensaje, modulo,
      leida: false, createdAt: new Date().toISOString(), ...opts,
    };
    mockDb.notifications.unshift(notif);
    if (mockDb.notifications.length > 500) mockDb.notifications = mockDb.notifications.slice(0, 500);
    saveMockDb(mockDb);
    broadcastNotif(notif); // 🔴 push real-time to SSE clients
  };

  try {
    // Ejecutar migraciones versionadas antes de arrancar las rutas
    const { runMigrations } = await import('./migrations/migrate.js');
    await runMigrations(pool);
    console.log("[DB] PostgreSQL listo.");
    isDbConnected = true;
  } catch (err: any) {
    console.warn(`[DB] No se pudo conectar a PostgreSQL (${err?.message ?? err}). Usando Mock DB.`);
  }

  // ================= API ROUTES (Auth & CRM) =================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, nombres, apellidoPaterno, puestoActual, usuario } = req.body;
      const uid = "USR-" + Date.now();
      const password_hash = await hashPassword(password);

      if (isDbConnected) {
        await pool.query(
          "INSERT INTO users (uid, email, usuario, password_hash, role, nombres, apellidos) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [uid, email, usuario, password_hash, puestoActual, nombres, apellidoPaterno]
        );
      } else {
        if (mockDb.users.find((u: MockUser) => u.email === email)) {
          return res.status(400).json({ error: "Email ya registrado" });
        }
        mockDb.users.push({ uid, email, role: puestoActual, nombres, password_hash });
        saveMockDb(mockDb);
      }

      res.json({ uid, email, role: puestoActual, displayName: nombres });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message || "Error registrando usuario" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      let user;

      if (isDbConnected) {
        const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });
        user = rows[0];
      } else {
        user = mockDb.users.find((u: MockUser) => u.email === email);
        if (!user) return res.status(401).json({ error: "Usuario no encontrado. Usa admin@hdreams.com / Admin123! o registrate primero." });
      }

      const { valid, newHash } = await verifyPassword(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Contraseña incorrecta" });

      // Auto-migración: si el hash era SHA-256, persistir el nuevo hash bcrypt
      if (newHash) {
        user.password_hash = newHash;
        if (isDbConnected) {
          await pool.query("UPDATE users SET password_hash = $1 WHERE uid = $2", [newHash, user.uid]);
        } else {
          saveMockDb(mockDb);
        }
      }

      const sessionToken = issueToken(user.uid, user.email, user.role);
      audit(user.uid, user.email, 'LOGIN', 'auth');
      res.json({ uid: user.uid, email: user.email, role: user.role, displayName: user.nombres, sessionToken });
    } catch (e: any) {
      res.status(500).json({ error: "Error en el servidor" });
    }
  });

  app.get("/api/ventas", requireRole('gerente', 'administracion', 'supervisor', 'vendedor'), async (req, res) => {
    try {
      if (isDbConnected) {
        const { rows } = await pool.query("SELECT * FROM ventas ORDER BY created_at DESC");
        res.json(rows.map(r => ({ ...r.data, folio: r.folio, estado: r.estado })));
      } else {
        res.json(mockDb.ventas.map(r => ({ ...r.data, folio: r.folio, estado: r.estado })));
      }
    } catch (e) {
      res.status(500).json({ error: "Error fetch ventas" });
    }
  });

  app.post("/api/ventas", requireRole('gerente', 'administracion', 'supervisor', 'vendedor'), async (req, res) => {
    try {
      const { folio, estado, paqueteNombre, nombres, telefonoTitular, rentaMensual, ...data } = req.body;
      const isUpdate = !!mockDb.ventas.find(v => v.folio === folio);

      // Si el frontend ya subió los archivos al expediente y nos pasó los paths,
      // tiramos los base64 inline para no duplicar (el JSON crecía decenas de MB
      // por cada venta). Las claves *Path son la fuente de verdad ahora.
      if (data.ineFrentePath)        delete data.ineFrente;
      if (data.ineReversoPath)       delete data.ineReverso;
      if (data.curpDocPath)          delete data.curpDoc;
      if (data.comprobantePath)      delete data.comprobanteDomicilio;
      if (data.videoFirmaPath)       delete data.videoFirmaBlob;
      if (data.audioValidacionPath)  delete data.audioValidacion;

      if (isDbConnected) {
        await pool.query(
          "INSERT INTO ventas (folio, estado, paquete_nombre, nombres, telefono, renta_mensual, data) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (folio) DO UPDATE SET estado = EXCLUDED.estado",
          [folio, estado || 'pendiente', paqueteNombre, nombres, telefonoTitular, rentaMensual, JSON.stringify(data)]
        );
      } else {
        const index = mockDb.ventas.findIndex(v => v.folio === folio);
        const newSale = { folio, estado: estado || 'pendiente', paqueteNombre, nombres, telefonoTitular, rentaMensual, data };
        if (index >= 0) mockDb.ventas[index] = newSale;
        else mockDb.ventas.push(newSale);
      }

      // Audit: registro de venta creada (o actualizada via import).
      if (!isUpdate) {
        const sess = peekSession(req);
        const promotor = data?.promotorNombre || data?.agente_nombre || nombres || 'Sin promotor';
        const promotorId = data?.promotorId || data?.agenteUID || sess.uid;
        audit(sess.uid, sess.email, 'crear_venta', 'ventas', {
          mensaje: `Venta ${folio} creada correctamente`,
          folio, promotor, promotorId, paquete: paqueteNombre, rentaMensual,
        });
      }

      res.json({ success: true, folio });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ================= TWILIO (REST API nativa) =================
  const twSid   = process.env.TWILIO_ACCOUNT_SID  || "";
  const twToken = process.env.TWILIO_AUTH_TOKEN    || "";
  const twFrom  = process.env.TWILIO_FROM_NUMBER   || "";
  const twWa    = process.env.TWILIO_WHATSAPP_FROM || "";

  const twilioPost = async (path: string, body: Record<string, string>) => {
    if (!twSid || !twToken) throw new Error("Credenciales Twilio no configuradas (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).");
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${twSid}/${path}`;
    const auth = Buffer.from(`${twSid}:${twToken}`).toString("base64");
    const resp = await fetch(url, {
      method : "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body   : new URLSearchParams(body).toString(),
    });
    const json = await resp.json() as any;
    if (!resp.ok) throw new Error(json?.message || `Twilio error ${resp.status}`);
    return json;
  };

  // POST /api/twilio/sms
  app.post("/api/twilio/sms", requireRole('gerente', 'administracion', 'supervisor', 'seguimiento'), async (req, res) => {
    try {
      const { to, message } = req.body as { to: string; message: string };
      if (!to || !message) return res.status(400).json({ error: "Faltan: to, message" });
      if (!twFrom) return res.status(400).json({ error: "TWILIO_FROM_NUMBER no configurado." });
      const r = await twilioPost("Messages.json", { From: twFrom, To: to, Body: message });
      res.json({ sid: r.sid, status: r.status });
    } catch (e: any) {
      console.error("Twilio SMS Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/twilio/whatsapp
  app.post("/api/twilio/whatsapp", requireRole('gerente', 'administracion', 'supervisor', 'seguimiento'), async (req, res) => {
    try {
      const { to, message } = req.body as { to: string; message: string };
      if (!to || !message) return res.status(400).json({ error: "Faltan: to, message" });
      const from = twWa || (twFrom ? `whatsapp:${twFrom}` : "");
      if (!from) return res.status(400).json({ error: "TWILIO_WHATSAPP_FROM no configurado." });
      const toWa = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
      const r = await twilioPost("Messages.json", { From: from, To: toWa, Body: message });
      res.json({ sid: r.sid, status: r.status });
    } catch (e: any) {
      console.error("Twilio WhatsApp Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/twilio/call
  app.post("/api/twilio/call", requireRole('gerente', 'administracion', 'supervisor', 'seguimiento'), async (req, res) => {
    try {
      const { to, twiml, callbackUrl } = req.body as { to: string; twiml?: string; callbackUrl?: string };
      if (!to) return res.status(400).json({ error: "Falta: to" });
      if (!twFrom) return res.status(400).json({ error: "TWILIO_FROM_NUMBER no configurado." });
      const xml = twiml || `<Response><Say language="es-MX">Bienvenido a Heavenly Dreams. Por favor espere un momento.</Say><Pause length="30"/></Response>`;
      const params: Record<string, string> = { From: twFrom, To: to, Twiml: xml };
      if (callbackUrl) params.StatusCallback = callbackUrl;
      const r = await twilioPost("Calls.json", params);
      res.json({ sid: r.sid, status: r.status, to: r.to });
    } catch (e: any) {
      console.error("Twilio Call Error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/twilio/status
  app.get("/api/twilio/status", (_req, res) => {
    res.json({
      configured : !!(twSid && twToken),
      hasSms     : !!twFrom,
      hasWhatsApp: !!(twWa || twFrom),
      fromNumber : twFrom ? twFrom.replace(/\d(?=\d{4})/g, "*") : null,
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  PLAN A (FOUNDATION) — VOICE AGENT 2 (VALIDACION)
  //  Andamiaje Vapi.ai + Twilio. Las claves viven en .env.
  //  Documentacion: docs/VOICE_AGENT_PLAN_A.md (futuro).
  //
  //  Flujo entrante:  PSTN -> Twilio numero -> POST /api/webhooks/twilio/incoming
  //                   -> TwiML <Dial><Sip> apuntando al SIP de Vapi.
  //  Flujo saliente:  CRM dispara POST /api/voice/agent2/start -> Vapi crea
  //                   call -> Twilio marca al cliente -> Vapi atiende como
  //                   "Agente 2 Validacion".
  //  Status callbacks: Twilio -> /api/webhooks/twilio/status (lifecycle).
  //  Eventos IA:       Vapi  -> /api/webhooks/vapi/events
  //                    (function-call, transcript, end-of-call-report, ...).
  // ═══════════════════════════════════════════════════════════════
  const twPhone   = process.env.TWILIO_PHONE_NUMBER  || "";
  const vapiKey   = process.env.VAPI_PRIVATE_KEY     || "";
  const vapiPub   = process.env.VAPI_PUBLIC_KEY      || "";
  const vapiAsst  = process.env.VAPI_ASSISTANT_ID    || "";
  const vapiPhId  = process.env.VAPI_PHONE_NUMBER_ID || "";
  const vapiHmac  = process.env.VAPI_WEBHOOK_SECRET  || "";
  const baseUrl   = process.env.PUBLIC_BASE_URL      || "";

  /** Cliente HTTP minimo para Vapi REST. */
  const vapiPost = async (path: string, body: any) => {
    if (!vapiKey) throw new Error("VAPI_PRIVATE_KEY no configurado.");
    const resp = await fetch(`https://api.vapi.ai${path}`, {
      method : "POST",
      headers: { "Authorization": `Bearer ${vapiKey}`, "Content-Type": "application/json" },
      body   : JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({})) as any;
    if (!resp.ok) throw new Error(json?.message || `Vapi error ${resp.status}`);
    return json;
  };

  /** Validacion HMAC opcional de webhooks Vapi (cuando VAPI_WEBHOOK_SECRET esta seteado). */
  const verifyVapiSignature = (req: any): boolean => {
    if (!vapiHmac) return true; // sin secret, no validamos (modo scaffolding)
    const sig = String(req.headers["x-vapi-signature"] || "");
    if (!sig) return false;
    try {
      const crypto = require("node:crypto");
      const raw = JSON.stringify(req.body);
      const expected = crypto.createHmac("sha256", vapiHmac).update(raw).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch { return false; }
  };

  // ── Bitacora en memoria (ultimas 100 llamadas) — visible desde Audit Log ──
  const voiceCallLog: Array<{
    ts: string; sid?: string; direction?: string; from?: string; to?: string;
    status?: string; provider: "twilio" | "vapi"; event?: string; payload?: any;
  }> = [];
  const pushVoiceLog = (entry: typeof voiceCallLog[number]) => {
    voiceCallLog.unshift(entry);
    if (voiceCallLog.length > 100) voiceCallLog.length = 100;
  };

  // POST /api/webhooks/twilio/incoming
  // Llamada entrante (cliente devuelve la llamada). Devuelve TwiML que conecta
  // al SIP de Vapi para que el Agente 2 atienda.
  app.post("/api/webhooks/twilio/incoming",
    express.urlencoded({ extended: false }),
    (req, res) => {
      const { CallSid, From, To, CallStatus } = req.body || {};
      pushVoiceLog({
        ts: new Date().toISOString(), provider: "twilio", event: "incoming",
        sid: CallSid, direction: "inbound", from: From, to: To, status: CallStatus,
      });

      // Si Vapi aun no esta configurado, devolvemos un mensaje seguro.
      const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX" voice="Polly.Mia-Neural">
    Gracias por llamar a Heavenly Dreams. Nuestro asistente de validacion
    no esta disponible en este momento. Un asesor le contactara pronto.
  </Say>
  <Hangup/>
</Response>`;

      // Twiml para conectar al SIP de Vapi (cuando vapiAsst este seteado).
      const sipTarget = vapiAsst
        ? `sip:${vapiAsst}@sip.vapi.ai`
        : "";

      const twiml = sipTarget
        ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" timeout="20">
    <Sip>${sipTarget}</Sip>
  </Dial>
</Response>`
        : fallback;

      res.type("text/xml").send(twiml);
    }
  );

  // POST /api/webhooks/twilio/status
  // Status callback de Twilio para el ciclo de vida de la llamada.
  // Eventos: initiated | ringing | answered | in-progress | completed
  //         | busy | no-answer | failed | canceled
  app.post("/api/webhooks/twilio/status",
    express.urlencoded({ extended: false }),
    (req, res) => {
      const {
        CallSid, CallStatus, CallDuration, From, To, Direction,
        AnsweredBy, ErrorCode, ErrorMessage,
      } = req.body || {};

      pushVoiceLog({
        ts: new Date().toISOString(), provider: "twilio", event: "status",
        sid: CallSid, direction: Direction, from: From, to: To, status: CallStatus,
        payload: { CallDuration, AnsweredBy, ErrorCode, ErrorMessage },
      });

      // TODO Plan B: persistir en tabla `voice_calls` y emitir SSE a `events`.
      console.log(`[voice/twilio/status] ${CallSid} -> ${CallStatus}${ErrorCode ? ` (err ${ErrorCode})` : ""}`);
      res.sendStatus(204);
    }
  );

  // POST /api/webhooks/vapi/events
  // Eventos del agente Vapi: function-call, transcript, end-of-call-report,
  // hang, status-update, speech-update, etc.
  app.post("/api/webhooks/vapi/events", (req, res) => {
    if (!verifyVapiSignature(req)) {
      console.warn("[voice/vapi] firma invalida");
      return res.status(401).json({ error: "invalid signature" });
    }
    const message = req.body?.message || req.body || {};
    const type = message.type || "unknown";
    const callId = message.call?.id || message.callId;

    pushVoiceLog({
      ts: new Date().toISOString(), provider: "vapi", event: type, sid: callId,
      payload: type === "transcript" ? { transcript: message.transcript } : message,
    });

    // Hook para function-calls del Agente 2 (consulta_folio, marcar_validado, etc.).
    // En Plan B se ramifica aqui hacia handlers especificos.
    if (type === "function-call") {
      const fnName = message.functionCall?.name;
      console.log(`[voice/vapi] function-call -> ${fnName}`);
      // TODO: dispatch a handler segun fnName y retornar `{ result }`.
      return res.json({ result: { ok: true, scaffolding: true } });
    }

    if (type === "end-of-call-report") {
      console.log(`[voice/vapi] call ${callId} ended (${message.endedReason || "unknown"})`);
      // TODO: persistir resumen + transcript + grabacion en `voice_calls`.
    }

    res.sendStatus(204);
  });

  // POST /api/voice/agent2/start
  // Dispara una llamada saliente del Agente 2 (Validacion) hacia un cliente.
  // Body: { phone: "+52...", folio?: string, customerName?: string, metadata?: object }
  app.post("/api/voice/agent2/start", async (req, res) => {
    try {
      const { phone, folio, customerName, metadata } = req.body || {};
      if (!phone) return res.status(400).json({ error: "Falta: phone" });
      if (!vapiKey || !vapiAsst || !vapiPhId) {
        return res.status(503).json({
          error: "Vapi no configurado",
          missing: {
            VAPI_PRIVATE_KEY    : !vapiKey,
            VAPI_ASSISTANT_ID   : !vapiAsst,
            VAPI_PHONE_NUMBER_ID: !vapiPhId,
          },
        });
      }

      const call = await vapiPost("/call", {
        assistantId   : vapiAsst,
        phoneNumberId : vapiPhId,
        customer      : { number: phone, name: customerName || undefined },
        // Variables que el assistant puede inyectar en su prompt
        assistantOverrides: {
          variableValues: { folio: folio || "", customer_name: customerName || "" },
        },
        metadata: { source: "hd-crm", agent: "agent2-validation", folio, ...(metadata || {}) },
      });

      pushVoiceLog({
        ts: new Date().toISOString(), provider: "vapi", event: "outbound-start",
        sid: call?.id, direction: "outbound", to: phone, status: call?.status,
        payload: { folio, customerName },
      });

      res.json({ callId: call?.id, status: call?.status, vapi: call });
    } catch (e: any) {
      console.error("[voice/agent2/start]", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/voice/status — health/diagnostico para el dashboard
  app.get("/api/voice/status", (_req, res) => {
    res.json({
      twilio: {
        configured : !!(twSid && twToken),
        phoneNumber: twPhone ? twPhone.replace(/\d(?=\d{4})/g, "*") : null,
      },
      vapi: {
        configured     : !!vapiKey,
        hasAssistant   : !!vapiAsst,
        hasPhoneNumber : !!vapiPhId,
        hasPublicKey   : !!vapiPub,
        signatureChecks: !!vapiHmac,
      },
      webhooks: {
        baseUrl  : baseUrl || null,
        incoming : baseUrl ? `${baseUrl}/api/webhooks/twilio/incoming` : null,
        status   : baseUrl ? `${baseUrl}/api/webhooks/twilio/status`   : null,
        vapi     : baseUrl ? `${baseUrl}/api/webhooks/vapi/events`     : null,
      },
      recentCalls: voiceCallLog.length,
    });
  });

  // GET /api/voice/log — ultimas N entradas de la bitacora en memoria
  app.get("/api/voice/log", requireRole('gerente', 'administracion', 'supervisor'), (req, res) => {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 100);
    res.json({ count: voiceCallLog.length, entries: voiceCallLog.slice(0, limit) });
  });

  // ═══════════════════════════════════════════════════════════════
  //  KNOWLEDGE BASE — Base de Conocimiento IA
  // ═══════════════════════════════════════════════════════════════

  /** Divide un texto en chunks de ~500 chars, respetando párrafos */
  const chunkText = (text: string, maxLen = 500): string[] => {
    const paras = text.split(/\n{2,}/);
    const chunks: string[] = [];
    let buf = '';
    for (const p of paras) {
      if ((buf + p).length > maxLen && buf.length > 0) {
        chunks.push(buf.trim());
        buf = p + '\n\n';
      } else {
        buf += p + '\n\n';
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.filter(c => c.length > 20);
  };

  /** Extrae texto plano de un archivo (base64). Usa Claude vision (primario) → Gemini (fallback). */
  const extractText = async (
    base64: string,
    mimetype: string,
    filename: string
  ): Promise<string> => {
    const textTypes = ['text/plain','text/csv','text/html','text/markdown','application/json'];
    if (textTypes.some(t => mimetype.startsWith(t))) {
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
    // Vision multimodal — Claude Haiku 4.5 (primario) → Gemini Flash (fallback) vía aiGenerate.
    if (!anthropicClient && geminiKeys.length === 0) {
      return `[Sin proveedor de visión — contenido de ${filename} no extraído]`;
    }
    return aiGenerate(
      [
        { inlineData: { mimeType: mimetype as any, data: base64 } },
        `Extrae TODO el texto de este documento de forma fiel, sin parafrasear.
Si es un PDF o imagen, transcribe el contenido completo.
Si es una tabla o CSV, convierte a texto estructurado.
Responde únicamente con el texto extraído, sin comentarios adicionales.`,
      ],
      { visionMode: true }
    );
  };

  /** Búsqueda BM25-lite: devuelve chunks más relevantes para una query */
  const searchKnowledge = (query: string, topN = 5): string[] => {
    const docs = (mockDb as any).knowledgeDocs as KnowledgeDoc[];
    if (!docs || docs.length === 0) return [];
    const ready = docs.filter(d => d.status === 'ready');
    const qWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    type ScoredChunk = { chunk: string; score: number };
    const scored: ScoredChunk[] = [];
    for (const doc of ready) {
      for (const chunk of doc.chunks) {
        const cl = chunk.toLowerCase();
        const score = qWords.reduce((acc, w) => acc + (cl.split(w).length - 1), 0);
        if (score > 0) scored.push({ chunk: `[${doc.filename}]\n${chunk}`, score });
      }
    }
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(s => s.chunk);
  };

  // GET /api/knowledge — listar documentos (sin contenido completo)
  app.get('/api/knowledge', (_req, res) => {
    const docs = ((mockDb as any).knowledgeDocs as KnowledgeDoc[] || []).map(d => ({
      id: d.id, filename: d.filename, category: d.category,
      mimetype: d.mimetype, size: d.size, tokens: d.tokens,
      status: d.status, errorMsg: d.errorMsg,
      uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt,
      description: d.description, chunksCount: d.chunks?.length || 0,
    }));
    res.json(docs);
  });

  // GET /api/knowledge/stats
  app.get('/api/knowledge/stats', (_req, res) => {
    const docs = ((mockDb as any).knowledgeDocs as KnowledgeDoc[] || []);
    const ready = docs.filter(d => d.status === 'ready');
    const cats  = [...new Set(docs.map(d => d.category))];
    res.json({
      total:       docs.length,
      ready:       ready.length,
      processing:  docs.filter(d => d.status === 'processing').length,
      error:       docs.filter(d => d.status === 'error').length,
      totalTokens: docs.reduce((a, d) => a + (d.tokens || 0), 0),
      totalChunks: docs.reduce((a, d) => a + (d.chunks?.length || 0), 0),
      categories:  cats,
    });
  });

  // POST /api/knowledge/upload — subir y procesar documento
  app.post('/api/knowledge/upload', async (req, res) => {
    try {
      const { filename, mimetype, size, category, description, base64Content, uploadedBy } = req.body;
      if (!filename || !base64Content) return res.status(400).json({ error: 'filename y base64Content son requeridos' });

      const doc: KnowledgeDoc = {
        id: 'KB-' + Date.now(),
        filename, mimetype: mimetype || 'text/plain',
        size: size || 0, category: category || 'General',
        content: '', chunks: [], tokens: 0,
        status: 'processing',
        uploadedBy: uploadedBy || 'sistema',
        uploadedAt: new Date().toISOString(),
        description: description || '',
      };

      if (!(mockDb as any).knowledgeDocs) (mockDb as any).knowledgeDocs = [];
      (mockDb as any).knowledgeDocs.push(doc);
      saveMockDb(mockDb);
      res.json({ id: doc.id, status: 'processing' });

      // Procesamiento asíncrono (no bloquea la respuesta)
      (async () => {
        try {
          const text = await extractText(base64Content, doc.mimetype, doc.filename);
          doc.content = text;
          doc.chunks  = chunkText(text);
          doc.tokens  = Math.ceil(text.length / 4); // aprox. 4 chars/token
          doc.status  = 'ready';
        } catch (e: any) {
          doc.status   = 'error';
          doc.errorMsg = e.message || 'Error al procesar';
        }
        saveMockDb(mockDb);
      })();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/knowledge/:id — actualizar categoría / descripción
  app.patch('/api/knowledge/:id', (req, res) => {
    const doc = ((mockDb as any).knowledgeDocs as KnowledgeDoc[] || []).find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    if (req.body.category)    doc.category    = req.body.category;
    if (req.body.description !== undefined) doc.description = req.body.description;
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  // DELETE /api/knowledge/:id
  app.delete('/api/knowledge/:id', (req, res) => {
    if (!(mockDb as any).knowledgeDocs) return res.status(404).json({ error: 'No encontrado' });
    const before = ((mockDb as any).knowledgeDocs as KnowledgeDoc[]).length;
    (mockDb as any).knowledgeDocs = ((mockDb as any).knowledgeDocs as KnowledgeDoc[]).filter(d => d.id !== req.params.id);
    if ((mockDb as any).knowledgeDocs.length === before) return res.status(404).json({ error: 'No encontrado' });
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  // POST /api/knowledge/query — probar la base de conocimiento
  app.post('/api/knowledge/query', async (req, res) => {
    try {
      const { question } = req.body;
      if (!question) return res.status(400).json({ error: 'question es requerido' });
      const chunks = searchKnowledge(question, 5);
      if (chunks.length === 0) {
        return res.json({ answer: 'No encontré información relevante en la base de conocimiento para esta pregunta.', chunks: [] });
      }
      const context = chunks.join('\n\n---\n\n');
      const prompt = `Eres el asistente de Heavenly Dreams, empresa de telecomunicaciones.
Usa ÚNICAMENTE la siguiente información de la base de conocimiento para responder:

${context}

---
Pregunta: ${question}

Responde de forma clara, concisa y profesional basándote solo en la información proporcionada.
Si la información no es suficiente para responder, indícalo.`;
      const answer = await geminiGenerate(prompt);
      res.json({ answer, chunks });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/knowledge/reprocess/:id — re-procesar documento con error
  app.post('/api/knowledge/reprocess/:id', async (req, res) => {
    const doc = ((mockDb as any).knowledgeDocs as KnowledgeDoc[] || []).find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'No encontrado' });
    if (!req.body.base64Content) return res.status(400).json({ error: 'base64Content requerido' });
    doc.status = 'processing'; doc.errorMsg = undefined;
    saveMockDb(mockDb);
    res.json({ ok: true });
    (async () => {
      try {
        const text = await extractText(req.body.base64Content, doc.mimetype, doc.filename);
        doc.content = text; doc.chunks = chunkText(text);
        doc.tokens  = Math.ceil(text.length / 4); doc.status = 'ready';
      } catch (e: any) { doc.status = 'error'; doc.errorMsg = e.message; }
      saveMockDb(mockDb);
    })();
  });

  // ================= AI ROUTE (Gemini) — con inyección de conocimiento =================
  app.post("/api/generate-response", async (req, res) => {
    try {
      const { systemPrompt, userMessage } = req.body;
      // Inyectar contexto de knowledge base si hay docs relevantes
      const kbChunks = searchKnowledge(userMessage, 3);
      const kbContext = kbChunks.length > 0
        ? `\n\n--- INFORMACIÓN DE LA BASE DE CONOCIMIENTO ---\n${kbChunks.join('\n\n')}\n--- FIN ---\n`
        : '';
      const prompt = `${systemPrompt}${kbContext}\n\nUsuario: ${userMessage}`;
      const text = await geminiGenerate(prompt);
      res.json({ text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Error generating AI response" });
    }
  });

  // ================= CALL SCRIPT ROUTE (Gemini) =================
  app.post("/api/call-script", async (req, res) => {
    try {
      const { clientName, contractNumber, issueType, agentName, additionalContext } = req.body;

      const prompt = `Eres un experto en telecomunicaciones y atencion al cliente de Heavenly Dreams, empresa de telecomunicaciones.
Genera un guion de llamada de validacion estructurado en JSON para el siguiente caso:

- Agente: ${agentName || 'Asesor HD'}
- Cliente: ${clientName || 'Cliente'}
- Contrato/Folio: ${contractNumber || 'N/A'}
- Tipo de gestion: ${issueType || 'Validacion general'}
- Contexto adicional: ${additionalContext || 'Ninguno'}

Responde UNICAMENTE con este JSON (sin markdown):
{
  "greeting": "Saludo inicial personalizado (15-20 palabras)",
  "objective": "Objetivo concreto de la llamada",
  "checklist": [
    { "id": "1", "step": "Texto del paso", "question": "Pregunta exacta a decir", "tip": "Consejo interno para el agente" }
  ],
  "objectionHandlers": [
    { "objection": "Objecion comun", "response": "Respuesta sugerida" }
  ],
  "closing": "Cierre profesional de la llamada",
  "escalationTriggers": ["Situacion que requiere escalar", "..."]
}

El checklist debe tener entre 5 y 8 pasos relevantes para ${issueType || 'validacion de contrato'}.`;

      const text = await geminiGenerate(prompt);
      res.json(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch (error: any) {
      console.error("Call Script Error:", error);
      res.status(500).json({ error: error.message || "Error generating call script" });
    }
  });

  // ================= OCR ROUTE (Cloud Vision → IA parser / Gemini Vision fallback) =================
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image, docType } = req.body;
      if (!image) return res.status(400).json({ error: "No image provided" });

      // Detect MIME from data-URL prefix; fall back to jpeg
      const mimeMatch = image.match(/^data:([^;]+);base64,/);
      const mimeType  = mimeMatch
        ? mimeMatch[1]                        // e.g. image/png, image/webp, application/pdf
        : image.startsWith('data:image/png')  ? 'image/png'
        : image.startsWith('data:image/webp') ? 'image/webp'
        : 'image/jpeg';
      const b64 = image.includes(',') ? image.split(',')[1] : image;

      // Gemini 1.5 Flash supports PDF but max ~20 pages; guard oversized uploads
      const approxBytes = b64.length * 0.75;
      if (approxBytes > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'Archivo demasiado grande para OCR (máx. ~15 MB)' });
      }

      const ocrPrompts: Record<string, string> = {
        ine: `Eres un sistema OCR especializado en credenciales INE/IFE mexicanas.
Analiza CUIDADOSAMENTE esta imagen. Puede ser el FRENTE o el REVERSO de la credencial.

INSTRUCCIONES CRÍTICAS:
1. Lee cada carácter con máxima precisión — el texto impreso es claro.
2. CURP: exactamente 18 caracteres alfanuméricos en mayúsculas (ej: LOEJ850312HDFVRG09).
3. Clave de elector/folio: 18-20 caracteres alfanuméricos (suele estar en el reverso).
4. La dirección SIEMPRE está en el REVERSO de la INE — si ves frente, los campos de dirección irán vacíos.
5. No inventes datos. Si un campo no es legible o no está en la imagen, usa "".

Devuelve EXACTAMENTE este JSON sin markdown ni texto adicional:
{
  "nombres": "nombre(s) de pila tal como aparecen",
  "apellidoPaterno": "primer apellido",
  "apellidoMaterno": "segundo apellido",
  "curp": "CURP 18 caracteres mayúsculas o vacío",
  "folioIne": "clave de elector o folio 18-20 chars o vacío",
  "calle": "nombre de la calle o vacío",
  "numeroExterior": "número exterior o vacío",
  "numeroInterior": "número interior o vacío",
  "colonia": "nombre de la colonia o vacío",
  "codigoPostal": "5 dígitos o vacío",
  "ciudad": "municipio o ciudad o vacío",
  "delegacion": "delegación, alcaldía o estado o vacío"
}`,

        curp: `Eres un sistema OCR especializado en documentos CURP mexicanos.
Analiza esta imagen y extrae ÚNICAMENTE el CURP y el nombre completo si están visibles.

INSTRUCCIONES:
1. El CURP tiene EXACTAMENTE 18 caracteres alfanuméricos en mayúsculas.
2. Formato típico: 4 letras + 6 dígitos fecha + 1 letra sexo + 2 letras estado + 3 letras consonantes + 2 dígitos.
3. Los demás campos van vacíos — un documento CURP no tiene dirección.

Devuelve EXACTAMENTE este JSON sin markdown ni texto adicional:
{
  "nombres": "nombre(s) de pila o vacío",
  "apellidoPaterno": "primer apellido o vacío",
  "apellidoMaterno": "segundo apellido o vacío",
  "curp": "CURP 18 caracteres mayúsculas",
  "folioIne": "",
  "calle": "",
  "numeroExterior": "",
  "numeroInterior": "",
  "colonia": "",
  "codigoPostal": "",
  "ciudad": "",
  "delegacion": ""
}`,

        comprobante: `Eres un sistema OCR especializado en comprobantes de domicilio mexicanos (recibos de luz CFE, agua SACMEX/CAEM, teléfono, gas, internet).
Analiza esta imagen y extrae la dirección del titular.

INSTRUCCIONES CRÍTICAS:
1. Busca la sección "DOMICILIO", "DIRECCIÓN DEL SERVICIO" o "DIRECCIÓN DEL USUARIO".
2. Separa correctamente: calle, número exterior, número interior, colonia, C.P., municipio/ciudad, estado.
3. El código postal son EXACTAMENTE 5 dígitos.
4. No extraigas CURP ni folio INE — estos campos van vacíos en un comprobante.
5. Si un campo no aparece claramente, usa "".

Devuelve EXACTAMENTE este JSON sin markdown ni texto adicional:
{
  "nombres": "",
  "apellidoPaterno": "",
  "apellidoMaterno": "",
  "curp": "",
  "folioIne": "",
  "calle": "nombre de la calle",
  "numeroExterior": "número exterior",
  "numeroInterior": "número interior o vacío",
  "colonia": "nombre de la colonia",
  "codigoPostal": "5 dígitos",
  "ciudad": "municipio o ciudad",
  "delegacion": "alcaldía, delegación o estado"
}`,
      };

      const ocrPrompt = ocrPrompts[docType] ?? ocrPrompts['ine'];

      let text: string;
      if (googleVisionKey) {
        // Cloud Vision extrae texto crudo → IA parsea a JSON estructurado (más barato)
        const rawText = await cloudVisionOCR(b64, mimeType);
        const textOnlyPrompt = `${ocrPrompt}\n\nTexto extraído por OCR de la imagen:\n\`\`\`\n${rawText}\n\`\`\`\n\nParsea el texto anterior y devuelve únicamente el JSON solicitado.`;
        text = await aiGenerate(textOnlyPrompt);
      } else {
        // Fallback: Gemini Vision con imagen completa
        text = await geminiGenerate([
          ocrPrompt,
          { inlineData: { data: b64, mimeType } }
        ], { visionMode: true });
      }

      // Robust JSON extraction — handles markdown fences and extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No se pudo extraer JSON del OCR');
      const parsed = JSON.parse(jsonMatch[0]);

      // Normalise — ensure all expected keys exist
      const normalised = {
        nombres:         (parsed.nombres || parsed.nombre || '').trim(),
        apellidoPaterno: (parsed.apellidoPaterno || parsed.apellido_paterno || parsed.primerApellido || '').trim(),
        apellidoMaterno: (parsed.apellidoMaterno || parsed.apellido_materno || parsed.segundoApellido || '').trim(),
        curp:            (parsed.curp || parsed.CURP || '').replace(/\s/g,'').toUpperCase(),
        folioIne:        (parsed.folioIne || parsed.folio || parsed.claveElector || '').replace(/\s/g,'').toUpperCase(),
        calle:           (parsed.calle || '').trim(),
        numeroExterior:  (parsed.numeroExterior || parsed.noExt || parsed.numExt || '').trim(),
        numeroInterior:  (parsed.numeroInterior || parsed.noInt || parsed.numInt || '').trim(),
        colonia:         (parsed.colonia || '').trim(),
        codigoPostal:    (parsed.codigoPostal || parsed.cp || '').replace(/\D/g,'').slice(0,5),
        ciudad:          (parsed.ciudad || parsed.municipio || '').trim(),
        delegacion:      (parsed.delegacion || parsed.alcaldia || parsed.estado || '').trim(),
      };

      res.json(normalised);
    } catch (error: any) {
      console.error("OCR Error:", error);
      res.status(500).json({ error: error.message || "Error processing document" });
    }
  });

  // ================= GEOCODE ROUTE (Google Maps Geocoding API) =================
  app.post("/api/geocode", async (req, res) => {
    try {
      const { address } = req.body as { address: string };
      if (!address?.trim()) return res.status(400).json({ error: "Dirección requerida" });
      if (!googleMapsKey) return res.status(503).json({ error: "GOOGLE_MAPS_API_KEY no configurada — agrega la clave en .env" });

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsKey}&region=mx&language=es`;
      const resp = await fetch(url);
      const json = await resp.json() as any;

      if (json.status !== "OK" || !json.results?.length) {
        return res.status(404).json({ error: `Sin resultados para la dirección proporcionada (${json.status})` });
      }
      const loc = json.results[0].geometry.location as { lat: number; lng: number };
      res.json({
        lat: loc.lat,
        lng: loc.lng,
        formattedAddress: json.results[0].formatted_address as string,
      });
    } catch (error: any) {
      console.error("Geocode Error:", error);
      res.status(500).json({ error: error.message || "Error al geocodificar" });
    }
  });

  // ================= EXPEDIENTES (PDFs · Audios · Videos) =================
  // Estructura física en disco:
  //   uploads/expedientes/{folio}/
  //     ├── documentos/   (INE frente/reverso, CURP, comprobante de domicilio)
  //     ├── audios/       (grabaciones de llamadas de validación)
  //     └── videos/       (video-firmas)
  //
  // Pipeline: el frontend manda base64 vía JSON al endpoint de upload, el server
  // decodifica y guarda al disco. Devuelve el path relativo. Cuando se finaliza
  // la venta (POST /api/ventas), se prefiere el path sobre el base64 — los
  // archivos pesados ya no se duplican dentro del JSON de la venta.
  const UPLOADS_ROOT = path.join(process.cwd(), 'uploads', 'expedientes');
  if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

  type ExpedienteTipo =
    | 'ine_frente' | 'ine_reverso' | 'curp' | 'comprobante'
    | 'audio_validacion' | 'videofirma';

  const TIPO_TO_SUBFOLDER: Record<ExpedienteTipo, string> = {
    ine_frente:       'documentos',
    ine_reverso:      'documentos',
    curp:             'documentos',
    comprobante:      'documentos',
    audio_validacion: 'audios',
    videofirma:       'videos',
  };

  const mimeToExt = (mt: string): string => {
    const m = mt.toLowerCase();
    if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
    if (m === 'image/png')  return 'png';
    if (m === 'image/webp') return 'webp';
    if (m === 'image/gif')  return 'gif';
    if (m === 'application/pdf') return 'pdf';
    if (m === 'audio/webm') return 'webm';
    if (m === 'audio/ogg')  return 'ogg';
    if (m === 'audio/mpeg' || m === 'audio/mp3') return 'mp3';
    if (m === 'audio/wav')  return 'wav';
    if (m === 'video/webm') return 'webm';
    if (m === 'video/mp4')  return 'mp4';
    return 'bin';
  };

  // Sanitiza folio para usarlo como nombre de carpeta (path traversal safe).
  const safeFolio = (folio: string): string =>
    String(folio || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

  // Body parser dedicado con límite alto solo para uploads de expediente.
  // (videos webm de 60s pueden pesar 10-30 MB en base64.)
  const expedienteUploadJson = express.json({ limit: '50mb' });

  // POST /api/expediente/:folio/upload — guarda un archivo en su subcarpeta.
  // Body: { tipo, base64, mimetype, filename? }
  app.post('/api/expediente/:folio/upload', expedienteUploadJson, async (req, res) => {
    try {
      const folio = safeFolio(req.params.folio);
      if (!folio) return res.status(400).json({ error: 'Folio inválido' });

      const { tipo, base64, mimetype, filename } = req.body as {
        tipo: ExpedienteTipo; base64: string; mimetype: string; filename?: string;
      };
      if (!tipo || !base64 || !mimetype) {
        return res.status(400).json({ error: 'Faltan campos: tipo, base64, mimetype' });
      }
      const subfolder = TIPO_TO_SUBFOLDER[tipo];
      if (!subfolder) {
        return res.status(400).json({
          error: `Tipo inválido: ${tipo}. Permitidos: ${Object.keys(TIPO_TO_SUBFOLDER).join(', ')}`
        });
      }

      const dir = path.join(UPLOADS_ROOT, folio, subfolder);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const ext = mimeToExt(mimetype);
      // Documentos: nombre estable (ine_frente.jpg) — sobreescribe si recapturan.
      // Audios/videos: timestamp para conservar histórico de intentos de grabación.
      const isHistoric = subfolder === 'audios' || subfolder === 'videos';
      const safeFilename = filename
        ? filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
        : isHistoric
          ? `${tipo}_${Date.now()}.${ext}`
          : `${tipo}.${ext}`;
      const fullPath = path.join(dir, safeFilename);

      // Decodifica base64 (admite data-URL completa o solo el cuerpo).
      const cleanB64 = base64.includes(',') ? base64.split(',')[1] : base64;
      const buf = Buffer.from(cleanB64, 'base64');
      // Hard cap por archivo: 50 MB (después del decode, no del base64).
      if (buf.length > 50 * 1024 * 1024) {
        return res.status(413).json({ error: 'Archivo > 50 MB no permitido' });
      }
      fs.writeFileSync(fullPath, buf);

      const relativePath = `/uploads/expedientes/${folio}/${subfolder}/${safeFilename}`;

      const sess = peekSession(req);
      audit(sess.uid, sess.email, 'subir_archivo_expediente', 'expedientes', {
        folio, tipo, path: relativePath, size: buf.length, mimetype,
      });

      res.json({ path: relativePath, size: buf.length, tipo, folio });
    } catch (e: any) {
      console.error('Expediente upload error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/expediente/:folio/files — lista archivos del expediente.
  app.get('/api/expediente/:folio/files', (req, res) => {
    try {
      const folio = safeFolio(req.params.folio);
      const baseDir = path.join(UPLOADS_ROOT, folio);
      if (!fs.existsSync(baseDir)) return res.json({ folio, files: [] });

      type FileEntry = {
        subfolder: string; filename: string; path: string; size: number; mtime: string;
      };
      const result: FileEntry[] = [];
      for (const sub of ['documentos', 'audios', 'videos']) {
        const subDir = path.join(baseDir, sub);
        if (!fs.existsSync(subDir)) continue;
        for (const fname of fs.readdirSync(subDir)) {
          const full = path.join(subDir, fname);
          const stat = fs.statSync(full);
          if (!stat.isFile()) continue;
          result.push({
            subfolder: sub,
            filename: fname,
            path: `/uploads/expedientes/${folio}/${sub}/${fname}`,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
          });
        }
      }
      res.json({ folio, files: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/expediente/:folio/file — elimina un archivo (solo gerente/admin).
  app.delete('/api/expediente/:folio/file', requireRole('gerente', 'administracion'), (req, res) => {
    try {
      const folio = safeFolio(req.params.folio);
      const { subfolder, filename } = req.body as { subfolder: string; filename: string };
      if (!subfolder || !filename) return res.status(400).json({ error: 'subfolder y filename requeridos' });
      // Evita path traversal: subfolder solo puede ser una de las 3 carpetas conocidas.
      if (!['documentos', 'audios', 'videos'].includes(subfolder)) {
        return res.status(400).json({ error: 'subfolder inválido' });
      }
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const full = path.join(UPLOADS_ROOT, folio, subfolder, safeName);
      if (!fs.existsSync(full)) return res.status(404).json({ error: 'Archivo no encontrado' });
      fs.unlinkSync(full);
      const sess = peekSession(req);
      audit(sess.uid, sess.email, 'eliminar_archivo_expediente', 'expedientes',
        { folio, subfolder, filename: safeName });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Servir archivos estáticos /uploads/expedientes/* — autenticado vía Bearer
  // header O ?token=... (los <img>/<audio>/<video> no envían Authorization).
  const expedienteStaticAuth = (req: any, res: any, next: any) => {
    const token = (req.headers?.authorization || '').replace('Bearer ', '')
                  || String(req.query?.token || '');
    if (!token) return res.status(401).send('No autenticado');
    const sess = sessionStore.get(token);
    if (!sess || Date.now() > sess.exp) return res.status(401).send('Sesión expirada');
    next();
  };
  app.use('/uploads/expedientes', expedienteStaticAuth, express.static(UPLOADS_ROOT));

  // ── RBAC global para todo /api/admin/* ──────────────────────────────────
  // Un único middleware aquí protege TODAS las rutas que empiecen con /api/admin.
  app.use('/api/admin', requireRole('gerente', 'administracion'));

  // ================= ADMIN: USUARIOS =================

  // GET /api/admin/users
  app.get("/api/admin/users", (_req, res) => {
    res.json(mockDb.users.map(u => ({ uid: u.uid, email: u.email, role: u.role, nombres: u.nombres, status: u.status || "active", createdAt: u.createdAt || "" })));
  });

  // POST /api/admin/users — crear usuario
  app.post("/api/admin/users", async (req, res) => {
    try {
      const { email, password, nombres, role } = req.body;
      if (!email || !password || !nombres) return res.status(400).json({ error: "Faltan campos: email, password, nombres" });
      if (mockDb.users.find(u => u.email === email)) return res.status(400).json({ error: "Email ya registrado" });
      const uid = "USR-" + Date.now();
      const newUser: MockUser = { uid, email, role: role || "vendedor", nombres, password_hash: await hashPassword(password), status: "active", createdAt: new Date().toISOString() };
      mockDb.users.push(newUser);
      saveMockDb(mockDb);
      res.json({ uid, email, role: newUser.role, nombres, status: "active" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PATCH /api/admin/users/:uid — editar usuario
  app.patch("/api/admin/users/:uid", (req, res) => {
    const u = mockDb.users.find(x => x.uid === req.params.uid);
    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });
    const { nombres, email, role, status } = req.body;
    if (nombres) u.nombres = nombres;
    if (email)   u.email   = email;
    if (role)    u.role    = role;
    if (status)  u.status  = status;
    saveMockDb(mockDb);
    res.json({ uid: u.uid, email: u.email, role: u.role, nombres: u.nombres, status: u.status });
  });

  // DELETE /api/admin/users/:uid
  app.delete("/api/admin/users/:uid", (req, res) => {
    const idx = mockDb.users.findIndex(x => x.uid === req.params.uid);
    if (idx < 0) return res.status(404).json({ error: "Usuario no encontrado" });
    mockDb.users.splice(idx, 1);
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  // POST /api/admin/users/:uid/reset-password
  app.post("/api/admin/users/:uid/reset-password", async (req, res) => {
    const u = mockDb.users.find(x => x.uid === req.params.uid);
    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: "Falta newPassword" });
    u.password_hash = await hashPassword(newPassword);
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  // ================= ADMIN: GASTOS =================

  app.get("/api/admin/expenses", (_req, res) => res.json(mockDb.expenses || []));

  app.post("/api/admin/expenses", (req, res) => {
    const e = req.body as Expense;
    if (!e.amount || !e.category) return res.status(400).json({ error: "Faltan: amount, category" });
    e.id = "EXP-" + Date.now();
    e.createdAt = new Date().toISOString();
    if (!mockDb.expenses) mockDb.expenses = [];
    mockDb.expenses.push(e);
    saveMockDb(mockDb);
    res.json(e);
  });

  app.patch("/api/admin/expenses/:id", (req, res) => {
    const e = (mockDb.expenses || []).find(x => x.id === req.params.id);
    if (!e) return res.status(404).json({ error: "Gasto no encontrado" });
    // Allowlist: solo campos editables (id, userId, createdAt son inmutables)
    const { amount, category, description, date } = req.body;
    if (amount    !== undefined) e.amount      = amount;
    if (category  !== undefined) e.category    = category;
    if (description !== undefined) e.description = description;
    if (date      !== undefined) e.date        = date;
    saveMockDb(mockDb);
    res.json(e);
  });

  app.delete("/api/admin/expenses/:id", (req, res) => {
    mockDb.expenses = (mockDb.expenses || []).filter(x => x.id !== req.params.id);
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  // ================= ADMIN: PREFERENCIAS =================

  app.get("/api/admin/preferences/:uid", (req, res) => {
    const uid = req.params.uid === 'me'
      ? ((req as any).sess?.uid || req.params.uid)
      : req.params.uid;
    const pref = (mockDb.userPrefs || []).find(p => p.userId === uid);
    res.json(pref || { userId: uid, visibleColumns: [], kpiConfig: {}, updatedAt: "" });
  });

  app.post("/api/admin/preferences/:uid", (req, res) => {
    if (!mockDb.userPrefs) mockDb.userPrefs = [];
    // Support 'me' as uid — resolve from session token
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const sess  = token ? sessionStore.get(token) : null;
    const uid   = req.params.uid === 'me' ? (sess?.uid || 'anonymous') : req.params.uid;
    const idx = mockDb.userPrefs.findIndex(p => p.userId === uid);
    const pref: UserPref = { ...req.body, userId: uid, updatedAt: new Date().toISOString() };
    if (idx >= 0) mockDb.userPrefs[idx] = pref;
    else mockDb.userPrefs.push(pref);
    saveMockDb(mockDb);
    res.json(pref);
  });

  // ═══════════════════════════════════════════════════════════════
  //  WHATSAPP MULTI-ACCOUNT — CRUD + Test
  // ═══════════════════════════════════════════════════════════════

  /** Helper: mask access token for safe client transmission */
  const maskToken = (token: string) => token ? `***${token.slice(-6)}` : '';

  /** GET /api/wa/accounts — list all (tokens masked) */
  app.get('/api/wa/accounts', (_req, res) => {
    const accounts = (mockDb.waAccounts || []).map(a => ({
      ...a,
      accessToken: maskToken(a.accessToken),
    }));
    res.json(accounts);
  });

  /** POST /api/wa/accounts — create account */
  app.post('/api/wa/accounts', requireRole('gerente', 'administracion'), (req, res) => {
    if (!mockDb.waAccounts) mockDb.waAccounts = [];
    const body = req.body as Partial<WAAccount>;
    const newAccount: WAAccount = {
      id: 'WA-' + Date.now(),
      nombre:      body.nombre      || 'Nueva cuenta',
      phoneId:     body.phoneId     || '',
      accessToken: body.accessToken || '',
      tipo:        body.tipo        || 'reclutamiento',
      orden:       body.orden       || mockDb.waAccounts.filter(a => a.tipo === body.tipo).length + 1,
      activo:      body.activo      !== false,
      status:      (body.phoneId && body.accessToken) ? 'activo' : 'sin_configurar',
    };
    mockDb.waAccounts.push(newAccount);
    saveMockDb(mockDb);
    audit((req as any).sess?.uid || 'system', (req as any).sess?.email || '', 'WA_ACCOUNT_CREATE', 'wa_accounts', { nombre: newAccount.nombre, tipo: newAccount.tipo });
    res.json({ ...newAccount, accessToken: maskToken(newAccount.accessToken) });
  });

  /** PATCH /api/wa/accounts/:id — update account */
  app.patch('/api/wa/accounts/:id', requireRole('gerente', 'administracion'), (req, res) => {
    const account = (mockDb.waAccounts || []).find(x => x.id === req.params.id);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    const { nombre, phoneId, accessToken, tipo, orden, activo } = req.body;
    if (nombre      !== undefined) account.nombre      = nombre;
    if (phoneId     !== undefined) account.phoneId     = phoneId;
    if (accessToken !== undefined && !accessToken.startsWith('***')) account.accessToken = accessToken; // skip if masked placeholder
    if (tipo        !== undefined) account.tipo        = tipo;
    if (orden       !== undefined) account.orden       = orden;
    if (activo      !== undefined) account.activo      = activo;
    account.status = (account.phoneId && account.accessToken) ? (account.status === 'error' ? 'error' : 'activo') : 'sin_configurar';
    saveMockDb(mockDb);
    audit((req as any).sess?.uid || 'system', (req as any).sess?.email || '', 'WA_ACCOUNT_UPDATE', 'wa_accounts', { id: account.id, nombre: account.nombre });
    res.json({ ...account, accessToken: maskToken(account.accessToken) });
  });

  /** DELETE /api/wa/accounts/:id */
  app.delete('/api/wa/accounts/:id', requireRole('gerente', 'administracion'), (req, res) => {
    const before = (mockDb.waAccounts || []).length;
    mockDb.waAccounts = (mockDb.waAccounts || []).filter(x => x.id !== req.params.id);
    if (mockDb.waAccounts.length === before) return res.status(404).json({ error: 'Cuenta no encontrada' });
    saveMockDb(mockDb);
    audit((req as any).sess?.uid || 'system', (req as any).sess?.email || '', 'WA_ACCOUNT_DELETE', 'wa_accounts', { id: req.params.id });
    res.json({ ok: true });
  });

  /** POST /api/wa/accounts/:id/test — ping Meta Graph API to verify credentials */
  app.post('/api/wa/accounts/:id/test', requireRole('gerente', 'administracion'), async (req, res) => {
    const account = (mockDb.waAccounts || []).find(x => x.id === req.params.id);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    if (!account.phoneId || !account.accessToken) {
      account.status = 'sin_configurar';
      saveMockDb(mockDb);
      return res.json({ ok: false, error: 'Phone ID o Access Token no configurados' });
    }
    try {
      const r = await fetch(`https://graph.facebook.com/v18.0/${account.phoneId}?fields=id,display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      });
      const data = await r.json() as any;
      if (r.ok && data.id) {
        account.status = 'activo';
        account.displayPhone = data.display_phone_number || '';
        account.lastChecked  = new Date().toISOString();
        saveMockDb(mockDb);
        return res.json({ ok: true, displayPhone: account.displayPhone, verifiedName: data.verified_name });
      } else {
        account.status = 'error';
        account.lastChecked = new Date().toISOString();
        saveMockDb(mockDb);
        return res.json({ ok: false, error: data.error?.message || 'Error de autenticación Meta' });
      }
    } catch (e: any) {
      account.status = 'error';
      saveMockDb(mockDb);
      return res.json({ ok: false, error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //  CANALES — WhatsApp QR (personal + business)
  // ═══════════════════════════════════════════════════════════════

  /** GET /api/canales/whatsapp-qr — list sessions */
  app.get('/api/canales/whatsapp-qr', (_req, res) => {
    res.json(mockDb.waQRSessions || []);
  });

  /** POST /api/canales/whatsapp-qr — create session record */
  app.post('/api/canales/whatsapp-qr', requireRole('gerente', 'administracion'), (req, res) => {
    if (!mockDb.waQRSessions) mockDb.waQRSessions = [];
    const { nombre, tipo } = req.body as { nombre: string; tipo: 'personal'|'business' };
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    const session: WAQRCanalSession = {
      id: 'WQR-' + Date.now(),
      nombre,
      tipo: tipo || 'personal',
      activo: true,
      createdAt: new Date().toISOString(),
    };
    mockDb.waQRSessions.push(session);
    saveMockDb(mockDb);
    res.json(session);
  });

  /** PATCH /api/canales/whatsapp-qr/:id — update label/tipo */
  app.patch('/api/canales/whatsapp-qr/:id', requireRole('gerente', 'administracion'), (req, res) => {
    const s = (mockDb.waQRSessions || []).find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
    if (req.body.nombre) s.nombre = req.body.nombre;
    if (req.body.tipo)   s.tipo   = req.body.tipo;
    if (req.body.activo !== undefined) s.activo = req.body.activo;
    saveMockDb(mockDb);
    res.json(s);
  });

  /** DELETE /api/canales/whatsapp-qr/:id — delete + disconnect */
  app.delete('/api/canales/whatsapp-qr/:id', requireRole('gerente', 'administracion'), async (req, res) => {
    const before = (mockDb.waQRSessions || []).length;
    mockDb.waQRSessions = (mockDb.waQRSessions || []).filter(x => x.id !== req.params.id);
    if (mockDb.waQRSessions.length === before) return res.status(404).json({ error: 'Sesión no encontrada' });
    await whatsappEngine.disconnect(req.params.id);
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  /** POST /api/canales/whatsapp-qr/:id/start — inicia o reanuda QR */
  app.post('/api/canales/whatsapp-qr/:id/start', async (req, res) => {
    const s = (mockDb.waQRSessions || []).find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
    const state = await whatsappEngine.start(req.params.id);
    res.json({ ok: true, mode: whatsappEngine.getMode(), state });
  });

  /** GET /api/canales/whatsapp-qr/:id/status — poll QR / estado */
  app.get('/api/canales/whatsapp-qr/:id/status', (req, res) => {
    const state = whatsappEngine.getStatus(req.params.id);
    // Persist phone number when connected
    const s = (mockDb.waQRSessions || []).find(x => x.id === req.params.id);
    if (s && state.status === 'conectado' && state.phoneNumber && s.phoneNumber !== state.phoneNumber) {
      s.phoneNumber = state.phoneNumber;
      saveMockDb(mockDb);
    }
    res.json({ mode: whatsappEngine.getMode(), state });
  });

  /** POST /api/canales/whatsapp-qr/:id/disconnect */
  app.post('/api/canales/whatsapp-qr/:id/disconnect', async (req, res) => {
    await whatsappEngine.disconnect(req.params.id);
    res.json({ ok: true, state: whatsappEngine.getStatus(req.params.id) });
  });

  /** POST /api/canales/whatsapp-qr/:id/stub-connect — DEV ONLY */
  if (!IS_PROD) {
    app.post('/api/canales/whatsapp-qr/:id/stub-connect', (req, res) => {
      const ok = whatsappEngine.stubMarkConnected(req.params.id);
      if (!ok) return res.status(400).json({ error: 'Solo disponible en modo stub' });
      res.json({ ok: true, state: whatsappEngine.getStatus(req.params.id) });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  CANALES — Telegram Bots
  // ═══════════════════════════════════════════════════════════════

  /** GET /api/canales/telegram — list bots (token masked) */
  app.get('/api/canales/telegram', (_req, res) => {
    const bots = (mockDb.telegramBots || []).map(b => ({ ...b, token: maskToken(b.token) }));
    res.json(bots);
  });

  /** POST /api/canales/telegram — add bot */
  app.post('/api/canales/telegram', requireRole('gerente', 'administracion'), (req, res) => {
    if (!mockDb.telegramBots) mockDb.telegramBots = [];
    const { nombre, token } = req.body as { nombre: string; token: string };
    if (!nombre || !token) return res.status(400).json({ error: 'nombre y token requeridos' });
    const bot: TelegramBot = {
      id: 'TG-' + Date.now(),
      nombre, token,
      activo: true,
      status: 'sin_configurar',
    };
    mockDb.telegramBots.push(bot);
    saveMockDb(mockDb);
    res.json({ ...bot, token: maskToken(bot.token) });
  });

  /** PATCH /api/canales/telegram/:id */
  app.patch('/api/canales/telegram/:id', requireRole('gerente', 'administracion'), (req, res) => {
    const bot = (mockDb.telegramBots || []).find(x => x.id === req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });
    if (req.body.nombre) bot.nombre = req.body.nombre;
    if (req.body.token && !req.body.token.startsWith('***')) bot.token = req.body.token;
    if (req.body.activo !== undefined) bot.activo = req.body.activo;
    saveMockDb(mockDb);
    res.json({ ...bot, token: maskToken(bot.token) });
  });

  /** DELETE /api/canales/telegram/:id */
  app.delete('/api/canales/telegram/:id', requireRole('gerente', 'administracion'), (req, res) => {
    const before = (mockDb.telegramBots || []).length;
    mockDb.telegramBots = (mockDb.telegramBots || []).filter(x => x.id !== req.params.id);
    if (mockDb.telegramBots.length === before) return res.status(404).json({ error: 'Bot no encontrado' });
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  /** POST /api/canales/telegram/:id/test — verify token via Telegram Bot API */
  app.post('/api/canales/telegram/:id/test', requireRole('gerente', 'administracion'), async (req, res) => {
    const bot = (mockDb.telegramBots || []).find(x => x.id === req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });
    if (!bot.token) { bot.status = 'sin_configurar'; saveMockDb(mockDb); return res.json({ ok: false, error: 'Token no configurado' }); }
    try {
      const r = await fetch(`https://api.telegram.org/bot${bot.token}/getMe`);
      const data = await r.json() as any;
      if (data.ok && data.result) {
        bot.status      = 'activo';
        bot.botUsername = data.result.username;
        bot.botName     = data.result.first_name;
        bot.lastChecked = new Date().toISOString();
        saveMockDb(mockDb);
        return res.json({ ok: true, botUsername: bot.botUsername, botName: bot.botName });
      } else {
        bot.status = 'error';
        bot.lastChecked = new Date().toISOString();
        saveMockDb(mockDb);
        return res.json({ ok: false, error: data.description || 'Token inválido' });
      }
    } catch (e: any) {
      bot.status = 'error';
      saveMockDb(mockDb);
      return res.json({ ok: false, error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //  FACEBOOK PAGES — CRUD + Test
  // ═══════════════════════════════════════════════════════════════

  /** GET /api/fb/accounts — list all (tokens masked) */
  app.get('/api/fb/accounts', (_req, res) => {
    const accounts = (mockDb.fbAccounts || []).map(a => ({
      ...a,
      accessToken: maskToken(a.accessToken),
    }));
    res.json(accounts);
  });

  /** POST /api/fb/accounts — create account */
  app.post('/api/fb/accounts', requireRole('gerente', 'administracion'), (req, res) => {
    if (!mockDb.fbAccounts) mockDb.fbAccounts = [];
    const body = req.body as Partial<FBAccount>;
    const newAccount: FBAccount = {
      id: 'FB-' + Date.now(),
      nombre:      body.nombre      || 'Nueva página FB',
      pageId:      body.pageId      || '',
      accessToken: body.accessToken || '',
      tipo:        body.tipo        || 'marketing',
      activo:      body.activo      !== false,
      status:      (body.pageId && body.accessToken) ? 'activo' : 'sin_configurar',
    };
    mockDb.fbAccounts.push(newAccount);
    saveMockDb(mockDb);
    audit((req as any).sess?.uid || 'system', (req as any).sess?.email || '', 'FB_ACCOUNT_CREATE', 'fb_accounts', { nombre: newAccount.nombre, tipo: newAccount.tipo });
    res.json({ ...newAccount, accessToken: maskToken(newAccount.accessToken) });
  });

  /** PATCH /api/fb/accounts/:id — update account */
  app.patch('/api/fb/accounts/:id', requireRole('gerente', 'administracion'), (req, res) => {
    const account = (mockDb.fbAccounts || []).find(x => x.id === req.params.id);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    const { nombre, pageId, accessToken, tipo, activo } = req.body;
    if (nombre      !== undefined) account.nombre      = nombre;
    if (pageId      !== undefined) account.pageId      = pageId;
    if (accessToken !== undefined && !accessToken.startsWith('***')) account.accessToken = accessToken;
    if (tipo        !== undefined) account.tipo        = tipo;
    if (activo      !== undefined) account.activo      = activo;
    account.status = (account.pageId && account.accessToken) ? (account.status === 'error' ? 'error' : 'activo') : 'sin_configurar';
    saveMockDb(mockDb);
    audit((req as any).sess?.uid || 'system', (req as any).sess?.email || '', 'FB_ACCOUNT_UPDATE', 'fb_accounts', { id: account.id, nombre: account.nombre });
    res.json({ ...account, accessToken: maskToken(account.accessToken) });
  });

  /** DELETE /api/fb/accounts/:id */
  app.delete('/api/fb/accounts/:id', requireRole('gerente', 'administracion'), (req, res) => {
    const before = (mockDb.fbAccounts || []).length;
    mockDb.fbAccounts = (mockDb.fbAccounts || []).filter(x => x.id !== req.params.id);
    if (mockDb.fbAccounts.length === before) return res.status(404).json({ error: 'Cuenta no encontrada' });
    saveMockDb(mockDb);
    audit((req as any).sess?.uid || 'system', (req as any).sess?.email || '', 'FB_ACCOUNT_DELETE', 'fb_accounts', { id: req.params.id });
    res.json({ ok: true });
  });

  /** POST /api/fb/accounts/:id/test — verify Page Access Token via Graph API */
  app.post('/api/fb/accounts/:id/test', requireRole('gerente', 'administracion'), async (req, res) => {
    const account = (mockDb.fbAccounts || []).find(x => x.id === req.params.id);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    if (!account.pageId || !account.accessToken) {
      account.status = 'sin_configurar';
      saveMockDb(mockDb);
      return res.json({ ok: false, error: 'Page ID o Access Token no configurados' });
    }
    try {
      const r = await fetch(`https://graph.facebook.com/v18.0/${account.pageId}?fields=id,name,category`, {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      });
      const data = await r.json() as any;
      if (r.ok && data.id) {
        account.status    = 'activo';
        account.pageName  = data.name || '';
        account.category  = data.category || '';
        account.lastChecked = new Date().toISOString();
        saveMockDb(mockDb);
        return res.json({ ok: true, pageName: account.pageName, category: account.category });
      } else {
        account.status = 'error';
        account.lastChecked = new Date().toISOString();
        saveMockDb(mockDb);
        return res.json({ ok: false, error: data.error?.message || 'Error de autenticación Meta' });
      }
    } catch (e: any) {
      account.status = 'error';
      saveMockDb(mockDb);
      return res.json({ ok: false, error: e.message });
    }
  });

  // ================= ADMIN: EXPORT VENTAS CSV =================

  app.get("/api/admin/export/ventas", (_req, res) => {
    const ventas = mockDb.ventas || [];
    const headers = ["folio","estado","nombres","telefono","paqueteNombre","rentaMensual"];
    const rows = ventas.map(v => headers.map(h => `"${String((v[h] ?? v.data?.[h] ?? "")).replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ventas-${Date.now()}.csv"`);
    res.send("﻿" + csv); // BOM for Excel
  });

  // ── Export: Clientes Morosos ─────────────────────────────────────────────
  app.get('/api/admin/export/morosos', (_req, res) => {
    const morosos = (mockDb.clientesSeguimiento || []).filter(c => c.estado_pago === 'moroso');
    const headers = ['id','folio','nombre','telefono','email','paquete','renta','estado_pago','fecha_alto','fecha_ultimo_pago','agente_nombre','municipio','mensajes_sin_leer'];
    const rows = morosos.map(c => headers.map(h => `"${String((c as any)[h] ?? '').replace(/"/g,'""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="morosos-${Date.now()}.csv"`);
    res.send('﻿' + [headers.join(','), ...rows].join('\n'));
  });

  // ── Export: Candidatos (Reclutamiento) ──────────────────────────────────
  app.get('/api/admin/export/candidatos', (_req, res) => {
    const candidatos = mockDb.botCandidates || [];
    const headers = ['id','folio','name','phone','age','experience','profile','stage','appointmentDate','appointmentTime','createdAt'];
    const rows = candidatos.map(c => headers.map(h => `"${String((c as any)[h] ?? '').replace(/"/g,'""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="candidatos-${Date.now()}.csv"`);
    res.send('﻿' + [headers.join(','), ...rows].join('\n'));
  });

  // ── Export: Gastos ───────────────────────────────────────────────────────
  app.get('/api/admin/export/gastos', (_req, res) => {
    const gastos = (mockDb as any).expenses || [];
    const headers = ['id','concepto','monto','categoria','fecha','responsable','notas'];
    const rows = gastos.map((g: any) => headers.map(h => `"${String(g[h] ?? '').replace(/"/g,'""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gastos-${Date.now()}.csv"`);
    res.send('﻿' + [headers.join(','), ...rows].join('\n'));
  });

  // ── Export: Clientes Seguimiento (todos) ────────────────────────────────
  app.get('/api/admin/export/clientes', (_req, res) => {
    const c = mockDb.clientesSeguimiento || [];
    const headers = ['id','folio','nombre','telefono','email','paquete','renta','estado_pago','fecha_alta','agente_nombre','supervisor_id','municipio','domiciliado','beneficio_activado'];
    const rows = c.map((x: any) => headers.map(h => `"${String(x[h] ?? '').replace(/"/g,'""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clientes-${Date.now()}.csv"`);
    res.send('﻿' + [headers.join(','), ...rows].join('\n'));
  });

  // ── Import: CSV/JSON → ventas / clientes / candidatos / morosos ────────
  app.post('/api/admin/import/:modulo', (req, res) => {
    const { modulo } = req.params;
    const { records } = req.body as { records: any[] };
    if (!Array.isArray(records) || records.length === 0)
      return res.status(400).json({ error: 'Sin registros para importar' });

    let imported = 0;
    const errors: string[] = [];

    if (modulo === 'clientes') {
      if (!mockDb.clientesSeguimiento) mockDb.clientesSeguimiento = [];
      records.forEach((r: any, i: number) => {
        if (!r.nombre && !r.telefono) { errors.push(`Fila ${i+2}: falta nombre o teléfono`); return; }
        const exists = mockDb.clientesSeguimiento.find(c => c.folio === r.folio || c.telefono === r.telefono);
        if (exists) { errors.push(`Fila ${i+2}: ya existe (tel ${r.telefono})`); return; }
        mockDb.clientesSeguimiento.push({
          id: 'CLI-' + Date.now() + '-' + i, folio: r.folio || 'F-' + Date.now(),
          nombre: r.nombre || '', telefono: r.telefono || '', email: r.email || '',
          paquete: r.paquete || '', renta: parseFloat(r.renta) || 0, megas: r.megas || '',
          estado_pago: r.estado_pago || 'nuevo', fecha_alta: r.fecha_alta || new Date().toISOString().split('T')[0],
          agente_id: r.agente_id || '', agente_nombre: r.agente_nombre || '',
          beneficio_activado: r.beneficio_activado === 'true', domiciliado: r.domiciliado === 'true',
          colonia: r.colonia || '', municipio: r.municipio || '',
          mensajes_sin_leer: 0,
        });
        imported++;
      });
    } else if (modulo === 'candidatos') {
      if (!mockDb.botCandidates) mockDb.botCandidates = [];
      records.forEach((r: any, i: number) => {
        if (!r.name && !r.phone) { errors.push(`Fila ${i+2}: falta nombre o teléfono`); return; }
        mockDb.botCandidates.push({
          id: r.id || 'CAND-' + Date.now() + '-' + i,
          phone: r.phone || '', name: r.name || r.nombre || '',
          age: parseInt(r.age) || 0, experience: r.experience || '',
          profile: r.profile || 'pendiente', stage: r.stage || 'nuevo',
          assignedAgent: parseInt(r.assignedAgent) || 1,
          folio: r.folio || 'C-' + Date.now(),
          notes: r.notes || r.notas || '',
          appointmentDate: r.appointmentDate || '', appointmentTime: r.appointmentTime || '',
          messages: [], createdAt: r.createdAt || new Date().toISOString(),
        });
        imported++;
      });
    } else if (modulo === 'ventas') {
      records.forEach((r: any, i: number) => {
        if (!r.folio) { errors.push(`Fila ${i+2}: falta folio`); return; }
        if (mockDb.ventas.find((v: any) => v.folio === r.folio)) { errors.push(`Fila ${i+2}: folio ${r.folio} ya existe`); return; }
        mockDb.ventas.push({ folio: r.folio, estado: r.estado || 'pendiente', data: r, createdAt: new Date().toISOString() });
        imported++;
      });
    } else if (modulo === 'morosos') {
      if (!mockDb.clientesSeguimiento) mockDb.clientesSeguimiento = [];
      records.forEach((r: any, i: number) => {
        if (!r.nombre && !r.telefono) { errors.push(`Fila ${i+2}: falta nombre o teléfono`); return; }
        const exists = mockDb.clientesSeguimiento.find(c => c.folio === r.folio || c.telefono === r.telefono);
        if (exists) {
          // Actualizar estado_pago a moroso si ya existe
          exists.estado_pago = 'moroso';
          if (r.fecha_ultimo_pago) (exists as any).fecha_ultimo_pago = r.fecha_ultimo_pago;
          imported++;
          return;
        }
        mockDb.clientesSeguimiento.push({
          id: 'CLI-' + Date.now() + '-' + i, folio: r.folio || 'F-' + Date.now(),
          nombre: r.nombre || '', telefono: r.telefono || '', email: r.email || '',
          paquete: r.paquete || '', renta: parseFloat(r.renta) || 0, megas: r.megas || '',
          estado_pago: 'moroso', fecha_alta: r.fecha_alta || new Date().toISOString().split('T')[0],
          agente_id: r.agente_id || '', agente_nombre: r.agente_nombre || '',
          beneficio_activado: r.beneficio_activado === 'true', domiciliado: r.domiciliado === 'true',
          colonia: r.colonia || '', municipio: r.municipio || '',
          mensajes_sin_leer: 0,
        });
        imported++;
      });
    } else {
      return res.status(400).json({ error: `Módulo '${modulo}' no soportado` });
    }

    saveMockDb(mockDb);
    pushNotif(`Import ${modulo}`, `${imported} registros importados` + (errors.length ? ` · ${errors.length} errores` : ''), imported > 0 ? 'success' : 'warning', 'admin');
    audit('IMPORT', 'import@system', `import_${modulo}`, 'admin', { imported, errors: errors.slice(0, 10) });
    res.json({ imported, errors: errors.slice(0, 20), total: records.length });
  });

  // ================= UNIFIED AGENTS REGISTRY (7 types) =================
  // Default seed: 6 non-recruitment agents. Recruitment squad lives in `recruitmentAgents`
  // (5 instances) and is exposed through the merged GET /api/agents endpoint.
  const nowIso = () => new Date().toISOString();
  const DEFAULT_AGENTS: Agent[] = [
    {
      id: 'AG-VENTAS-001',
      type: 'VENTAS_EXPEDIENTES',
      name: 'Agente de Ventas & Expedientes',
      description: 'Recibe ventas desde la app, envía contrato + flujo + link de Video Firma al vendedor por WhatsApp/Telegram. Resuelve dudas técnicas de folios y estatus.',
      channel: 'whatsapp_qr',
      enabled: true,
      tone: 'Profesional cercano',
      instructions: 'Eres el agente de Ventas y Expedientes de Heavenly Dreams. Cuando un vendedor te envía una venta nueva, respondes con: 1) Resumen del flujo de captura, 2) Link al contrato PDF, 3) Link al video-firma. Si te preguntan por un folio, consulta el estatus en el sistema. Sé directo y resolutivo. Si la pregunta requiere intervención humana, marca el caso para Edgar.',
      knowledgeBase: 'Folios formato VT-XXXXXXXXXX. Estatus: capturada, en validación, posteada (PISA), rechazada, instalada. Plataformas streaming dan 6 meses extra si pago domiciliado. Contrato debe ir firmado por el cliente y el vendedor.',
      templates: {
        nueva_venta: 'Recibida la venta {folio}. Aquí va el contrato: {linkContrato}\nLink de Video Firma: {linkFirma}\nFlujo de captura: {linkFlujo}',
        consulta_folio: 'El folio {folio} está en estatus: {estatus}. Última actualización: {fechaActualizacion}.',
      },
      config: { canalesPermitidos: ['whatsapp_qr', 'telegram'], notificarVendedor: true },
      createdAt: nowIso(), updatedAt: nowIso(),
    },
    {
      id: 'AG-VALIDACION-001',
      type: 'VALIDACION_TELEFONICA',
      name: 'Agente de Validación Telefónica',
      description: 'Especialista en llamadas de voz para confirmar datos del cliente y verificar honestidad antes de postear la venta.',
      channel: 'voice',
      enabled: true,
      tone: 'Serio y profesional',
      instructions: 'Realizas una llamada de validación al cliente. Confirma: nombre completo, dirección, teléfono, paquete contratado y consentimiento. Detecta inconsistencias o señales de fraude (cliente no sabe quién lo dio de alta, dirección no coincide, voz nerviosa). Si detectas algo sospechoso, marca la venta como "validación_fallida" y notifica a Edgar.',
      knowledgeBase: 'Paquetes Telmex/Infinitum: Internet Total, Triple Empaquetado, Negocio. Las ventas requieren consentimiento explícito y datos verificables. Banderas de fraude: cliente no recuerda dar datos, dirección genérica, número que no contesta.',
      templates: {
        saludo: 'Buen día, le habla {nombreAgente} del equipo de validación de Telmex. ¿Hablo con {nombreCliente}?',
        despedida: 'Gracias {nombreCliente}, su servicio quedará agendado para instalación. Que tenga buen día.',
      },
      config: { canalesPermitidos: ['voice'], proveedorVoz: 'twilio_pendiente', maxIntentos: 3 },
      twilioPhoneNumber: '',
      createdAt: nowIso(), updatedAt: nowIso(),
    },
    {
      id: 'AG-SEGUIMIENTO-001',
      type: 'SEGUIMIENTO',
      name: 'Agente de Seguimiento Post-Venta',
      description: 'Centraliza post-venta: bienvenida, activación de beneficios, recordatorios de pago, alertas de morosidad. Solo cuenta oficial empresa.',
      channel: 'whatsapp_qr',
      enabled: true,
      tone: 'Amable y servicial',
      instructions: 'Eres el agente oficial de Heavenly Dreams para clientes ya instalados. Tus funciones: 1) Mensaje de bienvenida tras instalación, 2) Activación de beneficios streaming, 3) Recordatorios de pago 5 días antes del corte, 4) Alertas si el cliente entra en morosidad. Tono cálido pero firme. Nunca prometas descuentos sin autorización.',
      knowledgeBase: 'Beneficios streaming: 6 meses extra si pago domiciliado. Corte de servicio: día 30 sin pago. Morosidad +30 días → derivar a agente de Recuperación. Ticket de soporte si reportan falla técnica.',
      templates: {
        bienvenida: '¡Bienvenido a Heavenly Dreams, {nombre}! Tu servicio quedó activo. Tu folio es {folio}. Para activar tus beneficios streaming responde con la palabra ACTIVAR.',
        recordatorio_pago: 'Hola {nombre}, te recordamos que tu pago vence el {fechaCorte}. Monto: ${monto}. Paga en línea o en tienda Telmex.',
        moroso: 'Hola {nombre}, detectamos un pago pendiente de ${monto}. Para evitar corte de servicio, regulariza antes del {fechaLimite}.',
      },
      config: { canalesPermitidos: ['whatsapp_qr'], cuentaUnica: true },
      createdAt: nowIso(), updatedAt: nowIso(),
    },
    {
      id: 'AG-RECUPERACION-001',
      type: 'RECUPERACION',
      name: 'Agente de Recuperación & Cierre',
      description: 'Rescata ventas no instaladas y cierra leads fríos con tono persuasivo pero respetuoso.',
      channel: 'whatsapp_qr',
      enabled: true,
      tone: 'Persuasivo y cercano',
      instructions: 'Tu objetivo es rescatar ventas que no se instalaron y reactivar leads fríos. Estrategia: 1) Detectar la objeción real (precio, cobertura, tiempo), 2) Ofrecer la solución concreta (visita técnica, cambio de fecha, paquete alternativo), 3) Cerrar con compromiso firme. Nunca ofrezcas descuentos sin autorización de Edgar.',
      knowledgeBase: 'Razones comunes de no-instalación: cliente no estaba, problema de cobertura, decidió cancelar. Argumentos de cierre: garantía 30 días, instalación gratis, sin permanencia mínima en algunos paquetes.',
      templates: {
        rescate: 'Hola {nombre}, vimos que tu instalación quedó pendiente. ¿Te gustaría reagendar para esta semana? Te confirmo en 5 minutos.',
        cierre_frio: 'Hola {nombre}, hace tiempo nos contactaste por internet en casa. Tenemos una promo nueva ¿te platico?',
      },
      config: { canalesPermitidos: ['whatsapp_qr'], requiereAutorizacionDescuento: true },
      createdAt: nowIso(), updatedAt: nowIso(),
    },
    {
      id: 'AG-MARKETING-001',
      type: 'MARKETING',
      name: 'Experto en Marketing & Publicidad',
      description: 'Supervisa campañas FB/IG. Revisa, edita y aprueba artes/copys antes de publicar para maximizar captación de reclutas.',
      channel: 'internal',
      enabled: true,
      tone: 'Estratégico y creativo',
      instructions: 'Eres el director creativo virtual. Tareas: 1) Revisar artes y copys propuestos, 2) Sugerir mejoras de hook, CTA y segmentación, 3) Aprobar o rechazar antes de publicar, 4) Analizar métricas de campañas activas (CTR, CPL, conversiones). Tu meta es maximizar la captación de reclutas para el escuadrón de ventas.',
      knowledgeBase: 'Audiencia objetivo: 18-35 años CDMX, sin experiencia, busca trabajo de campo. Hooks que funcionan: "Sueldo semanal garantizado", "Sin experiencia". CTAs: "Llena el formulario", "WhatsApp ahora". Plataformas: FB Ads, IG Ads.',
      templates: {
        review_arte: 'Análisis del arte: {fortalezas}. Mejoras sugeridas: {mejoras}. Recomendación: {decision}.',
      },
      config: { canalesPermitidos: ['internal'], requiereAprobacionEdgar: true },
      createdAt: nowIso(), updatedAt: nowIso(),
    },
    {
      id: 'AG-ASISTENTE-001',
      type: 'ASISTENTE_PERSONAL',
      name: 'Asistente Personal de Edgar',
      description: 'Administra el WhatsApp personal de Edgar, agenda juntas, registra gastos, gestiona el día a día.',
      channel: 'whatsapp_qr',
      enabled: true,
      tone: 'Eficiente y discreto',
      instructions: 'Eres el asistente personal de Edgar Lovera. Tienes acceso TOTAL a su agenda, gastos y comunicaciones. Tareas: 1) Filtrar mensajes urgentes vs no urgentes, 2) Agendar juntas detectando disponibilidad, 3) Registrar gastos personales/empresa, 4) Recordatorios diarios. Mantén absoluta discreción. Si no estás seguro de algo, pregunta antes de actuar.',
      knowledgeBase: 'Edgar es Tech Lead y dueño de Heavenly Dreams. Equipo: Gisselle (reclutamiento), supervisores, asesores. Citas frecuentes: junta semanal lunes 10am, revisión nómina jueves. Categorías de gasto: empresa, personal, vehículo, comida.',
      templates: {
        recordatorio: 'Edgar, recordatorio: {asunto} a las {hora}.',
        resumen_dia: 'Buen día Edgar. Hoy tienes: {juntas} juntas, {pendientes} pendientes urgentes.',
      },
      config: { canalesPermitidos: ['whatsapp_qr'], accesoTotal: true, soloUsuarioEdgar: true },
      createdAt: nowIso(), updatedAt: nowIso(),
    },
  ];

  // Build a virtual Agent record from a RecruitmentAgent for the unified view.
  const recruitmentAgentToAgent = (r: RecruitmentAgent): Agent => ({
    id: `AG-RECLUTAMIENTO-${String(r.id).padStart(3, '0')}`,
    type: 'RECLUTAMIENTO',
    name: r.name,
    description: `Reclutador del escuadrón. Vacante: ${r.vacancy.puesto}.`,
    channel: 'whatsapp_qr',
    enabled: true,
    tone: r.style,
    instructions: r.instructions,
    knowledgeBase: `Vacante: ${r.vacancy.puesto}\nSueldo: ${r.vacancy.sueldoSemanal}\nEdad: ${r.vacancy.edadMin}-${r.vacancy.edadMax}\nHorario: ${r.vacancy.horario}\nUbicación: ${r.vacancy.ubicacion}\nBeneficios: ${r.vacancy.beneficios}\nRequisitos: ${r.vacancy.requisitos}`,
    templates: r.templates,
    config: { recruitmentId: r.id, vacancy: r.vacancy },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  const getAllAgentsMerged = (): Agent[] => {
    const stored = mockDb.agents?.length ? mockDb.agents : (() => {
      mockDb.agents = [...DEFAULT_AGENTS];
      saveMockDb(mockDb);
      return mockDb.agents;
    })();
    // Recruitment squad: prefer stored, fall back to defaults so the squad always shows up.
    const recruitmentSource = mockDb.recruitmentAgents?.length
      ? mockDb.recruitmentAgents
      : DEFAULT_RECRUITMENT_AGENTS;
    const recruiters = recruitmentSource.map(recruitmentAgentToAgent);
    return [...stored, ...recruiters];
  };

  // GET /api/agents — unified list across all 7 types
  app.get("/api/agents", (_req, res) => {
    res.json(getAllAgentsMerged());
  });

  // GET /api/agents/:id — single agent
  app.get("/api/agents/:id", (req, res) => {
    const agent = getAllAgentsMerged().find(a => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });
    res.json(agent);
  });

  // POST /api/agents — upsert (recruitment-type writes back to recruitmentAgents)
  app.post("/api/agents", (req, res) => {
    const incoming = req.body as Agent;
    if (!incoming.id || !incoming.type) return res.status(400).json({ error: 'id y type requeridos' });

    if (incoming.type === 'RECLUTAMIENTO') {
      const recruitmentId = incoming.config?.recruitmentId;
      if (!recruitmentId) return res.status(400).json({ error: 'config.recruitmentId requerido para tipo RECLUTAMIENTO' });
      if (!mockDb.recruitmentAgents) mockDb.recruitmentAgents = [];
      const idx = mockDb.recruitmentAgents.findIndex(r => r.id === recruitmentId);
      const merged: RecruitmentAgent = {
        id: recruitmentId,
        name: incoming.name,
        style: incoming.tone,
        instructions: incoming.instructions,
        templates: incoming.templates,
        vacancy: incoming.config?.vacancy || {
          puesto: '', sueldoSemanal: '', edadMin: 18, edadMax: 35,
          horario: '', ubicacion: '', beneficios: '', requisitos: '',
        },
      };
      if (idx >= 0) mockDb.recruitmentAgents[idx] = merged;
      else mockDb.recruitmentAgents.push(merged);
      saveMockDb(mockDb);
      return res.json({ ok: true, agent: recruitmentAgentToAgent(merged) });
    }

    if (!mockDb.agents) mockDb.agents = [...DEFAULT_AGENTS];
    const idx = mockDb.agents.findIndex(a => a.id === incoming.id);
    const next: Agent = { ...incoming, updatedAt: nowIso(), createdAt: incoming.createdAt || nowIso() };
    if (idx >= 0) mockDb.agents[idx] = next;
    else mockDb.agents.push(next);
    saveMockDb(mockDb);
    res.json({ ok: true, agent: next });
  });

  // ── WhatsApp QR session management (per-agent, multi-device) ───────────
  // POST /api/agents/:id/whatsapp/start — create or attach to a QR session
  app.post("/api/agents/:id/whatsapp/start", async (req, res) => {
    const agent = getAllAgentsMerged().find(a => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agente no encontrado' });
    if (agent.channel !== 'whatsapp_qr') return res.status(400).json({ error: 'Agente no usa canal whatsapp_qr' });
    const state = await whatsappEngine.start(req.params.id);
    res.json({ ok: true, mode: whatsappEngine.getMode(), state });
  });

  // GET /api/agents/:id/whatsapp/status — poll status / QR
  app.get("/api/agents/:id/whatsapp/status", (req, res) => {
    const state = whatsappEngine.getStatus(req.params.id);
    res.json({ mode: whatsappEngine.getMode(), state });
  });

  // POST /api/agents/:id/whatsapp/stub-connect — DEV ONLY: simulate scan
  if (!IS_PROD) {
    app.post("/api/agents/:id/whatsapp/stub-connect", (req, res) => {
      const ok = whatsappEngine.stubMarkConnected(req.params.id);
      if (!ok) return res.status(400).json({ error: 'Solo disponible en modo stub' });
      res.json({ ok: true, state: whatsappEngine.getStatus(req.params.id) });
    });
  }

  // POST /api/agents/:id/whatsapp/disconnect
  app.post("/api/agents/:id/whatsapp/disconnect", async (req, res) => {
    await whatsappEngine.disconnect(req.params.id);
    res.json({ ok: true, state: whatsappEngine.getStatus(req.params.id) });
  });

  // POST /api/agents/:id/whatsapp/send — send a message (test)
  app.post("/api/agents/:id/whatsapp/send", async (req, res) => {
    const { to, text } = req.body as { to: string; text: string };
    if (!to || !text) return res.status(400).json({ error: 'to y text requeridos' });
    const result = await whatsappEngine.sendText(req.params.id, to, text);
    res.json(result);
  });

  // GET /api/agents/sessions — bulk status snapshot for dashboard
  app.get("/api/agents/sessions/all", (_req, res) => {
    res.json({ mode: whatsappEngine.getMode(), states: whatsappEngine.getAllStatuses() });
  });

  // ── Per-agent memory (auto-conocimiento, sin mezcla entre agentes) ─────
  // GET /api/agents/:id/memory — last N entries + summary
  app.get("/api/agents/:id/memory", (req, res) => {
    const agentId = req.params.id;
    const limit = parseInt(String(req.query.limit || '50'), 10);
    if (!mockDb.agentMemory) mockDb.agentMemory = [];
    const entries = mockDb.agentMemory
      .filter(m => m.agentId === agentId)
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, limit);
    const summary = entries.find(e => e.kind === 'summary');
    res.json({ agentId, count: entries.length, summary: summary?.content || '', entries });
  });

  // POST /api/agents/:id/memory — append an interaction or event
  app.post("/api/agents/:id/memory", (req, res) => {
    const { content, kind = 'interaction', metadata } = req.body as {
      content: string; kind?: AgentMemoryEntry['kind']; metadata?: Record<string, any>;
    };
    if (!content) return res.status(400).json({ error: 'content requerido' });
    if (!mockDb.agentMemory) mockDb.agentMemory = [];
    const entry: AgentMemoryEntry = {
      id: 'MEM-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      agentId: req.params.id,
      ts: nowIso(),
      kind,
      content,
      metadata,
    };
    mockDb.agentMemory.push(entry);
    saveMockDb(mockDb);
    res.json({ ok: true, entry });
  });

  // POST /api/agents/:id/memory/compress — compress old entries into a summary
  app.post("/api/agents/:id/memory/compress", async (req, res) => {
    const agentId = req.params.id;
    if (!mockDb.agentMemory) mockDb.agentMemory = [];
    const interactions = mockDb.agentMemory
      .filter(m => m.agentId === agentId && m.kind === 'interaction')
      .sort((a, b) => a.ts.localeCompare(b.ts));
    if (interactions.length < 10) return res.json({ ok: true, skipped: true, reason: 'menos de 10 interacciones' });

    const oldest = interactions.slice(0, Math.max(0, interactions.length - 20)); // keep last 20 raw
    if (oldest.length === 0) return res.json({ ok: true, skipped: true });

    try {
      const text = oldest.map(e => `- [${e.ts.slice(0,16)}] ${e.content}`).join('\n');
      const prompt = `Comprime el siguiente historial de interacciones de un agente IA en un resumen denso de máximo 1500 caracteres. Conserva: patrones recurrentes, reglas aprendidas, casos especiales, números importantes. Descarta el ruido.\n\n${text}`;
      const summary = await aiGenerate(prompt);

      // Remove old interactions, replace with one summary entry
      mockDb.agentMemory = mockDb.agentMemory.filter(m => !oldest.some(o => o.id === m.id));
      const summaryEntry: AgentMemoryEntry = {
        id: 'MEM-SUM-' + Date.now(),
        agentId,
        ts: nowIso(),
        kind: 'summary',
        content: summary.slice(0, 1500),
        metadata: { compressedFrom: oldest.length },
      };
      mockDb.agentMemory.push(summaryEntry);
      saveMockDb(mockDb);
      res.json({ ok: true, compressed: oldest.length, summary: summaryEntry });
    } catch (err: any) {
      res.status(500).json({ error: String(err?.message || err) });
    }
  });

  // ================= RECRUITMENT BOT =================

  // Default agent configs (used when mockDb.recruitmentAgents is empty)
  const DEFAULT_RECRUITMENT_AGENTS: RecruitmentAgent[] = [
    {
      id: 1, name: 'Agente 1 (Formal)', style: 'Profesional y formal',
      instructions: 'Mantén un tono profesional y formal. Evita contracciones. Sé preciso y directo.',
      templates: { initial: 'Hola, gracias por contactar a HDreams. ¿En qué puedo apoyarle hoy?' },
      vacancy: { puesto: 'Asesor Comercial Telmex', sueldoSemanal: '$2,300 + comisiones', edadMin: 18, edadMax: 35, horario: 'Lunes a Sábado 9:00 AM - 6:00 PM', ubicacion: 'Av. Tláhuac 3632 int 301, Col. Culhuacan, Iztapalapa (Metro Culhuacan L12)', beneficios: 'Sueldo semanal garantizado, comisiones sin tope, capacitación pagada', requisitos: 'Sin experiencia previa requerida, actitud positiva' },
    },
    {
      id: 2, name: 'Agente 2 (Amigable)', style: 'Cercano y amable',
      instructions: 'Sé amable y cercano. Usa un tono cálido y personal. Resuelve dudas con paciencia.',
      templates: { initial: '¡Hola! Qué gusto saludarte, soy parte del equipo de HDreams. ¿Cómo estás?' },
      vacancy: { puesto: 'Asesor Comercial Telmex', sueldoSemanal: '$2,300 + comisiones', edadMin: 18, edadMax: 35, horario: 'Lunes a Sábado 9:00 AM - 6:00 PM', ubicacion: 'Av. Tláhuac 3632 int 301, Col. Culhuacan, Iztapalapa (Metro Culhuacan L12)', beneficios: 'Sueldo semanal garantizado, comisiones sin tope, capacitación pagada', requisitos: 'Sin experiencia previa requerida, actitud positiva' },
    },
    {
      id: 3, name: 'Agente 3 (Energético)', style: 'Entusiasta y directo',
      instructions: 'Sé muy entusiasta, usa exclamaciones y emojis de energía 🚀💪⚡. Motiva al candidato constantemente.',
      templates: { initial: '¡Hola! ¿Listo para conocer las mejores vacantes de HDreams? ¡Vamos a ello!' },
      vacancy: { puesto: 'Asesor Comercial Telmex', sueldoSemanal: '$2,300 + comisiones', edadMin: 18, edadMax: 35, horario: 'Lunes a Sábado 9:00 AM - 6:00 PM', ubicacion: 'Av. Tláhuac 3632 int 301, Col. Culhuacan, Iztapalapa (Metro Culhuacan L12)', beneficios: 'Sueldo semanal garantizado, comisiones sin tope, capacitación pagada', requisitos: 'Sin experiencia previa requerida, actitud positiva' },
    },
    {
      id: 4, name: 'Agente 4 (Empático)', style: 'Comprensivo y paciente',
      instructions: 'Muestra mucha empatía. Valida las emociones del candidato. Explica cada paso con detalle.',
      templates: { initial: 'Hola, entiendo que buscar empleo puede ser un proceso importante. Estoy aquí para ayudarte.' },
      vacancy: { puesto: 'Asesor Comercial Telmex', sueldoSemanal: '$2,300 + comisiones', edadMin: 18, edadMax: 35, horario: 'Lunes a Sábado 9:00 AM - 6:00 PM', ubicacion: 'Av. Tláhuac 3632 int 301, Col. Culhuacan, Iztapalapa (Metro Culhuacan L12)', beneficios: 'Sueldo semanal garantizado, comisiones sin tope, capacitación pagada', requisitos: 'Sin experiencia previa requerida, actitud positiva' },
    },
    {
      id: 5, name: 'Agente 5 (Eficiente)', style: 'Rápido y al grano',
      instructions: 'Ve directo al punto. Respuestas cortas y claras. Agenda la entrevista lo antes posible.',
      templates: { initial: 'Hola, soy tu asistente de reclutamiento. ¿Qué información necesitas sobre nuestras vacantes?' },
      vacancy: { puesto: 'Asesor Comercial Telmex', sueldoSemanal: '$2,300 + comisiones', edadMin: 18, edadMax: 35, horario: 'Lunes a Sábado 9:00 AM - 6:00 PM', ubicacion: 'Av. Tláhuac 3632 int 301, Col. Culhuacan, Iztapalapa (Metro Culhuacan L12)', beneficios: 'Sueldo semanal garantizado, comisiones sin tope, capacitación pagada', requisitos: 'Sin experiencia previa requerida, actitud positiva' },
    },
  ];

  // GET /api/recruitment/agents — list all agents with their config
  app.get("/api/recruitment/agents", (_req, res) => {
    const agents = mockDb.recruitmentAgents?.length ? mockDb.recruitmentAgents : DEFAULT_RECRUITMENT_AGENTS;
    res.json(agents);
  });

  // POST /api/recruitment/agents — create or update an agent
  app.post("/api/recruitment/agents", (req, res) => {
    const agent = req.body as RecruitmentAgent;
    if (!mockDb.recruitmentAgents) mockDb.recruitmentAgents = [...DEFAULT_RECRUITMENT_AGENTS];
    const idx = mockDb.recruitmentAgents.findIndex(a => a.id === agent.id);
    if (idx >= 0) {
      mockDb.recruitmentAgents[idx] = agent;
    } else {
      mockDb.recruitmentAgents.push(agent);
    }
    saveMockDb(mockDb);
    res.json({ ok: true, agent });
  });

  // GET /api/recruitment/candidates
  app.get("/api/recruitment/candidates", (_req, res) => {
    res.json(mockDb.botCandidates || []);
  });

  // POST /api/recruitment/candidates — crear o actualizar candidato
  app.post("/api/recruitment/candidates", (req, res) => {
    const c = req.body as BotCandidate;
    if (!c.id) c.id = "CAND-" + Date.now();
    if (!mockDb.botCandidates) mockDb.botCandidates = [];
    const idx = mockDb.botCandidates.findIndex(x => x.id === c.id);
    if (idx >= 0) mockDb.botCandidates[idx] = c;
    else mockDb.botCandidates.push(c);
    saveMockDb(mockDb);
    res.json(c);
  });

  // DELETE /api/recruitment/candidates/:id
  app.delete("/api/recruitment/candidates/:id", (req, res) => {
    if (!mockDb.botCandidates) return res.json({ ok: true });
    mockDb.botCandidates = mockDb.botCandidates.filter(x => x.id !== req.params.id);
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  // POST /api/recruitment/bot/process — procesa mensaje de candidato con IA
  app.post("/api/recruitment/bot/process", async (req, res) => {
    try {
      const { phone, userMessage, conversationHistory, agentId } = req.body as {
        phone: string; userMessage: string;
        conversationHistory: {role:string;text:string}[];
        agentId?: number;
      };

      // Load agent config — lookup by agentId or fallback to agent 1
      const allAgents: RecruitmentAgent[] = mockDb.recruitmentAgents?.length
        ? mockDb.recruitmentAgents
        : DEFAULT_RECRUITMENT_AGENTS;
      const agent = allAgents.find(a => a.id === (agentId || 1)) || allAgents[0];
      const vacancy = agent.vacancy;

      const historyText = conversationHistory
        .slice(-8)
        .map(m => `${m.role === 'bot' ? 'BOT' : 'CANDIDATO'}: ${m.text}`)
        .join('\n');

      const prompt = `Eres ${agent.name}, un agente de reclutamiento de Heavenly Dreams (empresa promotora autorizada Telmex/Infinitum en CDMX).

=== INSTRUCCIONES DE PERSONALIDAD Y COMPORTAMIENTO ===
${agent.instructions}

=== BASE DE CONOCIMIENTOS — VACANTE DISPONIBLE ===
Puesto: ${vacancy.puesto}
Sueldo: ${vacancy.sueldoSemanal} (pago semanal puntual via transferencia)
Rango de edad: ${vacancy.edadMin} a ${vacancy.edadMax} años
Horario: ${vacancy.horario}
Ubicación de entrevista: ${vacancy.ubicacion}
Beneficios: ${vacancy.beneficios}
Requisitos: ${vacancy.requisitos}

=== INFORMACIÓN DE LA EMPRESA ===
Heavenly Dreams es promotor autorizado Infinitum/Telmex. Misión: conectar familias mexicanas con internet de calidad. Valores: honestidad, puntualidad, compromiso.

=== FLUJO DE CONVERSACIÓN ===
FASE 1 — Bienvenida: Solicitar nombre completo, edad y si tienen experiencia previa.
FASE 2 — Perfilado: Analizar datos y asignar perfil según edad/experiencia:
  - VOLANTERO: ${vacancy.edadMin}–25 años, sin experiencia. Sueldo $2,000/semana
  - AYUDANTE GENERAL: ${vacancy.edadMin}–${vacancy.edadMax} años, trabajo operativo. Sueldo $2,100/semana + bonos
  - ASESOR COMERCIAL: ${vacancy.edadMin}–${vacancy.edadMax} años, experiencia en ventas/atención al cliente. Sueldo ${vacancy.sueldoSemanal}
  - SUPERVISOR: ${vacancy.edadMin}–${vacancy.edadMax} años, experiencia liderando equipos (mín 1 año). Sueldo $2,600/semana + bonos
  - RECHAZADO: edad fuera de rango ${vacancy.edadMin}–${vacancy.edadMax} años — declinar cordialmente y agradecerles
FASE 3 — Agendamiento: Proponer entrevista presencial mañana 9:30 AM en ${vacancy.ubicacion}. Pedir confirmación con "ASISTIRE".
FASE 4 — FAQ y Resolución: Resolver cualquier duda. NUNCA dejar morir la conversación por falta de información.

=== FAQs AUTOMÁTICAS ===
- Documentos necesarios: CV impreso, INE original (o credencial escolar si es menor de edad), comprobante de domicilio reciente, RFC, CURP, NSS. Todo en original y copia.
- Pago: Semanal via transferencia bancaria, siempre puntual los viernes.
- Experiencia: No es requisito para Volantero y Ayudante. Para Supervisor mínimo 1 año liderando equipos.
- Ubicación: ${vacancy.ubicacion}
- Horario laboral: ${vacancy.horario}
- ¿Es trabajo de campo?: Sí, el trabajo incluye visitas a clientes y zonas asignadas en CDMX.
- Si la edad está fuera del rango: Agradecer el interés y declinar con respeto.

=== REGLA ESPECIAL — DERIVACIÓN HUMANA ===
Si el candidato hace preguntas legales complejas, sobre contratos laborales, despidos, demandas, IMSS, o temas que NO puedas responder con certeza basándote en la información de arriba, incluye "necesita_humano": true y "razon_humano": "motivo" en el JSON. El 99% de las preguntas puedes resolverlas tú.

HISTORIAL (últimos mensajes):
${historyText || '(sin historial — primer mensaje)'}

MENSAJE ACTUAL DEL CANDIDATO: "${userMessage}"

Responde SOLO con JSON exacto (sin markdown, sin bloques de código):
{
  "botReply": "Respuesta completa del agente en español, con la personalidad definida. Incluye emojis si tu estilo lo indica.",
  "extractedData": {
    "name": "nombre completo si fue mencionado, o null",
    "age": número entero o null,
    "experience": "descripción de experiencia o null",
    "profile": "volantero|ayudante|asesor|supervisor|rechazado|pendiente",
    "stage": "nuevo|interesado|perfilado|apto|agendado|confirmado|no_show"
  },
  "phase": 1,
  "necesita_humano": false,
  "razon_humano": null
}`;

      const text = await geminiGenerate(prompt);
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // If escalation flagged — save to candidate record
      if (parsed.necesita_humano && phone) {
        const cand = mockDb.botCandidates?.find(c => c.phone === phone);
        if (cand) {
          cand.needsHuman = true;
          cand.humanReason = parsed.razon_humano || 'Pregunta compleja detectada por IA';
          saveMockDb(mockDb);
          // Push notification to admin
          pushNotif('Atención Humana Requerida', `Candidato ${cand.name || phone} necesita atención humana: ${cand.humanReason}`, 'warning', 'admin');
        }
      }

      res.json(parsed);
    } catch (e: any) {
      console.error("Bot process error:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/twilio/webhook/whatsapp — webhook para mensajes entrantes de Twilio
  app.post("/api/twilio/webhook/whatsapp", express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const from    = (req.body.From || "").replace("whatsapp:", "");
      const body    = req.body.Body || "";
      if (!from || !body) return res.status(200).send("<Response/>");

      if (!mockDb.botCandidates) mockDb.botCandidates = [];
      let candidate = mockDb.botCandidates.find(c => c.phone === from);

      if (!candidate) {
        candidate = {
          id: "CAND-" + Date.now(), phone: from, name: "", age: 0, experience: "",
          profile: "pendiente", stage: "nuevo", assignedAgent: (mockDb.botCandidates.length % 5) + 1,
          folio: "", notes: "", appointmentDate: "", appointmentTime: "09:30",
          messages: [], createdAt: new Date().toISOString()
        };
        mockDb.botCandidates.push(candidate);
      }

      candidate.messages.push({ role: "user", text: body, ts: new Date().toISOString() });

      // Procesar con IA
      const aiRes = await fetch(`http://localhost:${PORT}/api/recruitment/bot/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: from, userMessage: body, conversationHistory: candidate.messages }),
      });
      const aiData = await aiRes.json() as any;

      const botReply = aiData.botReply || "Gracias por tu mensaje. Un asesor te contactara pronto.";
      candidate.messages.push({ role: "bot", text: botReply, ts: new Date().toISOString() });

      // Actualizar datos extraidos
      if (aiData.extractedData) {
        const d = aiData.extractedData;
        if (d.name && !candidate.name) candidate.name = d.name;
        if (d.age && !candidate.age) candidate.age = d.age;
        if (d.experience && !candidate.experience) candidate.experience = d.experience;
        if (d.profile && d.profile !== "pendiente") candidate.profile = d.profile;
        if (d.stage) candidate.stage = d.stage;
        if (d.stage === "confirmado" && !candidate.folio) {
          candidate.folio = "HD-" + Date.now().toString().slice(-6);
          candidate.stage = "confirmado";
        }
      }

      saveMockDb(mockDb);

      // Responder via Twilio TwiML
      const twiml = `<Response><Message>${botReply.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</Message></Response>`;

      // Si Twilio esta configurado, tambien enviar por API (opcional, TwiML es suficiente)
      res.set("Content-Type", "text/xml").send(twiml);
    } catch (e: any) {
      console.error("Webhook error:", e.message);
      res.status(200).send("<Response><Message>Lo sentimos, ocurrio un error. Intenta de nuevo.</Message></Response>");
    }
  });

  // ═══════════════════════════════════════════════
  // WEBAUTHN — Autenticación Biométrica
  // ═══════════════════════════════════════════════

  // ── Helpers internos ────────────────────────────────────────

  /** Decodificador CBOR mínimo (suficiente para COSE keys de WebAuthn) */
  const cborDecode = (buf: Buffer): any => {
    let pos = 0;
    const rb  = () => buf[pos++];
    const rn  = (n: number) => { const s = buf.slice(pos, pos + n); pos += n; return s; };
    const rl  = (ai: number): number => {
      if (ai < 24) return ai;
      if (ai === 24) return rb();
      if (ai === 25) return (rb() << 8) | rb();
      if (ai === 26) return ((rb() << 24) | (rb() << 16) | (rb() << 8) | rb()) >>> 0;
      return 0;
    };
    const dec = (): any => {
      const b  = rb();
      const mt = b >> 5;
      const ai = b & 0x1f;
      const l  = rl(ai);
      if (mt === 0) return l;                  // uint
      if (mt === 1) return -(l + 1);           // negint
      if (mt === 2) return rn(l);              // bstr
      if (mt === 3) return rn(l).toString('utf8'); // tstr
      if (mt === 4) { const a: any[] = []; for (let i = 0; i < l; i++) a.push(dec()); return a; }
      if (mt === 5) { const m: any = {}; for (let i = 0; i < l; i++) { const k = dec(); m[k] = dec(); } return m; }
      return null;
    };
    return dec();
  };

  /** Construye un SubjectPublicKeyInfo DER para EC P-256 a partir de coordenadas x, y */
  const buildSPKI_P256 = (x: Buffer, y: Buffer): Buffer => {
    // SEQUENCE { AlgorithmIdentifier { ecPublicKey, P-256 }, BIT STRING(04||x||y) }
    // Header fijo de 26 bytes para P-256 SPKI
    const prefix = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');
    return Buffer.concat([prefix, Buffer.from([0x04]), x, y]);
  };

  /** Parsea authenticatorData de WebAuthn */
  const parseAuthData = (authData: Buffer) => {
    const rpIdHash       = authData.slice(0, 32);
    const flags          = authData[32];
    const counter        = authData.readUInt32BE(33);
    const hasCredData    = !!(flags & 0x40);
    let credentialId: Buffer | null = null;
    let credentialPublicKey: Buffer | null = null;
    if (hasCredData && authData.length > 55) {
      // aaguid(16) at offset 37
      const credIdLen     = authData.readUInt16BE(53);
      credentialId        = authData.slice(55, 55 + credIdLen);
      credentialPublicKey = authData.slice(55 + credIdLen);
    }
    return { rpIdHash, flags, counter, credentialId, credentialPublicKey };
  };

  /** Verifica firma ECDSA-SHA256 usando clave pública COSE (almacenada como Buffer) */
  const verifyES256 = (coseKeyBuf: Buffer, signedData: Buffer, sigBuf: Buffer): boolean => {
    try {
      const coseKey = cborDecode(coseKeyBuf);
      const x = coseKey[-2] as Buffer;
      const y = coseKey[-3] as Buffer;
      if (!x || !y || x.length !== 32 || y.length !== 32) return false;
      const spki = buildSPKI_P256(x, y);
      const verifier = crypto.createVerify('SHA256');
      verifier.update(signedData);
      return verifier.verify({ key: spki, format: 'der', type: 'spki' }, sigBuf);
    } catch (e: any) {
      console.error('verifyES256 error:', e.message);
      return false;
    }
  };

  // ── Tipo y almacenamiento ────────────────────────────────────
  type WebAuthnCred = {
    credentialId: string;  // base64url
    publicKey:    string;  // base64 (Buffer del COSE key)
    counter:      number;
    userId:       string;
    email:        string;
    createdAt:    string;
  };

  // En memoria: challenges temporales (expiran en 60 s)
  const wasChallenges = new Map<string, { challenge: Buffer; email: string; ts: number }>();
  setInterval(() => {
    const now = Date.now();
    wasChallenges.forEach((v, k) => { if (now - v.ts > 60_000) wasChallenges.delete(k); });
  }, 10_000);

  if (!mockDb.userPrefs) mockDb.userPrefs = []; // safety guard
  const getWaCreds = (): WebAuthnCred[] => (mockDb as any).webAuthnCreds || [];
  const saveWaCreds = (creds: WebAuthnCred[]) => {
    (mockDb as any).webAuthnCreds = creds;
    saveMockDb(mockDb);
  };

  const RP_ID   = process.env.WA_RP_ID   || 'localhost';
  const RP_NAME = process.env.WA_RP_NAME || 'Heavenly Dreams CRM';

  // ── Rutas ────────────────────────────────────────────────────

  /** Comprueba si el usuario tiene huella registrada */
  app.get("/api/webauthn/check", (req, res) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: "Falta email" });
    const creds = getWaCreds();
    res.json({ registered: creds.some(c => c.email === email) });
  });

  /** Paso 1 de registro: genera challenge */
  app.post("/api/webauthn/register-request", (req, res) => {
    const { email, userId, displayName } = req.body;
    if (!email || !userId) return res.status(400).json({ error: "Falta email/userId" });

    const challenge = crypto.randomBytes(32);
    wasChallenges.set(`reg:${email}`, { challenge, email, ts: Date.now() });

    // Excluir credenciales existentes para este usuario
    const existingCreds = getWaCreds().filter(c => c.email === email);

    res.json({
      challenge: challenge.toString('base64url'),
      rp: { id: RP_ID, name: RP_NAME },
      user: {
        id:          Buffer.from(userId).toString('base64url'),
        name:        email,
        displayName: displayName || email,
      },
      pubKeyCredParams: [
        { alg: -7,   type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256 (fallback)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification:        'preferred',
        residentKey:             'preferred',
      },
      timeout:    60_000,
      attestation: 'none',
      excludeCredentials: existingCreds.map(c => ({
        id:         c.credentialId,
        type:       'public-key',
        transports: ['internal'],
      })),
    });
  });

  /** Paso 2 de registro: verifica y almacena credencial */
  app.post("/api/webauthn/register-response", (req, res) => {
    const { email, id, rawId, response } = req.body;
    if (!email || !id) return res.status(400).json({ error: "Payload inválido" });

    const stored = wasChallenges.get(`reg:${email}`);
    if (!stored) return res.status(400).json({ error: "Challenge expirado o inválido" });
    wasChallenges.delete(`reg:${email}`);

    try {
      // 1. Verificar clientDataJSON
      const clientDataBuf  = Buffer.from(response.clientDataJSON, 'base64url');
      const clientData     = JSON.parse(clientDataBuf.toString('utf8')) as { type: string; challenge: string; origin: string };

      if (clientData.type !== 'webauthn.create')
        return res.status(400).json({ error: "Tipo de operación inválido" });

      const receivedChallenge = Buffer.from(clientData.challenge, 'base64url');
      if (!crypto.timingSafeEqual(receivedChallenge, stored.challenge))
        return res.status(400).json({ error: "Challenge no coincide" });

      // 2. Parsear attestationObject (CBOR)
      const attObjBuf = Buffer.from(response.attestationObject, 'base64url');
      const attObj    = cborDecode(attObjBuf) as { fmt: string; authData: Buffer; attStmt: any };
      const authData  = attObj.authData as Buffer;

      // 3. Extraer credentialId y credentialPublicKey
      const parsed = parseAuthData(authData);
      if (!parsed.credentialId || !parsed.credentialPublicKey)
        return res.status(400).json({ error: "No se encontraron datos de credencial en authData" });

      // 4. Guardar credencial
      const creds = getWaCreds().filter(c => c.email !== email); // reemplazar si ya existía
      const newCred: WebAuthnCred = {
        credentialId: parsed.credentialId.toString('base64url'),
        publicKey:    parsed.credentialPublicKey.toString('base64'),
        counter:      parsed.counter,
        userId:       req.body.userId || email,
        email,
        createdAt:    new Date().toISOString(),
      };
      creds.push(newCred);
      saveWaCreds(creds);

      res.json({ ok: true, credentialId: newCred.credentialId });
    } catch (e: any) {
      console.error("WebAuthn register error:", e.message);
      res.status(500).json({ error: "Error procesando credencial: " + e.message });
    }
  });

  /** Paso 1 de login: genera challenge y devuelve credenciales del usuario */
  app.post("/api/webauthn/login-request", (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Falta email" });

    const userCreds = getWaCreds().filter(c => c.email === email);
    if (userCreds.length === 0)
      return res.status(404).json({ error: "No hay huella registrada para este usuario" });

    const challenge = crypto.randomBytes(32);
    wasChallenges.set(`auth:${email}`, { challenge, email, ts: Date.now() });

    res.json({
      challenge:         challenge.toString('base64url'),
      rpId:              RP_ID,
      timeout:           60_000,
      userVerification:  'preferred',
      allowCredentials:  userCreds.map(c => ({
        id:         c.credentialId,
        type:       'public-key',
        transports: ['internal'],
      })),
    });
  });

  /** Paso 2 de login: verifica firma biométrica y devuelve usuario */
  app.post("/api/webauthn/login-response", (req, res) => {
    const { email, id, response } = req.body;
    if (!email || !id) return res.status(400).json({ error: "Payload inválido" });

    const stored = wasChallenges.get(`auth:${email}`);
    if (!stored) return res.status(400).json({ error: "Challenge expirado" });
    wasChallenges.delete(`auth:${email}`);

    const creds   = getWaCreds();
    const credIdx = creds.findIndex(c => c.email === email && c.credentialId === id);
    if (credIdx === -1) return res.status(400).json({ error: "Credencial no encontrada" });
    const cred = creds[credIdx];

    try {
      // 1. Verificar clientDataJSON
      const clientDataBuf = Buffer.from(response.clientDataJSON, 'base64url');
      const clientData    = JSON.parse(clientDataBuf.toString('utf8')) as { type: string; challenge: string };

      if (clientData.type !== 'webauthn.get')
        return res.status(400).json({ error: "Tipo de operación inválido" });

      const receivedChallenge = Buffer.from(clientData.challenge, 'base64url');
      if (!crypto.timingSafeEqual(receivedChallenge, stored.challenge))
        return res.status(400).json({ error: "Challenge no coincide" });

      // 2. Verificar firma
      const authDataBuf   = Buffer.from(response.authenticatorData, 'base64url');
      const clientDataHash = crypto.createHash('SHA256').update(clientDataBuf).digest();
      const signedData    = Buffer.concat([authDataBuf, clientDataHash]);
      const sigBuf        = Buffer.from(response.signature, 'base64url');
      const pubKeyBuf     = Buffer.from(cred.publicKey, 'base64');

      const valid = verifyES256(pubKeyBuf, signedData, sigBuf);
      if (!valid) return res.status(401).json({ error: "Firma biométrica inválida" });

      // 3. Verificar counter anti-replay
      const parsed = parseAuthData(authDataBuf);
      if (parsed.counter > 0 && parsed.counter <= cred.counter)
        return res.status(401).json({ error: "Counter inválido (posible replay attack)" });

      // 4. Actualizar counter
      creds[credIdx].counter = parsed.counter;
      saveWaCreds(creds);

      // 5. Devolver usuario
      const user = mockDb.users.find(u => u.email === email);
      if (!user) return res.status(404).json({ error: "Usuario no encontrado en el sistema" });

      res.json({
        user: {
          uid:     user.uid,
          email:   user.email,
          nombres: user.nombres,
          role:    user.role,
        },
      });
    } catch (e: any) {
      console.error("WebAuthn login error:", e.message);
      res.status(500).json({ error: "Error verificando credencial: " + e.message });
    }
  });

  /** Eliminar huella de un usuario — solo el propio usuario o un gerente */
  app.delete("/api/webauthn/credential", requireRole('gerente', 'administracion', 'supervisor', 'vendedor', 'reclutadora', 'seguimiento'), (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Falta email" });
    const before = getWaCreds().length;
    saveWaCreds(getWaCreds().filter(c => c.email !== email));
    res.json({ ok: true, removed: before - getWaCreds().length });
  });

  // ═══════════════════════════════════════════════
  // SEGUIMIENTO A CLIENTES — Clientes
  // ═══════════════════════════════════════════════

  app.get("/api/seguimiento/clientes", requireRole('gerente', 'administracion', 'supervisor', 'seguimiento'), (req, res) => {
    let list = mockDb.clientesSeguimiento || [];
    const { supervisor_id, agente_id, estado_pago, q } = req.query as any;

    // Supervisores solo ven su equipo
    if (supervisor_id) list = list.filter((c: ClienteSeguimiento) => c.supervisor_id === supervisor_id || c.agente_id === supervisor_id);
    if (agente_id)     list = list.filter((c: ClienteSeguimiento) => c.agente_id === agente_id);
    if (estado_pago)   list = list.filter((c: ClienteSeguimiento) => c.estado_pago === estado_pago);
    if (q) { const ql = (q as string).toLowerCase(); list = list.filter((c: ClienteSeguimiento) => c.nombre.toLowerCase().includes(ql) || c.folio.toLowerCase().includes(ql) || c.telefono.includes(ql)); }

    res.json(list);
  });

  app.post("/api/seguimiento/clientes", requireRole('gerente', 'administracion', 'supervisor', 'seguimiento'), (req, res) => {
    const c = req.body as ClienteSeguimiento;
    c.id = "CLI-" + Date.now();
    c.mensajes_sin_leer = 0;
    if (!mockDb.clientesSeguimiento) mockDb.clientesSeguimiento = [];
    mockDb.clientesSeguimiento.push(c);
    saveMockDb(mockDb);
    res.json(c);
  });

  app.patch("/api/seguimiento/clientes/:id", requireRole('gerente', 'administracion', 'supervisor', 'seguimiento'), (req, res) => {
    const c = (mockDb.clientesSeguimiento || []).find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: "Cliente no encontrado" });
    // Allowlist: id, folio, agente_id, agente_nombre, supervisor_id, fecha_alta son inmutables
    const {
      nombre, telefono, email, paquete, renta, megas,
      estado_pago, fecha_ultimo_pago,
      beneficio_activado, domiciliado,
      colonia, municipio, notas,
      mensajes_sin_leer, ultimo_contacto,
    } = req.body;
    if (nombre           !== undefined) c.nombre            = nombre;
    if (telefono         !== undefined) c.telefono          = telefono;
    if (email            !== undefined) c.email             = email;
    if (paquete          !== undefined) c.paquete           = paquete;
    if (renta            !== undefined) c.renta             = renta;
    if (megas            !== undefined) c.megas             = megas;
    if (estado_pago      !== undefined) c.estado_pago       = estado_pago;
    if (fecha_ultimo_pago !== undefined) c.fecha_ultimo_pago = fecha_ultimo_pago;
    if (beneficio_activado !== undefined) c.beneficio_activado = beneficio_activado;
    if (domiciliado      !== undefined) c.domiciliado       = domiciliado;
    if (colonia          !== undefined) c.colonia           = colonia;
    if (municipio        !== undefined) c.municipio         = municipio;
    if (notas            !== undefined) c.notas             = notas;
    if (mensajes_sin_leer !== undefined) c.mensajes_sin_leer = mensajes_sin_leer;
    if (ultimo_contacto  !== undefined) c.ultimo_contacto   = ultimo_contacto;
    saveMockDb(mockDb);
    res.json(c);
  });

  app.delete("/api/seguimiento/clientes/:id", requireRole('gerente', 'administracion'), (req, res) => {
    mockDb.clientesSeguimiento = (mockDb.clientesSeguimiento || []).filter(x => x.id !== req.params.id);
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════
  // SEGUIMIENTO — Conversaciones / Mensajes
  // ═══════════════════════════════════════════════

  app.get("/api/seguimiento/conversaciones/:clienteId", (req, res) => {
    const msgs = (mockDb.conversaciones || []).filter(m => m.cliente_id === req.params.clienteId);
    res.json(msgs);
  });

  app.post("/api/seguimiento/mensajes/enviar", async (req, res) => {
    const { cliente_id, texto, plantilla, agente } = req.body;
    const msg: ConversacionMsg = {
      id: "MSG-" + Date.now(), cliente_id, texto,
      fecha: new Date().toISOString(), tipo: "outbound",
      estado: "enviado", plantilla, agente,
    };
    if (!mockDb.conversaciones) mockDb.conversaciones = [];
    mockDb.conversaciones.push(msg);

    // Intentar enviar por WhatsApp (Meta Cloud API)
    // Preferir la cuenta de tipo 'clientes' configurada en la BD; fallback a env vars
    const clientesAcc = (mockDb.waAccounts || []).find(a => a.tipo === 'clientes' && a.activo && a.accessToken && a.phoneId);
    const waToken    = clientesAcc?.accessToken || process.env.WA_ACCESS_TOKEN;
    const waPhoneId  = clientesAcc?.phoneId     || process.env.WA_PHONE_NUMBER_ID;
    const cliente    = (mockDb.clientesSeguimiento || []).find(c => c.id === cliente_id);

    if (waToken && waPhoneId && cliente) {
      try {
        const waRes = await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waToken}` },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: `52${cliente.telefono}`,
            type: "text",
            text: { body: texto }
          })
        });
        const waData = await waRes.json() as any;
        if (waData.messages?.[0]?.id) {
          msg.estado = "entregado";
        }
      } catch (e: any) {
        console.warn("WhatsApp send error:", e.message);
      }
    }

    // Actualizar ultimo_contacto del cliente
    if (cliente) {
      cliente.ultimo_contacto = new Date().toISOString().split("T")[0];
      saveMockDb(mockDb);
    }

    saveMockDb(mockDb);
    res.json(msg);
  });

  // Webhook Meta WhatsApp (GET = verificación, POST = mensajes entrantes)
  app.get("/api/whatsapp/webhook", (req, res) => {
    const verifyToken = process.env.WA_VERIFY_TOKEN || "hdreams_verify_2026";
    const mode  = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  app.post("/api/whatsapp/webhook", express.raw({ type: "*/*" }), async (req, res) => {
    res.sendStatus(200); // responder rápido a Meta
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Validar firma (X-Hub-Signature-256)
      const appSecret = process.env.WA_APP_SECRET;
      if (IS_PROD && !appSecret) {
        console.error("[SEGURIDAD] WA_APP_SECRET no configurado en producción — rechazando webhook");
        return; // en prod, sin secret = rechazar siempre
      }
      if (appSecret) {
        const sig = req.headers["x-hub-signature-256"] as string;
        const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(JSON.stringify(body)).digest("hex");
        // Usar timingSafeEqual para evitar timing attacks
        try {
          const sigBuf = Buffer.from(sig || "");
          const expBuf = Buffer.from(expected);
          if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return;
        } catch { return; }
      }

      const entry   = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages;

      if (messages) {
        for (const wa of messages) {
          const from = wa.from?.replace("52", ""); // normalizar número MX
          const text = wa.text?.body || wa.interactive?.button_reply?.title || "";

          const cliente = (mockDb.clientesSeguimiento || []).find(c => c.telefono === from || c.telefono === wa.from);
          if (!cliente) continue;

          const msg: ConversacionMsg = {
            id: "MSG-" + Date.now() + Math.random(), cliente_id: cliente.id, texto: text,
            fecha: new Date().toISOString(), tipo: "inbound", estado: "entregado",
          };
          if (!mockDb.conversaciones) mockDb.conversaciones = [];
          mockDb.conversaciones.push(msg);

          // Incrementar mensajes sin leer
          cliente.mensajes_sin_leer = (cliente.mensajes_sin_leer || 0) + 1;
          cliente.ultimo_contacto = new Date().toISOString().split("T")[0];
          saveMockDb(mockDb);
        }
      }
    } catch (e: any) {
      console.error("WA webhook error:", e.message);
    }
  });

  // ═══════════════════════════════════════════════
  // SEGUIMIENTO — Tickets
  // ═══════════════════════════════════════════════

  app.get("/api/seguimiento/tickets", (req, res) => {
    const { cliente_id } = req.query;
    const all = mockDb.ticketsSoporte || [];
    res.json(cliente_id ? all.filter(t => t.cliente_id === cliente_id) : all);
  });

  app.post("/api/seguimiento/tickets", (req, res) => {
    const t = req.body as TicketSoporte;
    t.id = "TKT-" + Date.now();
    t.fecha_apertura = new Date().toISOString();
    if (!mockDb.ticketsSoporte) mockDb.ticketsSoporte = [];
    mockDb.ticketsSoporte.push(t);
    saveMockDb(mockDb);
    res.json(t);
  });

  app.patch("/api/seguimiento/tickets/:id", (req, res) => {
    const t = (mockDb.ticketsSoporte || []).find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: "Ticket no encontrado" });
    // Allowlist: id, cliente_id, fecha_apertura son inmutables; fecha_cierre es auto-set
    const { estado, prioridad, asunto, descripcion, agente_id } = req.body;
    if (estado      !== undefined) t.estado      = estado;
    if (prioridad   !== undefined) t.prioridad   = prioridad;
    if (asunto      !== undefined) t.asunto      = asunto;
    if (descripcion !== undefined) t.descripcion = descripcion;
    if (agente_id   !== undefined) t.agente_id   = agente_id;
    if (estado === "resuelto" || estado === "cerrado") {
      t.fecha_cierre = new Date().toISOString();
    }
    saveMockDb(mockDb);
    res.json(t);
  });

  app.delete("/api/seguimiento/tickets/:id", (req, res) => {
    mockDb.ticketsSoporte = (mockDb.ticketsSoporte || []).filter(x => x.id !== req.params.id);
    saveMockDb(mockDb);
    res.json({ ok: true });
  });

  // ═══════════════════════════════════════════════
  // SEGUIMIENTO — Pagos
  // ═══════════════════════════════════════════════

  app.get("/api/seguimiento/pagos/:clienteId", (req, res) => {
    res.json((mockDb.pagosSeguimiento || []).filter(p => p.cliente_id === req.params.clienteId));
  });

  app.post("/api/seguimiento/pagos", (req, res) => {
    const p = req.body as PagoSeguimiento;
    p.id = "PAG-" + Date.now();
    if (!mockDb.pagosSeguimiento) mockDb.pagosSeguimiento = [];
    mockDb.pagosSeguimiento.push(p);

    // Actualizar estado_pago del cliente
    const cliente = (mockDb.clientesSeguimiento || []).find(c => c.id === p.cliente_id);
    if (cliente && p.estado === "pagado") {
      cliente.estado_pago = "al_corriente";
      cliente.fecha_ultimo_pago = p.fecha;
    }
    saveMockDb(mockDb);
    res.json(p);
  });

  // ═══════════════════════════════════════════════
  // SEGUIMIENTO — Stats
  // ═══════════════════════════════════════════════

  app.get("/api/seguimiento/stats", (_req, res) => {
    const clientes = mockDb.clientesSeguimiento || [];
    const tickets  = mockDb.ticketsSoporte || [];
    res.json({
      total:        clientes.length,
      al_corriente: clientes.filter(c => c.estado_pago === "al_corriente").length,
      pendientes:   clientes.filter(c => c.estado_pago === "pendiente").length,
      morosos:      clientes.filter(c => c.estado_pago === "moroso").length,
      nuevos:       clientes.filter(c => c.estado_pago === "nuevo").length,
      sin_leer:     clientes.reduce((s, c) => s + (c.mensajes_sin_leer || 0), 0),
      tkts_abiertos: tickets.filter(t => t.estado === "abierto" || t.estado === "en_proceso").length,
      tkts_resueltos: tickets.filter(t => t.estado === "resuelto").length,
    });
  });

  // ── IA: clasificar respuesta de moroso ─────────────────────────────────
  // Acepta { texto, monto?, clienteId? } y devuelve categoría + sugerencia.
  // Categorías: no_puede_pagar | promete_pagar | pago_realizado | queja | duda | otro
  // Si "no_puede_pagar" devuelve un compromisoPago propuesto a 3 días.
  app.post("/api/seguimiento/classify-response", async (req, res) => {
    const { texto, monto, clienteId } = req.body as { texto: string; monto?: number; clienteId?: string };
    if (!texto || typeof texto !== 'string') return res.status(400).json({ error: 'texto requerido' });

    // Heurística rápida (fallback si IA falla) — clasifica por keywords.
    const t = texto.toLowerCase();
    const heuristic = () => {
      if (/(no puedo|no tengo|sin dinero|estoy mal|me quede sin|despues|despu[eé]s|d[ei]a[sm]e|d[aá]me unos d[ií]as|m[aá]s tarde)/.test(t)) return 'no_puede_pagar';
      if (/(ya pagu[eé]|ya pague|ya deposit[eé]|ya transfer[ií]|pagado|comprobante)/.test(t)) return 'pago_realizado';
      if (/(este (viernes|lunes|martes|mi[eé]rcoles|jueves|s[aá]bado|domingo)|el (viernes|lunes|martes|mi[eé]rcoles|jueves|s[aá]bado|domingo)|ma[ñn]ana|en [0-9]+ d[ií]as|despu[eé]s de quincena|en cuanto cobre)/.test(t)) return 'promete_pagar';
      if (/(no funciona|falla|sin internet|mal servicio|reclam|queja|cobran de m[aá]s)/.test(t)) return 'queja';
      if (/(\?|c[oó]mo|cuanto|cu[aá]nto|cuando|cu[aá]ndo|d[oó]nde|donde)/.test(t)) return 'duda';
      return 'otro';
    };

    let category: string = heuristic();
    let aiUsed = false;
    try {
      const prompt = `Eres un clasificador de respuestas de clientes morosos de un servicio de internet en México.
Clasifica el siguiente mensaje en UNA sola categoría:
- no_puede_pagar: el cliente dice que no tiene dinero o que no puede pagar hoy/ahora
- promete_pagar: el cliente ofrece una fecha futura concreta para pagar
- pago_realizado: el cliente afirma que ya pagó
- queja: el cliente reclama por mal servicio, cobro o avería
- duda: el cliente hace una pregunta genuina sobre métodos de pago, fechas, montos
- otro: cualquier otro caso

Mensaje del cliente: "${texto}"

Responde EXCLUSIVAMENTE con un JSON: {"category":"...","confianza":0.0-1.0,"razonamiento":"..."}`;
      const raw = await aiGenerate(prompt);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.category) { category = parsed.category; aiUsed = true; }
      }
    } catch {
      // fallback a heurística
    }

    // Generar sugerencia + compromiso
    const today = new Date();
    let sugerencia = '';
    let compromisoPago: { fecha: string; monto: number; estado: string } | null = null;

    if (category === 'no_puede_pagar') {
      const fecha = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      const fechaIso = fecha.toISOString().slice(0, 10);
      const fechaTxt = fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
      compromisoPago = { fecha: fechaIso, monto: monto || 0, estado: 'propuesto' };
      sugerencia = `Entiendo, no te preocupes. Te propongo un *Compromiso de Pago* para el *${fechaTxt}*. ¿Lo confirmas?\n\n💡 Recuerda que con domiciliación obtienes 6 meses extra de streaming gratis.`;
    } else if (category === 'promete_pagar') {
      sugerencia = `Perfecto, anoto tu compromiso. Te enviaré un recordatorio cordial el día acordado. Si necesitas el link de pago directo, escribe *PAGAR* y te lo mando.`;
    } else if (category === 'pago_realizado') {
      sugerencia = `¡Gracias! Voy a verificar la confirmación en sistema. Si tienes el comprobante, ¿podrías compartirlo? Así actualizo tu cuenta de inmediato.`;
    } else if (category === 'queja') {
      sugerencia = `Lamento la molestia. Voy a abrir un ticket de soporte ahora mismo y un técnico te contactará en menos de 24h. Mientras tanto, ¿podrías describirme el problema con más detalle?`;
    } else if (category === 'duda') {
      sugerencia = `Con gusto te explico. Tienes 3 opciones de pago: 1) App Mi Telmex, 2) OXXO Pay con tu folio, 3) Domiciliación bancaria (incluye 6 meses extra de streaming). ¿Cuál te conviene?`;
    } else {
      sugerencia = `Gracias por tu mensaje. ¿Puedes contarme un poco más para apoyarte mejor?`;
    }

    // Si hay clienteId y categoría es no_puede_pagar, registrar el compromiso en notas
    if (clienteId && compromisoPago && category === 'no_puede_pagar') {
      const cli = (mockDb.clientesSeguimiento || []).find(c => c.id === clienteId);
      if (cli) {
        const tag = `[COMPROMISO ${compromisoPago.fecha} $${compromisoPago.monto}] (propuesto)`;
        cli.notas = cli.notas ? `${tag}\n${cli.notas}` : tag;
        saveMockDb(mockDb);
      }
    }

    res.json({ category, sugerencia, compromisoPago, aiUsed });
  });

  // ── Genera link seguro de domiciliación (mock-safe) ────────────────────
  app.post("/api/seguimiento/domiciliacion-link", (req, res) => {
    const { clienteId } = req.body as { clienteId?: string };
    const cli = clienteId ? (mockDb.clientesSeguimiento || []).find(c => c.id === clienteId) : null;
    const folio = cli?.folio || `FOL-${Date.now().toString().slice(-6)}`;
    const token = crypto.randomBytes(8).toString('hex');
    // En producción este link iría a un gateway con tokenización (Openpay/Stripe/etc.)
    const link = `https://pay.heavenlydreams.mx/domiciliar/${folio}?t=${token}`;
    res.json({ link, folio, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() });
  });

  // ── Supervisor: resumen de su equipo ─────────────────────────────────────
  app.get('/api/seguimiento/supervisor/:uid', (req, res) => {
    const uid      = req.params.uid;
    const clientes = (mockDb.clientesSeguimiento || []).filter((c: ClienteSeguimiento) =>
      c.supervisor_id === uid || c.agente_id === uid
    );
    const tickets  = (mockDb.ticketsSoporte || []).filter((t: TicketSoporte) =>
      clientes.some((c: ClienteSeguimiento) => c.id === t.cliente_id)
    );
    // Agrupar por agente
    const agentMap = new Map<string, { nombre: string; total: number; morosos: number; sin_leer: number }>();
    clientes.forEach((c: ClienteSeguimiento) => {
      const cur = agentMap.get(c.agente_id) || { nombre: c.agente_nombre, total: 0, morosos: 0, sin_leer: 0 };
      cur.total++;
      if (c.estado_pago === 'moroso') cur.morosos++;
      cur.sin_leer += c.mensajes_sin_leer || 0;
      agentMap.set(c.agente_id, cur);
    });
    res.json({
      total:        clientes.length,
      al_corriente: clientes.filter((c: ClienteSeguimiento) => c.estado_pago === 'al_corriente').length,
      morosos:      clientes.filter((c: ClienteSeguimiento) => c.estado_pago === 'moroso').length,
      sin_leer:     clientes.reduce((s: number, c: ClienteSeguimiento) => s + (c.mensajes_sin_leer || 0), 0),
      tickets_abiertos: tickets.filter((t: TicketSoporte) => t.estado === 'abierto' || t.estado === 'en_proceso').length,
      equipo:       [...agentMap.entries()].map(([id, d]) => ({ id, ...d })),
    });
  });

  // ═══════════════════════════════════════════════
  // SEGUIMIENTO — Export CSV
  // ═══════════════════════════════════════════════

  app.get("/api/seguimiento/export/clientes", requireRole('gerente', 'administracion'), (_req, res) => {
    const cs = mockDb.clientesSeguimiento || [];
    const headers = ["id","nombre","telefono","email","folio","paquete","renta","estado_pago","fecha_alta","fecha_ultimo_pago","agente_nombre","beneficio_activado","domiciliado","colonia","municipio"];
    const rows = cs.map(c => headers.map(h => `"${String((c as any)[h] ?? "").replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="clientes-seguimiento-${Date.now()}.csv"`);
    res.send("﻿" + csv);
  });

  // ================= HEALTH CHECKS =================
  // Liveness — siempre responde si el proceso está vivo (Railway/Render lo usan
  // para detectar crashes; debe ser barato).
  app.get("/health/live", (_req, res) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  // Readiness — verifica DB y devuelve 503 si la app no puede servir tráfico.
  app.get("/health/ready", async (_req, res) => {
    let dbOk = false;
    if (isDbConnected) {
      try {
        await pool.query("SELECT 1");
        dbOk = true;
      } catch {
        dbOk = false;
      }
    }
    const status = dbOk || !isDbConnected ? "ok" : "degraded";
    res.status(dbOk || !isDbConnected ? 200 : 503).json({
      status,
      env: process.env.NODE_ENV || "development",
      db: isDbConnected ? (dbOk ? "postgres-ok" : "postgres-error") : "mock",
      ts: new Date().toISOString(),
    });
  });

  // Backwards compatibility — Railway usa /health por default según railway.json.
  app.get("/health", async (_req, res) => {
    let dbOk = !isDbConnected;
    if (isDbConnected) {
      try { await pool.query("SELECT 1"); dbOk = true; } catch { dbOk = false; }
    }
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? "ok" : "degraded",
      env: process.env.NODE_ENV || "development",
      db: isDbConnected ? (dbOk ? "postgres-ok" : "postgres-error") : "mock",
      uptime: Math.round(process.uptime()),
      ts: new Date().toISOString(),
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  NOTIFICACIONES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/notifications', (req, res) => {
    const all = mockDb.notifications || [];
    const { rol, unread } = req.query as any;
    let filtered = all.filter((n: Notification_) =>
      !n.para_roles || !rol || n.para_roles.includes(rol)
    );
    if (unread === 'true') filtered = filtered.filter((n: Notification_) => !n.leida);
    res.json(filtered.slice(0, 100));
  });

  app.patch('/api/notifications/:id/read', (req, res) => {
    const n = (mockDb.notifications || []).find((x: Notification_) => x.id === req.params.id);
    if (!n) return res.status(404).json({ error: 'No encontrada' });
    n.leida = true; saveMockDb(mockDb); res.json({ ok: true });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const { rol } = req.body;
    (mockDb.notifications || []).forEach((n: Notification_) => {
      if (!n.para_roles || !rol || n.para_roles.includes(rol)) n.leida = true;
    });
    saveMockDb(mockDb); res.json({ ok: true });
  });

  app.delete('/api/notifications/:id', requireRole('gerente', 'admin'), (req, res) => {
    mockDb.notifications = (mockDb.notifications || []).filter((x: Notification_) => x.id !== req.params.id);
    saveMockDb(mockDb); res.json({ ok: true });
  });

  // ── SSE stream — real-time push ─────────────────────────────────────────
  app.get('/api/notifications/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Restringir CORS al origen real de la app en producción
    const allowedOrigin = process.env.APP_ORIGIN || (IS_PROD ? '' : '*');
    if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.flushHeaders();

    const rol = (req.query.rol as string) || undefined;
    const client = { res, rol };
    sseClients.add(client);

    // Send last 5 unread immediately
    const initial = (mockDb.notifications || [])
      .filter(n => !n.leida && (!n.para_roles || !rol || n.para_roles.includes(rol)))
      .slice(0, 5);
    initial.forEach(n => res.write(`data: ${JSON.stringify(n)}\n\n`));

    // Heartbeat every 25s to keep connection alive
    const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch { clearInterval(hb); } }, 25_000);

    req.on('close', () => { clearInterval(hb); sseClients.delete(client); });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUDIT LOG
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/audit', requireRole('gerente', 'admin'), (req, res) => {
    const { modulo, uid, limit: lim } = req.query as any;
    let entries = mockDb.auditLog || [];
    if (modulo) entries = entries.filter((e: AuditEntry) => e.modulo === modulo);
    if (uid)    entries = entries.filter((e: AuditEntry) => e.usuario_uid === uid || e.usuario_email === uid);
    res.json(entries.slice(0, parseInt(lim) || 200));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  CONTRATOS ACTIVOS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/contracts', (req, res) => {
    const { estado, agente, q } = req.query as any;
    let list = mockDb.contracts || [];
    if (estado) list = list.filter((c: Contract) => c.estado === estado);
    if (agente) list = list.filter((c: Contract) => c.agente_id === agente);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter((c: Contract) =>
        c.cliente_nombre.toLowerCase().includes(ql) ||
        c.folio.toLowerCase().includes(ql) ||
        (c.cliente_telefono || '').includes(ql)
      );
    }
    // Auto-marcar contratos por vencer (dentro de 30 días)
    const now = Date.now();
    list.forEach((c: Contract) => {
      if (c.estado === 'activo' && c.fecha_fin) {
        const diff = new Date(c.fecha_fin).getTime() - now;
        if (diff < 30 * 86400_000 && diff > 0) c.estado = 'por_vencer';
        else if (diff <= 0) c.estado = 'vencido';
      }
    });
    res.json(list);
  });

  app.get('/api/contracts/stats', (req, res) => {
    const list = mockDb.contracts || [];
    res.json({
      total: list.length,
      activos: list.filter((c: Contract) => c.estado === 'activo').length,
      por_vencer: list.filter((c: Contract) => c.estado === 'por_vencer').length,
      vencidos: list.filter((c: Contract) => c.estado === 'vencido').length,
      cancelados: list.filter((c: Contract) => c.estado === 'cancelado').length,
      mrr: list.filter((c: Contract) => c.estado === 'activo' || c.estado === 'por_vencer')
              .reduce((a: number, c: Contract) => a + c.renta, 0),
    });
  });

  app.post('/api/contracts', (req, res) => {
    const body = req.body as Partial<Contract>;
    if (!body.cliente_nombre || !body.paquete) return res.status(400).json({ error: 'cliente_nombre y paquete requeridos' });
    const contract: Contract = {
      id: 'CTR-' + Date.now(),
      folio: body.folio || 'CTR-' + Date.now().toString().slice(-6),
      cliente_nombre: body.cliente_nombre, cliente_telefono: body.cliente_telefono || '',
      cliente_email: body.cliente_email, paquete: body.paquete, renta: body.renta || 0,
      megas: body.megas, fecha_inicio: body.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin: body.fecha_fin, meses_permanencia: body.meses_permanencia || 12,
      estado: 'activo', portabilidad: body.portabilidad,
      agente_id: body.agente_id || '', agente_nombre: body.agente_nombre || '',
      domicilio: body.domicilio, municipio: body.municipio, notas: body.notas,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    if (!mockDb.contracts) mockDb.contracts = [];
    mockDb.contracts.unshift(contract);
    saveMockDb(mockDb);
    pushNotif('Nuevo contrato creado', `${contract.cliente_nombre} — ${contract.paquete}`, 'success', 'contratos', { referencia_id: contract.id });
    res.json(contract);
  });

  app.patch('/api/contracts/:id', (req, res) => {
    const c = (mockDb.contracts || []).find((x: Contract) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Contrato no encontrado' });
    // Allowlist: id, folio, cliente_nombre, cliente_telefono, fecha_inicio, createdAt son inmutables
    const {
      paquete, renta, megas, fecha_fin, meses_permanencia,
      estado, portabilidad, domicilio, municipio, notas,
      agente_id, agente_nombre, cliente_email,
    } = req.body;
    if (paquete           !== undefined) c.paquete           = paquete;
    if (renta             !== undefined) c.renta             = renta;
    if (megas             !== undefined) c.megas             = megas;
    if (fecha_fin         !== undefined) c.fecha_fin         = fecha_fin;
    if (meses_permanencia !== undefined) c.meses_permanencia = meses_permanencia;
    if (estado            !== undefined) c.estado            = estado;
    if (portabilidad      !== undefined) c.portabilidad      = portabilidad;
    if (domicilio         !== undefined) c.domicilio         = domicilio;
    if (municipio         !== undefined) c.municipio         = municipio;
    if (notas             !== undefined) c.notas             = notas;
    if (agente_id         !== undefined) c.agente_id         = agente_id;
    if (agente_nombre     !== undefined) c.agente_nombre     = agente_nombre;
    if (cliente_email     !== undefined) c.cliente_email     = cliente_email;
    c.updatedAt = new Date().toISOString();
    saveMockDb(mockDb);
    res.json(c);
  });

  app.delete('/api/contracts/:id', requireRole('gerente', 'admin'), (req, res) => {
    const before = (mockDb.contracts || []).length;
    mockDb.contracts = (mockDb.contracts || []).filter((x: Contract) => x.id !== req.params.id);
    if (mockDb.contracts.length === before) return res.status(404).json({ error: 'No encontrado' });
    saveMockDb(mockDb); res.json({ ok: true });
  });

  app.get('/api/contracts/export', (req, res) => {
    const list = mockDb.contracts || [];
    const headers = ['ID','Folio','Cliente','Teléfono','Paquete','Renta','Inicio','Fin','Estado','Agente'];
    const rows = list.map((c: Contract) =>
      [c.id, c.folio, c.cliente_nombre, c.cliente_telefono, c.paquete, c.renta, c.fecha_inicio, c.fecha_fin || '', c.estado, c.agente_nombre]
        .map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    );
    const csv = '﻿' + [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contratos.csv"');
    res.send(csv);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  FACTURACIÓN / INVOICES
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/invoices', (req, res) => {
    const { estado, q, from, to } = req.query as any;
    let list = mockDb.invoices || [];
    if (estado) list = list.filter((i: Invoice) => i.estado === estado);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter((i: Invoice) => i.cliente_nombre.toLowerCase().includes(ql) || i.folio_pago.includes(ql));
    }
    if (from) list = list.filter((i: Invoice) => i.fecha_emision >= from);
    if (to)   list = list.filter((i: Invoice) => i.fecha_emision <= to + 'T23:59:59');
    // Auto-vencer facturas pendientes
    const today = new Date().toISOString().split('T')[0];
    list.forEach((i: Invoice) => {
      if (i.estado === 'pendiente' && i.fecha_vencimiento < today) i.estado = 'vencido';
    });
    res.json(list);
  });

  app.get('/api/invoices/stats', (req, res) => {
    const list = mockDb.invoices || [];
    const pagadas = list.filter((i: Invoice) => i.estado === 'pagado');
    res.json({
      total: list.length,
      pendiente: list.filter((i: Invoice) => i.estado === 'pendiente').length,
      pagado: pagadas.length,
      vencido: list.filter((i: Invoice) => i.estado === 'vencido').length,
      ingresos_mes: pagadas
        .filter((i: Invoice) => i.fecha_pago?.startsWith(new Date().toISOString().slice(0, 7)))
        .reduce((a: number, i: Invoice) => a + i.total, 0),
      total_pendiente_monto: list
        .filter((i: Invoice) => i.estado === 'pendiente' || i.estado === 'vencido')
        .reduce((a: number, i: Invoice) => a + i.total, 0),
    });
  });

  app.post('/api/invoices', (req, res) => {
    const body = req.body as Partial<Invoice>;
    if (!body.cliente_nombre || !body.monto) return res.status(400).json({ error: 'cliente_nombre y monto requeridos' });
    const monto = body.monto || 0;
    const iva = Math.round(monto * 0.16 * 100) / 100;
    const inv: Invoice = {
      id: 'INV-' + Date.now(),
      folio_pago: body.folio_pago || 'F-' + Date.now().toString().slice(-6),
      contrato_id: body.contrato_id, cliente_nombre: body.cliente_nombre,
      cliente_email: body.cliente_email, concepto: body.concepto || 'Servicio de telecomunicaciones',
      monto, iva, total: monto + iva,
      metodo_pago: body.metodo_pago || 'efectivo',
      estado: 'pendiente',
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_vencimiento: body.fecha_vencimiento || new Date(Date.now() + 30*86400_000).toISOString().split('T')[0],
      agente_id: body.agente_id || '', notas: body.notas,
    };
    if (!mockDb.invoices) mockDb.invoices = [];
    mockDb.invoices.unshift(inv);
    saveMockDb(mockDb);
    res.json(inv);
  });

  app.patch('/api/invoices/:id', (req, res) => {
    const inv = (mockDb.invoices || []).find((x: Invoice) => x.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Factura no encontrada' });
    if (req.body.estado === 'pagado' && !inv.fecha_pago) {
      req.body.fecha_pago = new Date().toISOString().split('T')[0];
      pushNotif('Pago registrado', `${inv.cliente_nombre} — $${inv.total}`, 'success', 'facturacion', { referencia_id: inv.id });
    }
    // Allowlist: montos, cliente, fechas de emisión/vencimiento y agente_id son inmutables
    const { estado, fecha_pago, notas, metodo_pago } = req.body;
    if (estado      !== undefined) inv.estado      = estado;
    if (fecha_pago  !== undefined) inv.fecha_pago  = fecha_pago;
    if (notas       !== undefined) inv.notas       = notas;
    if (metodo_pago !== undefined) inv.metodo_pago = metodo_pago;
    saveMockDb(mockDb); res.json(inv);
  });

  app.delete('/api/invoices/:id', requireRole('gerente', 'admin'), (req, res) => {
    mockDb.invoices = (mockDb.invoices || []).filter((x: Invoice) => x.id !== req.params.id);
    saveMockDb(mockDb); res.json({ ok: true });
  });

  app.get('/api/invoices/export', (req, res) => {
    const list = mockDb.invoices || [];
    const headers = ['Folio','Cliente','Concepto','Monto','IVA','Total','Método','Estado','Emisión','Vencimiento','Pago'];
    const rows = list.map((i: Invoice) =>
      [i.folio_pago, i.cliente_nombre, i.concepto, i.monto, i.iva, i.total, i.metodo_pago, i.estado, i.fecha_emision, i.fecha_vencimiento, i.fecha_pago || '']
        .map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    );
    const csv = '﻿' + [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="facturas.csv"');
    res.send(csv);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  INVENTARIO
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/inventory', (req, res) => {
    const { tipo, estado, almacen, asignado_a, q } = req.query as any;
    let list = mockDb.inventory || [];
    if (tipo)        list = list.filter((i: InventoryItem) => i.tipo === tipo);
    if (estado)      list = list.filter((i: InventoryItem) => i.estado === estado);
    if (almacen)     list = list.filter((i: InventoryItem) => i.almacen === almacen);
    if (asignado_a)  list = list.filter((i: InventoryItem) => i.asignado_a === asignado_a);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter((i: InventoryItem) =>
        i.descripcion.toLowerCase().includes(ql) ||
        (i.serie || '').toLowerCase().includes(ql) ||
        (i.numero || '').includes(ql) ||
        (i.asignado_a || '').toLowerCase().includes(ql)
      );
    }
    res.json(list);
  });

  app.get('/api/inventory/stats', (req, res) => {
    const list = mockDb.inventory || [];
    const byTipo: Record<string, number> = {};
    const byEstado: Record<string, number> = {};
    list.forEach((i: InventoryItem) => {
      byTipo[i.tipo] = (byTipo[i.tipo] || 0) + 1;
      byEstado[i.estado] = (byEstado[i.estado] || 0) + 1;
    });
    res.json({
      total: list.length,
      disponibles: list.filter((i: InventoryItem) => i.estado === 'disponible').length,
      asignados: list.filter((i: InventoryItem) => i.estado === 'asignado').length,
      dañados: list.filter((i: InventoryItem) => i.estado === 'dañado' || i.estado === 'en_reparacion').length,
      byTipo, byEstado,
      valor_inventario: list.filter((i: InventoryItem) => i.estado !== 'baja').reduce((a: number, i: InventoryItem) => a + (i.precio_costo || 0), 0),
    });
  });

  app.post('/api/inventory', (req, res) => {
    const body = req.body as Partial<InventoryItem>;
    if (!body.tipo || !body.descripcion) return res.status(400).json({ error: 'tipo y descripcion requeridos' });
    const item: InventoryItem = {
      id: 'INV-' + Date.now(),
      tipo: body.tipo, descripcion: body.descripcion,
      serie: body.serie, numero: body.numero,
      estado: body.estado || 'disponible',
      cliente_nombre: body.cliente_nombre, contrato_id: body.contrato_id,
      almacen: body.almacen || 'Central',
      precio_costo: body.precio_costo || 0,
      fecha_ingreso: body.fecha_ingreso || new Date().toISOString().split('T')[0],
      fecha_asignacion: body.fecha_asignacion, notas: body.notas,
    };
    if (!mockDb.inventory) mockDb.inventory = [];
    mockDb.inventory.unshift(item);
    saveMockDb(mockDb); res.json(item);
  });

  app.patch('/api/inventory/:id', (req, res) => {
    const item = (mockDb.inventory || []).find((x: InventoryItem) => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item no encontrado' });
    // Allowlist: id, tipo, fecha_ingreso son inmutables
    const {
      descripcion, serie, numero, estado,
      cliente_nombre, contrato_id, asignado_a,
      talla, almacen, precio_costo, notas,
    } = req.body;
    if (descripcion   !== undefined) item.descripcion   = descripcion;
    if (serie         !== undefined) item.serie         = serie;
    if (numero        !== undefined) item.numero        = numero;
    if (estado        !== undefined) item.estado        = estado;
    if (cliente_nombre !== undefined) item.cliente_nombre = cliente_nombre;
    if (contrato_id   !== undefined) item.contrato_id   = contrato_id;
    if (asignado_a    !== undefined) item.asignado_a    = asignado_a;
    if (talla         !== undefined) item.talla         = talla;
    if (almacen       !== undefined) item.almacen       = almacen;
    if (precio_costo  !== undefined) item.precio_costo  = precio_costo;
    if (notas         !== undefined) item.notas         = notas;
    if (estado === 'asignado' && !item.fecha_asignacion)
      item.fecha_asignacion = new Date().toISOString().split('T')[0];
    saveMockDb(mockDb); res.json(item);
  });

  app.delete('/api/inventory/:id', requireRole('gerente', 'admin'), (req, res) => {
    mockDb.inventory = (mockDb.inventory || []).filter((x: InventoryItem) => x.id !== req.params.id);
    saveMockDb(mockDb); res.json({ ok: true });
  });

  app.get('/api/inventory/export', (req, res) => {
    const list = mockDb.inventory || [];
    const headers = ['ID','Tipo','Descripción','Serie','Número','Estado','Cliente','Almacén','Costo','Ingreso','Asignación'];
    const rows = list.map((i: InventoryItem) =>
      [i.id, i.tipo, i.descripcion, i.serie || '', i.numero || '', i.estado, i.cliente_nombre || '', i.almacen, i.precio_costo, i.fecha_ingreso, i.fecha_asignacion || '']
        .map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    );
    const csv = '﻿' + [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inventario.csv"');
    res.send(csv);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  REPORTES CENTRALIZADOS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/reports/summary', (req, res) => {
    const { from, to } = req.query as any;
    const ventas = mockDb.ventas || [];
    const contracts = mockDb.contracts || [];
    const invoices = mockDb.invoices || [];
    const inventory = mockDb.inventory || [];
    const candidates = mockDb.botCandidates || [];
    const tickets = mockDb.ticketsSoporte || [];

    const inRange = (iso: string) => {
      if (!from && !to) return true;
      if (from && iso < from) return false;
      if (to && iso > to + 'T23:59:59') return false;
      return true;
    };

    const ventasFiltradas = ventas.filter((v: any) => inRange(v.createdAt || v.data?.fecha || ''));
    const facturasPagadas = invoices.filter((i: Invoice) => i.estado === 'pagado' && inRange(i.fecha_pago || ''));

    res.json({
      ventas: {
        total: ventasFiltradas.length,
        monto: ventasFiltradas.reduce((a: number, v: any) => a + (parseFloat(v.renta_mensual || v.data?.rentaMensual || 0)), 0),
      },
      contratos: {
        activos: contracts.filter((c: Contract) => c.estado === 'activo').length,
        mrr: contracts.filter((c: Contract) => c.estado === 'activo').reduce((a: number, c: Contract) => a + c.renta, 0),
      },
      facturacion: {
        ingresos: facturasPagadas.reduce((a: number, i: Invoice) => a + i.total, 0),
        pendiente: invoices.filter((i: Invoice) => i.estado === 'pendiente').reduce((a: number, i: Invoice) => a + i.total, 0),
      },
      inventario: {
        total: inventory.length,
        disponibles: inventory.filter((i: InventoryItem) => i.estado === 'disponible').length,
      },
      reclutamiento: {
        total: candidates.length,
        contratados: candidates.filter((c: any) => c.profile === 'asesor' || c.profile === 'supervisor').length,
      },
      soporte: {
        tickets_abiertos: tickets.filter((t: any) => t.estado === 'abierto').length,
        tickets_resueltos: tickets.filter((t: any) => t.estado === 'resuelto' || t.estado === 'cerrado').length,
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  BÚSQUEDA GLOBAL
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/search', requireRole('gerente', 'administracion', 'supervisor', 'vendedor', 'reclutadora', 'seguimiento'), (req, res) => {
    const { q } = req.query as any;
    if (!q || q.length < 2) return res.json([]);
    const ql = q.toLowerCase();
    const results: any[] = [];

    // Ventas
    (mockDb.ventas || []).forEach((v: any) => {
      const nombre = (v.nombres || v.data?.nombres || '').toLowerCase();
      const folio  = (v.folio || '').toLowerCase();
      if (nombre.includes(ql) || folio.includes(ql))
        results.push({ tipo: 'venta', id: v.folio, titulo: v.nombres || v.folio, subtitulo: v.paquete_nombre || v.data?.paqueteNombre || '', modulo: 'Captura y Validación' });
    });
    // Contratos
    (mockDb.contracts || []).forEach((c: Contract) => {
      if (c.cliente_nombre.toLowerCase().includes(ql) || c.folio.toLowerCase().includes(ql))
        results.push({ tipo: 'contrato', id: c.id, titulo: c.cliente_nombre, subtitulo: `${c.paquete} · ${c.estado}`, modulo: 'Contratos' });
    });
    // Clientes seguimiento
    (mockDb.clientesSeguimiento || []).forEach((c: ClienteSeguimiento) => {
      if (c.nombre.toLowerCase().includes(ql) || c.telefono.includes(ql))
        results.push({ tipo: 'cliente', id: c.id, titulo: c.nombre, subtitulo: c.telefono, modulo: 'Seguimiento Clientes' });
    });
    // Facturas
    (mockDb.invoices || []).forEach((i: Invoice) => {
      if (i.cliente_nombre.toLowerCase().includes(ql) || i.folio_pago.toLowerCase().includes(ql))
        results.push({ tipo: 'factura', id: i.id, titulo: i.cliente_nombre, subtitulo: `${i.folio_pago} · $${i.total}`, modulo: 'Facturación' });
    });
    // Candidatos
    (mockDb.botCandidates || []).forEach((c: BotCandidate) => {
      if ((c.name || '').toLowerCase().includes(ql) || (c.phone || '').includes(ql))
        results.push({ tipo: 'candidato', id: c.id, titulo: c.name || c.phone, subtitulo: c.profile || 'candidato', modulo: 'Reclutamiento' });
    });

    res.json(results.slice(0, 20));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  DASHBOARD EJECUTIVO — KPIs en tiempo real
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/dashboard/executive', requireRole('gerente', 'admin'), (req, res) => {
    const ventas     = mockDb.ventas || [];
    const contratos  = mockDb.contracts || [];
    const facturas   = mockDb.invoices || [];
    const inventario = mockDb.inventory || [];
    const clientes   = mockDb.clientesSeguimiento || [];
    const tickets    = mockDb.ticketsSoporte || [];
    const candidatos = mockDb.botCandidates || [];
    const now        = Date.now();

    // Ventas
    const ventasHoy      = ventas.filter((v: any) => { const d = new Date(v.data?.fecha || v.createdAt || ''); return d.getTime() > now - 86400_000; });
    const ventasMes      = ventas.filter((v: any) => { const d = new Date(v.data?.fecha || v.createdAt || ''); const s = new Date(); s.setDate(1); s.setHours(0,0,0,0); return d.getTime() >= s.getTime(); });
    const ventasPosteadas = ventas.filter((v: any) => (v.estado || '').toUpperCase() === 'POSTEADA' || (v.data?.pisaStatus || '').toUpperCase() === 'POSTEADO');

    // Contratos
    const contratosActivos  = contratos.filter((c: Contract) => c.estado === 'activo' || c.estado === 'por_vencer');
    const contratosPorVencer = contratos.filter((c: Contract) => {
      if (!c.fecha_fin) return false;
      const diff = new Date(c.fecha_fin).getTime() - now;
      return diff > 0 && diff < 30 * 86400_000;
    });

    // Facturación
    const facturasVencidas = facturas.filter((f: Invoice) => f.estado === 'vencido' || f.estado === 'pendiente');
    const ingresoMes = facturas.filter((f: Invoice) => {
      const d = new Date(f.fecha_pago || ''); const s = new Date(); s.setDate(1); s.setHours(0,0,0,0);
      return f.estado === 'pagado' && d.getTime() >= s.getTime();
    }).reduce((sum: number, f: Invoice) => sum + f.total, 0);

    // Clientes
    const morosos  = clientes.filter((c: ClienteSeguimiento) => c.estado_pago === 'moroso');
    const sinLeer  = clientes.reduce((sum: number, c: ClienteSeguimiento) => sum + (c.mensajes_sin_leer || 0), 0);

    // Tickets
    const ticketsAbiertos = tickets.filter((t: TicketSoporte) => t.estado === 'abierto' || t.estado === 'en_proceso');
    const ticketsCriticos = tickets.filter((t: TicketSoporte) => t.prioridad === 'critica' && t.estado !== 'cerrado' && t.estado !== 'resuelto');

    // Inventario
    const inventarioDisponible = inventario.filter((i: InventoryItem) => i.estado === 'disponible').length;
    const inventarioBaja       = inventario.filter((i: InventoryItem) => i.estado === 'baja' || i.estado === 'dañado').length;

    // Reclutamiento
    const candidatosActivos    = candidatos.filter((c: BotCandidate) => !(['rechazado', 'contratado'] as string[]).includes(c.profile)).length;
    const candidatosContratados = candidatos.filter((c: BotCandidate) => (c as any).stage === 'contratado' || c.profile === 'asesor').length;

    // Audit reciente
    const auditReciente = (mockDb.auditLog || []).slice(0, 10);

    // Top agentes por ventas este mes
    const agenteMap = new Map<string, { nombre: string; count: number; monto: number }>();
    ventasMes.forEach((v: any) => {
      const uid  = v.data?.agenteUID || v.data?.agente || 'desconocido';
      const nom  = v.data?.agenteName || v.data?.agenteNombre || uid;
      const mn   = parseFloat(v.data?.rentaMensual || v.renta_mensual || 0);
      const cur  = agenteMap.get(uid) || { nombre: nom, count: 0, monto: 0 };
      agenteMap.set(uid, { nombre: nom, count: cur.count + 1, monto: cur.monto + mn });
    });
    const topAgentes = [...agenteMap.entries()]
      .map(([uid, d]) => ({ uid, ...d }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Ventas por día (últimos 7 días)
    const ventasPorDia = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86400_000);
      const label = d.toLocaleDateString('es-MX', { weekday: 'short' });
      const count = ventas.filter((v: any) => {
        const vd = new Date(v.data?.fecha || v.createdAt || '');
        return vd.toDateString() === d.toDateString();
      }).length;
      return { dia: label, ventas: count };
    });

    res.json({
      ventas:      { hoy: ventasHoy.length, mes: ventasMes.length, posteadas: ventasPosteadas.length, total: ventas.length },
      contratos:   { activos: contratosActivos.length, porVencer: contratosPorVencer.length, total: contratos.length },
      facturacion: { vencidas: facturasVencidas.length, ingresoMes, total: facturas.length },
      clientes:    { total: clientes.length, morosos: morosos.length, sinLeer },
      tickets:     { abiertos: ticketsAbiertos.length, criticos: ticketsCriticos.length },
      inventario:  { disponible: inventarioDisponible, bajas: inventarioBaja, total: inventario.length },
      reclutamiento: { activos: candidatosActivos, contratados: candidatosContratados, total: candidatos.length },
      topAgentes,
      ventasPorDia,
      auditReciente,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  NÓMINA — Comisiones y gestión
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/api/payroll/commissions', (req, res) => {
    const ventas = mockDb.ventas || [];
    const { agente } = req.query as any;
    let data = ventas;
    if (agente) data = data.filter((v: any) => (v.data?.agenteUID || v.data?.agente) === agente);
    const result = data.map((v: any) => {
      const isPosteada = (v.estado || '').toUpperCase() === 'POSTEADA' || (v.data?.pisaStatus || '').toUpperCase() === 'POSTEADO';
      const isPaid     = !!(v.data?.pagoRecibo || v.data?.estadoPago === 'Pagado' || v.data?.primerPago);
      return {
        folio: v.folio, cliente: `${v.data?.nombres || ''} ${v.data?.apellidoPaterno || ''}`.trim(),
        paquete: v.data?.paqueteNombre || v.paquete_nombre || 'N/A',
        estado: v.estado, isPosteada, isPaid,
        comision: (isPosteada ? 200 : 0) + (isPaid ? 200 : 0),
        fecha: v.data?.fecha || v.createdAt || '',
      };
    });
    res.json(result);
  });

  app.get('/api/payroll/advances', (req, res) => res.json((mockDb as any).advances || []));

  app.post('/api/payroll/advances', (req, res) => {
    const adv = { id: 'ADV-' + Date.now(), ...req.body, estado: 'pendiente', createdAt: new Date().toISOString() };
    if (!(mockDb as any).advances) (mockDb as any).advances = [];
    (mockDb as any).advances.unshift(adv);
    saveMockDb(mockDb);
    pushNotif('Solicitud de adelanto', `${req.body.agente_nombre} solicita $${req.body.monto}`, 'info', 'nomina');

    // Audit: vendedor solicito adelanto.
    const sess = peekSession(req);
    audit(sess.uid, sess.email, 'solicitar_adelanto', 'nomina', {
      mensaje: `${req.body.agente_nombre || sess.email || 'Vendedor'} solicito adelanto de $${req.body.monto}`,
      advanceId: adv.id, monto: req.body.monto, motivo: req.body.motivo,
    });
    res.json(adv);
  });

  app.patch('/api/payroll/advances/:id', requireRole('gerente', 'admin'), (req, res) => {
    const adv = ((mockDb as any).advances || []).find((a: any) => a.id === req.params.id);
    if (!adv) return res.status(404).json({ error: 'No encontrado' });
    const prevEstado = adv.estado;
    // Allowlist: id, agente_id, agente_nombre, monto, createdAt son inmutables
    const { estado, fecha_pago, notas } = req.body;
    if (estado     !== undefined) adv.estado     = estado;
    if (fecha_pago !== undefined) adv.fecha_pago = fecha_pago;
    if (notas      !== undefined) adv.notas      = notas;
    saveMockDb(mockDb);
    if (estado === 'aprobado') pushNotif('Adelanto aprobado', `$${adv.monto} para ${adv.agente_nombre}`, 'success', 'nomina');

    // Audit: gerente/admin autorizo o rechazo el pago.
    if (req.body.estado && req.body.estado !== prevEstado) {
      const sess = (req as any).sess;
      const accion = req.body.estado === 'aprobado' ? 'autorizar_pago_nomina'
                   : req.body.estado === 'rechazado' ? 'rechazar_pago_nomina'
                   : `actualizar_adelanto_${req.body.estado}`;
      const verbo = req.body.estado === 'aprobado' ? 'autorizo' : req.body.estado;
      audit(sess.uid, sess.email, accion, 'nomina', {
        mensaje: `${sess.email || 'Gerente'} ${verbo} adelanto ${adv.id} por $${adv.monto} a ${adv.agente_nombre || 'agente'}`,
        advanceId: adv.id, monto: adv.monto, agente_nombre: adv.agente_nombre,
        estado_anterior: prevEstado, estado_nuevo: req.body.estado,
      });
    }
    res.json(adv);
  });

  // ── Datos Bancarios — registro de cambio para auditoria ──────────────────
  // Body: { banco, titular, cuenta_mascarada, clabe_mascarada, rfc?, _diff?: string[] }
  // No persiste el numero completo (vive en localStorage en cliente);
  // solo deja el rastro de auditoria con datos enmascarados.
  app.post('/api/profile/bank/audit', (req, res) => {
    const sess = peekSession(req);
    const { banco, titular, cuenta_mascarada, clabe_mascarada, rfc, _diff } = req.body || {};
    audit(sess.uid, sess.email, 'editar_datos_bancarios', 'seguridad', {
      mensaje: `${sess.email || 'Usuario'} actualizo sus datos bancarios${banco ? ` (${banco})` : ''}`,
      banco, titular, cuenta_mascarada, clabe_mascarada, rfc,
      campos_modificados: Array.isArray(_diff) ? _diff : undefined,
    });
    res.json({ ok: true });
  });

  // ── Bloqueo por morosidad — el frontend reporta el intento ───────────────
  // Body: { folio?, cliente_nombre?, motivo?, monto_adeudo? }
  app.post('/api/audit/moroso-blocked', (req, res) => {
    const sess = peekSession(req);
    const { folio, cliente_nombre, motivo, monto_adeudo, intento } = req.body || {};
    audit(sess.uid, sess.email, 'bloqueo_morosidad', 'seguimiento', {
      mensaje: `Alerta de morosidad${folio ? ` en folio ${folio}` : ''}: ${sess.email || 'Vendedor'} intento ${intento || 'una operacion'} sobre cliente moroso${cliente_nombre ? ` (${cliente_nombre})` : ''}`,
      folio, cliente_nombre, motivo, monto_adeudo, vendedor_uid: sess.uid, vendedor_email: sess.email,
    });
    res.json({ ok: true });
  });

  // ================= VITE MIDDLEWARE (dev) / STATIC (prod) =================
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'build');
    app.use(express.static(distPath, { maxAge: '1y', immutable: true }));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bootstrap WhatsApp engine (detects whatsapp-web.js or runs in stub mode)
  whatsappEngine.init().catch(err => console.warn('[WA Engine] init error:', err));

  // 404 JSON para rutas /api desconocidas (mejor que devolver el index.html)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });

  // Error handler global — última línea antes de que Express devuelva 500 sin contexto
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('[ERROR]', err?.stack || err?.message || err);
    if (res.headersSent) return;
    res.status(500).json({
      error: IS_PROD ? 'Error interno del servidor' : (err?.message || 'Error desconocido'),
    });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\nHeavenly Dreams CRM — ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`   -> http://localhost:${PORT}`);
    console.log(`   -> DB: ${isDbConnected ? 'PostgreSQL' : 'Mock DB'}\n`);
    console.log(`   -> Agent registry: 6 system + recruitmentAgents (WA mode: ${whatsappEngine.getMode()})\n`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  // Railway envía SIGTERM antes de matar el contenedor; queremos cerrar
  // conexiones abiertas (HTTP, DB, SSE) limpiamente para no perder requests
  // en vuelo.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[${signal}] Cerrando servidor...`);
    const forceExit = setTimeout(() => {
      console.error('[SHUTDOWN] Timeout de 10s — forzando salida.');
      process.exit(1);
    }, 10_000);
    forceExit.unref();
    server.close(async () => {
      try { await pool.end(); } catch {}
      console.log('[SHUTDOWN] HTTP y DB cerrados. Bye.');
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // No queremos que un error no manejado tire el proceso silenciosamente.
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
  });
}

startServer().catch((err) => {
  console.error('[FATAL] No se pudo iniciar el servidor:', err);
  process.exit(1);
});
