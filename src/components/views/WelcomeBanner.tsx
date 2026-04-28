import React, { useEffect, useState } from 'react';
import {
  Sun, Sunset, Moon, AlertTriangle,
  ArrowRight, RefreshCw,
  ShoppingCart, UserX, Headphones, TrendingUp, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Role } from '../../App';

interface WelcomeBannerProps {
  role: Role;
  onNavigate: (section: string) => void;
}

interface LiveStats {
  ventasHoy: number;
  ventasMes: number;
  morosos: number;
  ticketsCriticos: number;
  candidatosActivos: number;
}

const ROLE_LABELS: Record<Role, string> = {
  GERENTE:       'Gerente',
  ADMINISTRACION:'Administración',
  SUPERVISOR:    'Supervisor',
  VENDEDOR:      'Vendedor',
  RECLUTADORA:   'Reclutadora',
  SEGUIMIENTO:   'Seguimiento',
};

const ROLE_GRADIENT: Record<Role, string> = {
  GERENTE:       'from-blue-600 via-indigo-600 to-violet-700',
  ADMINISTRACION:'from-indigo-600 via-purple-600 to-fuchsia-700',
  SUPERVISOR:    'from-emerald-600 via-teal-600 to-cyan-700',
  VENDEDOR:      'from-amber-500 via-orange-600 to-red-600',
  RECLUTADORA:   'from-pink-600 via-rose-600 to-red-600',
  SEGUIMIENTO:   'from-cyan-600 via-sky-600 to-blue-700',
};

function getGreeting(): { text: string; Icon: React.FC<any> } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: 'Buenos días',   Icon: Sun    };
  if (h >= 12 && h < 19) return { text: 'Buenas tardes', Icon: Sunset };
  return                        { text: 'Buenas noches', Icon: Moon   };
}

function StatChip({
  label, value, color = 'blue', onClick, icon: Icon, trend, trendUp = true,
}: { label: string; value: string | number; color?: string; onClick?: () => void; icon?: React.FC<any>; trend?: string; trendUp?: boolean }) {
  const variant: Record<string, string> = {
    blue:   'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-500/40',
    emerald:'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40',
    red:    'bg-red-500/10 border-red-500/20 text-red-400 hover:border-red-500/40',
    amber:  'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:border-amber-500/40',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:border-purple-500/40',
    slate:  'bg-slate-500/10 border-slate-500/20 text-slate-400 hover:border-slate-500/40',
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-1.5 px-4 py-3 rounded-xl border transition-all ${variant[color] ?? variant.blue} ${onClick ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between w-full gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 opacity-70 shrink-0" />}
        {trend && (
          <span className={`flex items-center gap-0.5 text-[8px] font-black ml-auto ${trendUp ? 'text-emerald-300' : 'text-red-300'}`}>
            {trendUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {trend}
          </span>
        )}
      </div>
      <span className="text-lg font-black leading-none">{value}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</span>
    </button>
  );
}

export default function WelcomeBanner({ role, onNavigate }: WelcomeBannerProps) {
  const [stats, setStats]       = useState<LiveStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [spin, setSpin]         = useState(false);

  const fetchStats = async () => {
    try {
      // Token lives in localStorage under hdreams_user.sessionToken (same as api.ts)
      const token = JSON.parse(localStorage.getItem('hdreams_user') || '{}')?.sessionToken || '';
      const r = await fetch('/api/dashboard/executive', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('no-auth');
      // API returns nested shape: { ventas:{hoy,mes}, facturacion:{ingresoMes}, ... }
      const d = await r.json();
      setStats({
        ventasHoy:           d.ventas?.hoy               ?? 0,
        ventasMes:           d.ventas?.mes               ?? 0,
        morosos:             d.clientes?.morosos          ?? 0,
        ticketsCriticos:     d.tickets?.criticos          ?? 0,
        candidatosActivos:   d.reclutamiento?.activos     ?? 0,
      });
      setLastSync(new Date());
    } catch {
      // no-auth or network error — show placeholder zeros gracefully
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleRefresh = async () => {
    setSpin(true);
    setLoading(true);
    await fetchStats();
    setTimeout(() => setSpin(false), 600);
  };

  const { text: greeting, Icon: GreetIcon } = getGreeting();
  const gradient = ROLE_GRADIENT[role];

  // Quick-action shortcuts depending on role
  const shortcuts: { label: string; section: string; color: string }[] = [];
  if (role === 'GERENTE' || role === 'ADMINISTRACION') {
    shortcuts.push(
      { label: 'Reportes',        section: 'Reportes',       color: 'blue'    },
      { label: 'Sales CRM',       section: 'Sales CRM',      color: 'emerald' },
      { label: 'Morosidad',       section: 'Morosidad',      color: 'red'     },
      { label: 'Audit Log',       section: 'Audit Log',      color: 'purple'  },
    );
  } else if (role === 'SUPERVISOR') {
    shortcuts.push(
      { label: 'Mi Equipo',     section: 'Consulta y Seguimiento', color: 'emerald' },
      { label: 'Capturar Venta',section: 'Captura y Validación',   color: 'blue'    },
    );
  } else if (role === 'VENDEDOR') {
    shortcuts.push(
      { label: 'Nueva Venta',   section: 'Captura y Validación', color: 'blue'   },
      { label: 'Seguimiento',   section: 'Consulta y Seguimiento', color: 'emerald' },
    );
  } else if (role === 'RECLUTADORA') {
    shortcuts.push({ label: 'Reclutamiento', section: 'Reclutamiento', color: 'purple' });
  }

  const syncLabel = lastSync.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} shadow-2xl`}>
      {/* Decorative blobs */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 p-6 md:p-8">
        {/* Top row: greeting + refresh */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20">
              <GreetIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold tracking-widest uppercase">
                {greeting}
              </p>
              <h2 className="text-white text-2xl font-black leading-tight">
                {ROLE_LABELS[role]}
                {role === 'GERENTE' && (
                  <span className="ml-2 text-sm font-bold text-white/50">Edgar</span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleRefresh}
              title="Actualizar estadísticas"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white/80 ${spin ? 'animate-spin' : ''}`} />
            </button>
            <span className="text-[9px] text-white/40 font-mono">sync {syncLabel}</span>
          </div>
        </div>

        {/* Live stats chips */}
        {(role === 'GERENTE' || role === 'ADMINISTRACION') && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/10 animate-pulse" />
              ))
            ) : stats ? (
              <>
                <StatChip
                  label="Ventas hoy"
                  value={stats.ventasHoy}
                  color="emerald"
                  icon={ShoppingCart}
                  trend="+3% vs ayer"
                  trendUp
                  onClick={() => onNavigate('Sales CRM')}
                />
                <StatChip
                  label="Ventas mes"
                  value={stats.ventasMes}
                  color="blue"
                  icon={TrendingUp}
                  trend="+7% vs mes ant."
                  trendUp
                  onClick={() => onNavigate('Sales CRM')}
                />
                <StatChip
                  label="Morosos"
                  value={stats.morosos}
                  color={stats.morosos > 10 ? 'red' : 'amber'}
                  icon={UserX}
                  trend="-2% vs ayer"
                  trendUp={false}
                  onClick={() => onNavigate('Morosidad')}
                />
                <StatChip
                  label="Tickets críticos"
                  value={stats.ticketsCriticos}
                  color={stats.ticketsCriticos > 5 ? 'red' : 'slate'}
                  icon={Headphones}
                  trend="+1 vs ayer"
                  trendUp={false}
                  onClick={() => onNavigate('Soporte a Clientes')}
                />
              </>
            ) : (
              <div className="col-span-4 text-white/40 text-xs font-semibold">
                Stats no disponibles (permisos insuficientes)
              </div>
            )}
          </div>
        )}

        {/* Alerts strip */}
        {stats && (stats.ticketsCriticos > 5 || stats.morosos > 15) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.ticketsCriticos > 5 && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {stats.ticketsCriticos} tickets críticos abiertos
              </span>
            )}
            {stats.morosos > 15 && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {stats.morosos} clientes morosos
              </span>
            )}
          </div>
        )}

        {/* Quick-action shortcuts */}
        {shortcuts.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {shortcuts.map(s => (
              <button
                key={s.section}
                onClick={() => onNavigate(s.section)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02] active:scale-100"
              >
                {s.label}
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
