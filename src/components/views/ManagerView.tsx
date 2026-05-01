import React, { useState, useEffect, lazy, Suspense, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, Users, DollarSign, Activity,
  LogOut, TrendingUp, ArrowUpRight, ArrowDownRight,
  LayoutDashboard, Settings as SettingsIcon, ChevronLeft,
  User, ClipboardCheck, FileSearch, Wallet, Headphones, AlertTriangle, Megaphone, Loader2,
  FileText, Database, Kanban, Search, MessageCircle,
  BarChart2, X, Shield,
  Brain,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import Logo from '../ui/Logo';

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
  // Auto-colapsa en tablets (md), expande en desktop (lg+)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1024);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-ES', { hour12: false }));
  const [searchQ, setSearchQ]         = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen]   = useState(false);
  const searchRef                     = useRef<HTMLDivElement>(null);

  // ── Live dashboard KPIs ─────────────────────────────────────────────────
  const [dashKPIs, setDashKPIs]     = useState<DashKPIs | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const loadDashKPIs = useCallback(async () => {
    if (role !== 'GERENTE' && role !== 'ADMINISTRACION') return;
    setDashLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('hdreams_user') || '{}')?.sessionToken || '';
      const r = await fetch('/api/dashboard/executive', { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setDashKPIs(await r.json());
    } catch { /* no-op */ }
    finally { setDashLoading(false); }
  }, [role]);

  useEffect(() => {
    if (activeSection === 'Dashboard') loadDashKPIs();
  }, [activeSection, loadDashKPIs]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      setSearchResults(await r.json());
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

    // Resize listener: auto-colapsa/expande sidebar según ancho
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarCollapsed(false);
      else if (window.innerWidth < 1024) setSidebarCollapsed(true);
      if (window.innerWidth >= 768) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => { clearInterval(timer); window.removeEventListener('resize', onResize); };
  }, [role]);

  return (
    <div className="flex h-screen w-full text-slate-50 relative z-10 overflow-hidden">

      {/* Mobile sidebar overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile (overlay), visible md+ */}
      <aside className={`
        ${sidebarCollapsed ? 'w-14' : 'w-60 lg:w-56'}
        glass-card border-r-0 border-white/5 flex flex-col rounded-2xl overflow-hidden relative z-40 transition-all duration-300
        fixed md:relative inset-y-0 left-0 m-3
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+12px)] md:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-3 border-b border-white/5 shrink-0 relative">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <Logo className="text-[40px]" />
              <div className="flex flex-col">
                <h1 className="text-sm font-black text-white tracking-tight leading-none">Heavenly Dreams</h1>
                <p className="text-[9px] text-blue-400 font-bold tracking-[0.25em] uppercase mt-0.5">Enterprise CRM</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && <Logo className="text-[32px] mx-auto" />}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
            className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg z-30`}
          >
            <ChevronLeft className={`w-3 h-3 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {role === 'GERENTE' && <NavItem icon={LayoutDashboard} label="Dashboard" active={activeSection === 'Dashboard'} onClick={() => setActiveSection('Dashboard')} collapsed={sidebarCollapsed} />}
          <NavItem icon={User} label="Perfil" active={activeSection === 'Perfil'} onClick={() => setActiveSection('Perfil')} collapsed={sidebarCollapsed} />

          {(role === 'GERENTE' || role === 'ADMINISTRACION' || role === 'SUPERVISOR' || role === 'VENDEDOR') && (
            <div className="pt-2">
              {!sidebarCollapsed && <p className="px-3 mb-1 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Operaciones</p>}
              {sidebarCollapsed && <div className="h-px bg-white/5 mx-1 my-2" />}
              <NavItem icon={ClipboardCheck} label="Captura & Validar" active={activeSection === 'Captura y Validación'} onClick={() => setActiveSection('Captura y Validación')} collapsed={sidebarCollapsed} />
              <NavItem icon={FileSearch} label="Seguimiento" active={activeSection === 'Consulta y Seguimiento'} onClick={() => setActiveSection('Consulta y Seguimiento')} collapsed={sidebarCollapsed} />
            </div>
          )}

          {(role === 'GERENTE' || role === 'ADMINISTRACION') && (
            <div className="pt-2">
              {!sidebarCollapsed && <p className="px-3 mb-1 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Gestión</p>}
              {sidebarCollapsed && <div className="h-px bg-white/5 mx-1 my-2" />}
              <NavItem icon={Wallet} label="Nóminas" active={activeSection === 'Nóminas'} onClick={() => setActiveSection('Nóminas')} collapsed={sidebarCollapsed} />
              <NavItem icon={BarChart2} label="Reportes" active={activeSection === 'Reportes'} onClick={() => setActiveSection('Reportes')} collapsed={sidebarCollapsed} />
              <NavItem icon={Shield} label="Audit Log" active={activeSection === 'Audit Log'} onClick={() => setActiveSection('Audit Log')} collapsed={sidebarCollapsed} />
              <NavItem icon={FileText} label="Sales CRM" active={activeSection === 'Sales CRM'} onClick={() => setActiveSection('Sales CRM')} collapsed={sidebarCollapsed} />
              <NavItem icon={Headphones} label="Soporte CRM" active={activeSection === 'Soporte a Clientes'} onClick={() => setActiveSection('Soporte a Clientes')} collapsed={sidebarCollapsed} />
              <NavItem icon={MessageCircle} label="Seguimiento WA" active={activeSection === 'Seguimiento Clientes'} onClick={() => setActiveSection('Seguimiento Clientes')} highlight collapsed={sidebarCollapsed} />
              <NavItem icon={AlertTriangle} label="Morosidad" active={activeSection === 'Morosidad'} onClick={() => setActiveSection('Morosidad')} collapsed={sidebarCollapsed} />
              <NavItem icon={Database} label="Analytics" active={activeSection === 'Analytics'} onClick={() => setActiveSection('Analytics')} collapsed={sidebarCollapsed} />
              <NavItem icon={Kanban} label="CRM Interactivo" active={activeSection === 'CRM Interactivo'} onClick={() => setActiveSection('CRM Interactivo')} collapsed={sidebarCollapsed} />
            </div>
          )}

          {(role === 'GERENTE' || role === 'ADMINISTRACION' || role === 'RECLUTADORA') && (
            <div className="pt-2">
              {!sidebarCollapsed && <p className="px-3 mb-1 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Recursos</p>}
              {sidebarCollapsed && <div className="h-px bg-white/5 mx-1 my-2" />}
              <NavItem icon={Users} label="Reclutamiento" active={activeSection === 'Reclutamiento'} onClick={() => setActiveSection('Reclutamiento')} collapsed={sidebarCollapsed} />
              <NavItem icon={Megaphone} label="Anuncios" active={activeSection === 'Anuncios'} onClick={() => setActiveSection('Anuncios')} collapsed={sidebarCollapsed} />
            </div>
          )}

          {(role === 'GERENTE' || role === 'ADMINISTRACION') && (
            <div className="pt-2">
              {!sidebarCollapsed && <p className="px-3 mb-1 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">IA & Ajustes</p>}
              {sidebarCollapsed && <div className="h-px bg-white/5 mx-1 my-2" />}
              {role === 'GERENTE' && <NavItem icon={Brain} label="Centro de Agentes" active={activeSection === 'Agentes IA'} onClick={() => setActiveSection('Agentes IA')} highlight collapsed={sidebarCollapsed} />}
              <NavItem icon={SettingsIcon} label="Ajustes" active={activeSection === 'Ajustes'} onClick={() => setActiveSection('Ajustes')} collapsed={sidebarCollapsed} />
            </div>
          )}
        </nav>

        <div className="p-2 border-t border-white/5 shrink-0">
          <button
            onClick={onBack}
            title="Salir del Sistema"
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} w-full px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-300`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && 'Salir del Sistema'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top Header */}
        <header className="h-14 bg-transparent flex items-center justify-between px-3 md:px-5 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            {/* Hamburger para mobile */}
            <button
              onClick={() => setMobileSidebarOpen(o => !o)}
              className="md:hidden flex items-center justify-center w-8 h-8 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 shrink-0"
              title="Abrir menú"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button
              onClick={onBack}
              className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Atrás</span>
            </button>
            <div className="relative flex-1 min-w-0 max-w-xs md:max-w-sm lg:max-w-md group" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(e.target.value.length >= 2); }}
                onFocus={() => searchQ.length >= 2 && setSearchOpen(true)}
                placeholder="Buscar en el sistema..."
                className="w-full bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl py-2 pl-9 pr-9 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 focus:ring-2 focus:ring-blue-500/5 transition-all"
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(''); setSearchResults([]); setSearchOpen(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar animate-scale-in">
                  {searchResults.map((r: any, i: number) => (
                    <button key={i} onClick={() => { setActiveSection(r.modulo === 'ventas' ? 'Sales CRM' : r.modulo === 'clientes' ? 'Soporte a Clientes' : 'Reclutamiento'); setSearchOpen(false); setSearchQ(''); }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${r.modulo === 'ventas' ? 'bg-purple-500/20 text-purple-400' : r.modulo === 'clientes' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.modulo}</span>
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-100 font-semibold truncate">{r.titulo}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{r.subtitulo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchOpen && searchQ.length >= 2 && searchResults.length === 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 px-4 py-3 text-xs text-zinc-500">
                  Sin resultados para "{searchQ}"
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="text-right hidden lg:block">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Status Global</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">SYNC • {time}</span>
              </div>
            </div>

            <NotificationBell role={role} />
            <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-white/5">
              <div className="text-right hidden md:block">
                <p className="text-[11px] font-bold text-white leading-none">{role}</p>
                <p className="text-[9px] text-slate-500">Conectado</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/20">
                <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center border border-white/10">
                  <span className="text-[10px] font-black text-white">{role.slice(0, 2).toUpperCase()}</span>
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
          {activeSection === 'Sales CRM' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Sales CRM"><SalesCRM /></ErrorBoundary></Suspense>}
          {activeSection === 'Soporte a Clientes' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Soporte CRM"><SupportCRM /></ErrorBoundary></Suspense>}
          {activeSection === 'Seguimiento Clientes' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Seguimiento Clientes"><CustomerFollowup /></ErrorBoundary></Suspense>}
          {activeSection === 'Morosidad' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Morosidad"><SupportCRM initialFilter="MOROSO" /></ErrorBoundary></Suspense>}
          {activeSection === 'Reclutamiento' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Reclutamiento"><TalentCRM /></ErrorBoundary></Suspense>}
          {activeSection === 'Analytics' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Analytics"><InfoAppCharts /></ErrorBoundary></Suspense>}
          {activeSection === 'CRM Interactivo' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="CRM Interactivo"><InteractiveCRM /></ErrorBoundary></Suspense>}
          {activeSection === 'Reportes' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Reportes"><ReportsCenter /></ErrorBoundary></Suspense>}
          {activeSection === 'Audit Log' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Audit Log"><AuditLog /></ErrorBoundary></Suspense>}
          {activeSection === 'Agentes IA' && <Suspense fallback={<SectionLoader />}><ErrorBoundary label="Centro de Agentes IA"><AgentsCenter /></ErrorBoundary></Suspense>}

          {!['Dashboard', 'Ajustes', 'Perfil', 'Nóminas', 'Captura y Validación', 'Consulta y Seguimiento', 'Sales CRM', 'Soporte a Clientes', 'Morosidad', 'Reclutamiento', 'Anuncios', 'Analytics', 'CRM Interactivo', 'Seguimiento Clientes', 'Reportes', 'Audit Log', 'Agentes IA'].includes(activeSection) && (
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

function NavItem({ icon: Icon, label, active, onClick, highlight, collapsed }: any) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group w-full flex items-center ${collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-3 py-2'} rounded-xl transition-all duration-200 active:scale-[0.98] ${
        active
          ? highlight
            ? 'bg-[#00ABDF]/20 text-white border border-[#00ABDF]/30 shadow-md shadow-[#00ABDF]/10'
            : 'bg-blue-600/20 text-white border border-blue-500/30 shadow-md shadow-blue-500/5'
          : highlight
            ? 'text-[#00ABDF]/70 hover:text-white hover:bg-[#00ABDF]/10 border border-[#00ABDF]/10'
            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className={`p-1.5 rounded-lg transition-all duration-200 shrink-0 ${
        active
          ? highlight ? 'bg-[#00ABDF] text-white' : 'bg-blue-500 text-white'
          : highlight ? 'bg-[#00ABDF]/20 text-[#00ABDF] group-hover:bg-[#00ABDF]/30' : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
      }`}>
        <Icon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
      </div>
      {!collapsed && <span className="font-semibold text-xs tracking-wide text-left leading-tight truncate">{label}</span>}
      {!collapsed && active && <div className={`ml-auto w-1 h-1 shrink-0 rounded-full ${highlight ? 'bg-[#00ABDF] shadow-[0_0_6px_#00ABDF]' : 'bg-blue-400 shadow-[0_0_6px_#3b82f6]'}`} />}
      {!collapsed && !active && highlight && <div className="ml-auto w-1.5 h-1.5 shrink-0 rounded-full bg-[#00ABDF]/50 animate-pulse" />}
    </button>
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
