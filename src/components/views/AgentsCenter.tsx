import { useEffect, useState, useCallback } from 'react';
import {
  Bot, MessageSquare, Phone, Megaphone, UserCog, Briefcase, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, QrCode, Power, Save, X, Brain,
  Settings, Send, Wifi, WifiOff,
} from 'lucide-react';

type AgentType =
  | 'VENTAS_EXPEDIENTES' | 'VALIDACION_TELEFONICA' | 'SEGUIMIENTO'
  | 'RECUPERACION' | 'RECLUTAMIENTO' | 'MARKETING' | 'ASISTENTE_PERSONAL';

type AgentChannel = 'whatsapp_qr' | 'telegram' | 'voice' | 'internal';

type Agent = {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  channel: AgentChannel;
  enabled: boolean;
  tone: string;
  instructions: string;
  knowledgeBase: string;
  templates: Record<string, string>;
  config: Record<string, any>;
  telegramBotToken?: string;
  twilioPhoneNumber?: string;
  createdAt: string;
  updatedAt: string;
};

type SessionStatus = 'desconectado' | 'esperando_qr' | 'qr_listo' | 'autenticando' | 'conectado' | 'error';
type SessionState = {
  agentId: string;
  status: SessionStatus;
  qr?: string;
  phoneNumber?: string;
  lastEvent?: string;
  lastEventAt?: string;
  error?: string;
};

const TYPE_META: Record<AgentType, { label: string; icon: any; tile: string; chip: string; iconColor: string }> = {
  VENTAS_EXPEDIENTES:    { label: 'Ventas & Expedientes',  icon: Briefcase,     tile: 'bg-emerald-500/10 border-emerald-500/30', chip: 'bg-emerald-500/10 border-emerald-500/30', iconColor: 'text-emerald-300' },
  VALIDACION_TELEFONICA: { label: 'Validación Telefónica', icon: Phone,         tile: 'bg-amber-500/10 border-amber-500/30',     chip: 'bg-amber-500/10 border-amber-500/30',     iconColor: 'text-amber-300'   },
  SEGUIMIENTO:           { label: 'Seguimiento',           icon: MessageSquare, tile: 'bg-blue-500/10 border-blue-500/30',       chip: 'bg-blue-500/10 border-blue-500/30',       iconColor: 'text-blue-300'    },
  RECUPERACION:          { label: 'Recuperación & Cierre', icon: RefreshCw,     tile: 'bg-rose-500/10 border-rose-500/30',       chip: 'bg-rose-500/10 border-rose-500/30',       iconColor: 'text-rose-300'    },
  RECLUTAMIENTO:         { label: 'Reclutamiento',         icon: UserCog,       tile: 'bg-pink-500/10 border-pink-500/30',       chip: 'bg-pink-500/10 border-pink-500/30',       iconColor: 'text-pink-300'    },
  MARKETING:             { label: 'Marketing',             icon: Megaphone,     tile: 'bg-purple-500/10 border-purple-500/30',   chip: 'bg-purple-500/10 border-purple-500/30',   iconColor: 'text-purple-300'  },
  ASISTENTE_PERSONAL:    { label: 'Asistente Personal',    icon: Bot,           tile: 'bg-cyan-500/10 border-cyan-500/30',       chip: 'bg-cyan-500/10 border-cyan-500/30',       iconColor: 'text-cyan-300'    },
};

const CHANNEL_LABEL: Record<AgentChannel, string> = {
  whatsapp_qr: 'WhatsApp QR',
  telegram: 'Telegram',
  voice: 'Voz (Twilio)',
  internal: 'Interno',
};

const STATUS_META: Record<SessionStatus, { label: string; color: string; icon: any }> = {
  desconectado:  { label: 'Desconectado',     color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: WifiOff },
  esperando_qr:  { label: 'Iniciando…',       color: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: Loader2 },
  qr_listo:      { label: 'Esperando QR',     color: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: QrCode },
  autenticando:  { label: 'Autenticando…',    color: 'text-blue-300 bg-blue-500/10 border-blue-500/30',    icon: Loader2 },
  conectado:     { label: 'Conectado',        color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', icon: Wifi },
  error:         { label: 'Error',            color: 'text-rose-300 bg-rose-500/10 border-rose-500/30',    icon: AlertCircle },
};

export default function AgentsCenter() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Record<string, SessionState>>({});
  const [engineMode, setEngineMode] = useState<'real' | 'stub'>('stub');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [qrAgent, setQrAgent] = useState<Agent | null>(null);
  const [memoryAgent, setMemoryAgent] = useState<Agent | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsR, sessR] = await Promise.all([
        fetch('/api/agents').then(r => r.json()),
        fetch('/api/agents/sessions/all').then(r => r.json()),
      ]);
      setAgents(agentsR);
      const map: Record<string, SessionState> = {};
      (sessR.states || []).forEach((s: SessionState) => { map[s.agentId] = s; });
      setSessions(map);
      setEngineMode(sessR.mode || 'stub');
    } catch (e) {
      console.error('Failed to load agents', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  // Periodic poll for session statuses (every 5s)
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/agents/sessions/all').then(r => r.json());
        const map: Record<string, SessionState> = {};
        (r.states || []).forEach((s: SessionState) => { map[s.agentId] = s; });
        setSessions(map);
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Group by type
  const grouped: Record<AgentType, Agent[]> = {
    VENTAS_EXPEDIENTES: [], VALIDACION_TELEFONICA: [], SEGUIMIENTO: [],
    RECUPERACION: [], RECLUTAMIENTO: [], MARKETING: [], ASISTENTE_PERSONAL: [],
  };
  agents.forEach(a => grouped[a.type]?.push(a));

  return (
    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-black text-white tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-400" />
            Centro de Agentes IA
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            7 tipos de agentes autónomos. Cada uno con su propia memoria, instrucciones y sesión WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
            engineMode === 'real'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}>
            Motor WA: {engineMode === 'real' ? 'Real (whatsapp-web.js)' : 'Stub (simulado)'}
          </span>
          <button
            onClick={loadAgents}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-white/10 text-slate-300 transition-all"
            title="Recargar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {engineMode === 'stub' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Modo simulado activo.</strong> Para conectar WhatsApp real ejecuta:
            <code className="ml-1 px-1.5 py-0.5 bg-slate-900/60 rounded text-amber-100 font-mono">npm install whatsapp-web.js qrcode</code>
            {' '}y reinicia el servidor. Por ahora puedes probar el flujo con QR simulado.
          </div>
        </div>
      )}

      {/* Agent groups */}
      {(Object.keys(TYPE_META) as AgentType[]).map(type => {
        const list = grouped[type] || [];
        if (list.length === 0) return null;
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        return (
          <section key={type} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.tile}`}>
                <Icon className={`w-4 h-4 ${meta.iconColor}`} />
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{meta.label}</h2>
              <span className="text-[10px] text-slate-500 font-mono">({list.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  session={sessions[agent.id]}
                  onConfigure={() => setEditing(agent)}
                  onConnect={() => setQrAgent(agent)}
                  onMemory={() => setMemoryAgent(agent)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {editing && (
        <AgentEditor
          agent={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setAgents(prev => prev.map(a => a.id === saved.id ? saved : a));
            setEditing(null);
          }}
        />
      )}

      {qrAgent && (
        <QRConnectModal
          agent={qrAgent}
          engineMode={engineMode}
          onClose={() => { setQrAgent(null); loadAgents(); }}
        />
      )}

      {memoryAgent && (
        <MemoryModal
          agent={memoryAgent}
          onClose={() => setMemoryAgent(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function AgentCard({ agent, session, onConfigure, onConnect, onMemory }: {
  agent: Agent;
  session?: SessionState;
  onConfigure: () => void;
  onConnect: () => void;
  onMemory: () => void;
}) {
  const meta = TYPE_META[agent.type];
  const Icon = meta.icon;
  const status = session?.status || 'desconectado';
  const sm = STATUS_META[status];
  const SIcon = sm.icon;

  return (
    <div className="glass-card rounded-xl p-4 border border-white/5 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${meta.tile}`}>
            <Icon className={`w-4 h-4 ${meta.iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{agent.name}</h3>
            <p className="text-[10px] text-slate-500 font-mono truncate">{agent.id}</p>
          </div>
        </div>
        {agent.channel === 'whatsapp_qr' && (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1 ${sm.color}`}>
            <SIcon className={`w-3 h-3 ${(status === 'esperando_qr' || status === 'autenticando') ? 'animate-spin' : ''}`} />
            {sm.label}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-2 line-clamp-2 min-h-[2.5rem]">{agent.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 font-mono">{CHANNEL_LABEL[agent.channel]}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">Tono: {agent.tone}</span>
        {!agent.enabled && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">Inactivo</span>
        )}
        {session?.phoneNumber && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">+{session.phoneNumber}</span>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={onConfigure}
          className="flex-1 min-w-[80px] flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 transition-all"
        >
          <Settings className="w-3 h-3" />
          Configurar
        </button>
        {agent.channel === 'whatsapp_qr' && (
          <button
            onClick={onConnect}
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
              status === 'conectado'
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
            }`}
          >
            <QrCode className="w-3 h-3" />
            {status === 'conectado' ? 'Sesión' : 'Conectar QR'}
          </button>
        )}
        <button
          onClick={onMemory}
          className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition-all"
          title="Memoria"
        >
          <Brain className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function AgentEditor({ agent, onClose, onSaved }: {
  agent: Agent;
  onClose: () => void;
  onSaved: (a: Agent) => void;
}) {
  const [draft, setDraft] = useState<Agent>(agent);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = <K extends keyof Agent>(k: K, v: Agent[K]) => setDraft(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await r.json();
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => { onSaved(data.agent); }, 800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const meta = TYPE_META[draft.type];

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${meta.tile}`}>
              <Bot className={`w-5 h-5 ${meta.iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{draft.name}</h2>
              <p className="text-[11px] text-slate-500 font-mono">{draft.id} · {meta.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Basic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nombre">
              <input value={draft.name} onChange={e => update('name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Tono / Estilo">
              <input value={draft.tone} onChange={e => update('tone', e.target.value)} className={inputCls} placeholder="Formal, Amigable, Energético..." />
            </Field>
          </div>

          <Field label="Descripción">
            <input value={draft.description} onChange={e => update('description', e.target.value)} className={inputCls} />
          </Field>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={draft.enabled} onChange={e => update('enabled', e.target.checked)} className="w-4 h-4 accent-blue-500" />
              <span className="text-sm text-slate-300">Agente activo</span>
            </label>
            <span className="text-[11px] text-slate-500 font-mono">Canal: {CHANNEL_LABEL[draft.channel]}</span>
          </div>

          {/* AI Brain */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-300" />
              <h3 className="text-sm font-bold text-blue-200">Cerebro IA — Instrucciones y Conocimiento</h3>
            </div>
            <Field label="Instrucciones del Agente (personalidad, reglas, comportamiento)" hint="Ejemplo: 'Sé amable pero firme. Nunca prometas descuentos sin autorización.'">
              <textarea
                value={draft.instructions}
                onChange={e => update('instructions', e.target.value)}
                rows={5}
                className={inputCls + ' font-mono text-xs'}
              />
            </Field>
            <Field label="Base de Conocimiento (datos, FAQs, info de vacante/producto/cliente)" hint="Lo que el agente debe saber para responder con precisión.">
              <textarea
                value={draft.knowledgeBase}
                onChange={e => update('knowledgeBase', e.target.value)}
                rows={6}
                className={inputCls + ' font-mono text-xs'}
              />
            </Field>
          </div>

          {/* Templates */}
          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4 space-y-2">
            <h3 className="text-sm font-bold text-slate-200 mb-2">Plantillas de mensajes</h3>
            {Object.entries(draft.templates).map(([key, value]) => (
              <Field key={key} label={key}>
                <textarea
                  value={value}
                  onChange={e => update('templates', { ...draft.templates, [key]: e.target.value })}
                  rows={2}
                  className={inputCls + ' text-xs'}
                />
              </Field>
            ))}
            {Object.keys(draft.templates).length === 0 && (
              <p className="text-xs text-slate-500 italic">Sin plantillas configuradas.</p>
            )}
          </div>

          {/* Recruitment-specific vacancy */}
          {draft.type === 'RECLUTAMIENTO' && draft.config?.vacancy && (
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 space-y-3">
              <h3 className="text-sm font-bold text-pink-200 mb-2">Vacante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Puesto"><input value={draft.config.vacancy.puesto} onChange={e => update('config', { ...draft.config, vacancy: { ...draft.config.vacancy, puesto: e.target.value } })} className={inputCls} /></Field>
                <Field label="Sueldo Semanal"><input value={draft.config.vacancy.sueldoSemanal} onChange={e => update('config', { ...draft.config, vacancy: { ...draft.config.vacancy, sueldoSemanal: e.target.value } })} className={inputCls} /></Field>
                <Field label="Edad Mínima"><input type="number" value={draft.config.vacancy.edadMin} onChange={e => update('config', { ...draft.config, vacancy: { ...draft.config.vacancy, edadMin: parseInt(e.target.value) } })} className={inputCls} /></Field>
                <Field label="Edad Máxima"><input type="number" value={draft.config.vacancy.edadMax} onChange={e => update('config', { ...draft.config, vacancy: { ...draft.config.vacancy, edadMax: parseInt(e.target.value) } })} className={inputCls} /></Field>
                <Field label="Horario"><input value={draft.config.vacancy.horario} onChange={e => update('config', { ...draft.config, vacancy: { ...draft.config.vacancy, horario: e.target.value } })} className={inputCls} /></Field>
                <Field label="Ubicación"><input value={draft.config.vacancy.ubicacion} onChange={e => update('config', { ...draft.config, vacancy: { ...draft.config.vacancy, ubicacion: e.target.value } })} className={inputCls} /></Field>
              </div>
              <Field label="Beneficios"><textarea rows={2} value={draft.config.vacancy.beneficios} onChange={e => update('config', { ...draft.config, vacancy: { ...draft.config.vacancy, beneficios: e.target.value } })} className={inputCls} /></Field>
              <Field label="Requisitos"><textarea rows={2} value={draft.config.vacancy.requisitos} onChange={e => update('config', { ...draft.config, vacancy: { ...draft.config.vacancy, requisitos: e.target.value } })} className={inputCls} /></Field>
            </div>
          )}

          {/* Channel-specific */}
          {draft.channel === 'telegram' && (
            <Field label="Telegram Bot Token (futuro)">
              <input value={draft.telegramBotToken || ''} onChange={e => update('telegramBotToken', e.target.value)} className={inputCls} placeholder="123456:ABC..." />
            </Field>
          )}
          {draft.channel === 'voice' && (
            <Field label="Twilio Phone Number (futuro)">
              <input value={draft.twilioPhoneNumber || ''} onChange={e => update('twilioPhoneNumber', e.target.value)} className={inputCls} placeholder="+52..." />
            </Field>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-white/10 px-6 py-4 flex items-center justify-between gap-3">
          {success ? (
            <span className="text-sm text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Guardado correctamente
            </span>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all">
              Cancelar
            </button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Agente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
function QRConnectModal({ agent, engineMode, onClose }: {
  agent: Agent;
  engineMode: 'real' | 'stub';
  onClose: () => void;
}) {
  const [state, setState] = useState<SessionState>({ agentId: agent.id, status: 'desconectado' });
  const [starting, setStarting] = useState(false);

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const r = await fetch(`/api/agents/${agent.id}/whatsapp/start`, { method: 'POST' });
      const d = await r.json();
      setState(d.state);
    } finally {
      setStarting(false);
    }
  }, [agent.id]);

  const disconnect = async () => {
    await fetch(`/api/agents/${agent.id}/whatsapp/disconnect`, { method: 'POST' });
    const r = await fetch(`/api/agents/${agent.id}/whatsapp/status`).then(r => r.json());
    setState(r.state);
  };

  const stubConnect = async () => {
    const r = await fetch(`/api/agents/${agent.id}/whatsapp/stub-connect`, { method: 'POST' });
    const d = await r.json();
    if (d.ok) setState(d.state);
  };

  // Initial fetch + polling
  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const r = await fetch(`/api/agents/${agent.id}/whatsapp/status`).then(r => r.json());
        if (!cancelled) setState(r.state);
      } catch {}
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [agent.id]);

  const sm = STATUS_META[state.status];
  const SIcon = sm.icon;

  // QR image rendering: use public QR API for foundation; later swap for backend-rendered PNG.
  const qrImageUrl = state.qr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(state.qr)}`
    : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-md">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Conexión WhatsApp</h2>
            <p className="text-[11px] text-slate-500">{agent.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${sm.color}`}>
            <SIcon className={`w-5 h-5 ${(state.status === 'esperando_qr' || state.status === 'autenticando') ? 'animate-spin' : ''}`} />
            <div className="flex-1">
              <p className="text-sm font-bold">{sm.label}</p>
              {state.phoneNumber && <p className="text-[11px] font-mono opacity-80">+{state.phoneNumber}</p>}
              {state.error && <p className="text-[11px] opacity-80">{state.error}</p>}
            </div>
          </div>

          {state.status === 'desconectado' && (
            <div className="text-center space-y-3">
              <p className="text-sm text-slate-400">
                Iniciar una sesión nueva. Se generará un código QR que debes escanear desde el teléfono asignado a este agente.
              </p>
              <button
                onClick={start}
                disabled={starting}
                className="w-full px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                Iniciar sesión QR
              </button>
            </div>
          )}

          {state.status === 'qr_listo' && qrImageUrl && (
            <div className="text-center space-y-3">
              <p className="text-sm text-slate-300 font-bold">Escanea este código desde WhatsApp</p>
              <p className="text-[11px] text-slate-500">
                WhatsApp → Configuración → Dispositivos vinculados → Vincular dispositivo
              </p>
              <div className="bg-white p-3 rounded-xl mx-auto inline-block">
                <img src={qrImageUrl} alt="QR" className="w-64 h-64" />
              </div>
              {engineMode === 'stub' && (
                <button
                  onClick={stubConnect}
                  className="w-full px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-500/30"
                >
                  [DEV] Simular escaneo exitoso
                </button>
              )}
            </div>
          )}

          {state.status === 'conectado' && (
            <div className="space-y-3">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-1" />
                <p className="text-sm font-bold text-emerald-200">Sesión activa</p>
                {state.phoneNumber && <p className="text-xs text-emerald-300/80 font-mono">+{state.phoneNumber}</p>}
              </div>
              <SendTestPanel agentId={agent.id} />
              <button
                onClick={disconnect}
                className="w-full px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm font-bold flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          )}

          {(state.status === 'esperando_qr' || state.status === 'autenticando') && (
            <div className="text-center text-sm text-slate-400 py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              {state.lastEvent && <p className="text-[11px] font-mono opacity-60">{state.lastEvent}</p>}
            </div>
          )}

          {state.status === 'error' && (
            <button onClick={start} className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold">
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SendTestPanel({ agentId }: { agentId: string }) {
  const [to, setTo] = useState('');
  const [text, setText] = useState('Hola, mensaje de prueba desde HDreams.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      const r = await fetch(`/api/agents/${agentId}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, text }),
      });
      const d = await r.json();
      setResult(d.ok ? 'Enviado' : (d.error || 'Error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-slate-800/50 p-3 space-y-2">
      <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Mensaje de prueba</p>
      <input value={to} onChange={e => setTo(e.target.value)} placeholder="Número (+52...)" className={inputCls + ' text-xs'} />
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2} className={inputCls + ' text-xs'} />
      <button onClick={send} disabled={sending || !to} className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2">
        {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        Enviar
      </button>
      {result && <p className="text-[11px] text-slate-400 text-center">{result}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
type MemoryEntry = {
  id: string; agentId: string; ts: string;
  kind: 'interaction' | 'summary' | 'event';
  content: string; metadata?: any;
};

function MemoryModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [data, setData] = useState<{ summary: string; entries: MemoryEntry[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [compressing, setCompressing] = useState(false);
  const [newEntry, setNewEntry] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/agents/${agent.id}/memory`).then(r => r.json());
      setData(r);
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => { load(); }, [load]);

  const addEntry = async () => {
    if (!newEntry.trim()) return;
    await fetch(`/api/agents/${agent.id}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newEntry, kind: 'interaction' }),
    });
    setNewEntry('');
    load();
  };

  const compress = async () => {
    setCompressing(true);
    try {
      await fetch(`/api/agents/${agent.id}/memory/compress`, { method: 'POST' });
      await load();
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-300" />
            <div>
              <h2 className="text-lg font-bold text-white">Memoria del Agente</h2>
              <p className="text-[11px] text-slate-500">{agent.name} · {data?.count ?? 0} entradas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {loading && <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />}

          {data?.summary && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1">Resumen comprimido</p>
              <p className="text-xs text-slate-200 whitespace-pre-wrap">{data.summary}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interacciones recientes</p>
              <button
                onClick={compress}
                disabled={compressing}
                className="text-[10px] px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold flex items-center gap-1"
              >
                {compressing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                Comprimir histórico
              </button>
            </div>
            {data?.entries.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-4">Sin interacciones registradas todavía.</p>
            )}
            {data?.entries.map(e => (
              <div key={e.id} className="rounded-lg border border-white/5 bg-slate-800/30 p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    e.kind === 'summary' ? 'bg-purple-500/20 text-purple-300' :
                    e.kind === 'event' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-700/50 text-slate-300'
                  }`}>{e.kind}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{e.ts.slice(0, 16)}</span>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{e.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 p-4 flex gap-2">
          <input
            value={newEntry}
            onChange={e => setNewEntry(e.target.value)}
            placeholder="Registrar interacción manual..."
            className={inputCls + ' text-xs flex-1'}
            onKeyDown={e => { if (e.key === 'Enter') addEntry(); }}
          />
          <button onClick={addEntry} className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-white/10 text-slate-100 text-sm focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-500 italic">{hint}</p>}
    </div>
  );
}
