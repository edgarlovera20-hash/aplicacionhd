import React, { useState, useEffect, lazy, Suspense, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, Users, DollarSign, Activity,
  TrendingUp, ArrowUpRight, ArrowDownRight,
  LayoutDashboard,
  Loader2, FileText, Search, X,
  Headphones,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import Logo from '../ui/Logo';
import EnterpriseSidebar from '../ui/EnterpriseSidebar';
import { useAuth } from '../../contexts/AuthContext';

// ── Lazy-loaded sections (reduces initial bundle ~60%) ─────────────────
const Settings             = lazy(() => import('./Settings'));
const Payroll              = lazy(() => import('./Payroll'));
const Announcements        = lazy(() => import('./Announcements'));
const CaptureValidation    = lazy(() => import('./CaptureValidation'));
const Profile              = lazy(() => import('./Profile'));
const ConsultasSeguimiento = lazy(() => import('./ConsultasSeguimiento'));
const Morosidad            = lazy(() => import('./Moroso'));
const TalentCRM            = lazy(() => import('../crm/TalentCRM'));
const SupportCRM           = lazy(() => import('../crm/SupportCRM'));
const SalesCRM             = lazy(() => import('../crm/SalesCRM'));
const InfoAppCharts        = lazy(() => import('../crm/InfoAppCharts'));
const InteractiveCRM       = lazy(() => import('../crm/InteractiveCRM'));

const CustomerFollowup     = lazy(() => import('./CustomerFollowup'));
const ReportsCenter        = lazy(() => import('./ReportsCenter'));
const AuditLog             = lazy(() => import('./AuditLog'));
const AgentsCenter         = lazy(() => import('./AgentsCenter'));
const MessagingHub         = lazy(() => import('./MessagingHub'));
const AutomationStudio     = lazy(() => import('./AutomationStudio'));
const AnalyticsDashboard   = lazy(() => import('./AnalyticsDashboard'));
const LeadPipeline         = lazy(() => import('../crm/LeadPipeline'));

import NotificationBell from '../ui/NotificationBell';
import ErrorBoundary    from '../ui/ErrorBoundary';
import WelcomeBanner    from './WelcomeBanner';

const SectionLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin text-blue-400 opacity-60" />
  </div>
);

import { Role } from '../../App';

interface ManagerViewProps {
  role: Role;
  onBack: () => void;
  onClearRole: () => void;
}

interface DashKPIs {
  ventas:        { hoy: number; mes: number; total: number };
  clientes:      { total: number; morosos: number; sinLeer: number };
  tickets:       { abiertos: number; criticos: number };
  reclutamiento: { activos: number; contratados: number };
  topAgentes:    { uid: string; nombre: string; count: number; monto: number }[];
  ventasPorDia:  { dia: string; ventas: number }[];
}

export default function ManagerView({ role, onBack, onClearRole }: ManagerViewProps) {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-ES', { hour12: false }));
  const [searchQ, setSearchQ]         = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen]   = useState(false);
  const searchRef                     = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // ── Live dashboard KPIs ─────────────────────────────────────────────────
  const [dashKPIs, setDashKPIs]     = useState<DashKPIs | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const loadDashKPIs = useCallback(async () => {
    if (role !== 'GERENTE' && role !== 'ADMINISTRACION') return;
    setDashLoading(true);
    try {
      const token = user?.sessionToken || '';
      const r = await fetch('/api/dashboard/executive', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setDashKPIs(await r.json());
    } catch { /* no-op */ }
    finally { setDashLoading(false); }
  }, [role, user?.sessionToken]);

  useEffect(() => {
    if (activeSection === 'Dashboard') loadDashKPIs();
  }, [activeSection, loadDashKPIs]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch { setSearchResults([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ, doSearch]);

  useEffect(() => {
    if (!searchOpen) return;
    const h = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [searchOpen]);

  useEffect(() => {
    // Definir la vista inicial según el rol
    if (role === 'RECLUTADORA') setActiveSection('Reclutamiento');
    else if (role === 'SUPERVISOR' || role === 'VENDEDOR') setActiveSection('Captura y Validación');
    else setActiveSection('Dashboard');

    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-ES', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, [role]);

  return (
    <div className="flex h-screen w-full text-slate-50 relative z-10 overflow-hidden">

      {/* ── Enterprise Sidebar ──────────────────────────────────────── */}
      <EnterpriseSidebar
        role={role}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={onBack}
        onClearRole={onClearRole}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/20 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 shrink-0 border-b border-white/[0.08]">
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* Hamburger para mobile */}
            <button
              onClick={() => setMobileSidebarOpen(o => !o)}
              className="md:hidden flex items-center justify-center w-10 h-10 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 shrink-0 transition-all"
              title="Abrir menú"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <div className="relative flex-1 min-w-0 max-w-xs md:max-w-sm lg:max-w-md group" ref={searchRef}>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(e.target.value.length >= 2); }}
                onFocus={() => searchQ.length >= 2 && setSearchOpen(true)}
                placeholder="Buscar en el sistema..."
                className="w-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[1.25rem] py-2.5 pl-10 pr-10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner"
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(''); setSearchResults([]); setSearchOpen(false); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden max-h-72 overflow-y-auto custom-scrollbar animate-scale-in">
                  {searchResults.map((r: any, i: number) => (
                    <button key={i} onClick={() => { setActiveSection(r.modulo === 'ventas' ? 'Sales CRM' : r.modulo === 'clientes' ? 'Soporte a Clientes' : 'Reclutamiento'); setSearchOpen(false); setSearchQ(''); }}
                      className="w-full flex items-start gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md mt-0.5 shrink-0 ${r.modulo === 'ventas' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : r.modulo === 'clientes' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>{r.modulo}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-100 font-bold truncate">{r.titulo}</p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{r.subtitulo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5 shrink-0">
            <div className="text-right hidden lg:block pr-2">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Status Global</p>
              <div className="flex items-center justify-end gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
                <span className="text-[11px] font-black text-emerald-400 font-mono tracking-tighter uppercase">SYNC • {time}</span>
              </div>
            </div>

            <NotificationBell role={role} />
            
            <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-white/[0.08]">
              <div className="text-right hidden md:block">
                <p className="text-xs font-black text-white leading-none uppercase tracking-tight">{role}</p>
                <p className="text-[10px] text-emerald-500/80 font-bold mt-1 uppercase tracking-widest flex items-center justify-end gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500"></span> Conectado
                </p>
              </div>
              <div className="w-10 h-10 rounded-[1.1rem] bg-gradient-to-tr from-blue-600/40 to-indigo-600/40 p-[1.5px] shadow-[0_0_20px_rgba(59,130,246,0.15)] group cursor-pointer hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-[1rem] bg-slate-900 flex items-center justify-center border border-white/10 group-hover:border-blue-500/30 transition-colors">
                  <span className="text-xs font-black text-white">{role.slice(0, 2).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {activeSection === 'Dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* ── Welcome banner ───────────────────────────────────── */}
              <WelcomeBanner role={role} onNavigate={setActiveSection} />


              {/* Consolidated CRM panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Talent CRM */}
                <button onClick={() => setActiveSection('Reclutamiento')} className="group text-left bg-slate-900/40 border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">TALENT-CRM</p>
                      <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">Reclutamiento</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] text-emerald-400 font-bold">LIVE</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Candidatos activos</span><span className="text-white font-bold">{dashLoading ? '…' : (dashKPIs?.reclutamiento?.activos ?? '--')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Contratados (mes)</span><span className="text-white font-bold">{dashLoading ? '…' : (dashKPIs?.reclutamiento?.contratados ?? '--')}</span></div>
                  </div>
                  <div className="mt-4 text-[9px] font-bold text-blue-400 uppercase tracking-widest group-hover:text-blue-300 transition-colors">Ver módulo →</div>
                </button>

                {/* Sales CRM */}
                <button onClick={() => setActiveSection('Sales CRM')} className="group text-left bg-slate-900/40 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">SALES-CRM</p>
                      <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Ventas</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] text-emerald-400 font-bold">LIVE</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Ventas hoy</span><span className="text-white font-bold">{dashLoading ? '…' : (dashKPIs?.ventas?.hoy ?? '--')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Ventas este mes</span><span className="text-white font-bold">{dashLoading ? '…' : (dashKPIs?.ventas?.mes ?? '--')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Ventas totales</span><span className="text-emerald-400 font-bold">{dashLoading ? '…' : (dashKPIs?.ventas?.total ?? '--')}</span></div>
                  </div>
                  <div className="mt-4 text-[9px] font-bold text-purple-400 uppercase tracking-widest group-hover:text-purple-300 transition-colors">Ver módulo →</div>
                </button>

                {/* Support CRM */}
                <button onClick={() => setActiveSection('Soporte a Clientes')} className="group text-left bg-slate-900/40 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-600/20 rounded-xl border border-red-500/30">
                      <Headphones className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">SUPPORT-CRM</p>
                      <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Atención</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] text-emerald-400 font-bold">LIVE</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Clientes activos</span><span className="text-white font-bold">{dashLoading ? '…' : (dashKPIs?.clientes?.total?.toLocaleString('es-MX') ?? '--')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tickets abiertos</span><span className="text-amber-400 font-bold">{dashLoading ? '…' : (dashKPIs?.tickets?.abiertos ?? '--')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tickets críticos</span><span className={`font-bold ${(dashKPIs?.tickets?.criticos ?? 0) > 5 ? 'text-red-400' : 'text-slate-400'}`}>{dashLoading ? '…' : (dashKPIs?.tickets?.criticos ?? '--')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Morosos +30 días</span><span className="text-red-400 font-bold">{dashLoading ? '…' : (dashKPIs?.clientes?.morosos ?? '--')}</span></div>
                  </div>
                  <div className="mt-4 text-[9px] font-bold text-red-400 uppercase tracking-widest group-hover:text-red-300 transition-colors">Ver módulo →</div>
                </button>
              </div>

              {/* Sync status bar */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">3/3 CRMs Conectados</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-bold text-white">7</span> WhatsApp APIs activas
                  <span className="text-slate-700">•</span>
                  <span className="font-bold text-white">23</span> Usuarios conectados
                  <span className="text-slate-700">•</span>
                  Última sync: <span className="text-emerald-400 font-bold">Hace 2 min</span>
                </div>
                <div className="ml-auto flex gap-3">
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">5 WA Reclutamiento</span>
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">1 WA Ventas</span>
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">1 WA Soporte</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card rounded-2xl p-5 flex flex-col h-[360px] transition-all hover:border-blue-500/20">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white text-sm font-bold uppercase tracking-widest">Top Vendedores</h4>
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 w-full overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashKPIs?.topAgentes?.length
                          ? dashKPIs.topAgentes.map(a => ({ name: a.nombre.split(' ')[0], ventas: a.count }))
                          : [{ name: '—', ventas: 0 }]}
                        layout="vertical" margin={{ left: -10, right: 20, top: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={65} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                        />
                        <Bar dataKey="ventas" fill="url(#barGradient)" radius={[0, 10, 10, 0]} barSize={16}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#60a5fa" />
                            </linearGradient>
                          </defs>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col h-[360px] items-center">
                  <h4 className="text-slate-300 text-xs font-semibold mb-2">% Ventas Instaladas</h4>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={[
                            { name: 'Instaladas', value: 78 },
                            { name: 'Pendientes', value: 22 },
                          ]}
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#1e293b" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-2xl font-bold text-white">78%</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Instaladas</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-700"></div> Pendientes</div>
                  </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col h-[360px] items-center">
                  <h4 className="text-slate-300 text-xs font-semibold mb-2">% Calidad (Rechazos)</h4>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={[
                            { name: 'Aprobadas', value: 85 },
                            { name: 'Rechazadas', value: 15 },
                          ]}
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-2xl font-bold text-white">15%</span>
                      <span className="text-[10px] text-red-400">Tasa Rechazo</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Aprobadas</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Rechazadas</div>
                  </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col h-[360px] items-center">
                  <h4 className="text-slate-300 text-xs font-semibold mb-2">% Cumplimiento Meta</h4>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={[
                            { name: 'Alcanzado', value: 65 },
                            { name: 'Faltante', value: 35 },
                          ]}
                          startAngle={180}
                          endAngle={0}
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={0}
                          dataKey="value"
                          cy="80%"
                        >
                          <Cell fill="#8b5cf6" />
                          <Cell fill="#1e293b" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-[75%] inset-x-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-2xl font-bold text-white">65%</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-400 -mt-8">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Logrado</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-700"></div> Faltante</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-base font-semibold text-white">Rendimiento de Ventas</h3>
                    <select className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1 text-sm text-slate-300 outline-none">
                      <option>Últimos 7 días</option>
                      <option>Este mes</option>
                      <option>Este año</option>
                    </select>
                  </div>
                  {(() => {
                    const dias = dashKPIs?.ventasPorDia?.length
                      ? dashKPIs.ventasPorDia
                      : [{ dia: 'Lun', ventas: 12 }, { dia: 'Mar', ventas: 19 }, { dia: 'Mie', ventas: 15 }, { dia: 'Jue', ventas: 24 }, { dia: 'Vie', ventas: 31 }, { dia: 'Sab', ventas: 22 }, { dia: 'Dom', ventas: 8 }];
                    const maxVal = Math.max(...dias.map(d => d.ventas), 1);
                    return (
                      <>
                        <div className="h-72 flex items-end justify-between gap-2">
                          {dias.map((d, i) => {
                            const pct = Math.round((d.ventas / maxVal) * 100);
                            return (
                              <div key={i} className="w-full bg-slate-800/50 rounded-t-lg relative group" title={`${d.ventas} ventas`}>
                                <div
                                  className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                                  style={{ height: `${pct || 2}%` }}
                                />
                                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity font-bold">{d.ventas}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-4 text-xs text-slate-500 font-medium">
                          {dias.map((d, i) => <span key={i}>{d.dia.slice(0, 3)}</span>)}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col">
                  <h3 className="text-sm font-semibold text-white mb-4">Actividad Reciente</h3>
                  <div className="flex-1 space-y-4">
                    <ActivityItem user="Ana G." action="Cerró una venta" amount="€ 1,200" time="Hace 5 min" />
                    <ActivityItem user="Carlos M." action="Nuevo lead" amount="--" time="Hace 12 min" />
                    <ActivityItem user="Elena R." action="Cerró una venta" amount="€ 850" time="Hace 1 hora" />
                    <ActivityItem user="Sistema" action="Reporte generado" amount="--" time="Hace 2 horas" />
                    <ActivityItem user="Luis P." action="Cerró una venta" amount="€ 3,400" time="Hace 3 horas" />
                  </div>
                  <button className="w-full mt-4 py-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    Ver todo el historial &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'Ajustes' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Ajustes"><Settings /></ErrorBoundary></Suspense>}
          {activeSection === 'Perfil' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Perfil"><Profile onClearRole={onClearRole} /></ErrorBoundary></Suspense>}
          {activeSection === 'Nóminas' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Nóminas"><Payroll /></ErrorBoundary></Suspense>}
          {activeSection === 'Anuncios' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Anuncios"><Announcements /></ErrorBoundary></Suspense>}
          {activeSection === 'Captura y Validación' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Captura y Validación"><CaptureValidation onSectionChange={setActiveSection} /></ErrorBoundary></Suspense>}
          {activeSection === 'Consulta y Seguimiento' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Consulta y Seguimiento"><ConsultasSeguimiento /></ErrorBoundary></Suspense>}
          {activeSection === 'Sales CRM' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Sales CRM"><SalesCRM role={role} /></ErrorBoundary></Suspense>}
          {activeSection === 'Soporte a Clientes' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Soporte CRM"><SupportCRM /></ErrorBoundary></Suspense>}
          {activeSection === 'Seguimiento Clientes' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Seguimiento Clientes"><CustomerFollowup /></ErrorBoundary></Suspense>}
          {activeSection === 'Morosidad' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Morosidad"><SupportCRM initialFilter="MOROSO" /></ErrorBoundary></Suspense>}
          {activeSection === 'Reclutamiento' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Reclutamiento"><TalentCRM /></ErrorBoundary></Suspense>}
          {activeSection === 'Analytics' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Analytics"><InfoAppCharts /></ErrorBoundary></Suspense>}
          {activeSection === 'Analytics Pro' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Analytics Pro"><AnalyticsDashboard /></ErrorBoundary></Suspense>}
          {activeSection === 'Mensajería' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Mensajería Hub"><MessagingHub /></ErrorBoundary></Suspense>}
          {activeSection === 'Pipeline' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Pipeline Leads"><LeadPipeline /></ErrorBoundary></Suspense>}
          {activeSection === 'Automatizaciones' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Automatizaciones"><AutomationStudio /></ErrorBoundary></Suspense>}
          {activeSection === 'CRM Interactivo' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="CRM Interactivo"><InteractiveCRM /></ErrorBoundary></Suspense>}
          {activeSection === 'Reportes' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Reportes"><ReportsCenter /></ErrorBoundary></Suspense>}
          {activeSection === 'Audit Log' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Audit Log"><AuditLog /></ErrorBoundary></Suspense>}
          {activeSection === 'Agentes IA' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Centro de Agentes IA"><AgentsCenter /></ErrorBoundary></Suspense>}

          {!['Dashboard', 'Ajustes', 'Perfil', 'Nóminas', 'Captura y Validación', 'Consulta y Seguimiento', 'Sales CRM', 'Soporte a Clientes', 'Morosidad', 'Reclutamiento', 'Anuncios', 'Analytics', 'Analytics Pro', 'CRM Interactivo', 'Seguimiento Clientes', 'Reportes', 'Audit Log', 'Agentes IA', 'Mensajería', 'Pipeline', 'Automatizaciones'].includes(activeSection) && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <h2 className="text-2xl font-bold text-white mb-2">{activeSection}</h2>
                <p>Esta sección está en desarrollo.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}




function KpiCard({ title, value, trend, trendUp, icon: Icon, color, bg }: any) {
  const glowColor = color.includes('blue') ? 'rgba(59,130,246,0.3)' :
    color.includes('emerald') ? 'rgba(16,185,129,0.3)' :
      color.includes('purple') ? 'rgba(168,85,247,0.3)' :
        color.includes('amber') ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)';

  return (
    <motion.div
      initial={{ borderColor: 'rgba(255,255,255,0.1)' }}
      animate={{
        borderColor: ['rgba(255,255,255,0.1)', glowColor, 'rgba(255,255,255,0.1)'],
        boxShadow: ['0 0 0px transparent', `0 0 15px ${glowColor.replace('0.3', '0.1')}`, '0 0 0px transparent']
      }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      className="bg-slate-900/40 backdrop-blur-md border rounded-xl p-4 transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center border border-white/5 shadow-[0_0_10px_currentColor]`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <h4 className="text-slate-400 text-sm font-medium mb-1">{title}</h4>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}

function ActivityItem({ user, action, amount, time }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-500/5 transition-all duration-300 border border-transparent hover:border-blue-500/20 hover:shadow-[0_0_10px_rgba(59,130,246,0.1)]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-blue-400 border border-blue-500/20 shadow-[0_0_5px_rgba(59,130,246,0.3)]">
          {user.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">{user}</p>
          <p className="text-xs text-slate-500">{action}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-white">{amount}</p>
        <p className="text-xs text-slate-500">{time}</p>
      </div>
    </div>
  );
}
