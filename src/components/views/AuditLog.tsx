import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, RefreshCw, Download, User, Clock, Filter, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface AuditEntry {
  id: string;
  usuario_uid: string;
  usuario_email: string;
  accion: string;
  modulo: string;
  detalles?: any;
  ts: string;
}

const MODULO_COLORS: Record<string, string> = {
  auth:        'bg-blue-500/15 text-blue-400 border-blue-500/25',
  contratos:   'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  facturas:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  inventario:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  nomina:      'bg-purple-500/15 text-purple-400 border-purple-500/25',
  seguimiento: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  ventas:      'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  seguridad:   'bg-red-500/15 text-red-300 border-red-500/30',
  wa_accounts: 'bg-teal-500/15 text-teal-300 border-teal-500/25',
  admin:       'bg-zinc-500/15 text-zinc-300 border-zinc-500/25',
};

const ACCION_COLORS: Record<string, string> = {
  crear_venta            : 'text-emerald-400',
  crear                  : 'text-emerald-400',
  editar_datos_bancarios : 'text-red-400',
  editar                 : 'text-blue-400',
  eliminar               : 'text-red-400',
  login                  : 'text-cyan-400',
  logout                 : 'text-zinc-400',
  autorizar_pago_nomina  : 'text-emerald-400',
  autorizar              : 'text-emerald-400',
  aprobar                : 'text-emerald-400',
  rechazar               : 'text-red-400',
  solicitar_adelanto     : 'text-amber-400',
  bloqueo_morosidad      : 'text-red-400',
  pagar                  : 'text-emerald-400',
  exportar               : 'text-amber-400',
};

const MODULOS = ['', 'auth', 'ventas', 'nomina', 'seguridad', 'seguimiento', 'contratos', 'facturas', 'inventario', 'wa_accounts', 'admin'];

/** Formato CDMX (America/Mexico_City) — 24h, fecha + hora exacta. */
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      timeZone: 'America/Mexico_City',
    }) + ' CDMX';
  } catch { return iso; }
};

/** Extrae el mensaje legible de detalles, con fallback al JSON. */
const detalleMensaje = (d: any): string => {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (typeof d.mensaje === 'string') return d.mensaje;
  return JSON.stringify(d);
};

const accionColor = (accion: string) => {
  const key = Object.keys(ACCION_COLORS).find(k => accion.toLowerCase().includes(k));
  return key ? ACCION_COLORS[key] : 'text-zinc-400';
};

export default function AuditLog() {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const allowed = role === 'GERENTE' || role === 'ADMINISTRACION';

  const [entries, setEntries]   = useState<AuditEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modulo, setModulo]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [total, setTotal]       = useState(0);

  // Defensa en profundidad: aunque el sidebar oculte la opcion, si alguien
  // navega manualmente bloqueamos el render.
  if (!allowed) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-3">
          <Lock className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-red-300">Acceso Restringido</h2>
            <p className="text-sm text-red-200/80 mt-1">
              El Audit Log es visible unicamente para Gerencia y Administracion.
              Si crees que esto es un error, contacta al area de sistemas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (modulo) params.set('modulo', modulo);
      const r = await fetch(`/api/audit?${params}`, {
        headers: user?.sessionToken ? { Authorization: `Bearer ${user.sessionToken}` } : {},
      });
      if (!r.ok) { setEntries([]); return; }
      const data: AuditEntry[] = await r.json();
      const safe = Array.isArray(data) ? data : [];
      setEntries(safe);
      setTotal(safe.length);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  }, [modulo, user?.sessionToken]);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.usuario_email.toLowerCase().includes(q) ||
      e.accion.toLowerCase().includes(q) ||
      e.modulo.toLowerCase().includes(q) ||
      detalleMensaje(e.detalles).toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Usuario', 'Email', 'Acción', 'Módulo', 'Detalles'];
    const rows = filtered.map(e => [
      e.id, e.ts, e.usuario_uid, e.usuario_email, e.accion, e.modulo,
      e.detalles ? JSON.stringify(e.detalles).replace(/"/g, '""') : '',
    ].map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Audit Log</h1>
          </div>
          <p className="text-zinc-500 text-sm">Registro inmutable de todas las acciones del sistema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8 text-zinc-400 hover:text-white text-sm transition-all">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />Actualizar
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8 text-zinc-400 hover:text-white text-sm transition-all">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Entradas totales', value: total, color: 'text-zinc-200' },
          { label: 'Filtradas', value: filtered.length, color: 'text-blue-400' },
          { label: 'Módulos', value: new Set(entries.map(e => e.modulo)).size, color: 'text-cyan-400' },
          { label: 'Usuarios', value: new Set(entries.map(e => e.usuario_email)).size, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario, acción, módulo…"
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-950/50 border border-white/8 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={modulo} onChange={e => setModulo(e.target.value)}
            className="bg-zinc-950/50 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          >
            {MODULOS.map(m => <option key={m} value={m}>{m || 'Todos los módulos'}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                {['Timestamp', 'Usuario', 'Acción', 'Módulo', 'Detalles'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500 text-sm">Cargando registros…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-600 text-sm">
                  <Shield className="w-8 h-8 opacity-20 mx-auto mb-2" />
                  Sin registros de auditoría
                </td></tr>
              ) : filtered.map(e => (
                <React.Fragment key={e.id}>
                  <tr
                    onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      <Clock className="w-3 h-3 inline mr-1.5 opacity-50" />
                      {fmtDate(e.ts)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          <User className="w-3 h-3 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-zinc-200 truncate max-w-[140px]">{e.usuario_email}</p>
                          <p className="text-[9px] text-zinc-600 font-mono">{e.usuario_uid.slice(0, 12)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-bold', accionColor(e.accion))}>{e.accion}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', MODULO_COLORS[e.modulo] || 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30')}>
                        {e.modulo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-300 max-w-[320px] truncate" title={detalleMensaje(e.detalles)}>
                      {e.detalles ? detalleMensaje(e.detalles).slice(0, 110) : '—'}
                      {e.detalles && typeof e.detalles === 'object' && Object.keys(e.detalles).length > 1 && (
                        <span className="ml-1 text-[9px] text-zinc-600 group-hover:text-blue-400 transition-colors">▼</span>
                      )}
                    </td>
                  </tr>
                  {expanded === e.id && e.detalles && (
                    <tr className="bg-zinc-950/40 border-b border-white/5">
                      <td colSpan={5} className="px-8 py-3">
                        <pre className="text-[10px] text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap bg-black/30 rounded-xl p-3 border border-white/5 max-h-40">
                          {JSON.stringify(e.detalles, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-white/8 flex justify-between items-center">
            <p className="text-[11px] text-zinc-600">
              Mostrando {filtered.length} de {total} entradas
            </p>
            <p className="text-[10px] text-zinc-700 font-mono">Últimas 200 entradas · Auto-trim en 2000</p>
          </div>
        )}
      </div>
    </div>
  );
}
