import React, { useState } from 'react';
import {
  Plus, Search, Phone, MessageCircle, Mail, X, ChevronRight,
  Star, Clock, DollarSign, User, Tag, StickyNote, MoreHorizontal,
  Flame, TrendingUp, CheckCircle2, XCircle, ArrowRight, Bot,
  Filter, BarChart3, Users, Target, Zap, Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = 'prospecto' | 'calificado' | 'propuesta' | 'negociacion' | 'ganado' | 'perdido';

interface Lead {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  package: string;
  value: number;
  stage: Stage;
  priority: 'alta' | 'media' | 'baja';
  source: string;
  assignedTo: string;
  tags: string[];
  note: string;
  createdAt: string;
  lastContact: string;
  score: number;
}

// ─── Pipeline config ──────────────────────────────────────────────────────────

const STAGES: { key: Stage; label: string; color: string; bg: string; border: string; icon: React.ElementType }[] = [
  { key: 'prospecto',    label: 'Prospectos',   color: 'text-slate-300',   bg: 'bg-slate-500',    border: 'border-slate-500/30',  icon: Circle },
  { key: 'calificado',   label: 'Calificados',  color: 'text-blue-400',    bg: 'bg-blue-500',     border: 'border-blue-500/30',   icon: Star },
  { key: 'propuesta',    label: 'Propuesta',    color: 'text-yellow-400',  bg: 'bg-yellow-500',   border: 'border-yellow-500/30', icon: Tag },
  { key: 'negociacion',  label: 'Negociación',  color: 'text-orange-400',  bg: 'bg-orange-500',   border: 'border-orange-500/30', icon: Flame },
  { key: 'ganado',       label: 'Ganados ✓',    color: 'text-emerald-400', bg: 'bg-emerald-500',  border: 'border-emerald-500/30',icon: CheckCircle2 },
  { key: 'perdido',      label: 'Perdidos',     color: 'text-red-400',     bg: 'bg-red-500',      border: 'border-red-500/30',    icon: XCircle },
];

const PRIORITY_COLORS = {
  alta: 'bg-red-500/20 text-red-400 border-red-500/30',
  media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  baja: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_LEADS: Lead[] = [
  { id: 'L-001', name: 'María Elena Rodríguez', company: '', phone: '+52 55 1234 5678', email: 'mrodriguez@gmail.com', package: 'Doble Play 250 MB', value: 2400, stage: 'calificado', priority: 'alta', source: 'Facebook Ads', assignedTo: 'Juan Pérez', tags: ['Fibra', 'Nuevo'], note: 'Muy interesada, llamar martes', createdAt: '15/04/2026', lastContact: 'Hoy', score: 82 },
  { id: 'L-002', name: 'Carlos Mendoza López', company: 'Tienda Mendoza', phone: '+52 55 9876 5432', email: 'cmendoza@tienda.mx', package: 'Triple Play 500 MB', value: 4800, stage: 'propuesta', priority: 'alta', source: 'Referido', assignedTo: 'Ana Torres', tags: ['PyME', 'Urgente'], note: 'Cotización enviada, espera respuesta', createdAt: '18/04/2026', lastContact: 'Ayer', score: 91 },
  { id: 'L-003', name: 'Sofía Hernández', company: '', phone: '+52 33 5555 4444', email: 'sofia.h@email.com', package: 'Doble Play 100 MB', value: 1800, stage: 'prospecto', priority: 'baja', source: 'Redes Sociales', assignedTo: 'Pedro Ruiz', tags: ['Nuevo'], note: '', createdAt: '20/04/2026', lastContact: '3 días', score: 45 },
  { id: 'L-004', name: 'Roberto Sánchez Vega', company: 'RS Consultores', phone: '+52 81 3333 2222', email: 'rsanchez@rsconsultores.com', package: 'Empresarial 1 GB', value: 9600, stage: 'negociacion', priority: 'alta', source: 'Evento', assignedTo: 'Juan Pérez', tags: ['Empresa', 'Premium'], note: 'Pide descuento de 10%, consultar gerencia', createdAt: '10/04/2026', lastContact: 'Hoy', score: 95 },
  { id: 'L-005', name: 'Laura Jiménez', company: '', phone: '+52 55 7777 8888', email: 'ljimenez@gmail.com', package: 'Triple Play 300 MB', value: 3600, stage: 'ganado', priority: 'media', source: 'WhatsApp', assignedTo: 'Ana Torres', tags: ['Fibra', 'Ganado'], note: 'Contrato firmado, instalación 26/04', createdAt: '08/04/2026', lastContact: 'Hoy', score: 100 },
  { id: 'L-006', name: 'Diego Morales', company: '', phone: '+52 55 2222 3333', email: 'dmorales@email.com', package: 'Doble Play 100 MB', value: 1800, stage: 'perdido', priority: 'baja', source: 'Puerta a puerta', assignedTo: 'Pedro Ruiz', tags: ['Perdido', 'Precio'], note: 'Se fue con la competencia por precio', createdAt: '01/04/2026', lastContact: '10 días', score: 0 },
  { id: 'L-007', name: 'Patricia Cruz Reyes', company: 'Estética Patricia', phone: '+52 33 4444 5555', email: 'pcruz@estetica.mx', package: 'Doble Play 250 MB', value: 2400, stage: 'calificado', priority: 'media', source: 'Facebook Ads', assignedTo: 'Ana Torres', tags: ['PyME', 'Fibra'], note: 'Demo agendada para mañana', createdAt: '22/04/2026', lastContact: 'Hoy', score: 74 },
  { id: 'L-008', name: 'Fernando Gutiérrez', company: '', phone: '+52 81 6666 7777', email: 'fgutierrez@gmail.com', package: 'Triple Play 500 MB', value: 4800, stage: 'propuesta', priority: 'media', source: 'Referido', assignedTo: 'Juan Pérez', tags: ['Nuevo', 'Potencial'], note: 'Espera comparar con 2 opciones más', createdAt: '19/04/2026', lastContact: 'Ayer', score: 68 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : score >= 50 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    : 'text-slate-500 bg-white/5 border-white/5';
  return (
    <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full border', color)}>
      {score}
    </span>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-4">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      <p className={cn('text-2xl font-black', color)}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InteractiveCRM() {
  const [leads, setLeads] = useState<Lead[]>(SEED_LEADS);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filterPriority, setFilterPriority] = useState<'all' | 'alta' | 'media' | 'baja'>('all');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [noteEdit, setNoteEdit] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // New lead form state
  const [newLead, setNewLead] = useState<Partial<Lead>>({ stage: 'prospecto', priority: 'media', source: 'Facebook Ads', tags: [], note: '' });

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.package.toLowerCase().includes(q);
    const matchPriority = filterPriority === 'all' || l.priority === filterPriority;
    return matchSearch && matchPriority;
  });

  const byStage = (stage: Stage) => filtered.filter(l => l.stage === stage);

  const moveLead = (id: string, to: Stage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: to } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, stage: to } : null);
  };

  const saveNote = () => {
    if (!selectedLead) return;
    setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, note: noteEdit } : l));
    setSelectedLead(prev => prev ? { ...prev, note: noteEdit } : null);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setNoteEdit(lead.note);
    setAiSuggestion('');
  };

  const getAiSuggestion = () => {
    if (!selectedLead) return;
    setAiLoading(true);
    setTimeout(() => {
      const msgs: Record<Stage, string> = {
        prospecto: `Hola ${selectedLead.name.split(' ')[0]}, me comunico de HDreams Infinitum. Tenemos el paquete ${selectedLead.package} perfecto para usted. ¿Tendría 5 minutos para platicar?`,
        calificado: `${selectedLead.name.split(' ')[0]}, basado en su perfil, el ${selectedLead.package} le ahorraría un estimado de $${Math.round(selectedLead.value * 0.15)}/mes vs. su servicio actual. ¿Agendamos una demostración?`,
        propuesta: `Le enviamos nuestra propuesta personalizada con el ${selectedLead.package}. ¿Tiene alguna duda sobre los términos o cobertura en su zona?`,
        negociacion: `Entiendo su necesidad. Podemos ofrecerle 2 meses de descuento del 20% como instalación de bienvenida. Esta oferta es válida hasta el viernes.`,
        ganado: `¡Bienvenido a la familia Infinitum, ${selectedLead.name.split(' ')[0]}! Su instalación está confirmada. Le enviaré los detalles por WhatsApp.`,
        perdido: `${selectedLead.name.split(' ')[0]}, lo entendemos. Si en algún momento quiere reconsiderar, seguimos aquí con mejores condiciones para usted. ¡Hasta pronto!`,
      };
      setAiSuggestion(msgs[selectedLead.stage]);
      setAiLoading(false);
    }, 900);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const lead: Lead = {
      id: `L-${Date.now()}`,
      name: newLead.name || '',
      company: newLead.company || '',
      phone: newLead.phone || '',
      email: newLead.email || '',
      package: newLead.package || 'Doble Play 100 MB',
      value: Number(newLead.value) || 1800,
      stage: newLead.stage as Stage || 'prospecto',
      priority: newLead.priority as Lead['priority'] || 'media',
      source: newLead.source || '',
      assignedTo: newLead.assignedTo || 'Sin asignar',
      tags: [],
      note: newLead.note || '',
      createdAt: new Date().toLocaleDateString('es-MX'),
      lastContact: 'Hoy',
      score: newLead.priority === 'alta' ? 70 : newLead.priority === 'media' ? 50 : 30,
    };
    setLeads(prev => [lead, ...prev]);
    setShowNewForm(false);
    setNewLead({ stage: 'prospecto', priority: 'media', source: 'Facebook Ads', tags: [], note: '' });
  };

  // KPIs
  const totalValue = leads.filter(l => l.stage === 'ganado').reduce((s, l) => s + l.value, 0);
  const pipeline = leads.filter(l => !['ganado', 'perdido'].includes(l.stage)).reduce((s, l) => s + l.value, 0);
  const winRate = leads.length ? Math.round((leads.filter(l => l.stage === 'ganado').length / leads.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/20 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-blue-600/20 rounded-xl border border-blue-500/30">
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">CRM Interactivo</h2>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Pipeline de Ventas • {leads.length} Leads</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 w-48"
            />
          </div>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}
            className="px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none appearance-none"
          >
            <option value="all">Toda prioridad</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
            <button onClick={() => setView('kanban')} className={cn('px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all', view === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white')}>Kanban</button>
            <button onClick={() => setView('table')} className={cn('px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all', view === 'table' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white')}>Lista</button>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Lead
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Leads Totales" value={String(leads.length)} sub={`${leads.filter(l => l.stage === 'prospecto').length} nuevos hoy`} color="text-white" />
        <KpiCard label="Pipeline" value={`$${(pipeline / 1000).toFixed(1)}k`} sub="Valor en proceso" color="text-blue-400" />
        <KpiCard label="Cerrados" value={`$${(totalValue / 1000).toFixed(1)}k`} sub={`${leads.filter(l => l.stage === 'ganado').length} contratos`} color="text-emerald-400" />
        <KpiCard label="Win Rate" value={`${winRate}%`} sub="Este mes" color={winRate >= 60 ? 'text-emerald-400' : 'text-yellow-400'} />
      </div>

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1100px]">
            {STAGES.map(stage => {
              const stageLeads = byStage(stage.key);
              const stageValue = stageLeads.reduce((s, l) => s + l.value, 0);
              return (
                <div key={stage.key} className={cn('flex-1 min-w-[170px] bg-slate-900/30 border rounded-2xl overflow-hidden', stage.border)}>
                  {/* Column header */}
                  <div className={cn('px-4 py-3 border-b', stage.border)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-[10px] font-black uppercase tracking-widest', stage.color)}>{stage.label}</span>
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', stage.bg + '/20', stage.color)}>{stageLeads.length}</span>
                    </div>
                    <p className="text-[9px] text-slate-600">${(stageValue / 1000).toFixed(1)}k valor</p>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {stageLeads.map(lead => (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => openLead(lead)}
                        className="bg-slate-900/70 border border-white/10 rounded-xl p-3 cursor-pointer hover:border-white/25 hover:bg-slate-800/60 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-white text-[11px] font-bold leading-tight truncate">{lead.name}</p>
                          <ScoreBadge score={lead.score} />
                        </div>
                        <p className="text-[9px] text-slate-500 mb-2 truncate">{lead.package}</p>
                        <div className="flex items-center justify-between">
                          <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded-full border', PRIORITY_COLORS[lead.priority])}>
                            {lead.priority}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">${(lead.value / 100).toFixed(0)}/mo</span>
                        </div>
                        {lead.note && (
                          <p className="text-[9px] text-slate-600 mt-2 truncate italic">"{lead.note}"</p>
                        )}
                        {/* Quick move buttons */}
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {STAGES.filter(s => s.key !== stage.key && !['ganado', 'perdido'].includes(s.key)).slice(0, 2).map(s => (
                            <button
                              key={s.key}
                              onClick={ev => { ev.stopPropagation(); moveLead(lead.id, s.key); }}
                              className={cn('flex-1 text-[7px] font-black uppercase py-1 rounded-lg transition-all border', s.border, s.color, s.bg + '/10')}
                            >→ {s.label.split(' ')[0]}</button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-slate-700 text-[9px] font-bold uppercase tracking-widest">Vacío</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-left text-[9px] uppercase font-bold tracking-wider border-b border-white/5">
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Paquete</th>
                <th className="px-5 py-3">Etapa</th>
                <th className="px-5 py-3">Prioridad</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Valor/mes</th>
                <th className="px-5 py-3">Asesor</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(lead => {
                const stageConf = STAGES.find(s => s.key === lead.stage)!;
                return (
                  <tr key={lead.id} onClick={() => openLead(lead)} className="hover:bg-white/5 cursor-pointer transition-colors group">
                    <td className="px-5 py-3">
                      <p className="font-bold text-white text-xs">{lead.name}</p>
                      <p className="text-[9px] text-slate-500">{lead.phone}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-xs">{lead.package}</td>
                    <td className="px-5 py-3">
                      <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', stageConf.border, stageConf.color)}>{stageConf.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', PRIORITY_COLORS[lead.priority])}>{lead.priority}</span>
                    </td>
                    <td className="px-5 py-3"><ScoreBadge score={lead.score} /></td>
                    <td className="px-5 py-3 text-slate-300 text-xs font-mono">${lead.value.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{lead.assignedTo}</td>
                    <td className="px-5 py-3 text-right"><ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LEAD DETAIL PANEL ── */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setSelectedLead(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-slate-950 border-l border-white/10 flex flex-col h-full overflow-y-auto"
            >
              {/* Panel header */}
              <div className="p-6 border-b border-white/10 shrink-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedLead.name}</h3>
                    {selectedLead.company && <p className="text-slate-400 text-xs">{selectedLead.company}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <ScoreBadge score={selectedLead.score} />
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', PRIORITY_COLORS[selectedLead.priority])}>{selectedLead.priority}</span>
                      <span className="text-[9px] text-slate-500">{selectedLead.source}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLead(null)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contact buttons */}
                <div className="flex gap-2">
                  <a href={`tel:${selectedLead.phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl text-xs font-bold transition-all border border-blue-500/20">
                    <Phone className="w-3.5 h-3.5" /> Llamar
                  </a>
                  <a href={`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-500/20">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  <a href={`mailto:${selectedLead.email}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-xl text-xs font-bold transition-all border border-purple-500/20">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                </div>
              </div>

              {/* Info */}
              <div className="p-6 space-y-5 flex-1">
                {/* Contact info */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Información de Contacto</p>
                  <div className="flex items-center gap-2 text-xs text-slate-300"><Phone className="w-3.5 h-3.5 text-slate-600" />{selectedLead.phone}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-300"><Mail className="w-3.5 h-3.5 text-slate-600" />{selectedLead.email}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-300"><User className="w-3.5 h-3.5 text-slate-600" />Asesor: {selectedLead.assignedTo}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-300"><Clock className="w-3.5 h-3.5 text-slate-600" />Último contacto: {selectedLead.lastContact}</div>
                </div>

                {/* Package & value */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Paquete de Interés</p>
                  <p className="text-white font-bold text-sm">{selectedLead.package}</p>
                  <p className="text-blue-400 font-mono font-bold text-lg mt-1">${selectedLead.value.toLocaleString()}<span className="text-slate-500 text-xs font-normal">/año</span></p>
                </div>

                {/* Move stage */}
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Mover Etapa</p>
                  <div className="grid grid-cols-3 gap-2">
                    {STAGES.map(s => (
                      <button
                        key={s.key}
                        onClick={() => moveLead(selectedLead.id, s.key)}
                        className={cn(
                          'py-2 px-2 rounded-xl text-[9px] font-bold uppercase tracking-tight transition-all border',
                          selectedLead.stage === s.key
                            ? `${s.bg}/30 ${s.color} ${s.border}`
                            : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                        )}
                      >
                        {selectedLead.stage === s.key && '✓ '}
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nota Interna</p>
                  <textarea
                    value={noteEdit}
                    onChange={e => setNoteEdit(e.target.value)}
                    placeholder="Agrega comentarios del seguimiento..."
                    rows={3}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 resize-none"
                  />
                  <button onClick={saveNote} className="mt-2 w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all">Guardar Nota</button>
                </div>

                {/* AI Suggestion */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Sugerencia IA</span>
                    </div>
                    <button
                      onClick={getAiSuggestion}
                      disabled={aiLoading}
                      className="text-[9px] font-bold px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg transition-all border border-indigo-500/20 disabled:opacity-50"
                    >
                      {aiLoading ? '...' : 'Generar'}
                    </button>
                  </div>
                  {aiSuggestion ? (
                    <div>
                      <p className="text-slate-300 text-xs leading-relaxed italic">"{aiSuggestion}"</p>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}?text=${encodeURIComponent(aiSuggestion)}`}
                          target="_blank" rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg text-[9px] font-bold border border-emerald-500/20"
                        >
                          <MessageCircle className="w-3 h-3" /> Enviar por WA
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-[10px]">Haz clic en "Generar" para obtener un mensaje personalizado según la etapa del lead.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NEW LEAD MODAL ── */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewForm(false)}
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-white font-bold text-lg">Nuevo Lead</h4>
                <button onClick={() => setShowNewForm(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nombre Completo *</label>
                    <input required value={newLead.name || ''} onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))} placeholder="Ej. Juan García López" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Teléfono *</label>
                    <input required value={newLead.phone || ''} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} placeholder="+52 55 ..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Email</label>
                    <input value={newLead.email || ''} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} placeholder="correo@email.com" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Paquete</label>
                    <select value={newLead.package || ''} onChange={e => setNewLead(p => ({ ...p, package: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none appearance-none">
                      <option>Doble Play 100 MB</option>
                      <option>Doble Play 250 MB</option>
                      <option>Triple Play 300 MB</option>
                      <option>Triple Play 500 MB</option>
                      <option>Empresarial 1 GB</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Fuente</label>
                    <select value={newLead.source || ''} onChange={e => setNewLead(p => ({ ...p, source: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none appearance-none">
                      <option>Facebook Ads</option>
                      <option>WhatsApp</option>
                      <option>Referido</option>
                      <option>Puerta a puerta</option>
                      <option>Evento</option>
                      <option>Redes Sociales</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Prioridad</label>
                    <select value={newLead.priority || 'media'} onChange={e => setNewLead(p => ({ ...p, priority: e.target.value as any }))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none appearance-none">
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Etapa Inicial</label>
                    <select value={newLead.stage || 'prospecto'} onChange={e => setNewLead(p => ({ ...p, stage: e.target.value as Stage }))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none appearance-none">
                      {STAGES.filter(s => !['ganado', 'perdido'].includes(s.key)).map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nota inicial</label>
                    <textarea value={newLead.note || ''} onChange={e => setNewLead(p => ({ ...p, note: e.target.value }))} rows={2} placeholder="Contexto del lead..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/40 outline-none resize-none" />
                  </div>
                </div>
                <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
                  Crear Lead →
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
