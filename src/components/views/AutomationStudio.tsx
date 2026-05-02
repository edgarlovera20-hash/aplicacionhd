import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, ToggleLeft, ToggleRight, Trash2, X, Play, ChevronDown, ChevronUp } from 'lucide-react';

interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  conditions: Array<{ field: string; operator: string; value: string }>;
  actions: Array<{ type: string; params?: Record<string, unknown> }>;
  enabled: boolean;
  run_count: number;
  last_run_at?: string;
  created_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  'message.received':  '📨 Mensaje recibido',
  'lead.created':      '👤 Lead creado',
  'payment.failed':    '💳 Pago fallido',
  'chat.assigned':     '🎯 Chat asignado',
  'automation.fired':  '⚡ Automatización disparada',
};

const ACTION_LABELS: Record<string, string> = {
  send_message:      '📤 Enviar mensaje',
  create_lead:       '👤 Crear lead',
  update_status:     '🔄 Actualizar estado',
  notify_agent:      '🔔 Notificar agente',
  schedule_followup: '📅 Programar seguimiento',
  tag_contact:       '🏷 Etiquetar contacto',
};

const EMPTY_AUTO = {
  name: '',
  description: '',
  trigger_type: 'message.received',
  conditions: [] as Automation['conditions'],
  actions: [] as Automation['actions'],
};

export default function AutomationStudio() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_AUTO });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchAutomations = useCallback(async () => {
    try {
      const r = await fetch('/api/automations', { credentials: 'include' });
      if (r.ok) setAutomations(await r.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  const toggleEnabled = async (id: string, enabled: boolean) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !enabled } : a));
    await fetch(`/api/automations/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm('¿Eliminar esta automatización?')) return;
    await fetch(`/api/automations/${id}`, { method: 'DELETE', credentials: 'include' });
    setAutomations(prev => prev.filter(a => a.id !== id));
    showToast('Automatización eliminada');
  };

  const addCondition = () =>
    setForm(p => ({ ...p, conditions: [...p.conditions, { field: 'channel', operator: 'eq', value: 'whatsapp' }] }));

  const addAction = () =>
    setForm(p => ({ ...p, actions: [...p.actions, { type: 'send_message', params: { template: 'bienvenida_telegram' } }] }));

  const createAutomation = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/automations', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setForm({ ...EMPTY_AUTO });
        setShowForm(false);
        fetchAutomations();
        showToast('Automatización creada');
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-zinc-400">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-50 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg"><Zap className="w-5 h-5 text-purple-400" /></div>
          <div>
            <h2 className="text-lg font-bold text-white">Automation Studio</h2>
            <p className="text-xs text-zinc-400">{automations.filter(a => a.enabled).length} activas de {automations.length}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Automatización
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {automations.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay automatizaciones configuradas.</p>
          </div>
        )}
        {automations.map(auto => (
          <motion.div key={auto.id} layout
            className={`bg-zinc-800/60 border rounded-xl overflow-hidden transition-colors ${
              auto.enabled ? 'border-purple-500/30' : 'border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-3 p-4">
              {/* Toggle */}
              <button
                onClick={() => toggleEnabled(auto.id, auto.enabled)}
                className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${
                  auto.enabled ? 'bg-purple-600' : 'bg-zinc-600'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  auto.enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm truncate">{auto.name}</span>
                  {!auto.enabled && <span className="text-xs text-zinc-500 border border-zinc-600 px-1.5 py-0.5 rounded">Inactiva</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-zinc-400">{TRIGGER_LABELS[auto.trigger_type] || auto.trigger_type}</span>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500">{auto.run_count} ejecuciones</span>
                  {auto.last_run_at && (
                    <span className="text-xs text-zinc-600">
                      Última: {new Date(auto.last_run_at).toLocaleDateString('es-MX')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpanded(expanded === auto.id ? null : auto.id)}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  {expanded === auto.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteAutomation(auto.id)} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expanded === auto.id && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden border-t border-zinc-700"
                >
                  <div className="p-4 space-y-3">
                    {auto.description && <p className="text-sm text-zinc-400">{auto.description}</p>}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Condiciones</p>
                        {auto.conditions.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic">Sin condiciones — siempre dispara</p>
                        ) : auto.conditions.map((c, i) => (
                          <div key={i} className="text-xs bg-zinc-700/50 rounded px-2 py-1 text-zinc-300">
                            {c.field} <span className="text-zinc-500">{c.operator}</span> <span className="text-blue-400">{String(c.value)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Acciones</p>
                        {auto.actions.map((a, i) => (
                          <div key={i} className="text-xs bg-zinc-700/50 rounded px-2 py-1 text-zinc-300">
                            {ACTION_LABELS[a.type] || a.type}
                            {a.params && <span className="text-zinc-500 ml-1">({JSON.stringify(a.params).slice(0, 50)})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* New Automation Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg my-4 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" /> Nueva Automatización
                </h3>
                <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="ej. Bienvenida Telegram" />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Descripción</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Disparador</label>
                <select value={form.trigger_type} onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Condiciones</label>
                  <button onClick={addCondition} className="text-xs text-purple-400 hover:text-purple-300">+ Agregar</button>
                </div>
                {form.conditions.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={c.field} onChange={e => setForm(p => ({ ...p, conditions: p.conditions.map((x, j) => j === i ? { ...x, field: e.target.value } : x) }))}
                      placeholder="campo" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none" />
                    <select value={c.operator} onChange={e => setForm(p => ({ ...p, conditions: p.conditions.map((x, j) => j === i ? { ...x, operator: e.target.value } : x) }))}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none">
                      {['eq','neq','contains','gt','lt'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input value={c.value} onChange={e => setForm(p => ({ ...p, conditions: p.conditions.map((x, j) => j === i ? { ...x, value: e.target.value } : x) }))}
                      placeholder="valor" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none" />
                    <button onClick={() => setForm(p => ({ ...p, conditions: p.conditions.filter((_, j) => j !== i) }))}
                      className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Acciones</label>
                  <button onClick={addAction} className="text-xs text-purple-400 hover:text-purple-300">+ Agregar</button>
                </div>
                {form.actions.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={a.type} onChange={e => setForm(p => ({ ...p, actions: p.actions.map((x, j) => j === i ? { ...x, type: e.target.value } : x) }))}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none">
                      {Object.keys(ACTION_LABELS).map(k => <option key={k} value={k}>{ACTION_LABELS[k]}</option>)}
                    </select>
                    <button onClick={() => setForm(p => ({ ...p, actions: p.actions.filter((_, j) => j !== i) }))}
                      className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-zinc-600 text-zinc-300 rounded-lg text-sm hover:border-zinc-400 transition-colors">
                  Cancelar
                </button>
                <button onClick={createAutomation} disabled={saving || !form.name.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
                  {saving ? 'Guardando...' : 'Crear Automatización'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
