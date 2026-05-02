import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, MessageCircle, Send, Phone, User, Users, CheckCircle, Clock,
  XCircle, Star, Briefcase, MapPin, Calendar, ChevronRight, Plus,
  Trash2, RefreshCw, Loader2, Copy, CheckCheck, AlertTriangle,
  Smartphone, MessageSquare, Zap, Settings, Filter, Search,
  TrendingUp, Award, Hash, ChevronDown, ChevronUp, Edit3, Save
} from 'lucide-react';
import { sendWhatsApp, formatMxNumber, MESSAGE_TEMPLATES } from '../../services/twilioService';

// ── Types ─────────────────────────────────────────────────────────────────
type Profile = 'volantero' | 'ayudante' | 'asesor' | 'supervisor' | 'rechazado' | 'pendiente';
type Stage = 'interesado' | 'agendo' | 'confirmocita' | 'confirmodd' | 'bienvenida' | 'no_show';

interface BotMessage { role: 'bot' | 'user'; text: string; ts: string; }
interface Candidate {
  id: string; phone: string; name: string; age: number; experience: string;
  profile: Profile; stage: Stage; assignedAgent: number;
  folio: string; notes: string; appointmentDate: string; appointmentTime: string;
  interviewer: string;   // QUIEN LO ENTREVISTÓ
  vacancy: string;       // A QUÉ VACANTE VIENE
  messages: BotMessage[]; createdAt: string;
  needsHuman?: boolean;     // Flagged for human attention
  humanReason?: string;     // Why escalation was triggered
}

// ── Config ────────────────────────────────────────────────────────────────
const STAGES: { id: Stage; label: string; color: string; icon: string }[] = [
  { id: 'interesado', label: 'INTERESADO', color: 'blue', icon: '💬' },
  { id: 'agendo', label: 'AGENDÓ', color: 'amber', icon: '📅' },
  { id: 'confirmocita', label: 'CONFIRMÓ LA CITA', color: 'emerald', icon: '✅' },
  { id: 'confirmodd', label: 'CONFIRMÓ DE D,DO', color: 'violet', icon: '🧠' },
  { id: 'bienvenida', label: 'BIENVENIDA', color: 'green', icon: '🌟' },
  { id: 'no_show', label: 'NO SHOW', color: 'red', icon: '🚫' },
];

const PROFILES: Record<Profile, { label: string; color: string; salary: string; age: string; emoji: string }> = {
  volantero: { label: 'Volantero/Embajador', color: 'yellow', salary: '$2,000/sem', age: '16-25', emoji: '📢' },
  ayudante: { label: 'Ayudante General', color: 'blue', salary: '$2,100/sem', age: '18-35', emoji: '📦' },
  asesor: { label: 'Asesor Comercial', color: 'green', salary: '$2,300/sem', age: '18-35', emoji: '💼' },
  supervisor: { label: 'Supervisor de Área', color: 'purple', salary: '$2,600/sem', age: '18-35', emoji: '🎖️' },
  rechazado: { label: 'No Aplica', color: 'red', salary: '—', age: '<16/>35', emoji: '❌' },
  pendiente: { label: 'Sin Perfil', color: 'slate', salary: '—', age: '—', emoji: '⏳' },
};

const AGENTS = [
  { id: 1, name: 'Agente 1', style: 'Formal', color: 'blue', avatar: '👔' },
  { id: 2, name: 'Agente 2', style: 'Amigable', color: 'emerald', avatar: '😊' },
  { id: 3, name: 'Agente 3', style: 'Energético', color: 'amber', avatar: '⚡' },
  { id: 4, name: 'Agente 4', style: 'Empático', color: 'violet', avatar: '🤝' },
  { id: 5, name: 'Agente 5', style: 'Eficiente', color: 'cyan', avatar: '🎯' },
];

const FAQS = [
  { q: '¿Qué documentos debo llevar?', a: '📄 Trae: CV impreso (o solicitud de empleo), INE o identificación oficial. Si eres menor de edad, trae identificación escolar o acta de nacimiento. También copia de comprobante de domicilio, RFC, NSS y comprobante de estudios.' },
  { q: '¿El pago es por tarjeta o efectivo?', a: '💸 Los pagos son de forma puntual cada semana vía transferencia bancaria para tu seguridad y comodidad.' },
  { q: '¿Necesito experiencia para Ayudante?', a: '✅ ¡No es necesaria! Nosotros te capacitamos desde el primer día. Solo necesitamos actitud proactiva y ganas de crecer.' },
  { q: '¿Dónde están ubicados exactamente?', a: '📍 Estamos en Av. Tláhuac 3632 interior 301, Col. Culhuacán, Iztapalapa, CDMX. Justo a un lado de la estación Metro Culhuacán (Línea 12, dirección Mixcoac).' },
  { q: '¿Puedo cambiar el horario de entrevista?', a: '🕒 Contamos con entrevistas de Lunes a Viernes a las 9:30 AM. Si no puedes en ese horario, indícanos a qué hora podrías asistir y verificamos disponibilidad.' },
  { q: '¿Aceptan sin experiencia?', a: '✅ ¡Claro! Para Volantero y Ayudante General no se requiere experiencia previa. Para Supervisor pedimos mínimo 1 año liderando equipos.' },
  { q: '¿Tienen otras sucursales?', a: '🏢 Sí, estamos en expansión con presencia en Naucalpan (Edomex) y Tijuana (BC), pero tu entrevista es en la sucursal de Iztapalapa, CDMX.' },
  { q: '¿Es seguro el pago?', a: '💚 Totalmente. En Heavenly Dreams pagamos cada semana de manera puntual vía transferencia. La tranquilidad de tu dinero es nuestra prioridad.' },
];

const BOT_FLOW = [
  {
    phase: 1, icon: '👋', title: 'Bienvenida y Filtro',
    bot: '¡Hola! 👋 Bienvenida(o) al portal de empleo de *Heavenly Dreams*. Soy tu asistente virtual de reclutamiento. 🚀\n\nPara ofrecerte la vacante ideal, necesito que respondas con los siguientes datos:\n\n1️⃣ *Nombre completo:*\n2️⃣ *Edad:* (Solo el número)\n3️⃣ *¿Tienes experiencia previa?* (Sí/No y en qué área)',
  },
  {
    phase: 2, icon: '🧠', title: 'Asignación de Perfil',
    bot: '[La IA analiza edad + experiencia y responde UNO de estos perfiles:]',
    options: [
      { label: '📢 Volantero (16-25 años)', msg: '¡Perfil Seleccionado: EMBAJADOR DE MARCA! 📢✨\n\nIdeal para tu energía y edad.\n💰 Sueldo: $2,000 semanales\n🎂 Edad: 16 a 25 años\n📌 Actividad: Primera conexión con clientes en puntos estratégicos\n✨ Requisito: Actitud extrovertida y mucha sonrisa' },
      { label: '📦 Ayudante (18-35, operativo)', msg: '¡Perfil Seleccionado: AYUDANTE GENERAL! 🎯\n\n💰 Sueldo: $2,100 semanales + BONOS\n🎂 Edad: 18 a 35 años\n📌 Captura de datos, organización y apoyo en atención al cliente\n✅ Prestaciones de Ley desde el día 1 + uniformes gratuitos' },
      { label: '💼 Asesor (18-35, ventas)', msg: '¡Perfil Seleccionado: ASESOR COMERCIAL! 📈\n\n💰 Sueldo: $2,300 semanales + Comisiones\n🎂 Edad: 18 a 35 años\n📌 Prospección, cierre de ventas y seguimiento de cartera\n✅ Capacitación pagada y plan de carrera' },
      { label: '🎖️ Supervisor (exp. liderazgo)', msg: '¡Perfil Seleccionado: SUPERVISOR DE ÁREA! 🎖️\n\n💰 Sueldo: $2,600 semanales + Bonos de resultados\n📋 Requisito: Experiencia mínima 1 año liderando equipos\n📌 Supervisión de KPIs, resolución de conflictos y reportes' },
    ],
  },
  {
    phase: 3, icon: '📅', title: 'Confirmación de Cita',
    bot: '¡Excelente elección! Para continuar, te agendaremos una entrevista presencial:\n\n🕒 *Horario:* Mañana 9:30 AM\n📍 *Dirección:* Av. Tláhuac 3632, int 301, Col. Culhuacán, Iztapalapa, CDMX\n🗺️ *Referencia:* Justo a un lado de Metro Culhuacán (Dirección Mixcoac)\n\n📍 https://maps.google.com/?q=19.331,-99.105\n\n¿Confirmas tu asistencia? Responde con la palabra *ASISTIRÉ* para generar tu folio de acceso.',
  },
  {
    phase: 4, icon: '🎟️', title: 'Folio Generado',
    bot: '¡Genial! 🎉 Tu cita ha sido *CONFIRMADA*.\n\n🎟️ *Folio de acceso:* HD-[FOLIO]\n📅 *Fecha:* Mañana\n⏰ *Hora:* 9:30 AM\n📍 *Lugar:* Av. Tláhuac 3632, int 301\n\nRecuerda traer:\n• CV o solicitud de empleo\n• INE o identificación oficial\n• Comprobante de domicilio\n\n¡Te esperamos! Si tienes alguna duda, escríbeme aquí. 🙌',
  },
];

// ── API helpers ────────────────────────────────────────────────────────────
const api = {
  getCandidates: (): Promise<Candidate[]> =>
    fetch('/api/recruitment/candidates').then(r => r.json()),
  saveCandidate: (c: Candidate): Promise<Candidate> =>
    fetch('/api/recruitment/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).then(r => r.json()),
  deleteCandidate: (id: string) =>
    fetch(`/api/recruitment/candidates/${id}`, { method: 'DELETE' }),
  processBot: (phone: string, msg: string, history: BotMessage[], agentId?: number) =>
    fetch('/api/recruitment/bot/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, userMessage: msg, conversationHistory: history, agentId }) }).then(r => r.json()),
};

function genFolio() { return 'HD-' + Math.floor(100000 + Math.random() * 900000); }
function genId() { return 'CAND-' + Date.now(); }

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function RecruitmentBot() {
  const [tab, setTab] = useState<'pipeline' | 'simulator' | 'faq' | 'agents'>('pipeline');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState(0);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => { loadCandidates(); }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const data = await api.getCandidates();
      // Si no hay datos en server, usar mock
      const safe = Array.isArray(data) ? data : [];
      if (safe.length === 0) setCandidates(MOCK_CANDIDATES);
      else setCandidates(safe);
    } catch {
      setCandidates(MOCK_CANDIDATES);
    }
    setLoading(false);
  };

  const saveCandidate = async (c: Candidate) => {
    const updated = await api.saveCandidate(c);
    setCandidates(prev => {
      const idx = prev.findIndex(x => x.id === c.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
      return [...prev, updated];
    });
  };

  const deleteCandidate = async (id: string) => {
    await api.deleteCandidate(id);
    setCandidates(prev => prev.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const moveStage = (cand: Candidate, stage: Stage) => {
    const updated = { ...cand, stage };
    if (stage === 'confirmocita' && !cand.folio) updated.folio = genFolio();
    saveCandidate(updated);
    if (selected?.id === cand.id) setSelected(updated);
  };

  const filtered = candidates.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchAgent = !filterAgent || c.assignedAgent === filterAgent;
    return matchSearch && matchAgent;
  });

  const stats = {
    total: candidates.length,
    contratados: candidates.filter(c => c.stage === 'bienvenida').length,
    agendados: candidates.filter(c => ['agendo', 'confirmocita'].includes(c.stage)).length,
    conversion: candidates.length ? Math.round((candidates.filter(c => c.stage === 'bienvenida').length / candidates.length) * 100) : 0,
    needsHuman: candidates.filter(c => c.needsHuman).length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Bot WhatsApp · Reclutamiento</h2>
            <p className="text-[11px] text-slate-400">Pipeline automatizado con IA · 5 agentes</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> Nuevo Candidato
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Leads', value: stats.total, icon: Users, color: 'blue' },
          { label: 'Agendados', value: stats.agendados, icon: Calendar, color: 'amber' },
          { label: 'Contratados', value: stats.contratados, icon: Star, color: 'emerald' },
          { label: 'Conversión', value: `${stats.conversion}%`, icon: TrendingUp, color: 'violet' },
          { label: '⚠️ Atención', value: stats.needsHuman, icon: AlertTriangle, color: stats.needsHuman > 0 ? 'red' : 'slate' },
        ].map(s => (
          <div key={s.label} className={`bg-slate-900/60 border rounded-2xl p-3 ${s.label.includes('Atención') && stats.needsHuman > 0 ? 'border-red-500/40 bg-red-900/20' : 'border-white/8'}`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-3.5 h-3.5 text-${s.color}-400`} />
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`text-2xl font-black text-${s.color}-400`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit overflow-x-auto hide-scrollbar">
        {([
          ['pipeline', '📋 Pipeline', 'pipeline'],
          ['simulator', '🤖 Bot Flujo', 'simulator'],
          ['faq', '❓ FAQ', 'faq'],
          ['agents', '👥 Agentes', 'agents'],
        ] as [typeof tab, string, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${tab === id ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── PIPELINE TAB ── */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-slate-800/60 border border-white/8 rounded-xl px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nombre o teléfono..."
                className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-44"
              />
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterAgent(0)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${!filterAgent ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Todos
              </button>
              {AGENTS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setFilterAgent(filterAgent === a.id ? 0 : a.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${filterAgent === a.id ? `bg-${a.color}-500/20 text-${a.color}-400 border border-${a.color}-500/30` : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {a.avatar} {a.name}
                </button>
              ))}
            </div>
          </div>

          {/* Kanban */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-green-400" />
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-max">
                {STAGES.map(stage => {
                  const stageCands = filtered.filter(c => c.stage === stage.id);
                  return (
                    <div key={stage.id} className="w-52 shrink-0">
                      {/* Column header */}
                      <div className={`flex items-center justify-between mb-2 px-2 py-1.5 rounded-xl bg-slate-800/60 border border-white/8`}>
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <span>{stage.icon}</span>{stage.label}
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full bg-${stage.color}-500/20 text-${stage.color}-400`}>
                          {stageCands.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div className="space-y-2 min-h-[80px]">
                        {stageCands.map(c => (
                          <CandidateCard
                            key={c.id}
                            candidate={c}
                            onSelect={() => setSelected(c)}
                            onMove={moveStage}
                            onDelete={deleteCandidate}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOT FLOW TAB ── */}
      {tab === 'simulator' && <BotSimulator />}

      {/* ── FAQ TAB ── */}
      {tab === 'faq' && <FAQSection />}

      {/* ── AGENTS TAB ── */}
      {tab === 'agents' && <AgentsPanel candidates={candidates} />}

      {/* ── CANDIDATE DETAIL PANEL ── */}
      <AnimatePresence>
        {selected && (
          <CandidateDetail
            candidate={selected}
            onClose={() => setSelected(null)}
            onSave={saveCandidate}
            onMove={moveStage}
          />
        )}
      </AnimatePresence>

      {/* ── NEW CANDIDATE FORM ── */}
      <AnimatePresence>
        {showNewForm && (
          <NewCandidateForm
            onClose={() => setShowNewForm(false)}
            onSave={c => { saveCandidate(c); setShowNewForm(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CANDIDATE CARD
// ═══════════════════════════════════════════════════════════════════════════
function CandidateCard({ candidate: c, onSelect, onMove, onDelete }: {
  candidate: Candidate;
  onSelect: () => void;
  onMove: (c: Candidate, s: Stage) => void;
  onDelete: (id: string) => void;
}) {
  const prof = PROFILES[c.profile];
  const agent = AGENTS.find(a => a.id === c.assignedAgent);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-800/70 border border-white/8 rounded-xl p-3 cursor-pointer hover:border-white/20 transition-all group"
      onClick={onSelect}
    >
      {/* Human escalation badge */}
      {c.needsHuman && (
        <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 rounded-lg px-2 py-1 mb-2">
          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
          <span className="text-[9px] font-bold text-red-300 truncate">
            Atención Humana Requerida
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{c.name || 'Sin nombre'}</p>
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <Phone className="w-2.5 h-2.5" />{c.phone}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${formatMxNumber(c.phone)}`, '_blank'); }}
            className="p-1 text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
            title="Iniciar WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(c.id); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {c.profile !== 'pendiente' && (
        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-${prof.color}-500/15 text-${prof.color}-400 border border-${prof.color}-500/20 mb-2`}>
          <span>{prof.emoji}</span>{prof.label}
        </div>
      )}

      <div className="flex items-center justify-between">
        {agent && (
          <span className={`text-[9px] text-${agent.color}-400 font-medium`}>{agent.avatar} {agent.name}</span>
        )}
        {c.folio && (
          <span className="text-[9px] font-mono text-slate-500">{c.folio}</span>
        )}
      </div>

      {c.age > 0 && (
        <p className="text-[9px] text-slate-600 mt-1">{c.age} años · {c.experience || 'Sin exp.'}</p>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CANDIDATE DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════════
function CandidateDetail({ candidate: c, onClose, onSave, onMove }: {
  candidate: Candidate;
  onClose: () => void;
  onSave: (c: Candidate) => void;
  onMove: (c: Candidate, s: Stage) => void;
}) {
  const [activeSection, setActiveSection] = useState<'info' | 'chat' | 'send'>('info');
  const [waMsgIdx, setWaMsgIdx] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string>('');
  const [editNotes, setEditNotes] = useState(c.notes);
  const [editInterviewer, setEditInterviewer] = useState(c.interviewer || '');
  const [editVacancy, setEditVacancy] = useState(c.vacancy || '');
  const [editAppDate, setEditAppDate] = useState(c.appointmentDate || '');
  const [editAppTime, setEditAppTime] = useState(c.appointmentTime || '09:30');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prof = PROFILES[c.profile];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [c.messages]);

  const waTemplates = [
    { label: 'Confirmar perfil', msg: `¡Hola ${c.name || 'candidato'}! 👋 Hemos revisado tu perfil y eres apto para la vacante de *${prof.label}* con sueldo de ${prof.salary}. ¿Te interesa avanzar al proceso de entrevista? Responde *SÍ* para agendar.` },
    { label: 'Enviar cita', msg: `¡Hola ${c.name || ''}! Tu entrevista está agendada para mañana a las 9:30 AM.\n📍 Av. Tláhuac 3632, int 301, Col. Culhuacán, Iztapalapa\n🗺️ Metro Culhuacán (Línea 12)\n\nTu folio de acceso: *${c.folio || genFolio()}*\n\nRecuerda traer: CV, INE y comprobante de domicilio. ¡Te esperamos! ✅` },
    { label: 'Recordatorio', msg: `¡Hola ${c.name || ''}! 🔔 Te recordamos que *mañana* tienes entrevista con Heavenly Dreams a las 9:30 AM en Av. Tláhuac 3632 int 301 (Metro Culhuacán). Por favor confirma con *VOY EN CAMINO*. ¡Te esperamos!` },
    { label: 'No show', msg: `Hola ${c.name || ''}, notamos que no pudiste presentarte hoy. ¿Te gustaría reagendar? Tenemos horarios disponibles mañana a las 10:00 AM, 1:00 PM o 4:00 PM. Responde con el número de horario que prefieras. 🙏` },
    { label: 'Reactivación', msg: `¡Hola ${c.name || ''}! 👋 Seguimos con vacantes disponibles en Heavenly Dreams para ventas Telmex. Pago semanal + bonos + capacitación pagada. ¿Aún te interesa? Responde *1* para entrevista o *2* para más info.` },
  ];

  const handleSendWA = async () => {
    if (!c.phone) return;
    setSending(true);
    setSendResult('');
    try {
      await sendWhatsApp(formatMxNumber(c.phone), waTemplates[waMsgIdx].msg);
      setSendResult('✅ Mensaje enviado por WhatsApp');
    } catch (e: any) {
      setSendResult(`❌ ${e.message}`);
    }
    setSending(false);
  };

  const handleSaveNotes = () => {
    onSave({ ...c, notes: editNotes });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md h-full bg-[#080f1e] border-l border-white/10 overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-black text-white">{c.name || 'Sin nombre'}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3" />{c.phone}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
          </div>

          {/* Profile badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-${prof.color}-500/15 text-${prof.color}-400 border border-${prof.color}-500/25`}>
            <span>{prof.emoji}</span>{prof.label}
            {prof.salary !== '—' && <span className="opacity-60">· {prof.salary}</span>}
          </div>

          {/* Stage selector */}
          <div className="mt-3">
            <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Etapa del proceso</p>
            <div className="flex flex-wrap gap-1">
              {STAGES.map(s => (
                <button
                  key={s.id}
                  onClick={() => onMove(c, s.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${c.stage === s.id
                      ? `bg-${s.color}-500/20 text-${s.color}-400 border-${s.color}-500/40`
                      : 'border-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-white/8">
          {(['info', 'chat', 'send'] as const).map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`flex-1 py-2.5 text-xs font-bold transition-all ${activeSection === s ? 'text-white border-b-2 border-green-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {s === 'info' ? '📋 Info' : s === 'chat' ? '💬 Chat' : '📤 Enviar'}
            </button>
          ))}
        </div>

        <div className="flex-1 p-4 space-y-4">

          {/* INFO */}
          {activeSection === 'info' && (
            <div className="space-y-4">
              {/* Human escalation banner */}
              {c.needsHuman && (
                <div className="flex items-start gap-3 bg-red-500/15 border border-red-500/40 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-300">⚠️ Atención Humana Requerida</p>
                    <p className="text-[10px] text-red-400/80 mt-0.5">{c.humanReason || 'Pregunta compleja detectada por IA'}</p>
                    <button
                      onClick={() => onSave({ ...c, needsHuman: false, humanReason: '' })}
                      className="mt-2 text-[10px] font-bold text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/40 px-2 py-1 rounded-lg transition-all"
                    >
                      Marcar como resuelto
                    </button>
                  </div>
                </div>
              )}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Edad', value: c.age ? `${c.age} años` : '—' },
                { label: 'Experiencia', value: c.experience || '—' },
                { label: 'Folio', value: c.folio || '(sin folio)' },
                { label: 'Agente', value: AGENTS.find(a => a.id === c.assignedAgent)?.name || '—' },
                { label: 'Registro', value: c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-MX') : '—' },
              ].map(f => (
                <div key={f.label} className="bg-slate-800/40 rounded-xl p-2.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">{f.label}</p>
                    <p className="text-xs font-bold text-slate-200 mt-0.5 truncate">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* CRM Reclutamiento - Campos Específicos */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Detalles de la Entrevista</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase">Día de Cita</label>
                    <input type="date" value={editAppDate} onChange={e => setEditAppDate(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase">Hora de Cita</label>
                    <input type="time" value={editAppTime} onChange={e => setEditAppTime(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase">Quién lo Entrevistó</label>
                  <input type="text" value={editInterviewer} onChange={e => setEditInterviewer(e.target.value)} placeholder="Nombre del entrevistador..." className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase">Vacante</label>
                  <input type="text" value={editVacancy} onChange={e => setEditVacancy(e.target.value)} placeholder="Puesto al que aplica..." className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white" />
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Notas del agente</p>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
                  placeholder="Observaciones del agente..."
                />
                <button
                  onClick={() => onSave({ ...c, notes: editNotes, interviewer: editInterviewer, vacancy: editVacancy, appointmentDate: editAppDate, appointmentTime: editAppTime })}
                  className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-green-600/80 hover:bg-green-500 text-white text-[11px] font-bold rounded-lg transition-all"
                >
                  <Save className="w-3 h-3" /> Guardar cambios
                </button>
              </div>
            </div>
          )}

        {/* CHAT */}
        {activeSection === 'chat' && (
          <div className="space-y-2">
            {c.messages.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">Sin mensajes registrados</div>
            )}
            {c.messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${m.role === 'bot' ? 'bg-green-600/30 text-green-400' : 'bg-slate-700 text-slate-300'}`}>
                  {m.role === 'bot' ? '🤖' : '👤'}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'bot' ? 'bg-slate-800 text-slate-200 border border-white/5' : 'bg-green-600/80 text-white'}`}>
                  {m.text}
                  <p className={`text-[8px] mt-1 ${m.role === 'bot' ? 'text-slate-600' : 'text-green-200/60'}`}>
                    {m.ts ? new Date(m.ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* SEND WHATSAPP */}
        {activeSection === 'send' && (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-400">Selecciona la plantilla y envía por WhatsApp:</p>

            <div className="space-y-2">
              {waTemplates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setWaMsgIdx(i)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all ${waMsgIdx === i ? 'bg-green-500/15 border-green-500/40 text-green-300' : 'bg-slate-800/40 border-white/8 text-slate-400 hover:text-slate-200'}`}
                >
                  <p className="font-bold">{t.label}</p>
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="bg-[#1a2332] border border-white/8 rounded-xl p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Vista previa</p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{waTemplates[waMsgIdx].msg}</p>
            </div>

            <button
              onClick={handleSendWA}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              Enviar por WhatsApp
            </button>

            {sendResult && (
              <p className={`text-xs text-center font-medium ${sendResult.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {sendResult}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
    </motion.div >
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BOT SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════
function BotSimulator() {
  const [phase, setPhase] = useState(0);
  const [optIdx, setOptIdx] = useState(0);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    { role: 'bot', text: BOT_FLOW[0].bot },
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/recruitment/bot/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: 'simulator', userMessage: msg, conversationHistory: msgs }),
      });
      const data = await res.json();
      if (data.botReply) {
        setMsgs(prev => [...prev, { role: 'bot', text: data.botReply }]);
        if (data.phase) setPhase(data.phase - 1);
      }
    } catch {
      setMsgs(prev => [...prev, { role: 'bot', text: 'Error al conectar con el servidor. Verifica que el servidor está corriendo.' }]);
    }
    setLoading(false);
  };

  const reset = () => {
    setPhase(0);
    setMsgs([{ role: 'bot', text: BOT_FLOW[0].bot }]);
    setInput('');
  };

  const currentFlow = BOT_FLOW[phase] || BOT_FLOW[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Phone simulator */}
      <div className="flex flex-col items-center">
        <p className="text-xs text-slate-400 mb-3 font-medium">Simulador de conversación WhatsApp</p>

        {/* Phone frame */}
        <div className="w-72 bg-[#0a1628] rounded-[32px] border-2 border-slate-700 shadow-2xl overflow-hidden">
          {/* Status bar */}
          <div className="bg-[#128C7E] px-4 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🤖</div>
            <div>
              <p className="text-white text-xs font-bold">Bot HDreams</p>
              <p className="text-green-200 text-[9px]">en línea</p>
            </div>
            <button onClick={reset} className="ml-auto text-white/70 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Chat */}
          <div className="bg-[#ECE5DD] h-96 overflow-y-auto p-3 space-y-2">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed whitespace-pre-wrap shadow-sm ${m.role === 'bot'
                    ? 'bg-white text-gray-800 rounded-tl-sm'
                    : 'bg-[#DCF8C6] text-gray-800 rounded-tr-sm'
                  }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2 flex gap-1 shadow-sm">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-gray-800 outline-none"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Quick replies */}
        <div className="mt-3 w-72 space-y-1.5">
          <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider">Respuestas rápidas de prueba</p>
          {[
            'María González, 24 años, sí tengo experiencia en atención al cliente',
            'Carlos Ramírez, 19 años, sin experiencia',
            'ASISTIRÉ',
            '¿Qué documentos necesito llevar?',
          ].map(r => (
            <button
              key={r}
              onClick={() => send(r)}
              className="w-full text-left px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-white/8 rounded-xl text-[11px] text-slate-300 transition-all truncate"
            >
              💬 {r}
            </button>
          ))}
        </div>
      </div>

      {/* Flow diagram */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-white">Flujo oficial del bot</p>
        {BOT_FLOW.map((f, i) => (
          <div
            key={i}
            className={`p-4 rounded-2xl border transition-all ${phase === i ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800/40 border-white/8'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className={`text-xs font-bold ${phase === i ? 'text-green-300' : 'text-slate-300'}`}>
                  Fase {f.phase}: {f.title}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed line-clamp-4">{f.bot}</p>
            {f.options && (
              <div className="mt-2 space-y-1">
                {f.options.map((o, j) => (
                  <div key={j} className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    {o.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Safety rules */}
        <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Reglas de Seguridad
          </p>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <p>• Edad &lt;16 o &gt;35: declinar cordialmente y registrar contacto</p>
            <p>• Sin confirmación en 2h: recordatorio automático</p>
            <p>• No show: flujo de reagendamiento</p>
            <p>• Si escribe "ASISTIRÉ" o "SÍ": generar folio HD-XXXXXX</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAQ SECTION
// ═══════════════════════════════════════════════════════════════════════════
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3 max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Respuestas automáticas del bot</p>
          <p className="text-[11px] text-slate-400">El bot detecta estas preguntas y responde al instante</p>
        </div>
      </div>

      {FAQS.map((faq, i) => (
        <motion.div
          key={i}
          className="bg-slate-800/50 border border-white/8 rounded-2xl overflow-hidden"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xs font-black">❓</span>
              <span className="text-sm font-semibold text-slate-200">{faq.q}</span>
            </div>
            <motion.div animate={{ rotate: open === i ? 180 : 0 }}>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </motion.div>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <div className="bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3">
                    <p className="text-[11px] text-slate-300 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}

      {/* Webhook info */}
      <div className="mt-6 bg-slate-900/60 border border-white/8 rounded-2xl p-4">
        <p className="text-xs font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-slate-400" /> Configuración del Webhook Twilio
        </p>
        <p className="text-[11px] text-slate-400 mb-3">
          Para recibir mensajes reales de WhatsApp, configura en <span className="text-blue-400">console.twilio.com</span> el webhook de tu número de WhatsApp:
        </p>
        <div className="bg-black/40 rounded-xl px-3 py-2 font-mono text-[11px] text-green-400">
          POST https://tu-dominio.railway.app/api/twilio/webhook/whatsapp
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          Ruta: Twilio Console → Messaging → Senders → WhatsApp → Webhook URL
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENTS PANEL
// ═══════════════════════════════════════════════════════════════════════════
function AgentsPanel({ candidates }: { candidates: Candidate[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {AGENTS.map(agent => {
        const agentCands = candidates.filter(c => c.assignedAgent === agent.id);
        const contratados = agentCands.filter(c => c.stage === 'bienvenida').length;
        const agendados = agentCands.filter(c => ['agendo', 'confirmocita'].includes(c.stage)).length;
        const conversion = agentCands.length ? Math.round((contratados / agentCands.length) * 100) : 0;

        return (
          <div key={agent.id} className={`bg-slate-900/60 border border-${agent.color}-500/20 rounded-2xl p-5`}>
            {/* Agent header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-${agent.color}-500/20 border border-${agent.color}-500/30 flex items-center justify-center text-2xl`}>
                {agent.avatar}
              </div>
              <div>
                <p className="text-sm font-black text-white">{agent.name}</p>
                <p className={`text-[11px] text-${agent.color}-400 font-medium`}>Estilo: {agent.style}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Leads', value: agentCands.length, color: agent.color },
                { label: 'Agendados', value: agendados, color: 'amber' },
                { label: 'Conv. %', value: `${conversion}%`, color: 'emerald' },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/50 rounded-xl p-2 text-center">
                  <p className={`text-lg font-black text-${s.color}-400`}>{s.value}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Stage breakdown */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Por etapa</p>
              {STAGES.slice(0, 5).map(stage => {
                const count = agentCands.filter(c => c.stage === stage.id).length;
                if (!count) return null;
                return (
                  <div key={stage.id} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>{stage.icon}</span>{stage.label}
                    </span>
                    <span className={`text-[11px] font-bold text-${stage.color}-400`}>{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Pipeline messages */}
            <div className="mt-4 bg-slate-800/40 rounded-xl p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">Plantilla de bienvenida</p>
              <p className="text-[10px] text-slate-300 italic leading-relaxed">
                {agent.id === 1 && '"Hola, gracias por contactar a Heavenly Dreams. ¿En qué puedo apoyarle?"'}
                {agent.id === 2 && '"¡Hola! Qué gusto saludarte, soy del equipo HDreams. ¿Cómo estás? 😊"'}
                {agent.id === 3 && '"¡Hola! ¿Listo para las mejores vacantes de HDreams? ¡Vamos! ⚡"'}
                {agent.id === 4 && '"Hola, entiendo que buscar empleo es importante. Estoy aquí para ayudarte 🤝"'}
                {agent.id === 5 && '"Hola, soy tu asistente de reclutamiento. ¿Qué info necesitas? 🎯"'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW CANDIDATE FORM
// ═══════════════════════════════════════════════════════════════════════════
function NewCandidateForm({ onClose, onSave }: { onClose: () => void; onSave: (c: Candidate) => void }) {
  const [form, setForm] = useState({
    name: '', phone: '', age: '', experience: '',
    profile: 'pendiente' as Profile,
    assignedAgent: 1,
    notes: '',
    interviewer: '',
    vacancy: 'Asesor Comercial',
  });

  const handleSubmit = () => {
    if (!form.phone.trim()) return;
    const ageNum = parseInt(form.age) || 0;
    let autoProfile: Profile = 'pendiente';
    if (ageNum > 0) {
      if (ageNum < 16 || ageNum > 35) autoProfile = 'rechazado';
      else if (ageNum >= 16 && ageNum <= 17) autoProfile = 'volantero';
      else if (form.experience.toLowerCase().includes('lider') || form.experience.toLowerCase().includes('supervisor')) autoProfile = 'supervisor';
      else if (form.experience.toLowerCase().includes('venta') || form.experience.toLowerCase().includes('comercial')) autoProfile = 'asesor';
      else autoProfile = 'ayudante';
    }
    const candidate: Candidate = {
      id: genId(), phone: form.phone, name: form.name, age: ageNum,
      experience: form.experience, profile: form.profile !== 'pendiente' ? form.profile : autoProfile,
      stage: 'interesado', assignedAgent: form.assignedAgent,
      folio: '', notes: form.notes, appointmentDate: '', appointmentTime: '09:30',
      interviewer: form.interviewer, vacancy: form.vacancy,
      messages: [], createdAt: new Date().toISOString(),
    };
    onSave(candidate);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-[#080f1e] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-green-400" /> Nuevo Candidato
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Ana Torres', full: true },
            { key: 'phone', label: 'Teléfono (WhatsApp)', type: 'tel', placeholder: '5512345678', full: false },
            { key: 'age', label: 'Edad', type: 'number', placeholder: '24', full: false },
          ].map(f => (
            <div key={f.key} className={f.full ? 'col-span-2' : ''}>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">{f.label}</label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Vacante</label>
            <input
              type="text"
              value={form.vacancy}
              onChange={e => setForm(prev => ({ ...prev, vacancy: e.target.value }))}
              placeholder="Ej: Asesor Comercial"
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Entrevistador</label>
            <input
              type="text"
              value={form.interviewer}
              onChange={e => setForm(prev => ({ ...prev, interviewer: e.target.value }))}
              placeholder="Quién entrevista..."
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Experiencia previa</label>
          <input
            type="text"
            value={form.experience}
            onChange={e => setForm(prev => ({ ...prev, experience: e.target.value }))}
            placeholder="Ej: Ventas, atención al cliente, sin experiencia..."
            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Perfil (auto si dejas vacío)</label>
            <select
              value={form.profile}
              onChange={e => setForm(prev => ({ ...prev, profile: e.target.value as Profile }))}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              {Object.entries(PROFILES).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Agente asignado</label>
            <select
              value={form.assignedAgent}
              onChange={e => setForm(prev => ({ ...prev, assignedAgent: Number(e.target.value) }))}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              {AGENTS.map(a => <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!form.phone.trim()}
          className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all"
        >
          ✅ Registrar Candidato
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Missing import alias ──
const UserPlus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

// ── Mock candidates for demo ───────────────────────────────────────────────
const MOCK_CANDIDATES: Candidate[] = [
  { id: 'c1', phone: '5512345678', name: 'María González', age: 22, experience: 'Atención al cliente 1 año', profile: 'asesor', stage: 'agendo', assignedAgent: 1, folio: 'HD-001234', notes: 'Muy interesada, llegó puntual', appointmentDate: '2026-04-27', appointmentTime: '09:30', interviewer: 'Lic. Claudia', vacancy: 'Asesor Comercial', messages: [], createdAt: '2026-04-25T10:00:00Z' },
  { id: 'c2', phone: '5598765432', name: 'Carlos Ramírez', age: 19, experience: 'Sin experiencia', profile: 'volantero', stage: 'interesado', assignedAgent: 2, folio: '', notes: '', appointmentDate: '', appointmentTime: '09:30', interviewer: '', vacancy: 'Volantero', messages: [], createdAt: '2026-04-25T11:00:00Z' },
  { id: 'c3', phone: '5511223344', name: 'Ana Torres', age: 28, experience: 'Supervisora 2 años', profile: 'supervisor', stage: 'confirmocita', assignedAgent: 3, folio: 'HD-005678', notes: 'Experiencia sólida en liderazgo', appointmentDate: '2026-04-26', appointmentTime: '09:30', interviewer: 'Ing. Marco', vacancy: 'Supervisor de Área', messages: [], createdAt: '2024-04-24T09:00:00Z' },
  { id: 'c4', phone: '5544332211', name: 'Luis Hernández', age: 25, experience: 'Ventas Telmex 6 meses', profile: 'asesor', stage: 'bienvenida', assignedAgent: 1, folio: 'HD-003456', notes: 'Contratado el 20/04', appointmentDate: '2026-04-20', appointmentTime: '09:30', interviewer: 'Lic. Claudia', vacancy: 'Asesor Comercial', messages: [], createdAt: '2026-04-18T08:00:00Z' },
  { id: 'c5', phone: '5566778899', name: 'Sofía Mendoza', age: 17, experience: 'Sin experiencia', profile: 'volantero', stage: 'interesado', assignedAgent: 4, folio: '', notes: '', appointmentDate: '', appointmentTime: '09:30', interviewer: '', vacancy: 'Volantero', messages: [], createdAt: '2026-04-26T07:00:00Z' },
  { id: 'c6', phone: '5533221100', name: 'Jorge Castillo', age: 31, experience: 'Captura de datos 3 años', profile: 'ayudante', stage: 'confirmodd', assignedAgent: 5, folio: '', notes: 'Muy organizado', appointmentDate: '', appointmentTime: '09:30', interviewer: 'Lic. Claudia', vacancy: 'Ayudante General', messages: [], createdAt: '2026-04-25T15:00:00Z' },
  { id: 'c7', phone: '5577889900', name: 'Elena Morales', age: 24, experience: 'Promotora 1 año', profile: 'asesor', stage: 'no_show', assignedAgent: 2, folio: 'HD-007890', notes: 'No se presentó, enviar reagendamiento', appointmentDate: '2026-04-25', appointmentTime: '09:30', interviewer: '', vacancy: 'Asesor Comercial', messages: [], createdAt: '2026-04-23T12:00:00Z' },
  { id: 'c8', phone: '5500112233', name: 'Roberto Díaz', age: 29, experience: 'Liderazgo en almacén 2 años', profile: 'supervisor', stage: 'interesado', assignedAgent: 3, folio: '', notes: 'Pendiente de agendar', appointmentDate: '', appointmentTime: '09:30', interviewer: '', vacancy: 'Supervisor de Área', messages: [], createdAt: '2026-04-26T09:00:00Z' },
];
