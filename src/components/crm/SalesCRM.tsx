import React, { useState } from 'react';
import {
  TrendingUp, Search, Plus, ChevronRight, MapPin, Package,
  FileCheck, CheckCircle2, Clock, FileText, Phone, MessageSquare,
  User, AlertCircle, Camera, Upload, XCircle, Bot,
  Tag, Filter, Send, Star, Zap, Award, DollarSign,
  BarChart3, Building2, Home, Shield, RefreshCw, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type ContractStatus = 'CAPTURA' | 'VALIDACION' | 'EXPEDIENTE' | 'INSTALACION' | 'ACTIVO';

interface Label {
  id: string;
  text: string;
  emoji: string;
  color: string;
  category: string;
}

interface Contract {
  id: string;
  client: string;
  curp: string;
  phone: string;
  email: string;
  refPhone: string;
  address: string;
  city: string;
  status: ContractStatus;
  package: string;
  price: string;
  vendedor: string;
  agente: string;
  progress: number;
  labels: string[];
  sections: boolean[];
  paymentStatus: 'completo' | 'parcial' | 'pendiente';
  source: string;
  date: string;
}

interface Payment {
  month: string;
  status: 'pagado' | 'pendiente' | 'vencido';
  amount: string;
  method?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: { key: ContractStatus; label: string; color: string; bg: string; count: number }[] = [
  { key: 'CAPTURA',     label: 'Captura',     color: 'text-blue-400',    bg: 'bg-blue-500',    count: 12 },
  { key: 'VALIDACION',  label: 'Validación',  color: 'text-yellow-400',  bg: 'bg-yellow-500',  count: 8  },
  { key: 'EXPEDIENTE',  label: 'Expediente',  color: 'text-amber-400',   bg: 'bg-amber-500',   count: 15 },
  { key: 'INSTALACION', label: 'Instalación', color: 'text-purple-400',  bg: 'bg-purple-500',  count: 42 },
  { key: 'ACTIVO',      label: 'Activo',      color: 'text-emerald-400', bg: 'bg-emerald-500', count: 1247 },
];

const DEFAULT_LABELS: Label[] = [
  { id: 'l1',  text: 'Captura completada',   emoji: '🔵', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    category: 'Proceso' },
  { id: 'l2',  text: 'Docs pendientes',      emoji: '🟡', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', category: 'Proceso' },
  { id: 'l3',  text: 'Captura completada',   emoji: '🟢', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', category: 'Proceso' },
  { id: 'l4',  text: 'INE OK',               emoji: '📄', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20',  category: 'Documentación' },
  { id: 'l5',  text: 'Pago inicial OK',       emoji: '💳', color: 'bg-green-500/10 text-green-400 border-green-500/20',  category: 'Documentación' },
  { id: 'l6',  text: 'Video firma OK',        emoji: '🎥', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', category: 'Documentación' },
  { id: 'l7',  text: 'Urgente (24h)',         emoji: '🔥', color: 'bg-red-500/10 text-red-400 border-red-500/20',        category: 'Prioridad' },
  { id: 'l8',  text: 'Prioritario (48h)',     emoji: '⭐', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  category: 'Prioridad' },
  { id: 'l9',  text: 'Nuevo cliente',         emoji: '🆕', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',     category: 'Tipo' },
  { id: 'l10', text: 'Cobertura OK',          emoji: '📍', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',    category: 'Cobertura' },
  { id: 'l11', text: 'Fraude sospechado',     emoji: '🚨', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',    category: 'Prioridad' },
  { id: 'l12', text: 'Alta prioridad',        emoji: '🎯', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', category: 'Prioridad' },
];

const mockContracts: Contract[] = [
  {
    id: 'CON-2024-04-1847', client: 'María Elena Rodríguez García', curp: 'ROGM850215MDFRDR08',
    phone: '+52 81 9876 5432', email: 'maria.rodriguez@email.com', refPhone: '+52 81 5555 6666',
    address: 'Av. Revolución 1234, Col. San Jerónimo', city: 'Monterrey, N.L.',
    status: 'VALIDACION', package: 'Doble Play 250 Megas', price: '$499.00/mes',
    vendedor: 'Carlos López', agente: 'CONTRATA-BOT', progress: 71,
    labels: ['l1', 'l4', 'l5', 'l7', 'l10'], sections: [true, true, true, true, true, false, false],
    paymentStatus: 'parcial', source: 'Facebook Ads', date: '16/04/2024 09:45',
  },
  {
    id: 'CON-2024-04-1848', client: 'Juan Pérez Morales', curp: 'PEMJ900301HDFRRN04',
    phone: '+52 55 1111 2222', email: 'juan.perez@email.com', refPhone: '+52 55 3333 4444',
    address: 'Reforma 456, Col. Juárez', city: 'CDMX',
    status: 'INSTALACION', package: 'Triple Play 500 Megas', price: '$899.00/mes',
    vendedor: 'Ana Martínez', agente: 'CONTRATA-BOT', progress: 90,
    labels: ['l3', 'l4', 'l5', 'l6', 'l8', 'l10'], sections: [true, true, true, true, true, true, false],
    paymentStatus: 'completo', source: 'Referido', date: '15/04/2024 14:00',
  },
  {
    id: 'CON-2024-04-1849', client: 'Ana López Hernández', curp: 'LOHA950718MDFPRN05',
    phone: '+52 81 7777 8888', email: 'ana.lopez@email.com', refPhone: '+52 81 9999 0000',
    address: 'Hidalgo 789, Col. Del Valle', city: 'Guadalajara, Jal.',
    status: 'CAPTURA', package: 'Internet 100 Megas', price: '$299.00/mes',
    vendedor: 'Carlos López', agente: 'CONTRATA-BOT', progress: 30,
    labels: ['l2', 'l9'], sections: [true, false, false, false, false, false, false],
    paymentStatus: 'pendiente', source: 'WhatsApp', date: '16/04/2024 11:20',
  },
];

const SECTION_LABELS = [
  'Identidad (INE/OCR)', 'Dirección (GPS)', 'Paquete seleccionado',
  'Términos aceptados', 'Contrato PDF generado', 'Video Firma', 'Validación Telefónica',
];

const WHATSAPP_TEMPLATES = [
  { emoji: '💳', label: 'Recordar pago', text: 'Hola {nombre}, te recordamos que tu pago inicial de $400 está pendiente. Realízalo aquí: [link seguro]' },
  { emoji: '📹', label: 'Ayuda video firma', text: 'Hola {nombre}, para completar tu contrato necesitamos el video firma. Aquí las instrucciones: [link tutorial]' },
  { emoji: '📅', label: 'Confirmar instalación', text: 'Hola {nombre}, tu instalación está confirmada para el {fecha} a las {hora}. ¿Alguien estará en casa?' },
  { emoji: '🎉', label: 'Bienvenida cliente', text: '¡Bienvenido/a {nombre}! Tu servicio HDreams ya está activo. Cualquier duda: [soporte]' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesCRM() {
  const [view, setView] = useState<'dashboard' | 'detail' | 'vendor'>('dashboard');
  const [contracts, setContracts] = useState<Contract[]>(mockContracts);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'TODOS'>('TODOS');
  const [activeTab, setActiveTab] = useState<'info' | 'whatsapp' | 'docs' | 'progress'>('info');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'telegram' | 'app'>('whatsapp');
  const [showLabelPanel, setShowLabelPanel] = useState(false);

  const filtered = contracts.filter(c => {
    const matchSearch = c.client.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.vendedor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'TODOS' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleLabel = (contractId: string, labelId: string) => {
    setContracts(prev => prev.map(c => {
      if (c.id !== contractId) return c;
      const has = c.labels.includes(labelId);
      return { ...c, labels: has ? c.labels.filter(l => l !== labelId) : [...c.labels, labelId] };
    }));
    if (selectedContract?.id === contractId) {
      setSelectedContract(prev => {
        if (!prev) return null;
        const has = prev.labels.includes(labelId);
        return { ...prev, labels: has ? prev.labels.filter(l => l !== labelId) : [...prev.labels, labelId] };
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-950/20 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30">
            <FileCheck className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">SALES-CRM</h2>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Gestión de Ventas y Contrataciones</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('vendor')} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all", view === 'vendor' ? "bg-amber-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
            Mi Panel
          </button>
          <button onClick={() => setView('dashboard')} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all", view === 'dashboard' ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
            Contratos
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg shadow-purple-900/20 ml-4">
            <Plus className="w-3 h-3" /> Nueva Venta
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SalesKpi label="Ventas hoy" value="23" sub="$45,200 capturados" color="text-purple-400" />
              <SalesKpi label="En validación" value="8" sub="Aguardando docs" color="text-yellow-400" />
              <SalesKpi label="Instalaciones hoy" value="5" sub="En curso" color="text-emerald-400" />
              <SalesKpi label="Meta mensual" value="76%" sub="$380,400 / $500,000" color="text-blue-400" />
            </div>

            {/* Pipeline */}
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Estado de Contrataciones</h3>
              <div className="grid grid-cols-5 gap-3">
                {PIPELINE_STAGES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setStatusFilter(statusFilter === s.key ? 'TODOS' : s.key)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border transition-all",
                      statusFilter === s.key ? `${s.bg.replace('bg-', 'bg-')}/10 border-current` : 'border-white/5 hover:border-white/10'
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full mb-3", s.bg)} />
                    <div className="text-2xl font-black text-white mb-1">{s.count}</div>
                    <div className={cn("text-[9px] font-bold uppercase tracking-tighter text-center", s.color)}>{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Search + Table */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por cliente, folio, teléfono, vendedor..."
                    className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 text-sm"
                  />
                </div>
                <button onClick={() => setStatusFilter('TODOS')} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all", statusFilter === 'TODOS' ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10")}>
                  Todos
                </button>
              </div>

              <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-slate-400 text-[10px] uppercase font-bold tracking-wider text-left">
                      <th className="px-6 py-4">Cliente / Folio</th>
                      <th className="px-6 py-4">Paquete</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Etiquetas</th>
                      <th className="px-6 py-4">Vendedor</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map(c => (
                      <tr key={c.id} className="hover:bg-white/5 cursor-pointer group transition-colors" onClick={() => { setSelectedContract(c); setActiveTab('info'); setView('detail'); }}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{c.client}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{c.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-300 text-xs">{c.package}</p>
                          <p className="text-slate-500 text-[10px] font-bold">{c.price}</p>
                        </td>
                        <td className="px-6 py-4">
                          <ContractStatusBadge status={c.status} />
                          <div className="mt-1.5 w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.progress}%` }} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[140px]">
                            {c.labels.slice(0, 2).map(lid => {
                              const l = DEFAULT_LABELS.find(x => x.id === lid);
                              return l ? (
                                <span key={lid} className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border truncate max-w-[80px]", l.color)}>
                                  {l.emoji} {l.text}
                                </span>
                              ) : null;
                            })}
                            {c.labels.length > 2 && <span className="text-[8px] text-slate-500 font-bold">+{c.labels.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{c.vendedor}</td>
                        <td className="px-6 py-4 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── VENDOR PANEL ── */}
        {view === 'vendor' && (
          <motion.div key="vendor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="bg-amber-600/5 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Panel del Vendedor — Carlos López</h3>
                  <p className="text-slate-400 text-xs">Región CDMX / Monterrey • Ranking: #3 de 12</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Meta personal</p>
                  <p className="text-2xl font-black text-white">$150,000</p>
                </div>
                <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Logrado</p>
                  <p className="text-2xl font-black text-amber-400">$127,400</p>
                  <p className="text-[9px] text-slate-400 mt-1">85% de meta</p>
                </div>
                <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Comisiones est.</p>
                  <p className="text-2xl font-black text-emerald-400">$6,370</p>
                </div>
                <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Ranking</p>
                  <p className="text-2xl font-black text-blue-400">#3 / 12</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Mis Clientes Activos</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-left">
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Etiquetas</th>
                    <th className="px-6 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {contracts.filter(c => c.vendedor === 'Carlos López').map(c => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{c.client}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{c.id}</p>
                      </td>
                      <td className="px-6 py-4"><ContractStatusBadge status={c.status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {c.labels.slice(0, 2).map(lid => {
                            const l = DEFAULT_LABELS.find(x => x.id === lid);
                            return l ? <span key={lid} className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border", l.color)}>{l.emoji}</span> : null;
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-all">
                            <MessageSquare className="w-3 h-3" />
                          </button>
                          <button className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all">
                            <Phone className="w-3 h-3" />
                          </button>
                          <button onClick={() => { setSelectedContract(c); setActiveTab('info'); setView('detail'); }} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all">
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── CONTRACT DETAIL ── */}
        {view === 'detail' && selectedContract && (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Header card */}
              <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 relative">
                <button onClick={() => setView('dashboard')} className="absolute top-6 right-6 text-slate-500 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
                <div className="mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <User className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedContract.client}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                          {selectedContract.id}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-blue-400 font-bold">
                          <Phone className="w-3 h-3" /> {selectedContract.phone}
                        </span>
                        <ContractStatusBadge status={selectedContract.status} />
                      </div>
                      <p className="text-slate-500 text-xs mt-2">Vendedor: {selectedContract.vendedor} • Agente: {selectedContract.agente} • {selectedContract.date}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-white/5">
                  {(['info', 'progress', 'whatsapp', 'docs'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={cn(
                      "px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                      activeTab === t ? "text-purple-400" : "text-slate-500 hover:text-slate-300"
                    )}>
                      {t === 'info' ? 'Información' : t === 'progress' ? 'Progreso' : t === 'whatsapp' ? 'WhatsApp' : 'Documentos'}
                      {activeTab === t && <motion.div layoutId="salesTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <AnimatePresence mode="wait">

                    {/* Info tab */}
                    {activeTab === 'info' && (
                      <motion.div key="si" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-5">
                          <InfoSection title="Información del Cliente" icon={User}>
                            <InfoLine label="Nombre" value={selectedContract.client} />
                            <InfoLine label="CURP" value={selectedContract.curp} mono />
                            <InfoLine label="Teléfono" value={selectedContract.phone} />
                            <InfoLine label="Email" value={selectedContract.email} />
                            <InfoLine label="Tel. Referencia" value={selectedContract.refPhone} />
                            <InfoLine label="Fuente" value={selectedContract.source} />
                          </InfoSection>
                        </div>
                        <div className="space-y-5">
                          <InfoSection title="Dirección de Instalación" icon={MapPin}>
                            <InfoLine label="Dirección" value={selectedContract.address} />
                            <InfoLine label="Ciudad" value={selectedContract.city} />
                            <InfoLine label="Cobertura" value="✅ Validado" />
                          </InfoSection>
                          <InfoSection title="Servicio Contratado" icon={Package}>
                            <InfoLine label="Paquete" value={selectedContract.package} />
                            <InfoLine label="Precio" value={selectedContract.price} />
                            <InfoLine label="Estado pago" value={selectedContract.paymentStatus} />
                          </InfoSection>
                        </div>
                      </motion.div>
                    )}

                    {/* Progress tab */}
                    {activeTab === 'progress' && (
                      <motion.div key="sp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all" style={{ width: `${selectedContract.progress}%` }} />
                          </div>
                          <span className="text-purple-400 font-black text-sm">{selectedContract.progress}%</span>
                        </div>
                        {SECTION_LABELS.map((label, i) => (
                          <div key={i} className={cn(
                            "flex items-center gap-4 p-4 rounded-xl border transition-all",
                            selectedContract.sections[i] ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/2 border-white/5"
                          )}>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black border",
                              selectedContract.sections[i] ? "bg-emerald-500 text-white border-emerald-400" : "bg-white/5 text-slate-600 border-white/10"
                            )}>
                              {selectedContract.sections[i] ? '✓' : i + 1}
                            </div>
                            <div>
                              <p className={cn("font-bold text-sm", selectedContract.sections[i] ? "text-white" : "text-slate-500")}>
                                Sección {i + 1}: {label}
                              </p>
                              {selectedContract.sections[i] && <p className="text-[10px] text-emerald-400 font-bold">Completado</p>}
                              {!selectedContract.sections[i] && <p className="text-[10px] text-slate-600 font-bold">Pendiente</p>}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* WhatsApp tab */}
                    {activeTab === 'whatsapp' && (
                      <motion.div key="sw" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                        {/* Channel selector */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Canal de envío</p>
                          <div className="flex gap-2">
                            {(['whatsapp', 'telegram', 'app'] as const).map(ch => (
                              <button key={ch} onClick={() => setSelectedChannel(ch)} className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all",
                                selectedChannel === ch ? "bg-emerald-600 text-white border-emerald-500" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                              )}>
                                {ch === 'whatsapp' ? '📱 WhatsApp' : ch === 'telegram' ? '✈️ Telegram' : '📲 App Móvil'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Conversation */}
                        <div className="bg-black/30 rounded-2xl p-5 h-[280px] overflow-y-auto space-y-4">
                          <ChatBubble sender="CONTRATA-BOT" text="¡Hola María Elena! Para comenzar tu contratación de Doble Play 250, necesito validar tu identidad. ¿Puedes enviarme una foto de tu INE?" time="09:45" />
                          <ChatBubble sender="CLIENTE" text="Hola, aquí está mi INE. ¿Qué sigue?" time="09:48" variant="user" />
                          <ChatBubble sender="CONTRATA-BOT" text="✅ Secciones 1-4 completadas. Te acabo de enviar el contrato PDF. Léelo y cuando estés de acuerdo, graba el video firma siguiendo las instrucciones." time="09:52" />
                          <ChatBubble sender="Vendedor Carlos" text="Hola María, soy Carlos, tu asesor. ¿Recibiste el contrato? ¿Tienes alguna duda sobre el video firma?" time="10:15" isHuman />
                        </div>

                        {/* Message input */}
                        <div className="relative">
                          <textarea
                            value={whatsappMessage}
                            onChange={e => setWhatsappMessage(e.target.value)}
                            placeholder="Escribir mensaje al cliente..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-28 text-sm text-white outline-none focus:border-purple-500/30 resize-none h-20"
                          />
                          <div className="absolute right-3 bottom-3 flex gap-2">
                            <button className="p-2 text-slate-500 hover:text-white"><Upload className="w-4 h-4" /></button>
                            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                              <Send className="w-3 h-3" /> Enviar
                            </button>
                          </div>
                        </div>

                        {/* Quick templates */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Plantillas rápidas</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {WHATSAPP_TEMPLATES.map(t => (
                              <button key={t.label} onClick={() => setWhatsappMessage(t.text)} className="flex-none px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap">
                                {t.emoji} {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Docs tab */}
                    {activeTab === 'docs' && (
                      <motion.div key="sd" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <DocCard label="INE Frente" icon={Camera} status="OK" />
                        <DocCard label="Comprobante" icon={FileText} status="OK" />
                        <DocCard label="Contrato PDF" icon={FileText} status="VER" />
                        <DocCard label="Video Firma" icon={FileCheck} status="PEND" />
                        <div className="aspect-square rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-2 group hover:border-purple-500/30 transition-all cursor-pointer">
                          <Upload className="w-6 h-6 text-slate-700 group-hover:text-purple-500" />
                          <span className="text-[9px] font-bold text-slate-700 group-hover:text-slate-500 uppercase">Subir doc</span>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Quick actions */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Acciones Rápidas</h4>
                <div className="space-y-2">
                  <ActionBtn icon={MessageSquare} label="WhatsApp Cliente" primary color="bg-emerald-600" />
                  <ActionBtn icon={Phone} label="Llamar / Validar" />
                  <ActionBtn icon={RefreshCw} label="Cambiar Estado" />
                  <ActionBtn icon={FileText} label="Reenviar Contrato" />
                  <ActionBtn icon={Bot} label="Reasignar Agente" />
                  <ActionBtn icon={FileCheck} label="Validar Contrato" color="bg-purple-600/20 text-purple-400 border-purple-500/20" />
                  <ActionBtn icon={XCircle} label="Cancelar Proceso" color="text-red-400 hover:bg-red-500/10" />
                </div>
              </div>

              {/* Labels */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Etiquetas</h4>
                  <button onClick={() => setShowLabelPanel(!showLabelPanel)} className="text-[9px] font-bold text-blue-400 uppercase">
                    {showLabelPanel ? 'Cerrar' : 'Gestionar'}
                  </button>
                </div>

                {/* Active labels */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selectedContract.labels.map(lid => {
                    const l = DEFAULT_LABELS.find(x => x.id === lid);
                    return l ? (
                      <button key={lid} onClick={() => toggleLabel(selectedContract.id, lid)} className={cn("text-[9px] font-bold px-2 py-1 rounded-full border transition-all hover:opacity-70", l.color)}>
                        {l.emoji} {l.text}
                      </button>
                    ) : null;
                  })}
                  {selectedContract.labels.length === 0 && <p className="text-[10px] text-slate-600">Sin etiquetas</p>}
                </div>

                {showLabelPanel && (
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    {['Proceso', 'Documentación', 'Prioridad', 'Tipo', 'Cobertura'].map(cat => (
                      <div key={cat}>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mb-1.5">{cat}</p>
                        <div className="flex flex-wrap gap-1">
                          {DEFAULT_LABELS.filter(l => l.category === cat).map(l => (
                            <button key={l.id} onClick={() => toggleLabel(selectedContract.id, l.id)} className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded-full border transition-all",
                              selectedContract.labels.includes(l.id) ? l.color : "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10"
                            )}>
                              {l.emoji} {l.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Visibilidad</h4>
                <div className="flex flex-wrap gap-2">
                  {['Vendedor', 'Supervisor', 'Validador', 'Soporte'].map(r => (
                    <span key={r} className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10">{r}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const map: Record<ContractStatus, string> = {
    CAPTURA:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    VALIDACION:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    EXPEDIENTE:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    INSTALACION: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    ACTIVO:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  return <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", map[status])}>{status}</span>;
}

function SalesKpi({ label, value, sub, color }: any) {
  return (
    <motion.div
      animate={{ borderColor: ['rgba(255,255,255,0.1)', 'rgba(168,85,247,0.2)', 'rgba(255,255,255,0.1)'] }}
      transition={{ repeat: Infinity, duration: 3 }}
      className="bg-slate-900/40 border p-4 rounded-xl backdrop-blur-md"
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-[9px] text-slate-400 mt-1 font-bold">{sub}</p>
    </motion.div>
  );
}

function InfoSection({ title, icon: Icon, children }: any) {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Icon className="w-3 h-3" /> {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoLine({ label, value, mono }: any) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-slate-500 text-xs">{label}:</span>
      <span className={cn("text-slate-200 font-bold text-xs", mono && "font-mono text-[10px]")}>{value}</span>
    </div>
  );
}

function ChatBubble({ sender, text, time, variant, isHuman }: any) {
  return (
    <div className={cn("flex flex-col gap-1", variant === 'user' ? "items-end" : "items-start")}>
      <span className={cn("text-[8px] font-bold uppercase tracking-widest", isHuman ? "text-amber-400" : variant === 'user' ? "text-blue-400" : "text-emerald-400")}>
        {sender}
      </span>
      <div className={cn(
        "px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[85%]",
        variant === 'user' ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none"
      )}>
        {text}
      </div>
      <span className="text-[8px] text-slate-600">{time}</span>
    </div>
  );
}

function DocCard({ label, icon: Icon, status }: any) {
  return (
    <div className="aspect-square bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2 p-4 group hover:border-purple-500/30 transition-all cursor-pointer">
      <Icon className="w-6 h-6 text-slate-500 group-hover:text-purple-400 transition-colors" />
      <span className="text-[9px] font-bold text-slate-400 text-center uppercase">{label}</span>
      <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded", status === 'OK' ? "bg-emerald-500/20 text-emerald-400" : status === 'VER' ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400")}>{status}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, primary, color }: any) {
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-xs font-bold group",
      primary ? `${color || 'bg-purple-600'} text-white border-white/10 hover:scale-[1.01]` : `${color || 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`
    )}>
      <Icon className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
      {label}
    </button>
  );
}
