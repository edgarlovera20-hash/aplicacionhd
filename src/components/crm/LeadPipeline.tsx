import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, Phone, Mail, MessageSquare, Plus, Edit3, X } from 'lucide-react';

type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

interface Lead {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  canal: string;
  score: number;
  stage: LeadStage;
  source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const STAGES: { id: LeadStage; label: string; color: string; bg: string }[] = [
  { id: 'new',       label: 'Nuevo',       color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'contacted', label: 'Contactado',  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  { id: 'qualified', label: 'Calificado',  color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'proposal',  label: 'Propuesta',   color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  { id: 'won',       label: '✓ Ganado',    color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' },
  { id: 'lost',      label: '✗ Perdido',   color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
];

const CANAL_ICON: Record<string, string> = {
  whatsapp: '💬', telegram: '✈️', facebook: '📘', sms: '📱', manual: '✍️',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold text-white ${color}`}>
      {score}
    </span>
  );
}

interface NewLeadForm { nombre: string; telefono: string; email: string; canal: string; notes: string; }
const EMPTY_FORM: NewLeadForm = { nombre: '', telefono: '', email: '', canal: 'manual', notes: '' };

export default function LeadPipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewLeadForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads', { credentials: 'include' });
      if (res.ok) setLeads(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/leads/stats', { credentials: 'include' });
      if (res.ok) {
        const data: { stage: string; count: string }[] = await res.json();
        setStats(Object.fromEntries(data.map(r => [r.stage, parseInt(r.count)])));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchLeads(); fetchStats(); }, [fetchLeads, fetchStats]);

  const moveStage = async (id: string, stage: LeadStage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    fetchStats();
  };

  const createLead = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, score: form.email ? 20 : 0 }),
      });
      if (res.ok) {
        setForm(EMPTY_FORM);
        setShowForm(false);
        fetchLeads();
        fetchStats();
      }
    } finally { setSaving(false); }
  };

  const leadsByStage = (stage: LeadStage) => leads.filter(l => l.stage === stage);

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-zinc-400">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
          <div>
            <h2 className="text-lg font-bold text-white">Pipeline de Leads</h2>
            <p className="text-xs text-zinc-400">{leads.length} leads activos</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Lead
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STAGES.map(s => (
          <div key={s.id} className={`rounded-lg border p-2 text-center ${s.bg}`}>
            <div className={`text-lg font-bold ${s.color}`}>{stats[s.id] || 0}</div>
            <div className="text-xs text-zinc-400 truncate">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div key={stage.id} className="flex-shrink-0 w-64">
            <div className={`rounded-t-lg border-b-2 px-3 py-2 ${stage.bg} border-b-current`}>
              <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
              <span className="ml-2 text-xs text-zinc-500">({leadsByStage(stage.id).length})</span>
            </div>
            <div className="space-y-2 mt-2 min-h-[200px]">
              <AnimatePresence>
                {leadsByStage(stage.id).map(lead => (
                  <motion.div
                    key={lead.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 space-y-2 hover:border-zinc-500 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-sm font-medium text-white leading-tight">{lead.nombre}</span>
                      <ScoreBadge score={lead.score} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <span>{CANAL_ICON[lead.canal] || '📡'}</span>
                      <span>{lead.canal}</span>
                      {lead.telefono && <><Phone className="w-3 h-3 ml-1" /><span className="truncate">{lead.telefono}</span></>}
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Mail className="w-3 h-3" /><span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {/* Move to next stage */}
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-700">
                      {STAGES.filter(s => s.id !== stage.id).slice(0, 3).map(s => (
                        <button
                          key={s.id}
                          onClick={() => moveStage(lead.id, s.id)}
                          className={`text-xs px-1.5 py-0.5 rounded border ${s.bg} ${s.color} hover:opacity-80 transition-opacity`}
                        >
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* New Lead Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" /> Nuevo Lead
                </h3>
                <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {(['nombre','telefono','email'] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs text-zinc-400 mb-1 capitalize">{f}{f === 'nombre' && ' *'}</label>
                  <input
                    value={form[f]}
                    onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder={f === 'nombre' ? 'Nombre completo' : f === 'telefono' ? '+52 55...' : 'correo@ejemplo.com'}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Canal</label>
                <select
                  value={form.canal}
                  onChange={e => setForm(p => ({ ...p, canal: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {['manual','whatsapp','telegram','facebook','sms'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-zinc-600 text-zinc-300 rounded-lg text-sm hover:border-zinc-400 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={createLead}
                  disabled={saving || !form.nombre.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Guardando...' : 'Crear Lead'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
