import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneOff, PhoneCall, Bot, Send, ChevronLeft,
  CheckCircle2, Circle, Clock, User, AlertTriangle,
  FileText, Mic, MicOff, ChevronDown, ChevronUp,
  Loader2, ClipboardList, RefreshCw, CheckCheck,
  XCircle, TrendingUp, Copy, Volume2, Info, Zap
} from 'lucide-react';
import { generateResponse } from '../../services/aiService';
import TwilioPanel from '../ui/TwilioPanel';

// ── Types ──────────────────────────────────────────────────────────────────
type ScriptType = 'portabilidad' | 'linea_nueva';
type CallOutcome = 'success' | 'callback' | 'no_answer' | 'rejected' | 'escalated' | null;
type Phase = 'setup' | 'call' | 'summary';

interface FormData {
  scriptType: ScriptType;
  agentName: string;
  clientName: string;
  contractDate: string;
  packagePrice: string;
  packageMegas: string;
  extraPlatform: string;      // STAR TV u otro adicional
  promoPlatform: string;      // Netflix o HBO
  clientEmail: string;
  clientPhone: string;
  referencePhone: string;
  portNumber: string;         // solo portabilidad
  address: string;
  betweenStreets: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  script: string;             // texto exacto a decir
  tip?: string;
  critical?: boolean;
  done: boolean;
  skipped: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// ── Notas importantes del script oficial ─────────────────────────────────
const IMPORTANT_NOTES = [
  { text: 'Solo pura telefonía: $187, pero se debe convencer al cliente de contratar el paquete completo.', color: 'text-amber-400' },
  { text: 'Claro Video y Universal+ NO tienen costo, son ilimitados.', color: 'text-emerald-400' },
  { text: 'Netflix 2 disp. c/anuncios: $109 | HBO: $119 | F1: $119 (después de promo).', color: 'text-blue-400' },
  { text: 'Portabilidad: 3 meses sin costo (4°, 8° y 12° mes).', color: 'text-purple-400' },
  { text: 'Llamadas ilimitadas (excepto Rusia y Cuba — NO mencionar si el cliente no pregunta).', color: 'text-slate-300' },
  { text: 'NO hay contrato con plazo forzoso.', color: 'text-emerald-400' },
  { text: 'Pago 30 días después de la instalación.', color: 'text-slate-300' },
  { text: 'Cambio de domicilio: $800.', color: 'text-slate-300' },
  { text: 'Cuenta con SÍGUEME: enlaza llamadas de teléfono de casa al celular.', color: 'text-blue-400' },
  { text: 'Si el cliente tiene dudas o quiere otro paquete: mencionar al promotor. NO hacer labor de venta.', color: 'text-red-400 font-bold' },
];

// ── Outcome config ─────────────────────────────────────────────────────────
const OUTCOME_CONFIG: Record<NonNullable<CallOutcome>, { label: string; color: string; icon: React.ElementType }> = {
  success:   { label: 'Exitosa',      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', icon: CheckCircle2 },
  callback:  { label: 'Rellamar',     color: 'text-amber-400   border-amber-500/40   bg-amber-500/10',   icon: PhoneCall     },
  no_answer: { label: 'No contestó',  color: 'text-slate-400   border-slate-500/40   bg-slate-500/10',   icon: PhoneOff      },
  rejected:  { label: 'Rechazada',    color: 'text-red-400     border-red-500/40     bg-red-500/10',     icon: XCircle       },
  escalated: { label: 'Escalada',     color: 'text-purple-400  border-purple-500/40  bg-purple-500/10',  icon: TrendingUp    },
};

// ── Generar checklist según tipo de script ─────────────────────────────────
function buildChecklist(f: FormData): ChecklistItem[] {
  const greeting = `"Buenos días / Buenas tardes, mi nombre es ${f.agentName || 'AGENTE'}, promotor autorizado Infinitum. Me comunico con ${f.clientName || 'EL TITULAR'} — solo validar al titular. La llamada será grabada para fines de calidad."`;

  const confirmContract = `"El motivo de mi llamada es para confirmar los detalles de su contratación que realizó el día de hoy ${f.contractDate || 'DD/MM/AA'} del paquete ($${f.packagePrice || '389'}). ¿Es correcto?"`;

  const benefits = `"El paquete solicitado ($${f.packagePrice || '389'}) le ofrece ${f.packageMegas || '120'} megas de velocidad y Claro Video (películas, series, documentales, conciertos y caricaturas). También incluye Universal+ ilimitado y sin costo, además de una línea telefónica con llamadas ilimitadas${f.extraPlatform ? ` — también incluye ${f.extraPlatform}` : ''}."`;

  const promo = `"Por promoción cuenta con ${f.promoPlatform || 'Netflix o HBO'} por 6 meses sin costo para 2 dispositivos con anuncios. Finalizando los 6 meses tendría un costo adicional de $${f.promoPlatform === 'Netflix' ? '109' : '119'}. Si no requiere la plataforma, es necesario cancelarla antes de que se cumplan los 6 meses."`;

  const paymentWarn = `"El pago lo tiene que realizar directamente en sucursal o por medio del estado de cuenta que llega a su correo. No tiene que generar ningún pago en efectivo o transferencia al promotor o al técnico."`;

  const address = `"Me podría indicar el domicilio donde se instalará el servicio: calle, número exterior, número interior, colonia, municipio y código postal. También sus entre calles."`;

  const phones = `"Me podría confirmar su número de celular y de referencia."`;

  const email = `"Por último, cuento con el correo electrónico ${f.clientEmail || 'CORREO@EJEMPLO.COM'}. ¿Es correcto?"`;

  const techTime = `"El técnico se estará comunicando con usted para agendar día y hora de instalación en los siguientes días (de 3 a 5 días hábiles)."`;

  const doubts = `"¿Tendrá alguna duda acerca de su servicio?"`;

  const uniform = `"¿Me podría confirmar si el promotor estaba portando su uniforme?"`;

  const farewell = `"Para el seguimiento recibirá un SMS y correo electrónico. Le invitamos a descargar la app de Telmex. Ponemos a su disposición el número 800 123 2222 para cualquier duda. Le agradezco que haya tomado mi llamada, le atendió ${f.agentName || 'AGENTE'}, promotor autorizado Infinitum. ¡Que tenga un excelente día!"`;

  const base: Omit<ChecklistItem, 'done' | 'skipped'>[] = [
    { id: '1', label: 'Saludo y grabación', script: greeting, critical: true },
    { id: '2', label: 'Confirmar contratación y paquete', script: confirmContract, critical: true },
    { id: '3', label: 'Explicar beneficios del paquete', script: benefits },
    { id: '4', label: 'Mencionar plataformas de promoción', script: promo, tip: `Si conserva la plataforma: Netflix $109 | HBO $119 | F1 $119` },
  ];

  if (f.scriptType === 'portabilidad') {
    base.push({
      id: '5', critical: true,
      label: 'Portabilidad: sin TV ni GI — cancelar con compañía anterior',
      script: '"Es importante mencionarle que su servicio no cuenta con canales de televisión abierta ni de paga, y no cuenta con Gastos de Instalación por ser una portabilidad. Le recordamos que usted tiene que generar la cancelación con su actual compañía posterior a la instalación de nuestro servicio — por términos y condiciones, el titular tiene que generarla."',
      tip: 'Portabilidad: 3 meses sin costo en el 4°, 8° y 12° mes',
    });
    base.push({
      id: '6', critical: true,
      label: 'Forma de pago (NO al promotor/técnico)',
      script: paymentWarn,
    });
    base.push({ id: '7', label: 'Confirmar domicilio', script: address, critical: true });
    base.push({ id: '8', label: 'Confirmar celular y referencia', script: phones, critical: true });
    if (f.portNumber) {
      base.push({
        id: '8b', critical: true,
        label: 'Confirmar número a portar',
        script: `"Me podría confirmar el número ${f.portNumber} que se va a portar."`,
      });
    }
  } else {
    base.push({
      id: '5', critical: true,
      label: 'Línea nueva: sin TV — no hay meses gratis',
      script: '"Es importante mencionarle que su servicio no cuenta con canales de televisión abierta ni de paga y no hay promoción de meses gratis."',
    });
    base.push({
      id: '5b', critical: true,
      label: 'Explicar Gastos de Instalación ($1,600)',
      script: '"El promotor le informó que los gastos de instalación son de $1,600: un pago inicial de $400 — recibirá un correo para generar ese pago y después se realiza la instalación. El restante se difiere a 12 meses, por lo que su paquete quedaría en $489. En caso de pago en una sola exhibición, los GI son de $1,600 y se ven reflejados en la primera facturación."',
      tip: '⚠️ Primero se genera el pago inicial, LUEGO se instala. No decir que es después de la instalación.',
    });
    base.push({
      id: '6', critical: true,
      label: 'Forma de pago (NO al promotor/técnico)',
      script: '"El pago lo tiene que realizar directamente en sucursal o por medio de la liga de pago que llega a su correo. No tiene que generar ningún pago en efectivo o transferencia al promotor o al técnico."',
    });
    base.push({ id: '7', label: 'Confirmar domicilio', script: address, critical: true });
    base.push({ id: '8', label: 'Confirmar celular y referencia', script: phones, critical: true });
  }

  base.push({ id: '9', label: 'Confirmar correo electrónico', script: email, critical: true });
  base.push({ id: '10', label: 'Informar tiempo de instalación (3-5 días)', script: techTime });
  base.push({ id: '11', label: '¿Tiene alguna duda?', script: doubts });
  base.push({ id: '12', label: 'Confirmar uniforme del promotor', script: uniform, critical: true });
  base.push({ id: '13', label: 'Despedida + app Telmex + 800 123 2222', script: farewell });

  return base.map(item => ({ ...item, done: false, skipped: false }));
}

// ── Timer hook ─────────────────────────────────────────────────────────────
function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = () => { setRunning(true); setSeconds(0); };
  const stop  = () => setRunning(false);
  const reset = () => { setRunning(false); setSeconds(0); };
  useEffect(() => {
    if (running) ref.current = setInterval(() => setSeconds(s => s + 1), 1000);
    else if (ref.current) clearInterval(ref.current);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);
  const fmt = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
  return { seconds, fmt, start, stop, reset };
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AIValidationCall({ onBack }: { onBack: () => void }) {
  const [phase, setPhase]         = useState<Phase>('setup');
  const [form, setForm]           = useState<FormData>({
    scriptType: 'portabilidad', agentName: '', clientName: '', contractDate: '',
    packagePrice: '389', packageMegas: '120', extraPlatform: '', promoPlatform: 'Netflix',
    clientEmail: '', clientPhone: '', referencePhone: '', portNumber: '',
    address: '', betweenStreets: '',
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [expandedTip, setExpandedTip]   = useState<string | null>(null);
  const [showScript, setShowScript]     = useState<string | null>(null);
  const [showNotes, setShowNotes]       = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [callOutcome, setCallOutcome]   = useState<CallOutcome>(null);
  const [summaryText, setSummaryText]   = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [muted, setMuted]               = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timer = useTimer();

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const setF = (field: keyof FormData, val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const startCall = () => {
    const cl = buildChecklist(form);
    setChecklist(cl);
    timer.start();
    setPhase('call');
    setChatMessages([{
      role: 'assistant',
      text: `📞 Llamada iniciada. Script: **${form.scriptType === 'portabilidad' ? 'Portabilidad' : 'Línea Nueva'}** — Cliente: **${form.clientName || 'N/D'}**\n\nEstoy aquí para ayudarte durante la llamada. Pregúntame sobre objeciones, dudas del cliente o cualquier situación del script.`,
    }]);
  };

  const toggleStep = (id: string, field: 'done' | 'skipped') => {
    setChecklist(prev => prev.map(s => s.id !== id ? s : {
      ...s,
      done:    field === 'done'    ? !s.done    : s.done,
      skipped: field === 'skipped' ? !s.skipped : s.skipped,
    }));
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const context = `Eres el asistente de IA de Heavenly Dreams ayudando a un asesor durante una llamada de validación de Infinitum/Telmex.

TIPO DE SCRIPT: ${form.scriptType === 'portabilidad' ? 'Portabilidad' : 'Línea Nueva'}
CLIENTE: ${form.clientName} | PAQUETE: $${form.packagePrice} | ${form.packageMegas} megas

NOTAS CLAVE DEL SCRIPT OFICIAL:
- Claro Video y Universal+ son GRATIS e ilimitados
- ${form.scriptType === 'portabilidad' ? 'Portabilidad: sin GI, 3 meses sin costo (4°, 8° y 12° mes). El cliente cancela con su compañía actual DESPUÉS de la instalación.' : 'Línea nueva: GI $1,600 — pago inicial $400 ANTES de instalación, resto en 12 meses ($489/mes) o $1,600 en una sola exhibición.'}
- Plataformas de promo (Netflix/HBO/F1) duran 6 meses. Cancelar antes si no las quiere.
- NUNCA hacer labor de venta. Si el cliente quiere otro paquete, avisar al promotor.
- Llamadas ilimitadas (excepto Rusia y Cuba — no mencionar si no preguntan).
- Pago 30 días después de instalación. NUNCA al promotor/técnico en efectivo.
- No hay contrato con plazo forzoso.
- Cuenta con SÍGUEME (enlaza llamadas de casa al celular).

Responde de forma muy concisa (máx 2-3 oraciones), práctica y en español. Sin markdown excesivo.`;

      const reply = await generateResponse(`${context}\n\nPregunta del asesor: ${msg}`, 'GENERAL');
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Error al conectar con la IA. Intenta de nuevo.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const endCall = async (outcome: CallOutcome) => {
    if (!outcome) return;
    timer.stop();
    setCallOutcome(outcome);
    setPhase('summary');
    setSummaryLoading(true);
    const done  = checklist.filter(s => s.done).length;
    const total = checklist.length;
    const critical = checklist.filter(s => s.critical && !s.done).map(s => s.label);
    try {
      const summary = await generateResponse(
        `Genera un resumen ejecutivo de esta llamada de validación de Infinitum/Telmex:

Script: ${form.scriptType === 'portabilidad' ? 'Portabilidad' : 'Línea Nueva'}
Cliente: ${form.clientName} | Paquete: $${form.packagePrice} | ${form.packageMegas} megas
Agente: ${form.agentName} | Duración: ${timer.fmt}
Resultado: ${OUTCOME_CONFIG[outcome].label}
Pasos completados: ${done}/${total}
${critical.length > 0 ? `Pasos críticos NO completados: ${critical.join(', ')}` : 'Todos los pasos críticos completados.'}
Dirección confirmada: ${form.address || 'No capturada'}
Email confirmado: ${form.clientEmail || 'No capturado'}

Escribe un resumen ejecutivo en español (5-6 oraciones). Incluye: resultado, puntos completados, puntos pendientes y recomendaciones. Tono profesional, sin markdown.`,
        'GENERAL'
      );
      setSummaryText(summary);
    } catch {
      setSummaryText(`Llamada ${OUTCOME_CONFIG[outcome].label} — Duración: ${timer.fmt} — ${done}/${total} pasos completados.`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const doneCount   = checklist.filter(s => s.done).length;
  const progressPct = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // SETUP PHASE
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'setup') return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Phone className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Llamada de Validación — Infinitum</h1>
            <p className="text-xs text-slate-400">Script oficial Telmex · Portabilidad o Línea Nueva</p>
          </div>
        </div>
      </div>

      {/* Script Type Selector */}
      <div className="grid grid-cols-2 gap-3">
        {(['portabilidad', 'linea_nueva'] as ScriptType[]).map(type => (
          <button
            key={type}
            onClick={() => setF('scriptType', type)}
            className={`rounded-2xl border p-4 text-left transition-all ${
              form.scriptType === type
                ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                : 'bg-slate-900/40 border-white/10 hover:border-white/20'
            }`}
          >
            <p className={`text-sm font-bold mb-1 ${form.scriptType === type ? 'text-blue-300' : 'text-white'}`}>
              {type === 'portabilidad' ? '🔄 Portabilidad' : '✨ Línea Nueva'}
            </p>
            <p className="text-[10px] text-slate-400">
              {type === 'portabilidad'
                ? 'Cliente que viene de otra compañía — sin GI, 3 meses sin costo'
                : 'Cliente nuevo — GI $1,600 ($400 inicial + 12 meses)'}
            </p>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Datos de la llamada
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { field: 'agentName',   label: 'Tu nombre (asesor)', placeholder: 'Ej: Carlos Martínez' },
            { field: 'clientName',  label: 'Nombre del titular *', placeholder: 'Ej: Juan García López' },
            { field: 'contractDate',label: 'Fecha de contratación', placeholder: 'DD/MM/AA' },
            { field: 'clientPhone', label: 'Celular del cliente *', placeholder: '+52 55 1234 5678' },
            { field: 'referencePhone', label: 'Teléfono de referencia', placeholder: '+52 55 8765 4321' },
            { field: 'clientEmail', label: 'Correo electrónico *', placeholder: 'cliente@email.com' },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">{label}</label>
              <input
                value={form[field as keyof FormData]}
                onChange={e => setF(field as keyof FormData, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">Precio del paquete</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input value={form.packagePrice} onChange={e => setF('packagePrice', e.target.value)}
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">Megas</label>
            <input value={form.packageMegas} onChange={e => setF('packageMegas', e.target.value)}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">Plataforma promo</label>
            <select value={form.promoPlatform} onChange={e => setF('promoPlatform', e.target.value)}
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50">
              <option className="bg-slate-900">Netflix</option>
              <option className="bg-slate-900">HBO</option>
              <option className="bg-slate-900">F1</option>
              <option className="bg-slate-900">Netflix o HBO</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">Adicional contratado (opcional)</label>
            <input value={form.extraPlatform} onChange={e => setF('extraPlatform', e.target.value)}
              placeholder="Ej: STAR TV, otro paquete"
              className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          {form.scriptType === 'portabilidad' && (
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">Número a portar *</label>
              <input value={form.portNumber} onChange={e => setF('portNumber', e.target.value)}
                placeholder="Ej: 55 1234 5678"
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-medium text-slate-400 mb-1">Domicilio del cliente</label>
          <input value={form.address} onChange={e => setF('address', e.target.value)}
            placeholder="Calle, n° ext., n° int., colonia, municipio, CP"
            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Notes accordion */}
      <div className="bg-slate-900/40 border border-amber-500/20 rounded-2xl overflow-hidden">
        <button onClick={() => setShowNotes(n => !n)}
          className="w-full flex items-center justify-between px-5 py-3 text-amber-400 hover:bg-amber-500/5 transition-all">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" /> Notas importantes del script oficial
          </span>
          {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {showNotes && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="overflow-hidden">
              <div className="px-5 pb-4 space-y-2">
                {IMPORTANT_NOTES.map((n, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <p className={`text-xs ${n.color}`}>{n.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={startCall}
        disabled={!form.clientName.trim()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-900/30"
      >
        <Phone className="w-5 h-5" /> Iniciar Llamada de Validación
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // CALL PHASE
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'call') return (
    <div className="h-full flex flex-col gap-3 animate-in fade-in pb-4">

      {/* Call Header */}
      <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-500/30 rounded-2xl px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">{form.clientName || 'Cliente'}</p>
            <p className="text-[10px] text-slate-400">
              {form.scriptType === 'portabilidad' ? 'Portabilidad' : 'Línea Nueva'} · ${ form.packagePrice} · {form.packageMegas} megas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-white/10">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-emerald-400">{timer.fmt}</span>
          </div>
          <button onClick={() => setMuted(m => !m)}
            className={`p-1.5 rounded-xl border transition-all ${muted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white'}`}>
            {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setShowNotes(n => !n)}
            className={`p-1.5 rounded-xl border transition-all ${showNotes ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-amber-400'}`}
            title="Notas del script">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notes overlay */}
      <AnimatePresence>
        {showNotes && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-amber-900/20 border border-amber-500/30 rounded-2xl px-4 py-3 shrink-0">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {IMPORTANT_NOTES.slice(0, 6).map((n, i) => (
                <span key={i} className={`text-[10px] flex items-start gap-1 ${n.color}`}>
                  <span className="mt-0.5">•</span>{n.text}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0 overflow-hidden">

        {/* ── Checklist ── */}
        <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 min-h-0">

          {/* Progress */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3 shrink-0">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Script ({doneCount}/{checklist.length})
              </span>
              <span className="text-[10px] font-bold text-blue-400">{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-1.5">
            {checklist.map((step, i) => (
              <motion.div key={step.id} layout
                className={`rounded-xl border px-3 py-2.5 transition-all ${
                  step.done    ? 'bg-emerald-500/10 border-emerald-500/20' :
                  step.skipped ? 'bg-slate-800/30 border-slate-700/30 opacity-40' :
                  step.critical ? 'bg-slate-800/50 border-red-500/20 hover:border-red-400/30' :
                  'bg-slate-800/40 border-white/5 hover:border-blue-500/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleStep(step.id, 'done')} className="shrink-0 mt-0.5 transition-transform active:scale-90">
                    {step.done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <Circle className={`w-4 h-4 ${step.critical ? 'text-red-400/60 hover:text-red-400' : 'text-slate-600 hover:text-blue-400'} transition-colors`} />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-black text-slate-600`}>{String(i+1).padStart(2,'0')}</span>
                      {step.critical && !step.done && <Zap className="w-2.5 h-2.5 text-red-400/70" />}
                      <p className={`text-xs font-semibold leading-snug ${step.done ? 'text-emerald-300 line-through opacity-60' : step.critical ? 'text-white' : 'text-slate-200'}`}>
                        {step.label}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => setShowScript(showScript === step.id ? null : step.id)}
                        className="flex items-center gap-1 text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors">
                        <Volume2 className="w-2.5 h-2.5" />
                        Ver texto
                        {showScript === step.id ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                      </button>
                      {step.tip && (
                        <button onClick={() => setExpandedTip(expandedTip === step.id ? null : step.id)}
                          className="flex items-center gap-1 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors">
                          <Info className="w-2.5 h-2.5" />
                          Nota
                        </button>
                      )}
                      {!step.done && (
                        <button onClick={() => toggleStep(step.id, 'skipped')}
                          className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors ml-auto">
                          {step.skipped ? 'Reactivar' : 'Omitir'}
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showScript === step.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="mt-2 bg-slate-900/80 border border-white/10 rounded-lg p-2.5">
                          <p className="text-[11px] text-slate-200 italic leading-relaxed">{step.script}</p>
                        </motion.div>
                      )}
                      {expandedTip === step.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="mt-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                          <p className="text-[10px] text-amber-300">{step.tip}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── AI Chat + End Call ── */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* Chat */}
          <div className="flex-1 flex flex-col bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden min-h-0">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 shrink-0">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Asistente IA — Objeciones & Dudas</span>
              <span className="ml-auto flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ACTIVO
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 min-h-0">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-blue-600/30 border border-blue-500/30' : 'bg-slate-700 border border-white/10'}`}>
                    {msg.role === 'assistant' ? <Bot className="w-3 h-3 text-blue-400" /> : <User className="w-3 h-3 text-slate-300" />}
                  </div>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'assistant' ? 'bg-slate-800/80 text-slate-200 border border-white/5' : 'bg-blue-600/80 text-white'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-blue-400" />
                  </div>
                  <div className="bg-slate-800/80 border border-white/5 rounded-2xl px-3 py-2 flex items-center gap-1">
                    {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="px-2.5 py-2.5 border-t border-white/5 flex gap-2 shrink-0">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder='Ej: "El cliente pregunta si hay TV" o "No quiere pagar los GI"'
                className="flex-1 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-all active:scale-90">
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          {/* Twilio — marcar al cliente */}
          <TwilioPanel
            compact
            defaultPhone={form.clientPhone}
            clientName={form.clientName}
            folio=""
            extras={{ megas: form.packageMegas, price: form.packagePrice }}
          />

          {/* End Call */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3 shrink-0">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <PhoneOff className="w-3 h-3" /> Finalizar llamada
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(OUTCOME_CONFIG) as [NonNullable<CallOutcome>, typeof OUTCOME_CONFIG[keyof typeof OUTCOME_CONFIG]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => endCall(key)}
                  className={`flex items-center gap-1 justify-center rounded-xl border px-1.5 py-1.5 text-[9px] font-bold transition-all hover:opacity-90 active:scale-95 ${cfg.color}`}>
                  <cfg.icon className="w-3 h-3 shrink-0" />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY PHASE
  // ══════════════════════════════════════════════════════════════════════════
  const outcomeInfo = callOutcome ? OUTCOME_CONFIG[callOutcome] : null;
  const criticalMissed = checklist.filter(s => s.critical && !s.done);

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 pb-10">
      {/* Header */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/10 to-transparent border-b border-white/5 px-5 py-4 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${outcomeInfo?.color || ''}`}>
            {outcomeInfo && <outcomeInfo.icon className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen · Validación Infinitum</p>
            <h2 className="text-lg font-bold text-white">
              {callOutcome ? OUTCOME_CONFIG[callOutcome].label : '—'} — {form.clientName || 'Cliente'}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/5">
          {[
            { label: 'Duración',  value: timer.fmt,                          icon: Clock },
            { label: 'Pasos',     value: `${doneCount}/${checklist.length}`, icon: CheckCheck },
            { label: 'Progreso',  value: `${progressPct}%`,                  icon: TrendingUp },
          ].map(({ label, value, icon: Ic }) => (
            <div key={label} className="flex flex-col items-center py-3 gap-0.5">
              <Ic className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
              <span className="text-base font-black text-white">{value}</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical missed items */}
      {criticalMissed.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Pasos críticos no completados:
          </p>
          <div className="space-y-1">
            {criticalMissed.map(s => (
              <p key={s.id} className="text-[11px] text-red-300 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" /> {s.label}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> Resumen ejecutivo IA
          </p>
          {summaryText && (
            <button onClick={() => { navigator.clipboard.writeText(summaryText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
              {copied ? <><CheckCheck className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
            </button>
          )}
        </div>
        {summaryLoading
          ? <div className="flex items-center gap-2 text-slate-400 text-xs py-3 justify-center"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando resumen…</div>
          : <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{summaryText}</p>
        }
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => { timer.reset(); setPhase('setup'); setChecklist([]); setCallOutcome(null); setSummaryText(''); setChatMessages([]); }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 font-bold text-sm transition-all">
          <RefreshCw className="w-4 h-4" /> Nueva llamada
        </button>
        <button onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 border border-white/10 hover:bg-slate-700/60 text-slate-300 font-bold text-sm transition-all">
          <ChevronLeft className="w-4 h-4" /> Menú
        </button>
      </div>
    </div>
  );
}
