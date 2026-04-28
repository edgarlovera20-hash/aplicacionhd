import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, Download, RefreshCw, TrendingUp,
  Users, Headphones,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ── Types ───────────────────────────────────────────────────── */
interface Summary {
  ventas:        { total: number; monto: number };
  reclutamiento: { total: number; contratados: number };
  soporte:       { tickets_abiertos: number; tickets_resueltos: number };
}

const fmt$ = (n: number) => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n);

/* ── Tooltip ─────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900/95 border border-white/10 rounded-xl p-3 text-xs shadow-xl">
      <p className="font-bold text-zinc-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{color: p.color || '#fff'}}>{p.name}: <span className="font-bold">{typeof p.value === 'number' && p.value > 1000 ? fmt$(p.value) : p.value}</span></p>
      ))}
    </div>
  );
};

/* ── Stat Card ───────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, bg }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; bg: string }) {
  return (
    <div className={cn('p-5 rounded-2xl border border-white/5 flex flex-col gap-2', bg)}>
      <div className="flex items-center gap-2">
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', bg.replace('/8','/20').replace('/12','/20'))}>
          <Icon className={cn('w-4 h-4', color)}/>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      </div>
      <p className={cn('text-3xl font-black font-mono', color)}>{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function ReportsCenter() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'ventas' | 'operaciones'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo)   params.set('to', dateTo);
      const r = await fetch(`/api/reports/summary?${params}`);
      setSummary(await r.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => `"${String(r[h]||'').replace(/"/g,'""')}"`).join(','));
    const csv = '﻿' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportModulo = (mod: string) => window.open(`/api/${mod}/export`, '_blank');

  const tabs = [
    { id: 'overview',    label: 'Resumen General', icon: BarChart2 },
    { id: 'ventas',      label: 'Ventas',           icon: TrendingUp },
    { id: 'operaciones', label: 'Operaciones',      icon: Headphones },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Centro de Reportes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Análisis unificado de todos los módulos del sistema</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            className="px-3 py-2 bg-zinc-950/50 border border-white/8 rounded-xl text-sm text-zinc-200 focus:outline-none"/>
          <span className="text-zinc-600 text-sm">→</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            className="px-3 py-2 bg-zinc-950/50 border border-white/8 rounded-xl text-sm text-zinc-200 focus:outline-none"/>
          <button onClick={load} className="p-2 rounded-xl border border-white/8 text-zinc-400 hover:text-white transition-all"><RefreshCw className="w-4 h-4"/></button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 p-1 bg-zinc-950/40 border border-white/5 rounded-xl w-fit">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all',
              activeTab===t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5')}>
            <t.icon className="w-3.5 h-3.5"/>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-600 gap-3"><RefreshCw className="w-5 h-5 animate-spin"/>Cargando reportes…</div>
      ) : !summary ? (
        <div className="flex items-center justify-center py-24 text-zinc-600">Sin datos disponibles</div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={TrendingUp}   label="Ventas totales"   value={summary.ventas.total}                       sub={`Facturado: ${fmt$(summary.ventas.monto)}`}                     color="text-blue-400"    bg="bg-blue-500/8 border-blue-500/15"/>
                <StatCard icon={Users}        label="Candidatos"       value={summary.reclutamiento.total}                sub={`Contratados: ${summary.reclutamiento.contratados}`}            color="text-violet-400"  bg="bg-violet-500/8 border-violet-500/15"/>
                <StatCard icon={Headphones}   label="Soporte abierto"  value={summary.soporte.tickets_abiertos}           sub={`Resueltos: ${summary.soporte.tickets_resueltos}`}              color="text-red-400"     bg="bg-red-500/8 border-red-500/15"/>
                <StatCard icon={TrendingUp}   label="Volumen facturado"value={fmt$(summary.ventas.monto)}                 sub={`${summary.ventas.total} ventas`}                                color="text-emerald-400" bg="bg-emerald-500/8 border-emerald-500/15"/>
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                <h3 className="text-sm font-bold text-zinc-300 mb-4">Estado Operacional</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={[
                    {name:'Ventas',       valor: summary.ventas.total},
                    {name:'Candidatos',   valor: summary.reclutamiento.total},
                    {name:'Tickets AB.',  valor: summary.soporte.tickets_abiertos},
                    {name:'Tickets RES.', valor: summary.soporte.tickets_resueltos},
                  ]} margin={{left:-20,right:10,top:5,bottom:5}}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="valor" fill="#3b82f6" radius={[6,6,0,0]} barSize={36}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── VENTAS ── */}
          {activeTab === 'ventas' && (
            <div className="space-y-4">
              <div className="flex justify-end"><button onClick={()=>exportModulo('admin/export/ventas')} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8 text-zinc-400 hover:text-white text-sm transition-all"><Download className="w-3.5 h-3.5"/>Exportar ventas</button></div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {label:'Ventas totales',   value: summary.ventas.total,            color:'text-blue-400'},
                  {label:'Volumen facturado',value: fmt$(summary.ventas.monto),       color:'text-emerald-400'},
                  {label:'Candidatos',       value: summary.reclutamiento.total,      color:'text-violet-400'},
                ].map(s=>(
                  <div key={s.label} className="p-5 rounded-2xl border border-white/5 bg-white/2">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">{s.label}</p>
                    <p className={cn('text-2xl font-black font-mono',s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                <p className="text-xs text-zinc-500 text-center py-8">Los reportes detallados por agente y periodo estarán disponibles cuando haya datos históricos suficientes.<br/>Usa el filtro de fechas para acotar el análisis.</p>
              </div>
            </div>
          )}

          {/* ── OPERACIONES ── */}
          {activeTab === 'operaciones' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  {label:'Tickets abiertos',   value: summary.soporte.tickets_abiertos,            color:'text-red-400'},
                  {label:'Tickets resueltos',  value: summary.soporte.tickets_resueltos,           color:'text-blue-400'},
                  {label:'Candidatos',         value: summary.reclutamiento.total,                 color:'text-violet-400'},
                ].map(s=>(
                  <div key={s.label} className="p-5 rounded-2xl border border-white/5 bg-white/2">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">{s.label}</p>
                    <p className={cn('text-2xl font-black font-mono',s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                  <h3 className="text-sm font-bold text-zinc-300 mb-3">Reclutamiento</h3>
                  <div className="space-y-3">
                    {[
                      {label:'Total candidatos',  value: summary.reclutamiento.total,      pct: 100},
                      {label:'Contratados',       value: summary.reclutamiento.contratados, pct: summary.reclutamiento.total ? Math.round((summary.reclutamiento.contratados/summary.reclutamiento.total)*100) : 0},
                    ].map(s=>(
                      <div key={s.label}>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>{s.label}</span><span className="font-bold text-zinc-200">{s.value}</span></div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all" style={{width:`${s.pct}%`}}/></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 rounded-2xl border border-white/5 bg-white/2">
                  <h3 className="text-sm font-bold text-zinc-300 mb-3">Soporte</h3>
                  <div className="space-y-3">
                    {[
                      {label:'Abiertos',   value: summary.soporte.tickets_abiertos,  color:'bg-red-500'},
                      {label:'Resueltos',  value: summary.soporte.tickets_resueltos, color:'bg-emerald-500'},
                    ].map(s=>{
                      const total = summary.soporte.tickets_abiertos + summary.soporte.tickets_resueltos;
                      const pct = total ? Math.round((s.value/total)*100) : 0;
                      return (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>{s.label}</span><span className="font-bold text-zinc-200">{s.value}</span></div>
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all',s.color)} style={{width:`${pct}%`}}/></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
