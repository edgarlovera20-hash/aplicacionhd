import React, { useState, useEffect } from 'react';
import {
  MessageCircle, LogOut, ChevronLeft, Activity, Loader2,
  LayoutDashboard, Users, Zap, BarChart2, Bell,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import Logo from '../ui/Logo';
import NotificationBell from '../ui/NotificationBell';
import ErrorBoundary from '../ui/ErrorBoundary';

const CustomerFollowup = lazy(() => import('./CustomerFollowup'));

const SectionLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin text-cyan-400 opacity-60" />
  </div>
);

interface Props {
  onBack: () => void;
  onClearRole: () => void;
}

export default function SeguimientoView({ onBack, onClearRole }: Props) {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('es-ES', { hour12: false })
  );

  useEffect(() => {
    const t = setInterval(
      () => setTime(new Date().toLocaleTimeString('es-ES', { hour12: false })),
      1000
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen w-full text-slate-50 relative z-10 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-56 glass-card border-r-0 border-white/5 hidden md:flex flex-col m-3 rounded-2xl overflow-hidden relative z-20">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <Logo className="text-[32px]" />
            <div>
              <h1 className="text-base font-display font-black text-white tracking-tighter leading-none">
                HDreams
              </h1>
              <p className="text-[8px] text-cyan-400 font-bold tracking-[0.3em] uppercase">
                Clientes
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
          {/* Module badge */}
          <div className="mb-3 px-3 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-cyan-300 uppercase tracking-widest leading-none">
                  Gestión
                </p>
                <p className="text-[8px] text-cyan-500/70 font-semibold tracking-wide">
                  de Clientes
                </p>
              </div>
            </div>
          </div>

          <p className="px-3 mb-1 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Módulos
          </p>

          {/* These are visual labels only — CustomerFollowup manages its own tabs */}
          {[
            { icon: LayoutDashboard, label: 'Dashboard',        color: 'text-blue-400'    },
            { icon: Users,           label: 'Clientes',         color: 'text-cyan-400'    },
            { icon: Zap,             label: 'Flujos Automáticos', color: 'text-amber-400' },
            { icon: BarChart2,       label: 'Reportes',         color: 'text-emerald-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 text-xs font-semibold"
            >
              <div className="p-1.5 rounded-lg bg-slate-800/80 shrink-0">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <span>{label}</span>
            </div>
          ))}

          {/* Status */}
          <div className="mt-4 px-3 pt-3 border-t border-white/5 space-y-2">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Estado
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="font-bold text-emerald-400">WhatsApp API</span>
              <span className="ml-auto text-slate-600">Activo</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="font-bold text-cyan-400">Flujos Auto</span>
              <span className="ml-auto text-slate-600">7 activos</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-bold text-blue-400">Sync</span>
              <span className="ml-auto font-mono text-slate-500">{time}</span>
            </div>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5 shrink-0">
          <button
            onClick={() => { if (window.confirm('¿Cerrar sesión? Se perderán los cambios no guardados.')) onBack(); }}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            Salir del Sistema
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Header */}
        <header className="h-14 bg-transparent flex items-center justify-between px-5 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={onClearRole}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Módulos</span>
            </button>

            {/* Dept badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                  Gestión de Clientes
                </p>
                <p className="text-[8px] text-cyan-400 font-semibold tracking-wide">
                  WhatsApp · Seguimiento · Cobranza
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="text-right hidden lg:block">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                Status Global
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(0,171,223,0.5)] animate-pulse" />
                <span className="text-[10px] font-bold text-cyan-400 font-mono">
                  LIVE • {time}
                </span>
              </div>
            </div>

            <NotificationBell role="SEGUIMIENTO" />

            <div className="flex items-center gap-2.5 pl-4 border-l border-white/5">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-bold text-white leading-none">SEGUIMIENTO</p>
                <p className="text-[9px] text-slate-500">Conectado</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center border border-white/10">
                  <span className="text-[10px] font-black text-white">CL</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content — CustomerFollowup owns its own tabs */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Suspense fallback={<SectionLoader />}>
            <ErrorBoundary label="Gestión de Clientes">
              <CustomerFollowup />
            </ErrorBoundary>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
