import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

type NotifTipo = 'info' | 'warning' | 'error' | 'success';
interface Notif {
  id: string; tipo: NotifTipo; titulo: string; mensaje: string;
  modulo: string; leida: boolean; createdAt: string;
}

const TIPO_CFG: Record<NotifTipo, { icon: React.ElementType; color: string; bg: string }> = {
  info:    { icon: Info,          color: 'text-blue-400',    bg: 'bg-blue-500/10'   },
  warning: { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/10'  },
  error:   { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-500/10'    },
  success: { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10'},
};

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `Hace ${diff}s`;
  if (diff < 3600)  return `Hace ${Math.floor(diff/60)}m`;
  if (diff < 86400) return `Hace ${Math.floor(diff/3600)}h`;
  return new Date(iso).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});
};

interface Props { role?: string }

export default function NotificationBell({ role }: Props) {
  const [open, setOpen]               = useState(false);
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sseOk, setSseOk]             = useState(false);
  const panelRef                      = useRef<HTMLDivElement>(null);
  const esRef                         = useRef<EventSource | null>(null);

  /* ── Full load (REST) ──────────────��──────────────────────── */
  const loadAll = useCallback(async () => {
    try {
      const r = await fetch(`/api/notifications?rol=${role || ''}`);
      if (!r.ok) return;
      const data: Notif[] = await r.json();
      const safe = Array.isArray(data) ? data : [];
      setNotifs(safe);
      setUnreadCount(safe.filter(n => !n.leida).length);
    } catch { /* silent */ }
  }, [role]);

  /* ── SSE real-time connection ─────────────────────────────── */
  useEffect(() => {
    loadAll(); // initial full fetch

    const url = `/api/notifications/stream?rol=${role || ''}`;
    const es   = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setSseOk(true);

    es.onmessage = (e) => {
      if (!e.data || e.data.trim() === '') return;
      try {
        const notif: Notif = JSON.parse(e.data);
        setNotifs(prev => {
          if (prev.some(n => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });
        if (!notif.leida) setUnreadCount(c => c + 1);
      } catch { /* malformed */ }
    };

    es.onerror = () => {
      setSseOk(false);
      es.close();
    };

    return () => { es.close(); };
  }, [role, loadAll]);

  /* ── Polling fallback when SSE is down ──────────────────── */
  useEffect(() => {
    if (sseOk) return; // SSE active — no poll needed
    const t = setInterval(loadAll, 30_000);
    return () => clearInterval(t);
  }, [sseOk, loadAll]);

  /* ── Close panel on outside click ───────────────────────── */
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  /* ── Actions ──────────────��──────────────────────────────── */
  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rol: role }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) loadAll(); }}
        className={cn(
          'relative w-9 h-9 rounded-xl flex items-center justify-center transition-all',
          open ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
        )}
      >
        <Bell className="w-4 h-4" />
        {/* SSE live indicator */}
        {sseOk && (
          <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" title="Tiempo real activo" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-bold text-zinc-200">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full">{unreadCount}</span>
              )}
              {sseOk && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-bold text-emerald-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />LIVE
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-blue-400 transition-colors font-semibold">
                <CheckCheck className="w-3 h-3" />Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-600">
                <Bell className="w-8 h-8 opacity-20" />
                <p className="text-xs">Sin notificaciones</p>
              </div>
            ) : notifs.map(n => {
              const cfg  = TIPO_CFG[n.tipo] || TIPO_CFG.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.leida && markRead(n.id)}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b border-white/5 transition-all cursor-pointer group',
                    n.leida ? 'opacity-60' : 'hover:bg-white/3',
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-xs font-semibold leading-tight', n.leida ? 'text-zinc-500' : 'text-zinc-100')}>{n.titulo}</p>
                      {!n.leida && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1 shadow-[0_0_6px_rgba(59,130,246,0.7)]" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-600">{timeAgo(n.createdAt)}</span>
                      <span className="text-[10px] text-zinc-700">·</span>
                      <span className="text-[10px] text-zinc-600 capitalize">{n.modulo}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/8">
              <p className="text-[10px] text-zinc-600 text-center">
                {notifs.length} notificaciones · {sseOk ? '🟢 Tiempo real' : '🔵 Actualizando cada 30s'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
