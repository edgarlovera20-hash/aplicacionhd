import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Bot, Smartphone, Download, Upload, Plus, Edit2, Power,
  AlertTriangle, FileText, BrainCircuit, Trash2, Key, CheckSquare,
  BarChart2, DollarSign, Search, X, RefreshCw, Check, Eye, EyeOff,
  ChevronDown, ChevronUp, Filter, TrendingUp, TrendingDown, Save,
  BookOpen, Cpu, Zap, MessageSquare, Tag, Clock, CheckCircle2,
  XCircle, Loader2, CloudUpload, Send, Database, Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../api';

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */
type Tab = 'usuarios' | 'gastos' | 'columnas' | 'kpis' | 'bot' | 'canales' | 'import_export' | 'ia';

interface AdminUser {
  uid: string;
  email: string;
  nombres: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Expense {
  id: string;
  concepto: string;
  monto: number;
  categoria: string;
  fecha: string;
  responsable: string;
  notas?: string;
}

const ROLES = ['gerente', 'administracion', 'supervisor', 'vendedor', 'reclutadora', 'seguimiento'];
const ROLE_LABELS: Record<string, string> = {
  gerente:        'Gerente',
  administracion: 'Administración',
  supervisor:     'Supervisor',
  vendedor:       'Vendedor',
  reclutadora:    'Reclutadora',
  seguimiento:    'Seguimiento',
};
const ROLE_COLORS: Record<string, string> = {
  gerente:        'bg-purple-500/15 text-purple-300 border-purple-500/30',
  administracion: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  supervisor:     'bg-blue-500/15 text-blue-300 border-blue-500/30',
  vendedor:       'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  reclutadora:    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  seguimiento:    'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};
const EXPENSE_CATS = ['Operativo', 'Marketing', 'Logística', 'RRHH', 'Tecnología', 'Otros'];

/* ─────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────── */
export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'usuarios',     label: 'Usuarios',       icon: Users },
    { id: 'gastos',       label: 'Gastos',          icon: DollarSign },
    { id: 'columnas',     label: 'Columnas',        icon: CheckSquare },
    { id: 'kpis',         label: 'KPIs',            icon: BarChart2 },
    { id: 'bot',          label: 'Bot',             icon: Bot },
    { id: 'canales',      label: 'Canales',         icon: Smartphone },
    { id: 'import_export',label: 'Importar/Exportar', icon: Download },
    { id: 'ia',           label: 'IA · Conocimiento', icon: BrainCircuit },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-1 tracking-tight">Ajustes y Administración</h1>
        <p className="text-zinc-400 text-sm">Gestiona usuarios, gastos, KPIs y configuraciones del sistema.</p>
      </div>

      <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex gap-2 p-1.5 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 min-h-[520px] shadow-xl">
        {activeTab === 'usuarios'      && <UsuariosTab />}
        {activeTab === 'gastos'        && <GastosTab />}
        {activeTab === 'columnas'      && <ColumnasTab />}
        {activeTab === 'kpis'          && <KPIsTab />}
        {activeTab === 'bot'           && <BotTab />}
        {activeTab === 'canales'       && <CanalesTab />}
        {activeTab === 'import_export' && <ImportExportTab />}
        {activeTab === 'ia'            && <KnowledgeBaseTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB — GESTIÓN DE USUARIOS + INVITACIONES
═══════════════════════════════════════════ */
interface Invitation { id?: number; token: string; email: string; role: string; nombres?: string; expiresAt?: string; expires_at?: string; used?: boolean; created_at?: string; }

function UsuariosTab() {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [invites, setInvites]       = useState<Invitation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit]     = useState<AdminUser | null>(null);
  const [resetUid, setResetUid]     = useState<string | null>(null);
  const [newPwd, setNewPwd]         = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [toast, setToast]           = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [subTab, setSubTab]         = useState<'usuarios' | 'invitaciones'>('usuarios');

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadUsers = async () => {
    setLoading(true);
    try { setUsers(await api.get('/admin/users')); } catch { notify('Error cargando usuarios'); }
    setLoading(false);
  };

  const loadInvites = async () => {
    try { setInvites(await api.get('/invitations')); } catch { /* ignore */ }
  };

  useEffect(() => { loadUsers(); loadInvites(); }, []);

  const filtered = users.filter(u =>
    (!search || u.nombres?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter)
  );

  const toggleStatus = async (u: AdminUser) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    await api.patch(`/admin/users/${u.uid}`, { status: newStatus });
    setUsers(prev => prev.map(x => x.uid === u.uid ? { ...x, status: newStatus } : x));
    notify(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
  };

  const deleteUser = async (uid: string) => {
    if (!confirm('¿Eliminar este usuario permanentemente?')) return;
    await api.del(`/admin/users/${uid}`);
    setUsers(prev => prev.filter(x => x.uid !== uid));
    notify('Usuario eliminado');
  };

  const revokeInvite = async (token: string) => {
    if (!confirm('¿Revocar esta invitación?')) return;
    await api.del(`/invitations/${token}`);
    setInvites(prev => prev.filter(x => x.token !== token));
    notify('Invitación revocada');
  };

  const handleResetPwd = async () => {
    if (!resetUid || !newPwd) return;
    if (newPwd.length < 8 || !/[A-Z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
      notify('Mín. 8 caracteres, 1 mayúscula y 1 número');
      return;
    }
    await api.post(`/admin/users/${resetUid}/reset-password`, { newPassword: newPwd });
    setResetUid(null); setNewPwd('');
    notify('Contraseña restablecida');
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const active   = users.filter(u => u.status === 'active').length;
  const inactive = users.filter(u => u.status === 'inactive').length;
  const pendingInvites = invites.filter(i => !i.used).length;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" />{toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',        val: users.length,   color: 'text-zinc-100' },
          { label: 'Activos',      val: active,         color: 'text-emerald-400' },
          { label: 'Inactivos',    val: inactive,       color: 'text-red-400' },
          { label: 'Roles',        val: new Set(users.map(u => u.role)).size, color: 'text-indigo-400' },
          { label: 'Invitaciones', val: pendingInvites, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 mb-1">{s.label}</p>
            <p className={cn("text-2xl font-mono font-bold", s.color)}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs: Usuarios / Invitaciones */}
      <div className="flex gap-2">
        <button onClick={() => setSubTab('usuarios')} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", subTab === 'usuarios' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5')}>
          <Users className="w-3.5 h-3.5 inline mr-1.5" />Usuarios
        </button>
        <button onClick={() => setSubTab('invitaciones')} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", subTab === 'invitaciones' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5')}>
          <Send className="w-3.5 h-3.5 inline mr-1.5" />Invitaciones {pendingInvites > 0 && <span className="ml-1 bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded-full text-[9px]">{pendingInvites}</span>}
        </button>
      </div>

      {subTab === 'usuarios' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email..."
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/50 border border-white/5 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 bg-zinc-950/50 border border-white/5 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
              <option value="">Todos los roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <button onClick={loadUsers} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-950/50 border border-white/5 rounded-xl transition-colors" title="Recargar">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowInvite(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
              <Plus className="w-4 h-4" /> Invitar Usuario
            </button>
          </div>

          {/* Tabla de usuarios */}
          {loading ? (
            <div className="text-center py-16 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Cargando usuarios...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/60">
                  <tr>
                    {['Nombre', 'Email', 'Rol', 'Estado', 'Alta', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-zinc-600 text-sm">Sin resultados</td></tr>
                  )}
                  {filtered.map(u => (
                    <tr key={u.uid} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-zinc-100">{u.nombres}</td>
                      <td className="px-4 py-3.5 text-zinc-400 text-xs font-mono">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border", ROLE_COLORS[u.role] || 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30')}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                          u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        )}>
                          {u.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500 text-xs font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-MX') : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1">
                          <button title="Editar" onClick={() => setShowEdit(u)} className="p-1.5 text-zinc-400 hover:text-indigo-400 rounded-lg hover:bg-indigo-500/10 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button title="Restablecer contraseña" onClick={() => setResetUid(u.uid)} className="p-1.5 text-zinc-400 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors"><Key className="w-3.5 h-3.5" /></button>
                          <button title={u.status === 'active' ? 'Desactivar' : 'Activar'} onClick={() => toggleStatus(u)} className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors"><Power className="w-3.5 h-3.5" /></button>
                          <button title="Eliminar" onClick={() => deleteUser(u.uid)} className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {subTab === 'invitaciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Invitaciones generadas por el equipo directivo. Cada token expira en 48 horas.</p>
            <button onClick={() => setShowInvite(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4" /> Nueva Invitación
            </button>
          </div>
          {invites.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm">No hay invitaciones</div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv, i) => {
                const expired = inv.expires_at ? new Date(inv.expires_at) < new Date() : false;
                return (
                  <div key={inv.token || i} className={cn("flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all",
                    inv.used ? 'bg-emerald-500/5 border-emerald-500/10' : expired ? 'bg-red-500/5 border-red-500/10' : 'bg-zinc-950/50 border-white/5')}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{inv.email}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border", ROLE_COLORS[inv.role] || 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30')}>
                          {ROLE_LABELS[inv.role] || inv.role}
                        </span>
                        {inv.used ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Registrado</span>
                        ) : expired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/15 text-red-400 border border-red-500/20">Expirada</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/20">Pendiente</span>
                        )}
                      </div>
                    </div>
                    {!inv.used && !expired && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => copyToken(inv.token)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5">
                          {copiedToken === inv.token ? <><Check className="w-3 h-3 text-emerald-400" /> Copiado</> : <><CloudUpload className="w-3 h-3" /> Copiar Token</>}
                        </button>
                        <button onClick={() => revokeInvite(inv.token)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 shrink-0">
                      {inv.expires_at ? `Expira: ${new Date(inv.expires_at).toLocaleDateString('es-MX')}` : inv.created_at ? `Creada: ${new Date(inv.created_at).toLocaleDateString('es-MX')}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Editar Usuario */}
      {showEdit && (
        <UserEditModal
          user={showEdit}
          onClose={() => setShowEdit(null)}
          onSaved={(u) => { setUsers(prev => prev.map(x => x.uid === u.uid ? u : x)); setShowEdit(null); notify('Usuario actualizado'); }}
        />
      )}

      {/* Modal Invitar Usuario */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onCreated={(inv) => { setInvites(prev => [inv, ...prev]); setShowInvite(false); notify('Invitación creada — comparte el token con el usuario'); }}
        />
      )}

      {/* Modal Reset Password */}
      {resetUid && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-100">Restablecer Contraseña</h3>
            <p className="text-xs text-zinc-500">Mín. 8 caracteres, 1 mayúscula y 1 número</p>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Nueva contraseña segura..."
                className="w-full pr-10 px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setResetUid(null); setNewPwd(''); }} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleResetPwd} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors">Cambiar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Modal para editar un usuario existente */
function UserEditModal({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: (u: AdminUser) => void }) {
  const [form, setForm] = useState({ nombres: user.nombres, email: user.email, role: user.role });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const handle = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nombres || !form.email) { setErr('Nombre y email son requeridos'); return; }
    setSaving(true); setErr('');
    try {
      const res = await api.patch(`/admin/users/${user.uid}`, form);
      onSaved(res);
    } catch { setErr('Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100">Editar Usuario</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{err}</p>}
        <div className="space-y-3">
          <Field label="Nombre completo"><input value={form.nombres} onChange={e => handle('nombres', e.target.value)} className={inputCls} /></Field>
          <Field label="Correo electrónico"><input type="email" value={form.email} onChange={e => handle('email', e.target.value)} className={inputCls} /></Field>
          <Field label="Rol">
            <select value={form.role} onChange={e => handle('role', e.target.value)} className={inputCls}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Guardando...' : 'Actualizar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Modal para crear una invitación (reemplaza creación directa de usuario) */
function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (inv: Invitation) => void }) {
  const [form, setForm] = useState({ email: '', role: 'vendedor', nombres: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<Invitation | null>(null);
  const handle = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.email) { setErr('Email es requerido'); return; }
    setSaving(true); setErr('');
    try {
      const res = await api.post('/invitations', form);
      setResult(res);
      onCreated(res);
    } catch (e: any) { setErr(e.message || 'Error al crear invitación'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100">{result ? 'Invitación Creada' : 'Invitar Nuevo Usuario'}</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{err}</p>}
        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-300">Comparte este token con <strong className="text-white">{result.email}</strong> para que se registre:</p>
            <div className="bg-zinc-950 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
              <code className="flex-1 text-xs text-amber-300 font-mono break-all select-all">{result.token}</code>
              <button onClick={() => { navigator.clipboard.writeText(result.token); }} className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors">Copiar</button>
            </div>
            <p className="text-[10px] text-zinc-500">Expira: {result.expiresAt ? new Date(result.expiresAt).toLocaleString('es-MX') : '48 horas'}</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Field label="Email del nuevo usuario">
                <input type="email" value={form.email} onChange={e => handle('email', e.target.value)} placeholder="nuevo@hdreams.com" className={inputCls} />
              </Field>
              <Field label="Rol asignado">
                <select value={form.role} onChange={e => handle('role', e.target.value)} className={inputCls}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </Field>
              <Field label="Nombre (opcional)">
                <input value={form.nombres} onChange={e => handle('nombres', e.target.value)} placeholder="Ej. Laura Martínez" className={inputCls} />
              </Field>
            </div>
            <p className="text-[10px] text-zinc-500">El usuario recibirá un token que deberá usar para registrarse. La invitación expira en 48 horas.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Creando...' : 'Generar Invitación'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB — CONTROL DE GASTOS
═══════════════════════════════════════════ */
function GastosTab() {
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Expense | null>(null);
  const [toast, setToast]         = useState('');

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/expenses');
      setExpenses(await r.json());
    } catch { notify('Error cargando gastos'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = expenses.filter(e => {
    if (catFilter && e.categoria !== catFilter) return false;
    if (dateFrom && e.fecha < dateFrom) return false;
    if (dateTo   && e.fecha > dateTo)   return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + e.monto, 0);

  const delExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
    setExpenses(prev => prev.filter(x => x.id !== id));
    notify('Gasto eliminado');
  };

  const byCategory = EXPENSE_CATS.map(cat => ({
    cat, total: expenses.filter(e => e.categoria === cat).reduce((s, e) => s + e.monto, 0)
  })).filter(c => c.total > 0);
  const maxCat = Math.max(...byCategory.map(c => c.total), 1);

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />{toast}
        </div>
      )}

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3 col-span-2 md:col-span-1">
          <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 mb-1">Total (Filtrado)</p>
          <p className="text-2xl font-mono font-bold text-white">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 mb-1">Registros</p>
          <p className="text-2xl font-mono font-bold text-indigo-400">{filtered.length}</p>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 mb-1">Categorías</p>
          <p className="text-2xl font-mono font-bold text-amber-400">{new Set(expenses.map(e => e.categoria)).size}</p>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 mb-1">Promedio</p>
          <p className="text-2xl font-mono font-bold text-emerald-400">
            ${filtered.length ? (total / filtered.length).toLocaleString('es-MX', { maximumFractionDigits: 0 }) : '0'}
          </p>
        </div>
      </div>

      {/* Mini chart por categoría */}
      {byCategory.length > 0 && (
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-3">Por Categoría</p>
          {byCategory.sort((a, b) => b.total - a.total).map(c => (
            <div key={c.cat} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-24 shrink-0">{c.cat}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${(c.total / maxCat) * 100}%` }} />
              </div>
              <span className="text-xs font-mono text-zinc-300 w-24 text-right">${c.total.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-4 py-2.5 bg-zinc-950/50 border border-white/5 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
          <option value="">Todas las categorías</option>
          {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-4 py-2.5 bg-zinc-950/50 border border-white/5 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-4 py-2.5 bg-zinc-950/50 border border-white/5 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50" />
        <button onClick={load} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-950/50 border border-white/5 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> Registrar Gasto
        </button>
      </div>

      {/* Tabla gastos */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Cargando gastos...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-950/60">
              <tr>
                {['Concepto', 'Categoría', 'Monto', 'Fecha', 'Responsable', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-zinc-600 text-sm">Sin registros</td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-100 font-medium">
                    {e.concepto}
                    {e.notas && <p className="text-[11px] text-zinc-500 mt-0.5">{e.notas}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{e.categoria}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-white">${e.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{e.fecha}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{e.responsable}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(e); setShowModal(true); }} className="p-1.5 text-zinc-400 hover:text-indigo-400 rounded-lg hover:bg-indigo-500/10 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => delExpense(e.id)} className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ExpenseModal
          expense={editing}
          onClose={() => setShowModal(false)}
          onSaved={(ex) => {
            if (editing) setExpenses(prev => prev.map(x => x.id === ex.id ? ex : x));
            else setExpenses(prev => [...prev, ex]);
            setShowModal(false);
            notify(editing ? 'Gasto actualizado' : 'Gasto registrado');
          }}
        />
      )}
    </div>
  );
}

function ExpenseModal({ expense, onClose, onSaved }: { expense: Expense | null; onClose: () => void; onSaved: (e: Expense) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    concepto:    expense?.concepto    || '',
    monto:       expense?.monto?.toString() || '',
    categoria:   expense?.categoria   || EXPENSE_CATS[0],
    fecha:       expense?.fecha       || today,
    responsable: expense?.responsable || '',
    notas:       expense?.notas       || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const handle = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.concepto || !form.monto) { setErr('Concepto y monto son requeridos'); return; }
    setSaving(true); setErr('');
    try {
      const body = { ...form, monto: parseFloat(form.monto) };
      let res: Expense;
      if (expense) {
        const r = await fetch(`/api/admin/expenses/${expense.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        res = await r.json();
      } else {
        const r = await fetch('/api/admin/expenses', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        res = await r.json();
      }
      onSaved(res);
    } catch { setErr('Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100">{expense ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Concepto" className="col-span-2">
            <input value={form.concepto} onChange={e => handle('concepto', e.target.value)} placeholder="Ej. Papelería" className={inputCls} />
          </Field>
          <Field label="Monto (MXN)">
            <input type="number" value={form.monto} onChange={e => handle('monto', e.target.value)} placeholder="0.00" className={inputCls} />
          </Field>
          <Field label="Categoría">
            <select value={form.categoria} onChange={e => handle('categoria', e.target.value)} className={inputCls}>
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Fecha">
            <input type="date" value={form.fecha} onChange={e => handle('fecha', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Responsable">
            <input value={form.responsable} onChange={e => handle('responsable', e.target.value)} placeholder="Nombre" className={inputCls} />
          </Field>
          <Field label="Notas" className="col-span-2">
            <input value={form.notas} onChange={e => handle('notas', e.target.value)} placeholder="Opcional..." className={inputCls} />
          </Field>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Guardando...' : expense ? 'Actualizar' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB — CONFIGURACIÓN DE COLUMNAS
═══════════════════════════════════════════ */
const ALL_COLUMNS = [
  { id: 'folio',         label: 'Folio',              group: 'Venta' },
  { id: 'estado',        label: 'Estado',             group: 'Venta' },
  { id: 'nombres',       label: 'Nombre del Cliente', group: 'Venta' },
  { id: 'telefono',      label: 'Teléfono',           group: 'Venta' },
  { id: 'paqueteNombre', label: 'Paquete',            group: 'Venta' },
  { id: 'rentaMensual',  label: 'Renta Mensual',      group: 'Venta' },
  { id: 'promotor',      label: 'Promotor',           group: 'Venta' },
  { id: 'fechaCreacion', label: 'Fecha de Venta',     group: 'Venta' },
  { id: 'modalidad',     label: 'Modalidad',          group: 'Venta' },
  { id: 'gi',            label: 'GI',                 group: 'Financiero' },
  { id: 'domiciliacion', label: 'Domiciliación',      group: 'Financiero' },
  { id: 'instalacion',   label: 'Fecha Instalación',  group: 'Operativo' },
  { id: 'nss',           label: 'NSS',                group: 'Operativo' },
  { id: 'colonia',       label: 'Colonia',            group: 'Ubicación' },
  { id: 'municipio',     label: 'Municipio',          group: 'Ubicación' },
  { id: 'estado_geo',    label: 'Estado (Geo)',       group: 'Ubicación' },
];

const getToken = () => JSON.parse(localStorage.getItem('hdreams_user') || '{}')?.sessionToken || '';
const authHdr  = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

function ColumnasTab() {
  const DEFAULT_COLS = ['folio','estado','nombres','telefono','paqueteNombre','rentaMensual','promotor','fechaCreacion'];
  const [enabled, setEnabled] = useState<Set<string>>(new Set(DEFAULT_COLS));
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    fetch('/api/admin/preferences/me', { headers: authHdr() })
      .then(r => r.json())
      .then(pref => {
        if (pref.visibleColumns?.length) setEnabled(new Set(pref.visibleColumns));
      })
      .catch(() => {}); // fallback to defaults
  }, []);

  const toggle = (id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectGroup = (group: string, on: boolean) => {
    const ids = ALL_COLUMNS.filter(c => c.group === group).map(c => c.id);
    setEnabled(prev => {
      const next = new Set(prev);
      ids.forEach(id => on ? next.add(id) : next.delete(id));
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/preferences/me', {
        method: 'POST', headers: authHdr(),
        body: JSON.stringify({ visibleColumns: [...enabled] }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { /* silent */ }
    setSaving(false);
  };

  const groups = [...new Set(ALL_COLUMNS.map(c => c.group))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-zinc-100 font-bold text-base">Columnas Visibles en la Tabla de Ventas</h3>
          <p className="text-zinc-500 text-sm mt-1">Selecciona qué columnas aparecen en tu vista. Se guarda por usuario.</p>
        </div>
        <button
          onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          {saved ? <Check className="w-4 h-4" /> : saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-5">
        {groups.map(group => {
          const cols = ALL_COLUMNS.filter(c => c.group === group);
          const allOn  = cols.every(c => enabled.has(c.id));
          const allOff = cols.every(c => !enabled.has(c.id));
          return (
            <div key={group} className="bg-zinc-950/40 border border-white/5 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{group}</h4>
                <div className="flex gap-2">
                  <button onClick={() => selectGroup(group, true)} disabled={allOn} className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-colors">Activar todo</button>
                  <span className="text-zinc-700">·</span>
                  <button onClick={() => selectGroup(group, false)} disabled={allOff} className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors">Quitar todo</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {cols.map(col => (
                  <button
                    key={col.id}
                    onClick={() => toggle(col.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left",
                      enabled.has(col.id)
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-200"
                        : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                      enabled.has(col.id) ? "bg-indigo-500 border-indigo-400" : "border-zinc-600"
                    )}>
                      {enabled.has(col.id) && <Check className="w-2 h-2 text-white" />}
                    </div>
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-zinc-950/30 border border-white/5 rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-2">Vista previa de columnas activas</p>
        <div className="flex flex-wrap gap-2">
          {ALL_COLUMNS.filter(c => enabled.has(c.id)).map(c => (
            <span key={c.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{c.label}</span>
          ))}
          {enabled.size === 0 && <span className="text-zinc-600 text-xs">Ninguna columna seleccionada</span>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB — KPIs DINÁMICOS
═══════════════════════════════════════════ */
const ALL_KPIS = [
  { id: 'total_ventas',      label: 'Total de Ventas',          icon: '📊', desc: 'Número de ventas registradas en el período' },
  { id: 'ventas_activas',    label: 'Ventas Activas',           icon: '✅', desc: 'Ventas en estado activo / instaladas' },
  { id: 'ingresos_mes',      label: 'Ingresos del Mes',         icon: '💰', desc: 'Suma de rentas del período seleccionado' },
  { id: 'ticket_promedio',   label: 'Ticket Promedio',          icon: '📈', desc: 'Renta promedio por venta' },
  { id: 'tasa_conversion',   label: 'Tasa de Conversión',       icon: '🎯', desc: 'Porcentaje de leads convertidos' },
  { id: 'candidatos_bot',    label: 'Candidatos (Bot)',         icon: '🤖', desc: 'Candidatos procesados por el bot de WhatsApp' },
  { id: 'nuevos_empleados',  label: 'Nuevos Empleados',         icon: '👥', desc: 'Contrataciones del período' },
  { id: 'gastos_periodo',    label: 'Gastos del Período',       icon: '📉', desc: 'Suma de gastos registrados' },
  { id: 'margen_bruto',      label: 'Margen Bruto Estimado',    icon: '💵', desc: 'Ingresos menos gastos' },
  { id: 'ventas_canceladas', label: 'Ventas Canceladas',        icon: '❌', desc: 'Cancelaciones y rescisiones' },
  { id: 'portabilidades',    label: 'Portabilidades',           icon: '🔄', desc: 'Ventas con portabilidad de número' },
  { id: 'domiciliaciones',   label: 'Domiciliaciones',          icon: '🏦', desc: 'Contratos con pago domiciliado' },
];

function KPIsTab() {
  const DEFAULT_KPIS = ['total_ventas','ventas_activas','ingresos_mes','ticket_promedio','tasa_conversion','gastos_periodo'];
  const [enabled, setEnabled] = useState<Set<string>>(new Set(DEFAULT_KPIS));
  const [dateRange, setDateRange] = useState('mes');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);

  // Load saved KPI config on mount
  useEffect(() => {
    fetch('/api/admin/preferences/me', { headers: authHdr() })
      .then(r => r.json())
      .then(pref => {
        const cfg = pref.kpiConfig;
        if (cfg && Object.keys(cfg).length > 0) {
          setEnabled(new Set(Object.keys(cfg).filter(k => cfg[k])));
        }
        if (pref.kpiDateRange) setDateRange(pref.kpiDateRange);
      })
      .catch(() => {});
  }, []);

  const toggle = (id: string) => setEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async () => {
    setSaving(true);
    const kpiConfig: Record<string, boolean> = {};
    ALL_KPIS.forEach(k => { kpiConfig[k.id] = enabled.has(k.id); });
    try {
      await fetch('/api/admin/preferences/me', {
        method: 'POST', headers: authHdr(),
        body: JSON.stringify({ kpiConfig, kpiDateRange: dateRange }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { /* silent */ }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h3 className="text-zinc-100 font-bold text-base">KPIs del Dashboard</h3>
          <p className="text-zinc-500 text-sm mt-1">Activa o desactiva métricas. Define el rango de fechas predeterminado.</p>
        </div>
        <button
          onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          {saved ? <Check className="w-4 h-4" /> : saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? '¡Guardado!' : saving ? 'Guardando…' : 'Guardar Configuración'}
        </button>
      </div>

      {/* Rango de fechas */}
      <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Rango de Fechas Predeterminado</p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'hoy',     label: 'Hoy' },
            { id: 'semana',  label: 'Esta semana' },
            { id: 'mes',     label: 'Este mes' },
            { id: 'trimestre', label: 'Trimestre' },
            { id: 'anio',    label: 'Este año' },
            { id: 'custom',  label: 'Personalizado' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setDateRange(r.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-semibold transition-all border",
                dateRange === r.id
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
              )}
            >{r.label}</button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="flex gap-3 pt-1">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 mb-1 block">Desde</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 mb-1 block">Hasta</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}
      </div>

      {/* Grid de KPIs */}
      <div>
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-3">
          Métricas activas: <span className="text-indigo-400">{enabled.size}</span> / {ALL_KPIS.length}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_KPIS.map(kpi => (
            <button
              key={kpi.id}
              onClick={() => toggle(kpi.id)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                enabled.has(kpi.id)
                  ? "bg-indigo-600/10 border-indigo-500/30 ring-1 ring-indigo-500/20"
                  : "bg-zinc-950/40 border-white/5 opacity-60 hover:opacity-80 hover:border-white/10"
              )}
            >
              <span className="text-xl mt-0.5">{kpi.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-sm font-semibold", enabled.has(kpi.id) ? "text-indigo-200" : "text-zinc-300")}>{kpi.label}</p>
                  <div className={cn("w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                    enabled.has(kpi.id) ? "bg-indigo-500 border-indigo-400" : "border-zinc-600"
                  )}>
                    {enabled.has(kpi.id) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{kpi.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-zinc-950/30 border border-white/5 rounded-xl p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-3">Vista previa del dashboard</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALL_KPIS.filter(k => enabled.has(k.id)).map(k => (
            <div key={k.id} className="bg-zinc-900/60 border border-white/5 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-zinc-500 mb-1">{k.icon} {k.label}</p>
              <div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB — IMPORTAR / EXPORTAR
═══════════════════════════════════════════ */
function ImportExportTab() {
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [previewData, setPreviewData]   = useState<string[][] | null>(null);
  const [parsedRecords, setParsedRecords] = useState<Record<string, string>[]>([]);
  const [importModulo, setImportModulo] = useState<'clientes' | 'candidatos' | 'ventas'>('clientes');
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string; errors?: string[] } | null>(null);
  const [exporting, setExporting]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast]               = useState('');
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3200); };

  /* ── Parse CSV helper ─────────────────────────────────── */
  const parseCSV = (text: string): { headers: string[]; records: Record<string, string>[] } => {
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const records = lines.slice(1).map(line => {
      const cells = line.match(/("(?:[^"]|"")*"|[^,]*)/g) || [];
      const record: Record<string, string> = {};
      headers.forEach((h, i) => { record[h] = (cells[i] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim(); });
      return record;
    });
    return { headers, records };
  };

  /* ── Download helper ─────────────────────────────────── */
  const dlFile = async (url: string, filename: string) => {
    setExporting(filename);
    try {
      const r = await fetch(url);
      if (!r.ok) { notify('Error al exportar: ' + await r.text()); return; }
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      URL.revokeObjectURL(a.href);
      notify(`✅ ${filename} descargado`);
    } catch { notify('Error al exportar'); }
    finally { setExporting(null); }
  };

  /* ── JSON backup download ─────────────────────────────── */
  const dlJSON = async (apiUrl: string, filename: string) => {
    setExporting(filename);
    try {
      const r = await fetch(apiUrl);
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      URL.revokeObjectURL(a.href);
      notify(`✅ ${filename} descargado`);
    } catch { notify('Error al exportar'); }
    finally { setExporting(null); }
  };

  const EXPORTS = [
    { label: 'Ventas',             sub: 'Historial completo de ventas + estado + agente', url: '/api/admin/export/ventas',      file: `ventas_${new Date().toISOString().slice(0,10)}.csv`,       color: 'indigo', fmt: 'CSV' },
    { label: 'Clientes Morosos',   sub: 'Clientes con estado de pago = moroso',           url: '/api/admin/export/morosos',     file: `morosos_${new Date().toISOString().slice(0,10)}.csv`,      color: 'red',    fmt: 'CSV' },
    { label: 'Candidatos',         sub: 'Todos los candidatos de reclutamiento',          url: '/api/admin/export/candidatos',  file: `candidatos_${new Date().toISOString().slice(0,10)}.csv`,   color: 'amber',  fmt: 'CSV' },
    { label: 'Clientes Seguimiento', sub: 'Base completa de clientes activos',           url: '/api/admin/export/clientes',    file: `clientes_${new Date().toISOString().slice(0,10)}.csv`,     color: 'cyan',   fmt: 'CSV' },
    { label: 'Gastos',             sub: 'Registro de gastos por categoría',              url: '/api/admin/export/gastos',      file: `gastos_${new Date().toISOString().slice(0,10)}.csv`,       color: 'orange', fmt: 'CSV' },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    red:    'bg-red-500/10 text-red-400 border-red-500/20',
    amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cyan:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  /* ── File change ─────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file); setImportResult(null); setPreviewData(null); setParsedRecords([]);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (file.name.endsWith('.csv')) {
        const { headers, records } = parseCSV(text);
        const preview = [headers, ...records.slice(0, 5).map(r => headers.map(h => r[h] || ''))];
        setPreviewData(preview);
        setParsedRecords(records);
      } else if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          const keys = Object.keys(arr[0] || {});
          const preview = [keys, ...arr.slice(0, 5).map((r: Record<string, unknown>) => keys.map(k => String(r[k] ?? '')))];
          setPreviewData(preview);
          setParsedRecords(arr.map((r: Record<string, unknown>) => { const out: Record<string,string> = {}; Object.keys(r).forEach(k => out[k] = String(r[k] ?? '')); return out; }));
        } catch { setPreviewData([['Error: JSON inválido']]); }
      }
    };
    reader.readAsText(file);
  };

  /* ── Real import ─────────────────────────────────────── */
  const handleImport = async () => {
    if (!uploadFile || parsedRecords.length === 0) return;
    setImporting(true); setImportResult(null);
    try {
      const r = await fetch(`/api/admin/import/${importModulo}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: parsedRecords }),
      });
      const data = await r.json();
      if (data.imported !== undefined) {
        setImportResult({ ok: data.imported > 0, msg: `${data.imported} registros importados de ${data.total}`, errors: data.errors });
        if (data.imported > 0) notify(`✅ ${data.imported} registros importados`);
      } else {
        setImportResult({ ok: false, msg: data.error || 'Error en importación' });
      }
    } catch (err) {
      setImportResult({ ok: false, msg: 'Error de red al importar' });
    } finally { setImporting(false); }
  };

  const inp = 'px-3 py-2 bg-zinc-950/50 border border-white/8 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40';

  return (
    <div className="space-y-8">
      {toast && <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-fade-in">{toast}</div>}

      {/* ── EXPORTAR ────────────────────────────────────── */}
      <div>
        <h3 className="text-zinc-100 font-bold flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-indigo-400" /> Exportar Datos
        </h3>
        <p className="text-sm text-zinc-400 mb-5">Descarga cualquier módulo como CSV para Excel o análisis.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {EXPORTS.map(exp => (
            <button
              key={exp.label}
              onClick={() => dlFile(exp.url, exp.file)}
              disabled={exporting === exp.file}
              className="text-left px-4 py-3.5 bg-zinc-950/50 border border-white/5 rounded-xl hover:border-indigo-500/30 hover:bg-indigo-500/4 transition-all group disabled:opacity-50"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">{exp.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{exp.sub}</p>
                </div>
                <span className={cn('text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-lg border shrink-0', colorMap[exp.color])}>
                  {exporting === exp.file ? '...' : exp.fmt}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* JSON backup row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {[
            { label: 'Backup Ventas (JSON)', url: '/api/ventas', file: `backup_ventas_${new Date().toISOString().slice(0,10)}.json` },
            { label: 'Backup Candidatos (JSON)', url: '/api/recruitment/candidates', file: `backup_candidatos_${new Date().toISOString().slice(0,10)}.json` },
          ].map(b => (
            <button key={b.label} onClick={() => dlJSON(b.url, b.file)} className="text-left px-4 py-3 bg-zinc-950/50 border border-white/5 rounded-xl hover:border-amber-500/30 transition-all group">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-zinc-100 group-hover:text-white">{b.label}</p>
                <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-lg border border-amber-500/20">JSON</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── IMPORTAR ────────────────────────────────────── */}
      <div>
        <h3 className="text-zinc-100 font-bold flex items-center gap-2 mb-1">
          <Upload className="w-5 h-5 text-indigo-400" /> Importar Datos
        </h3>
        <p className="text-sm text-zinc-400 mb-5">Sube CSV o JSON. Los registros duplicados serán ignorados.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {/* Módulo selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Módulo destino</label>
              <select value={importModulo} onChange={e => setImportModulo(e.target.value as any)} className={inp}>
                <option value="clientes">Clientes Seguimiento</option>
                <option value="candidatos">Candidatos Reclutamiento</option>
                <option value="ventas">Ventas</option>
              </select>
            </div>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-zinc-700/50 rounded-2xl p-8 text-center hover:bg-zinc-800/20 transition-colors cursor-pointer bg-zinc-950/20"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
              <p className="text-zinc-100 text-sm font-medium mb-1">{uploadFile ? uploadFile.name : 'Seleccionar archivo CSV o JSON'}</p>
              <p className="text-xs text-zinc-500">{uploadFile ? `${parsedRecords.length} registros detectados` : 'Haz clic o arrastra aquí'}</p>
              <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileChange} />
            </div>

            {importResult && (
              <div className={cn('rounded-xl p-3 text-sm', importResult.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border border-red-500/20 text-red-300')}>
                <p className="font-semibold">{importResult.ok ? '✅' : '❌'} {importResult.msg}</p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-[11px] opacity-75 max-h-20 overflow-y-auto">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            {uploadFile && parsedRecords.length > 0 && (
              <button onClick={handleImport} disabled={importing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {importing
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importando {parsedRecords.length} registros…</>
                  : <><Upload className="w-4 h-4" /> Importar {parsedRecords.length} registros → {importModulo}</>}
              </button>
            )}

            {/* Plantilla CSV */}
            <div className="bg-zinc-950/30 border border-white/5 rounded-xl p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Columnas requeridas por módulo</p>
              <div className="space-y-1.5 text-[11px] font-mono">
                <p className="text-cyan-400/70"><span className="font-bold text-cyan-400">clientes:</span> nombre, telefono, folio, paquete, renta, estado_pago, agente_nombre, municipio</p>
                <p className="text-amber-400/70"><span className="font-bold text-amber-400">candidatos:</span> name, phone, age, experience, profile, stage</p>
                <p className="text-indigo-400/70"><span className="font-bold text-indigo-400">ventas:</span> folio, estado, nombres, telefono, paqueteNombre, rentaMensual</p>
              </div>
            </div>
          </div>

          {/* Preview table */}
          {previewData && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Vista previa — primeras filas</p>
              <div className="bg-zinc-950/50 border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-900/60 sticky top-0">
                      <tr>{previewData[0]?.map((h, i) => <th key={i} className="px-3 py-2 text-left text-zinc-400 font-bold whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {previewData.slice(1).map((row, i) => (
                        <tr key={i} className="hover:bg-white/2">
                          {row.map((cell, j) => <td key={j} className="px-3 py-2 text-zinc-300 font-mono max-w-[120px] truncate">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-white/5">
                  <p className="text-[10px] text-zinc-600">{parsedRecords.length} registros detectados en el archivo</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB — BOT (existente, mejorado)
═══════════════════════════════════════════ */
function BotTab() {
  const [faqs, setFaqs] = useState([
    { id: 1, question: '¿Cuáles son los requisitos de contratación?', answer: 'Los requisitos son: INE, Comprobante de domicilio y RFC.' },
    { id: 2, question: '¿Dónde están ubicados?', answer: 'Nos encontramos en Avenida Tláhuac 3632.' }
  ]);
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [isSaving, setIsSaving]           = useState(false);
  const [saved, setSaved]                 = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => { setIsSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000); }, 1500);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-zinc-100 font-medium">Plantillas de Bienvenida</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Reclutamiento Especializado</label>
              <textarea className="w-full bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-zinc-100 resize-none h-24 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50" defaultValue="¡Hola! Soy Gisselle Arenas, agente de reclutamiento de Heavenly Dreams. ¿Te interesa conocer nuestras vacantes?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Operativo</label>
              <textarea className="w-full bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-zinc-100 resize-none h-24 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50" defaultValue="Hola, soy tu asistente operativo. Por favor, indícame el folio VT que deseas consultar." />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-zinc-100 font-medium">Mensajes Operativos</h3>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Cobranza (1-15 días)</label>
              <textarea className="w-full bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-zinc-100 resize-none h-24 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50" defaultValue="Estimado cliente, le recordamos amablemente que su fecha de pago ha pasado. Le invitamos a regularizar su saldo." />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-zinc-100 font-medium flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" /> Entrenamiento de IA
            </h3>
            <p className="text-sm text-zinc-400">Sube documentos o añade texto para entrenar al bot con conocimiento específico de tu empresa.</p>
            <div className="border-2 border-dashed border-zinc-700/50 rounded-2xl p-6 text-center hover:bg-zinc-800/30 transition-colors cursor-pointer bg-zinc-950/20">
              <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
              <p className="text-zinc-100 text-sm font-medium mb-1">Subir Documentos (PDF, TXT)</p>
              <p className="text-xs text-zinc-500">Arrastra tus archivos de conocimiento aquí</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Base de Conocimiento Manual</label>
              <textarea
                value={knowledgeBase} onChange={e => setKnowledgeBase(e.target.value)}
                className="w-full bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-zinc-100 resize-none h-32 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                placeholder="Escribe aquí preguntas frecuentes, políticas de la empresa, o información clave que el bot deba saber..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5">
        <h3 className="text-zinc-100 font-medium mb-4">Respuestas Rápidas / FAQs</h3>
        <div className="space-y-3">
          {faqs.map(faq => (
            <div key={faq.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-4 flex gap-4 items-start">
              <div className="flex-1 space-y-2">
                <input
                  type="text" value={faq.question}
                  onChange={e => setFaqs(faqs.map(f => f.id === faq.id ? { ...f, question: e.target.value } : f))}
                  className="w-full bg-transparent border-b border-zinc-800 pb-1 text-zinc-100 text-sm font-medium focus:outline-none focus:border-indigo-500"
                  placeholder="Pregunta frecuente..."
                />
                <input
                  type="text" value={faq.answer}
                  onChange={e => setFaqs(faqs.map(f => f.id === faq.id ? { ...f, answer: e.target.value } : f))}
                  className="w-full bg-transparent text-zinc-400 text-sm focus:outline-none"
                  placeholder="Respuesta..."
                />
              </div>
              <button onClick={() => setFaqs(faqs.filter(f => f.id !== faq.id))} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button onClick={() => setFaqs([...faqs, { id: Date.now(), question: '', answer: '' }])} className="text-indigo-400 text-sm font-medium flex items-center gap-1.5 hover:text-indigo-300 transition-colors">
            <Plus className="w-4 h-4" /> Añadir respuesta
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4 gap-4 items-center">
        {saved && <span className="text-sm text-emerald-400 font-medium">¡Entrenamiento iniciado!</span>}
        <button
          onClick={handleSave} disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <Upload className="w-4 h-4 animate-bounce" />}
          {isSaving ? 'Entrenando IA...' : 'Guardar y Entrenar Bot'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB — CANALES WhatsApp + Facebook (Multi-cuenta)
═══════════════════════════════════════════ */
type WAAccount = {
  id: string; nombre: string; phoneId: string; accessToken: string;
  tipo: 'reclutamiento'|'clientes'|'cobranza'|'soporte';
  orden: number; activo: boolean;
  status: 'activo'|'inactivo'|'error'|'sin_configurar';
  displayPhone?: string; lastChecked?: string;
};
type FBAccount = {
  id: string; nombre: string; pageId: string; accessToken: string;
  tipo: 'reclutamiento'|'clientes'|'cobranza'|'soporte'|'marketing';
  activo: boolean;
  status: 'activo'|'inactivo'|'error'|'sin_configurar';
  pageName?: string; category?: string; lastChecked?: string;
};
type WAQRCanalSession = {
  id: string; nombre: string; tipo: 'personal'|'business';
  activo: boolean; phoneNumber?: string; createdAt: string;
};
type TelegramBot = {
  id: string; nombre: string; token: string; activo: boolean;
  status: 'activo'|'inactivo'|'error'|'sin_configurar';
  botUsername?: string; botName?: string; lastChecked?: string;
};
type QRSessionStatus = {
  status: 'desconectado'|'esperando_qr'|'qr_listo'|'autenticando'|'conectado'|'error';
  qr?: string; phoneNumber?: string; error?: string;
};
const IS_DEV = (import.meta as any).env?.DEV ?? false;

const TIPO_LABELS: Record<string, string> = {
  reclutamiento: 'Reclutamiento', clientes: 'Clientes', cobranza: 'Cobranza', soporte: 'Soporte',
};
const TIPO_COLORS: Record<string, string> = {
  reclutamiento: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  clientes:      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  cobranza:      'bg-red-500/10 text-red-400 border-red-500/20',
  soporte:       'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const STATUS_CFG = {
  activo:          { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Activa' },
  inactivo:        { cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',         dot: 'bg-zinc-500',    label: 'Inactiva' },
  error:           { cls: 'bg-red-500/10 text-red-400 border-red-500/20',             dot: 'bg-red-500',     label: 'Error' },
  sin_configurar:  { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',      dot: 'bg-amber-500',   label: 'Sin configurar' },
};

function WAAccountModal({
  account, onClose, onSaved,
}: { account: WAAccount | null; onClose: () => void; onSaved: (a: WAAccount) => void }) {
  const [form, setForm] = useState({
    nombre:      account?.nombre      || '',
    phoneId:     account?.phoneId     || '',
    accessToken: '',   // never pre-fill token
    tipo:        account?.tipo        || 'reclutamiento' as WAAccount['tipo'],
    orden:       account?.orden       || 1,
    activo:      account?.activo      !== false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const [showToken, setShowToken] = useState(false);
  const handle = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nombre) { setErr('El nombre es requerido'); return; }
    setSaving(true); setErr('');
    try {
      const body: any = { nombre: form.nombre, phoneId: form.phoneId, tipo: form.tipo, orden: form.orden, activo: form.activo };
      if (form.accessToken) body.accessToken = form.accessToken; // only send if user typed a new one
      let r;
      if (account) {
        r = await fetch(`/api/wa/accounts/${account.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        r = await fetch('/api/wa/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      onSaved(await r.json());
    } catch (e: any) { setErr(e.message || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100">{account ? 'Editar cuenta WA' : 'Nueva cuenta WA'}</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{err}</p>}
        <div className="space-y-3">
          <Field label="Nombre de la cuenta">
            <input value={form.nombre} onChange={e => handle('nombre', e.target.value)} placeholder="Ej. Reclutamiento 1 — Gisselle" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select value={form.tipo} onChange={e => handle('tipo', e.target.value)} className={inputCls}>
                <option value="reclutamiento">Reclutamiento</option>
                <option value="clientes">Clientes</option>
                <option value="cobranza">Cobranza</option>
                <option value="soporte">Soporte</option>
              </select>
            </Field>
            <Field label="Orden">
              <input type="number" min={1} max={10} value={form.orden} onChange={e => handle('orden', parseInt(e.target.value) || 1)} className={inputCls} />
            </Field>
          </div>
          <Field label="Meta Phone Number ID">
            <input value={form.phoneId} onChange={e => handle('phoneId', e.target.value)} placeholder="123456789012345" className={inputCls} />
          </Field>
          <Field label={account ? 'Nuevo Access Token (dejar vacío = sin cambios)' : 'Meta Access Token'}>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.accessToken} onChange={e => handle('accessToken', e.target.value)}
                placeholder={account ? 'Solo si quieres cambiarlo...' : 'EAA...'}
                className={cn(inputCls, 'pr-10')}
              />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Permanece oculto por seguridad. Se muestra enmascarado.</p>
          </Field>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handle('activo', !form.activo)}
              className={cn('relative w-10 h-6 rounded-full transition-colors border', form.activo ? 'bg-emerald-500 border-emerald-400' : 'bg-zinc-700 border-zinc-600')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.activo ? 'left-4' : 'left-0.5')} />
            </button>
            <span className="text-sm text-zinc-300">{form.activo ? 'Cuenta activa' : 'Cuenta inactiva'}</span>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Guardando...' : account ? 'Actualizar' : 'Crear cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FBAccountModal({
  account, onClose, onSaved,
}: { account: FBAccount | null; onClose: () => void; onSaved: (a: FBAccount) => void }) {
  const [form, setForm] = useState({
    nombre:      account?.nombre || '',
    pageId:      account?.pageId || '',
    accessToken: '',
    tipo:        account?.tipo   || 'marketing' as FBAccount['tipo'],
    activo:      account?.activo !== false,
  });
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [showToken, setShowToken] = useState(false);
  const handle = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nombre) { setErr('El nombre es requerido'); return; }
    setSaving(true); setErr('');
    try {
      const body: any = { nombre: form.nombre, pageId: form.pageId, tipo: form.tipo, activo: form.activo };
      if (form.accessToken) body.accessToken = form.accessToken;
      let r;
      if (account) {
        r = await fetch(`/api/fb/accounts/${account.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        r = await fetch('/api/fb/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      onSaved(await r.json());
    } catch (e: any) { setErr(e.message || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100">{account ? 'Editar página Facebook' : 'Nueva página Facebook'}</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{err}</p>}
        <div className="space-y-3">
          <Field label="Nombre de la cuenta">
            <input value={form.nombre} onChange={e => handle('nombre', e.target.value)} placeholder="Ej. Página Heavenly Dreams" className={inputCls} />
          </Field>
          <Field label="Uso">
            <select value={form.tipo} onChange={e => handle('tipo', e.target.value)} className={inputCls}>
              <option value="marketing">Marketing</option>
              <option value="reclutamiento">Reclutamiento</option>
              <option value="clientes">Clientes</option>
              <option value="cobranza">Cobranza</option>
              <option value="soporte">Soporte</option>
            </select>
          </Field>
          <Field label="Facebook Page ID">
            <input value={form.pageId} onChange={e => handle('pageId', e.target.value)} placeholder="123456789012345" className={inputCls} />
          </Field>
          <Field label={account ? 'Nuevo Page Access Token (dejar vacío = sin cambios)' : 'Page Access Token'}>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.accessToken} onChange={e => handle('accessToken', e.target.value)}
                placeholder={account ? 'Solo si quieres cambiarlo...' : 'EAA...'}
                className={cn(inputCls, 'pr-10')}
              />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Token de página permanente desde Business Manager → System Users.</p>
          </Field>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handle('activo', !form.activo)}
              className={cn('relative w-10 h-6 rounded-full transition-colors border', form.activo ? 'bg-emerald-500 border-emerald-400' : 'bg-zinc-700 border-zinc-600')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.activo ? 'left-4' : 'left-0.5')} />
            </button>
            <span className="text-sm text-zinc-300">{form.activo ? 'Cuenta activa' : 'Cuenta inactiva'}</span>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Guardando...' : account ? 'Actualizar' : 'Crear página'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WhatsApp QR Modal ────────────────────────────────────────────
function WAQRModal({ session, onClose, onConnected }: {
  session: WAQRCanalSession; onClose: () => void; onConnected: (phone: string) => void;
}) {
  const [state, setState] = React.useState<QRSessionStatus>({ status: 'desconectado' });
  const [mode, setMode]   = React.useState<'real'|'stub'>('stub');
  const [loading, setLoading] = React.useState(false);
  const pollRef = React.useRef<ReturnType<typeof setInterval>|null>(null);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const poll = () => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/canales/whatsapp-qr/${session.id}/status`);
        const d = await r.json();
        setMode(d.mode);
        setState(d.state);
        if (d.state.status === 'conectado') {
          stopPoll();
          if (d.state.phoneNumber) onConnected(d.state.phoneNumber);
        }
      } catch {}
    }, 2000);
  };

  const start = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/canales/whatsapp-qr/${session.id}/start`, { method: 'POST' });
      const d = await r.json();
      setMode(d.mode);
      setState(d.state);
      poll();
    } catch {}
    setLoading(false);
  };

  const disconnect = async () => {
    stopPoll();
    await fetch(`/api/canales/whatsapp-qr/${session.id}/disconnect`, { method: 'POST' });
    setState({ status: 'desconectado' });
  };

  const stubConnect = async () => {
    await fetch(`/api/canales/whatsapp-qr/${session.id}/stub-connect`, { method: 'POST' });
  };

  React.useEffect(() => {
    // Check current status on open
    fetch(`/api/canales/whatsapp-qr/${session.id}/status`)
      .then(r => r.json()).then(d => { setMode(d.mode); setState(d.state); if (d.state.status !== 'conectado') poll(); })
      .catch(() => {});
    return () => stopPoll();
  }, [session.id]);

  const QR_URL = state.qr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(state.qr)}`
    : null;

  const isWA  = session.tipo === 'personal';
  const color = isWA ? 'bg-emerald-600' : 'bg-teal-600';
  const label = isWA ? 'WhatsApp' : 'WhatsApp Business';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white', color)}>{label}</span>
            <span className="text-sm font-semibold text-zinc-200 truncate">{session.nombre}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {/* QR / Estado */}
        <div className="flex flex-col items-center gap-3 py-2">
          {state.status === 'desconectado' && (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center mx-auto">
                <Smartphone className="w-10 h-10 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400">Sesión no iniciada</p>
              <button onClick={start} disabled={loading} className={cn('px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all flex items-center gap-2 mx-auto', color.replace('bg-','bg-').replace('600','600') + ' hover:opacity-90')}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando…</> : <><Zap className="w-4 h-4" /> Generar QR</>}
              </button>
            </div>
          )}

          {(state.status === 'esperando_qr' || state.status === 'autenticando') && (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-zinc-500 animate-spin" />
              </div>
              <p className="text-sm text-zinc-400">{state.status === 'autenticando' ? 'Autenticando...' : 'Generando QR...'}</p>
            </div>
          )}

          {state.status === 'qr_listo' && QR_URL && (
            <div className="text-center space-y-3">
              <div className="bg-white p-2 rounded-xl inline-block shadow-xl">
                <img src={QR_URL} alt="QR WhatsApp" className="w-56 h-56 rounded-lg" />
              </div>
              <p className="text-xs text-zinc-400">
                Abre {label} → <span className="font-semibold text-zinc-200">Dispositivos vinculados</span> → Vincular dispositivo
              </p>
              {mode === 'stub' && IS_DEV && (
                <button onClick={stubConnect} className="text-[10px] text-zinc-600 hover:text-zinc-400 underline">
                  [DEV] Simular escaneo
                </button>
              )}
            </div>
          )}

          {state.status === 'conectado' && (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">Conectado</p>
                {state.phoneNumber && <p className="text-xs text-zinc-500 font-mono mt-0.5">{state.phoneNumber}</p>}
              </div>
              <button onClick={disconnect} className="text-xs text-red-400 hover:text-red-300 underline">Desconectar sesión</button>
            </div>
          )}

          {state.status === 'error' && (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-xs text-red-400">{state.error || 'Error al conectar'}</p>
              <button onClick={start} className="text-xs text-zinc-400 hover:text-white underline">Reintentar</button>
            </div>
          )}
        </div>

        {mode === 'stub' && state.status !== 'conectado' && (
          <p className="text-[10px] text-center text-zinc-700">Modo demo — instala <span className="font-mono">whatsapp-web.js</span> para QR real</p>
        )}
      </div>
    </div>
  );
}

// ── Telegram Bot Modal ───────────────────────────────────────────
function TelegramBotModal({ bot, onClose, onSaved }: {
  bot: TelegramBot | null; onClose: () => void; onSaved: (b: TelegramBot) => void;
}) {
  const [form, setForm] = React.useState({ nombre: bot?.nombre || '', token: '', activo: bot?.activo !== false });
  const [saving, setSaving]     = React.useState(false);
  const [err, setErr]           = React.useState('');
  const [showToken, setShowToken] = React.useState(false);
  const handle = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.nombre) { setErr('El nombre es requerido'); return; }
    setSaving(true); setErr('');
    try {
      const body: any = { nombre: form.nombre, activo: form.activo };
      if (form.token) body.token = form.token;
      let r;
      if (bot) {
        r = await fetch(`/api/canales/telegram/${bot.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        if (!form.token) { setErr('El token es requerido'); setSaving(false); return; }
        r = await fetch('/api/canales/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      onSaved(await r.json());
    } catch (e: any) { setErr(e.message || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#229ED9] flex items-center justify-center text-white text-[11px] font-black">✈</span>
            {bot ? 'Editar bot Telegram' : 'Nuevo bot Telegram'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{err}</p>}
        <div className="space-y-3">
          <Field label="Nombre del bot">
            <input value={form.nombre} onChange={e => handle('nombre', e.target.value)} placeholder="Ej. Bot Reclutamiento HD" className={inputCls} />
          </Field>
          <Field label={bot ? 'Nuevo Token (dejar vacío = sin cambios)' : 'Bot Token'}>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.token} onChange={e => handle('token', e.target.value)}
                placeholder={bot ? 'Solo si quieres cambiarlo...' : '123456789:AAF...'}
                className={cn(inputCls, 'pr-10')}
              />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Obtén el token de <span className="text-[#229ED9] font-mono">@BotFather</span> en Telegram → /newbot</p>
          </Field>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => handle('activo', !form.activo)}
              className={cn('relative w-10 h-6 rounded-full transition-colors border', form.activo ? 'bg-[#229ED9] border-[#229ED9]/60' : 'bg-zinc-700 border-zinc-600')}>
              <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.activo ? 'left-4' : 'left-0.5')} />
            </button>
            <span className="text-sm text-zinc-300">{form.activo ? 'Bot activo' : 'Bot inactivo'}</span>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#229ED9] hover:bg-[#1a8bbf] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Guardando...' : bot ? 'Actualizar' : 'Agregar bot'}
          </button>
        </div>
      </div>
    </div>
  );
}

const FB_TIPO_LABELS: Record<string, string> = {
  marketing: 'Marketing', reclutamiento: 'Reclutamiento', clientes: 'Clientes', cobranza: 'Cobranza', soporte: 'Soporte',
};
const FB_TIPO_COLORS: Record<string, string> = {
  marketing:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  reclutamiento: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  clientes:      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  cobranza:      'bg-red-500/10 text-red-400 border-red-500/20',
  soporte:       'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function CanalesTab() {
  // WhatsApp state
  const [accounts, setAccounts] = useState<WAAccount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<WAAccount | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [testing, setTesting]   = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Facebook state
  const [fbAccounts, setFbAccounts]     = useState<FBAccount[]>([]);
  const [fbLoading, setFbLoading]       = useState(true);
  const [fbEditing, setFbEditing]       = useState<FBAccount | null>(null);
  const [showFbModal, setShowFbModal]   = useState(false);
  const [fbTesting, setFbTesting]       = useState<string | null>(null);
  const [fbTestResults, setFbTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // WhatsApp QR state
  const [wqrSessions, setWqrSessions]   = useState<WAQRCanalSession[]>([]);
  const [wqrLoading, setWqrLoading]     = useState(true);
  const [wqrModal, setWqrModal]         = useState<WAQRCanalSession | null>(null);
  const [showNewWqr, setShowNewWqr]     = useState(false);
  const [newWqrForm, setNewWqrForm]     = useState({ nombre: '', tipo: 'personal' as 'personal'|'business' });

  // Telegram state
  const [tgBots, setTgBots]             = useState<TelegramBot[]>([]);
  const [tgLoading, setTgLoading]       = useState(true);
  const [tgEditing, setTgEditing]       = useState<TelegramBot | null>(null);
  const [showTgModal, setShowTgModal]   = useState(false);
  const [tgTesting, setTgTesting]       = useState<string | null>(null);
  const [tgTestResults, setTgTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const [toast, setToast] = useState('');
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3200); };

  const load = async () => {
    setLoading(true);
    try { setAccounts(await (await fetch('/api/wa/accounts')).json()); }
    catch { notify('Error cargando cuentas WA'); }
    finally { setLoading(false); }
  };

  const loadFb = async () => {
    setFbLoading(true);
    try { setFbAccounts(await (await fetch('/api/fb/accounts')).json()); }
    catch { notify('Error cargando cuentas Facebook'); }
    finally { setFbLoading(false); }
  };

  const loadWqr = async () => {
    setWqrLoading(true);
    try { setWqrSessions(await (await fetch('/api/canales/whatsapp-qr')).json()); }
    catch { notify('Error cargando sesiones WA QR'); }
    finally { setWqrLoading(false); }
  };

  const loadTg = async () => {
    setTgLoading(true);
    try { setTgBots(await (await fetch('/api/canales/telegram')).json()); }
    catch { notify('Error cargando bots Telegram'); }
    finally { setTgLoading(false); }
  };

  useEffect(() => { load(); loadFb(); loadWqr(); loadTg(); }, []);

  const del = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await fetch(`/api/wa/accounts/${id}`, { method: 'DELETE' });
    setAccounts(prev => prev.filter(a => a.id !== id));
    notify('Cuenta eliminada');
  };

  const delFb = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await fetch(`/api/fb/accounts/${id}`, { method: 'DELETE' });
    setFbAccounts(prev => prev.filter(a => a.id !== id));
    notify('Página eliminada');
  };

  const createWqrSession = async () => {
    if (!newWqrForm.nombre) { notify('Escribe un nombre'); return; }
    try {
      const r = await fetch('/api/canales/whatsapp-qr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newWqrForm) });
      const s = await r.json() as WAQRCanalSession;
      setWqrSessions(prev => [...prev, s]);
      setShowNewWqr(false);
      setNewWqrForm({ nombre: '', tipo: 'personal' });
      setWqrModal(s);
      notify('Sesión creada — escanea el QR');
    } catch { notify('Error creando sesión'); }
  };

  const delWqr = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar sesión "${nombre}"?`)) return;
    await fetch(`/api/canales/whatsapp-qr/${id}`, { method: 'DELETE' });
    setWqrSessions(prev => prev.filter(s => s.id !== id));
    notify('Sesión eliminada');
  };

  const testTgBot = async (id: string) => {
    setTgTesting(id);
    try {
      const r = await fetch(`/api/canales/telegram/${id}/test`, { method: 'POST' });
      const data = await r.json() as { ok: boolean; error?: string; botUsername?: string; botName?: string };
      setTgTestResults(prev => ({
        ...prev,
        [id]: data.ok
          ? { ok: true, msg: `✅ @${data.botUsername} — ${data.botName}` }
          : { ok: false, msg: `❌ ${data.error || 'Token inválido'}` },
      }));
      await loadTg();
    } catch { setTgTestResults(prev => ({ ...prev, [id]: { ok: false, msg: '❌ Error de red' } })); }
    finally { setTgTesting(null); }
  };

  const delTg = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar bot "${nombre}"?`)) return;
    await fetch(`/api/canales/telegram/${id}`, { method: 'DELETE' });
    setTgBots(prev => prev.filter(b => b.id !== id));
    notify('Bot eliminado');
  };

  const testAccount = async (id: string) => {
    setTesting(id);
    try {
      const r = await fetch(`/api/wa/accounts/${id}/test`, { method: 'POST' });
      const data = await r.json() as { ok: boolean; error?: string; displayPhone?: string; verifiedName?: string };
      setTestResults(prev => ({
        ...prev,
        [id]: data.ok
          ? { ok: true, msg: `✅ Conectada${data.displayPhone ? ` — ${data.displayPhone}` : ''}${data.verifiedName ? ` (${data.verifiedName})` : ''}` }
          : { ok: false, msg: `❌ ${data.error || 'Error desconocido'}` },
      }));
      await load();
    } catch { setTestResults(prev => ({ ...prev, [id]: { ok: false, msg: '❌ Error de red' } })); }
    finally { setTesting(null); }
  };

  const testFbAccount = async (id: string) => {
    setFbTesting(id);
    try {
      const r = await fetch(`/api/fb/accounts/${id}/test`, { method: 'POST' });
      const data = await r.json() as { ok: boolean; error?: string; pageName?: string; category?: string };
      setFbTestResults(prev => ({
        ...prev,
        [id]: data.ok
          ? { ok: true, msg: `✅ Conectada${data.pageName ? ` — ${data.pageName}` : ''}${data.category ? ` (${data.category})` : ''}` }
          : { ok: false, msg: `❌ ${data.error || 'Error desconocido'}` },
      }));
      await loadFb();
    } catch { setFbTestResults(prev => ({ ...prev, [id]: { ok: false, msg: '❌ Error de red' } })); }
    finally { setFbTesting(null); }
  };

  // Group by tipo
  const TIPO_ORDER = ['reclutamiento', 'clientes', 'cobranza', 'soporte'];
  const grouped = TIPO_ORDER.map(tipo => ({
    tipo,
    items: accounts.filter(a => a.tipo === tipo).sort((a, b) => a.orden - b.orden),
  })).filter(g => g.items.length > 0);

  const unconfigured = accounts.filter(a => a.status === 'sin_configurar').length;
  const errors       = accounts.filter(a => a.status === 'error').length;

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-fade-in"><Check className="w-4 h-4" />{toast}</div>}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h3 className="text-zinc-100 font-bold text-base">Cuentas WhatsApp Business</h3>
          <p className="text-zinc-500 text-sm mt-1">
            Gestiona tus {accounts.length} cuentas conectadas a la Meta Business API.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-950/50 border border-white/5 rounded-xl transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" /> Nueva cuenta
          </button>
        </div>
      </div>

      {/* Alert strip */}
      {(unconfigured > 0 || errors > 0) && (
        <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-300">
            {unconfigured > 0 && <span className="font-bold">{unconfigured} cuenta(s) sin configurar</span>}
            {unconfigured > 0 && errors > 0 && ' · '}
            {errors > 0 && <span className="font-bold">{errors} cuenta(s) con error de conexión</span>}
            {' — agrega el Phone ID y Access Token de Meta Business para activarlas.'}
          </div>
        </div>
      )}

      {/* Stats chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total cuentas',     val: accounts.length,                                     color: 'text-zinc-100' },
          { label: 'Activas',           val: accounts.filter(a => a.status === 'activo').length,   color: 'text-emerald-400' },
          { label: 'Sin configurar',    val: unconfigured,                                         color: 'text-amber-400' },
          { label: 'Con error',         val: errors,                                               color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-mono font-bold', s.color)}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Account cards by group */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500">Cargando cuentas…</div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ tipo, items }) => (
            <div key={tipo} className="space-y-3">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-bold text-zinc-100">{TIPO_LABELS[tipo]}</h4>
                <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest', TIPO_COLORS[tipo])}>
                  {items.length} cuenta{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map(acc => {
                  const st = STATUS_CFG[acc.status] || STATUS_CFG.sin_configurar;
                  const tr = testResults[acc.id];
                  return (
                    <div key={acc.id} className={cn('bg-zinc-950/50 border rounded-xl p-5 flex flex-col gap-3 transition-all', acc.activo ? 'border-white/8 hover:border-white/15' : 'border-white/3 opacity-60')}>
                      {/* Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full shrink-0', st.dot)} />
                            <p className="text-sm font-semibold text-zinc-100 truncate">{acc.nombre}</p>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{acc.displayPhone || (acc.phoneId ? `ID: ${acc.phoneId.slice(0,8)}…` : 'Sin Phone ID')}</p>
                        </div>
                        <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0', st.cls)}>{st.label}</span>
                      </div>

                      {/* Token status */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={cn('w-1.5 h-1.5 rounded-full', acc.phoneId ? 'bg-emerald-500' : 'bg-zinc-600')} />
                        <span className={acc.phoneId ? 'text-zinc-400' : 'text-zinc-600'}>Phone ID {acc.phoneId ? '✓' : '—'}</span>
                        <span className={cn('w-1.5 h-1.5 rounded-full ml-2', acc.accessToken ? 'bg-emerald-500' : 'bg-zinc-600')} />
                        <span className={acc.accessToken ? 'text-zinc-400' : 'text-zinc-600'}>Token {acc.accessToken ? `(${acc.accessToken})` : '—'}</span>
                      </div>

                      {/* Test result */}
                      {tr && (
                        <p className={cn('text-[11px] font-medium px-2 py-1 rounded-lg', tr.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300')}>
                          {tr.msg}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => { setEditing(acc); setShowModal(true); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 transition-colors border border-white/5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Configurar
                        </button>
                        <button
                          onClick={() => testAccount(acc.id)}
                          disabled={testing === acc.id || !acc.phoneId || !acc.accessToken}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600/80 hover:bg-indigo-600 transition-colors disabled:opacity-40 border border-indigo-500/30"
                        >
                          {testing === acc.id
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Probando…</>
                            : <><Zap className="w-3.5 h-3.5" /> Probar</>
                          }
                        </button>
                        <button
                          onClick={() => del(acc.id, acc.nombre)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {accounts.length === 0 && (
            <div className="text-center py-16 text-zinc-600">
              <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Sin cuentas configuradas</p>
              <p className="text-sm mt-1">Agrega tu primera cuenta WhatsApp Business con el botón de arriba.</p>
            </div>
          )}
        </div>
      )}

      {/* Setup guide WA */}
      <div className="bg-zinc-950/30 border border-white/5 rounded-xl p-5 space-y-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Guía — WhatsApp Business</p>
        <ol className="space-y-1.5 text-xs text-zinc-400 list-decimal list-inside">
          <li>Ve a <span className="text-indigo-400 font-mono">developers.facebook.com</span> → tu app → WhatsApp → API Setup</li>
          <li>Obtén el <span className="text-zinc-200 font-semibold">Phone Number ID</span> de cada número registrado</li>
          <li>Genera un <span className="text-zinc-200 font-semibold">Access Token permanente</span> desde Business Manager → System Users</li>
          <li>Pega Phone ID + Token en el modal de configuración de cada cuenta</li>
          <li>Presiona <span className="text-zinc-200 font-semibold">Probar</span> para verificar la conexión con Meta</li>
          <li>Configura el webhook: <span className="font-mono text-indigo-400">https://tudominio.com/api/whatsapp/webhook</span></li>
        </ol>
      </div>

      {/* ── SECCIÓN FACEBOOK ─────────────────────────── */}
      <div className="border-t border-white/5 pt-6 space-y-6">
        {/* FB Header */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h3 className="text-zinc-100 font-bold text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-black">f</span>
              Páginas Facebook
            </h3>
            <p className="text-zinc-500 text-sm mt-1">
              Conecta tus páginas de Facebook para publicaciones y Messenger.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadFb} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-950/50 border border-white/5 rounded-xl transition-colors">
              <RefreshCw className={cn('w-4 h-4', fbLoading && 'animate-spin')} />
            </button>
            <button
              onClick={() => { setFbEditing(null); setShowFbModal(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> Nueva página
            </button>
          </div>
        </div>

        {/* FB account cards */}
        {fbLoading ? (
          <div className="text-center py-10 text-zinc-500">Cargando páginas…</div>
        ) : fbAccounts.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 border border-dashed border-white/8 rounded-xl">
            <span className="text-3xl block mb-2">f</span>
            <p className="font-medium">Sin páginas configuradas</p>
            <p className="text-sm mt-1">Agrega tu primera página de Facebook con el botón de arriba.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {fbAccounts.map(acc => {
              const st = STATUS_CFG[acc.status] || STATUS_CFG.sin_configurar;
              const tr = fbTestResults[acc.id];
              return (
                <div key={acc.id} className={cn('bg-zinc-950/50 border rounded-xl p-5 flex flex-col gap-3 transition-all', acc.activo ? 'border-white/8 hover:border-white/15' : 'border-white/3 opacity-60')}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', st.dot)} />
                        <p className="text-sm font-semibold text-zinc-100 truncate">{acc.nombre}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{acc.pageName || (acc.pageId ? `ID: ${acc.pageId.slice(0,8)}…` : 'Sin Page ID')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', st.cls)}>{st.label}</span>
                      <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider', FB_TIPO_COLORS[acc.tipo])}>{FB_TIPO_LABELS[acc.tipo]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full', acc.pageId ? 'bg-emerald-500' : 'bg-zinc-600')} />
                    <span className={acc.pageId ? 'text-zinc-400' : 'text-zinc-600'}>Page ID {acc.pageId ? '✓' : '—'}</span>
                    <span className={cn('w-1.5 h-1.5 rounded-full ml-2', acc.accessToken ? 'bg-emerald-500' : 'bg-zinc-600')} />
                    <span className={acc.accessToken ? 'text-zinc-400' : 'text-zinc-600'}>Token {acc.accessToken ? `(${acc.accessToken})` : '—'}</span>
                  </div>
                  {tr && (
                    <p className={cn('text-[11px] font-medium px-2 py-1 rounded-lg', tr.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300')}>
                      {tr.msg}
                    </p>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => { setFbEditing(acc); setShowFbModal(true); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 transition-colors border border-white/5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Configurar
                    </button>
                    <button
                      onClick={() => testFbAccount(acc.id)}
                      disabled={fbTesting === acc.id || !acc.pageId || !acc.accessToken}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600/80 hover:bg-blue-600 transition-colors disabled:opacity-40 border border-blue-500/30"
                    >
                      {fbTesting === acc.id
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Probando…</>
                        : <><Zap className="w-3.5 h-3.5" /> Probar</>
                      }
                    </button>
                    <button
                      onClick={() => delFb(acc.id, acc.nombre)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Setup guide FB */}
        <div className="bg-zinc-950/30 border border-white/5 rounded-xl p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Guía — Facebook Pages</p>
          <ol className="space-y-1.5 text-xs text-zinc-400 list-decimal list-inside">
            <li>Ve a <span className="text-blue-400 font-mono">developers.facebook.com</span> → tu app → Facebook Login → OAuth</li>
            <li>Obtén el <span className="text-zinc-200 font-semibold">Page ID</span> desde la configuración de tu página de Facebook</li>
            <li>Genera un <span className="text-zinc-200 font-semibold">Page Access Token permanente</span> desde Business Manager → System Users con permiso <span className="font-mono text-zinc-300">pages_messaging</span></li>
            <li>Pega Page ID + Token en el modal de configuración</li>
            <li>Presiona <span className="text-zinc-200 font-semibold">Probar</span> para verificar la conexión</li>
          </ol>
        </div>
      </div>

      {/* ── SECCIÓN WHATSAPP QR ──────────────────────── */}
      <div className="border-t border-white/5 pt-6 space-y-5">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h3 className="text-zinc-100 font-bold text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center text-white text-[11px]">✓</span>
              WhatsApp QR — Personal y Business
            </h3>
            <p className="text-zinc-500 text-sm mt-1">Conecta números de WhatsApp escaneando el código QR.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadWqr} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-950/50 border border-white/5 rounded-xl transition-colors">
              <RefreshCw className={cn('w-4 h-4', wqrLoading && 'animate-spin')} />
            </button>
            <button onClick={() => setShowNewWqr(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
              <Plus className="w-4 h-4" /> Nueva sesión QR
            </button>
          </div>
        </div>

        {/* New session inline form */}
        {showNewWqr && (
          <div className="bg-zinc-950/60 border border-emerald-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Nueva sesión WhatsApp QR</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Nombre</label>
                <input value={newWqrForm.nombre} onChange={e => setNewWqrForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej. Ventas Norte" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Tipo</label>
                <select value={newWqrForm.tipo} onChange={e => setNewWqrForm(p => ({ ...p, tipo: e.target.value as 'personal'|'business' }))} className={inputCls}>
                  <option value="personal">WhatsApp Personal</option>
                  <option value="business">WhatsApp Business</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewWqr(false)} className="px-4 py-2 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={createWqrSession} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">Crear y generar QR</button>
            </div>
          </div>
        )}

        {wqrLoading ? (
          <div className="text-center py-8 text-zinc-500">Cargando sesiones…</div>
        ) : wqrSessions.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 border border-dashed border-white/8 rounded-xl">
            <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Sin sesiones QR configuradas</p>
            <p className="text-xs mt-1">Agrega una sesión y escanea el QR con tu teléfono.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {wqrSessions.map(s => (
              <div key={s.id} className="bg-zinc-950/50 border border-white/8 rounded-xl p-4 flex flex-col gap-3 hover:border-white/15 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider text-white', s.tipo === 'personal' ? 'bg-emerald-600' : 'bg-teal-600')}>
                        {s.tipo === 'personal' ? 'Personal' : 'Business'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-100 mt-1 truncate">{s.nombre}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{s.phoneNumber || 'Sin número'}</p>
                  </div>
                  <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0', s.phoneNumber ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                    {s.phoneNumber ? 'Conectado' : 'Sin conectar'}
                  </span>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => setWqrModal(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600/80 hover:bg-emerald-600 transition-colors border border-emerald-500/30">
                    <Smartphone className="w-3.5 h-3.5" /> {s.phoneNumber ? 'Reconectar' : 'Conectar QR'}
                  </button>
                  <button onClick={() => delWqr(s.id, s.nombre)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECCIÓN TELEGRAM ─────────────────────────── */}
      <div className="border-t border-white/5 pt-6 space-y-5">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h3 className="text-zinc-100 font-bold text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#229ED9] flex items-center justify-center text-white text-[11px] font-black">✈</span>
              Bots de Telegram
            </h3>
            <p className="text-zinc-500 text-sm mt-1">Conecta bots de Telegram con token de @BotFather.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadTg} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-950/50 border border-white/5 rounded-xl transition-colors">
              <RefreshCw className={cn('w-4 h-4', tgLoading && 'animate-spin')} />
            </button>
            <button onClick={() => { setTgEditing(null); setShowTgModal(true); }} className="text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg" style={{ background: '#229ED9' }}>
              <Plus className="w-4 h-4" /> Nuevo bot
            </button>
          </div>
        </div>

        {tgLoading ? (
          <div className="text-center py-8 text-zinc-500">Cargando bots…</div>
        ) : tgBots.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 border border-dashed border-white/8 rounded-xl">
            <span className="text-3xl block mb-2 opacity-50">✈</span>
            <p className="text-sm font-medium">Sin bots configurados</p>
            <p className="text-xs mt-1">Crea un bot en @BotFather y pega el token aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tgBots.map(bot => {
              const st = STATUS_CFG[bot.status] || STATUS_CFG.sin_configurar;
              const tr = tgTestResults[bot.id];
              return (
                <div key={bot.id} className={cn('bg-zinc-950/50 border rounded-xl p-5 flex flex-col gap-3 transition-all', bot.activo ? 'border-white/8 hover:border-white/15' : 'border-white/3 opacity-60')}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', st.dot)} />
                        <p className="text-sm font-semibold text-zinc-100 truncate">{bot.nombre}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{bot.botUsername ? `@${bot.botUsername}` : 'Sin verificar'}</p>
                    </div>
                    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0', st.cls)}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={cn('w-1.5 h-1.5 rounded-full', bot.token ? 'bg-emerald-500' : 'bg-zinc-600')} />
                    <span className={bot.token ? 'text-zinc-400' : 'text-zinc-600'}>Token {bot.token ? `(${bot.token})` : '—'}</span>
                  </div>
                  {tr && <p className={cn('text-[11px] font-medium px-2 py-1 rounded-lg', tr.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300')}>{tr.msg}</p>}
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => { setTgEditing(bot); setShowTgModal(true); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 transition-colors border border-white/5">
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button onClick={() => testTgBot(bot.id)} disabled={tgTesting === bot.id || !bot.token} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-40 border" style={{ background: '#229ED9aa', borderColor: '#229ED930' }}>
                      {tgTesting === bot.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Probando…</> : <><Zap className="w-3.5 h-3.5" /> Probar</>}
                    </button>
                    <button onClick={() => delTg(bot.id, bot.nombre)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      {showModal && (
        <WAAccountModal
          account={editing}
          onClose={() => setShowModal(false)}
          onSaved={saved => {
            if (editing) setAccounts(prev => prev.map(a => a.id === saved.id ? saved : a));
            else setAccounts(prev => [...prev, saved]);
            setShowModal(false);
            notify(editing ? 'Cuenta actualizada' : 'Cuenta creada');
          }}
        />
      )}

      {showFbModal && (
        <FBAccountModal
          account={fbEditing}
          onClose={() => setShowFbModal(false)}
          onSaved={saved => {
            if (fbEditing) setFbAccounts(prev => prev.map(a => a.id === saved.id ? saved : a));
            else setFbAccounts(prev => [...prev, saved]);
            setShowFbModal(false);
            notify(fbEditing ? 'Página actualizada' : 'Página creada');
          }}
        />
      )}

      {wqrModal && (
        <WAQRModal
          session={wqrModal}
          onClose={() => setWqrModal(null)}
          onConnected={phone => {
            setWqrSessions(prev => prev.map(s => s.id === wqrModal.id ? { ...s, phoneNumber: phone } : s));
            notify(`✅ Conectado: ${phone}`);
          }}
        />
      )}

      {showTgModal && (
        <TelegramBotModal
          bot={tgEditing}
          onClose={() => setShowTgModal(false)}
          onSaved={saved => {
            if (tgEditing) setTgBots(prev => prev.map(b => b.id === saved.id ? saved : b));
            else setTgBots(prev => [...prev, saved]);
            setShowTgModal(false);
            notify(tgEditing ? 'Bot actualizado' : 'Bot agregado');
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TAB — BASE DE CONOCIMIENTO IA
═══════════════════════════════════════════ */

type KBDoc = {
  id: string; filename: string; category: string; mimetype: string;
  size: number; tokens: number; status: 'processing'|'ready'|'error';
  errorMsg?: string; uploadedBy: string; uploadedAt: string;
  description?: string; chunksCount: number;
};

type KBStats = {
  total: number; ready: number; processing: number; error: number;
  totalTokens: number; totalChunks: number; categories: string[];
};

const KB_CATEGORIES = [
  'Ventas','Productos','Contratos','RRHH','Legal',
  'FAQ','Técnico','Marketing','Operaciones','General',
];

const MIME_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'text/plain': '📝',
  'text/csv': '📊',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'application/msword': '📘',
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
  'image/webp': '🖼️',
  'application/json': '🔧',
  'text/html': '🌐',
};
const mimeIcon = (m: string) => MIME_ICON[m] || '📎';

const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/1024/1024).toFixed(1)} MB`;
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }); } catch { return iso; } };

function StatusBadge({ status, error }: { status: KBDoc['status']; error?: string }) {
  if (status === 'ready')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3"/>Listo</span>;
  if (status === 'processing')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold"><Loader2 className="w-3 h-3 animate-spin"/>Procesando</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold" title={error}>
      <XCircle className="w-3 h-3"/>Error
    </span>
  );
}

function KnowledgeBaseTab() {
  const [docs, setDocs]             = useState<KBDoc[]>([]);
  const [stats, setStats]           = useState<KBStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [toast, setToast]           = useState('');
  const [activePane, setActivePane] = useState<'library'|'upload'|'test'>('library');

  // Upload state
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [uploadCat, setUploadCat]       = useState('General');
  const [uploadDesc, setUploadDesc]     = useState('');
  const [uploading, setUploading]       = useState(false);
  const [dragOver, setDragOver]         = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // Test pane
  const [testQ, setTestQ]               = useState('');
  const [testAnswer, setTestAnswer]     = useState('');
  const [testChunks, setTestChunks]     = useState<string[]>([]);
  const [testing, setTesting]           = useState(false);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3200); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dr, sr] = await Promise.all([
        fetch('/api/knowledge'),
        fetch('/api/knowledge/stats'),
      ]);
      setDocs(await dr.json());
      setStats(await sr.json());
    } catch { notify('Error cargando la base de conocimiento'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh while any doc is processing
  useEffect(() => {
    const hasPending = docs.some(d => d.status === 'processing');
    if (!hasPending) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [docs, load]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          resolve(result.split(',')[1] || result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });

      const resp = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.name,
          mimetype: uploadFile.type || 'text/plain',
          size: uploadFile.size,
          category: uploadCat,
          description: uploadDesc,
          base64Content: base64,
          uploadedBy: 'admin',
        }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.error); }
      notify(`✅ "${uploadFile.name}" enviado para procesar`);
      setUploadFile(null); setUploadDesc('');
      setActivePane('library');
      await load();
    } catch (e: any) {
      notify(`❌ ${e.message}`);
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      notify('Documento eliminado');
      await load();
    } catch { notify('Error al eliminar'); }
  };

  const handleCatChange = async (id: string, cat: string) => {
    await fetch(`/api/knowledge/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat }),
    });
    setDocs(prev => prev.map(d => d.id === id ? { ...d, category: cat } : d));
  };

  const handleTest = async () => {
    if (!testQ.trim()) return;
    setTesting(true); setTestAnswer(''); setTestChunks([]);
    try {
      const r = await fetch('/api/knowledge/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: testQ }),
      });
      const data = await r.json() as { answer: string; chunks: string[] };
      setTestAnswer(data.answer);
      setTestChunks(data.chunks || []);
    } catch { setTestAnswer('Error al consultar la IA'); }
    finally { setTesting(false); }
  };

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.filename.toLowerCase().includes(search.toLowerCase()) || (d.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat    = !catFilter || d.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header + Stats */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Base de Conocimiento IA</h2>
              <p className="text-xs text-zinc-500">Sube documentos y la IA aprenderá automáticamente de ellos</p>
            </div>
          </div>
        </div>
        {stats && (
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Documentos', value: stats.total, icon: Database, color: 'text-violet-400' },
              { label: 'Listos',     value: stats.ready, icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Fragmentos', value: stats.totalChunks.toLocaleString(), icon: Layers, color: 'text-blue-400' },
              { label: 'Tokens',     value: stats.totalTokens > 1000 ? `${(stats.totalTokens/1000).toFixed(1)}k` : stats.totalTokens, icon: Zap, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/3 border border-white/5">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <div>
                  <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pane switcher */}
      <div className="flex gap-2 p-1 bg-zinc-950/40 border border-white/5 rounded-xl w-fit">
        {([
          { id: 'library', label: 'Biblioteca', icon: BookOpen },
          { id: 'upload',  label: 'Subir Archivo', icon: CloudUpload },
          { id: 'test',    label: 'Probar IA', icon: MessageSquare },
        ] as { id: typeof activePane; label: string; icon: React.ElementType }[]).map(p => (
          <button key={p.id} onClick={() => setActivePane(p.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all',
              activePane === p.id
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            )}
          >
            <p.icon className="w-3.5 h-3.5" />{p.label}
          </button>
        ))}
      </div>

      {/* ── LIBRARY PANE ── */}
      {activePane === 'library' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documento…"
                className="w-full pl-9 pr-4 py-2 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500/50">
              <option value="">Todas las categorías</option>
              {KB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={load} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" title="Actualizar">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 gap-3">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando documentos…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-3">
              <Database className="w-10 h-10 opacity-30" />
              <p className="text-sm">{docs.length === 0 ? 'Aún no hay documentos. ¡Sube el primero!' : 'Sin resultados para este filtro.'}</p>
              {docs.length === 0 && (
                <button onClick={() => setActivePane('upload')}
                  className="mt-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20">
                  Subir primer documento
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-all group">
                  <span className="text-2xl flex-shrink-0">{mimeIcon(doc.mimetype)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-100 truncate max-w-[280px]">{doc.filename}</span>
                      <StatusBadge status={doc.status} error={doc.errorMsg} />
                    </div>
                    {doc.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{doc.description}</p>}
                    <div className="flex gap-3 mt-1 flex-wrap">
                      <span className="text-[11px] text-zinc-600 flex items-center gap-1"><Clock className="w-3 h-3"/>{fmtDate(doc.uploadedAt)}</span>
                      <span className="text-[11px] text-zinc-600">{fmtSize(doc.size)}</span>
                      {doc.status === 'ready' && (
                        <>
                          <span className="text-[11px] text-violet-500 flex items-center gap-1"><Layers className="w-3 h-3"/>{doc.chunksCount} fragmentos</span>
                          <span className="text-[11px] text-amber-600 flex items-center gap-1"><Zap className="w-3 h-3"/>~{doc.tokens > 1000 ? `${(doc.tokens/1000).toFixed(1)}k` : doc.tokens} tokens</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={doc.category}
                      onChange={e => handleCatChange(doc.id, e.target.value)}
                      className="px-2 py-1 text-[11px] bg-zinc-900/80 border border-white/8 rounded-lg text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    >
                      {KB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => handleDelete(doc.id, doc.filename)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD PANE ── */}
      {activePane === 'upload' && (
        <div className="max-w-xl space-y-5">
          <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2"><CloudUpload className="w-4 h-4 text-violet-400"/>Subir nuevo documento</h3>
          <p className="text-xs text-zinc-500 -mt-2">
            Soporta PDF, Word, Excel, imágenes, TXT, CSV, JSON, HTML y más.
            La IA extraerá el contenido automáticamente y lo fragmentará para búsqueda semántica.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all',
              dragOver ? 'border-violet-500 bg-violet-500/8' : uploadFile ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/2'
            )}
          >
            <input ref={fileInputRef} type="file" className="hidden"
              accept=".pdf,.txt,.csv,.json,.html,.md,.docx,.doc,.png,.jpg,.jpeg,.webp,.xlsx,.xls"
              onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }} />
            {uploadFile ? (
              <>
                <span className="text-4xl">{mimeIcon(uploadFile.type)}</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-100">{uploadFile.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">{fmtSize(uploadFile.size)}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setUploadFile(null); }}
                  className="text-xs text-red-400 hover:text-red-300 underline">Quitar archivo</button>
              </>
            ) : (
              <>
                <CloudUpload className={cn('w-10 h-10 transition-colors', dragOver ? 'text-violet-400' : 'text-zinc-600')} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-400">Arrastra tu archivo aquí</p>
                  <p className="text-xs text-zinc-600 mt-0.5">o haz clic para seleccionar</p>
                </div>
                <p className="text-[11px] text-zinc-700 text-center">PDF · Word · Excel · TXT · CSV · JSON · Imágenes</p>
              </>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Categoría</label>
              <select value={uploadCat} onChange={e => setUploadCat(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50">
                {KB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Descripción <span className="text-zinc-700 normal-case font-normal">(opcional)</span></label>
              <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                placeholder="Ej: Manual de ventas Q1 2026, Política de devoluciones…"
                className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15 space-y-1.5">
            <p className="text-xs font-semibold text-violet-400 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5"/>Cómo funciona</p>
            <ul className="text-[11px] text-zinc-500 space-y-1 list-none pl-0">
              <li className="flex items-start gap-1.5"><span className="text-violet-600 mt-0.5">1.</span>El texto se extrae automáticamente con Gemini Vision</li>
              <li className="flex items-start gap-1.5"><span className="text-violet-600 mt-0.5">2.</span>Se divide en fragmentos semánticos de ~500 tokens</li>
              <li className="flex items-start gap-1.5"><span className="text-violet-600 mt-0.5">3.</span>El asistente IA inyecta los fragmentos relevantes en cada respuesta</li>
              <li className="flex items-start gap-1.5"><span className="text-violet-600 mt-0.5">4.</span>Puedes verificar el aprendizaje en la pestaña "Probar IA"</li>
            </ul>
          </div>

          <button onClick={handleUpload} disabled={!uploadFile || uploading}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all',
              uploadFile && !uploading
                ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                : 'bg-white/5 text-zinc-600 cursor-not-allowed'
            )}
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin"/>Procesando…</> : <><CloudUpload className="w-4 h-4"/>Subir y Entrenar IA</>}
          </button>
        </div>
      )}

      {/* ── TEST PANE ── */}
      {activePane === 'test' && (
        <div className="max-w-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Probar la IA con tu base de conocimiento</h3>
              <p className="text-xs text-zinc-500">Formula una pregunta y verás qué fragmentos usó la IA para responder</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input value={testQ} onChange={e => setTestQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleTest()}
              placeholder="Ej: ¿Cuál es la política de cancelación de contratos?"
              className="flex-1 px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
            <button onClick={handleTest} disabled={!testQ.trim() || testing}
              className={cn(
                'px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all',
                testQ.trim() && !testing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-white/5 text-zinc-600 cursor-not-allowed'
              )}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
            </button>
          </div>

          {testAnswer && (
            <div className="space-y-4">
              {/* Respuesta */}
              <div className="p-5 rounded-2xl bg-white/3 border border-white/8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5"/>Respuesta de la IA</p>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{testAnswer}</p>
              </div>

              {/* Fragmentos usados */}
              {testChunks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5"><Layers className="w-3 h-3"/>Fragmentos recuperados ({testChunks.length})</p>
                  <div className="space-y-2">
                    {testChunks.map((chunk, i) => (
                      <div key={i} className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                        <span className="text-[10px] text-violet-500 font-bold">Fragmento {i+1}</span>
                        <p className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap leading-relaxed line-clamp-4">{chunk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testChunks.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-400">No se encontraron fragmentos relevantes. Sube más documentos o reformula la pregunta.</p>
                </div>
              )}
            </div>
          )}

          {!testAnswer && !testing && (
            <div className="p-5 rounded-2xl bg-white/2 border border-white/5 space-y-3">
              <p className="text-xs font-semibold text-zinc-400">Ejemplos de preguntas:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  '¿Cuáles son los planes disponibles?',
                  '¿Cómo cancelo un contrato?',
                  '¿Cuál es la política de portabilidad?',
                  '¿Qué beneficios tiene el plan Premium?',
                ].map(q => (
                  <button key={q} onClick={() => setTestQ(q)}
                    className="px-3 py-1.5 rounded-lg bg-white/4 border border-white/8 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/8 transition-all text-left">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl text-sm text-zinc-100 z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const inputCls = "w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
