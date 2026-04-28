import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import { Database, TrendingUp, CheckCircle2, XCircle, Package, MapPin, Users2, Store, Layers, Wifi, BarChart3, Flame, AlertTriangle, ShieldCheck, Filter as FilterIcon } from 'lucide-react';
import {
  RISK_ZONES, RiskZone, colorForLevel, bgClassForLevel, labelForLevel,
  HEATMAP_ROWS, HEATMAP_COLS, formatMXN, totalsByLevel,
} from '../../utils/riskZones';

/* ────────────────────────────────────────────────────────
   DATA – extraída de INFO APP.xlsx (677 registros)
   Período: Dic 2025 – Abr 2026
──────────────────────────────────────────────────────── */

const estatusData = [
  { name: 'POSTEADA', value: 413, color: '#22c55e' },
  { name: 'ABIERTA',  value: 183, color: '#f59e0b' },
];

const capturaByMonth = [
  { mes: 'Dic 25', capturas: 216, posteadas: 148, abiertas: 68 },
  { mes: 'Ene 26', capturas: 152, posteadas: 101, abiertas: 51 },
  { mes: 'Feb 26', capturas: 134, posteadas: 92,  abiertas: 42 },
  { mes: 'Mar 26', capturas: 115, posteadas: 58,  abiertas: 57 },
  { mes: 'Abr 26', capturas: 60,  posteadas: 14,  abiertas: 46 },
];

const estadoData = [
  { name: 'Técnico\nEntrega Módems', value: 551, color: '#3b82f6' },
  { name: 'No Elaborada',    value: 126, color: '#ef4444' },
];

const paqueteData = [
  { paquete: 'INF19-PKG 389',        count: 285 },
  { paquete: 'PFR39-INF 349',        count: 124 },
  { paquete: 'PFR24-INF NEG 349',    count: 78  },
  { paquete: 'PQI37-CONECTES NEG',   count: 44  },
  { paquete: 'PQI43-PKG 499',        count: 41  },
  { paquete: 'PQI42-PKG 435',        count: 40  },
  { paquete: 'PFR34-INF 399',        count: 13  },
  { paquete: 'PQI64-PKG 649',        count: 11  },
  { paquete: 'PFR14-INF NEG 399',    count: 10  },
  { paquete: 'PFRA5-INF 449',        count: 6   },
  { paquete: 'Otros',                count: 25  },
];

const tipoClienteData = [
  { name: 'Línea Nueva',    value: 433, color: '#6366f1' },
  { name: 'Línea Portada',  value: 244, color: '#a78bfa' },
];

const tipoClienteData2 = [
  { name: 'Cliente Nuevo',    value: 433, color: '#0ea5e9' },
  { name: 'Cliente Portado',  value: 244, color: '#38bdf8' },
];

const areaData = [
  { area: 'UNIVERSIDAD',        count: 286 },
  { area: 'ERMITA-TLAHUAC',     count: 110 },
  { area: 'BALBUENA',           count: 79  },
  { area: 'SOTELO',             count: 60  },
  { area: 'MIXCOAC',            count: 45  },
  { area: 'TEXCOCO-ZARAGOZA',   count: 35  },
  { area: 'LINDAVISTA',         count: 25  },
  { area: 'VALLE-SAN JUAN',     count: 15  },
  { area: 'LOMAS',              count: 11  },
  { area: 'SATÉLITE',           count: 4   },
  { area: 'TECAMAC',            count: 4   },
  { area: 'TOLUCA',             count: 3   },
];

const estrategiaData = [
  { name: 'Doble Play (10000064)', value: 429, color: '#f97316' },
  { name: 'Infinitum (10001013)',  value: 248, color: '#14b8a6' },
];

const tipoLineaData = [
  { name: 'Residencial', value: 529, color: '#8b5cf6' },
  { name: 'Comercial',   value: 148, color: '#ec4899' },
];

const etapaPisaData = [
  { etapa: 'PF',  count: 413, label: 'Posteo Final'    },
  { etapa: 'MC',  count: 158, label: 'Módems Captura'  },
  { etapa: 'PS',  count: 12,  label: 'Proceso Survey'  },
  { etapa: 'PM',  count: 5,   label: 'Proceso Módems'  },
  { etapa: 'IM',  count: 4,   label: 'Instalación Módems' },
  { etapa: '9F',  count: 3,   label: '9-F'             },
  { etapa: 'G5',  count: 1,   label: 'Grupo 5'         },
];

const promotorTop10 = [
  { id: '326925', count: 78  },
  { id: '346072', count: 74  },
  { id: '345495', count: 58  },
  { id: '348485', count: 58  },
  { id: '346126', count: 57  },
  { id: '348467', count: 52  },
  { id: '325078', count: 32  },
  { id: '330804', count: 26  },
  { id: '329069', count: 25  },
  { id: '350703', count: 22  },
];

const tiendaTop10 = [
  { tienda: 'XOCHIMILCO',   count: 184 },
  { tienda: 'TLAHUAC',      count: 67  },
  { tienda: 'CUAJIMALPA',   count: 54  },
  { tienda: 'PLAZA INBURSA',count: 46  },
  { tienda: 'UNIVERSIDAD',  count: 43  },
  { tienda: 'MALINCHE',     count: 42  },
  { tienda: 'CULHUACAN',    count: 35  },
  { tienda: 'PARQUE VIA',   count: 23  },
  { tienda: 'MIXHUCA',      count: 20  },
  { tienda: 'LORETO (MEX)', count: 19  },
];

/* ────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────── */
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15,23,42,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  fontSize: '11px',
  color: '#f1f5f9',
};

function ChartCard({ title, icon: Icon, iconColor = 'text-blue-400', children, className = '' }: {
  title: string; icon: React.ElementType; iconColor?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-slate-900/50 border border-white/8 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-slate-900/50 border ${color} rounded-2xl p-4`}>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.18em] mb-1">{label}</p>
      <p className="text-2xl font-black text-white font-display leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function SimplePie({ data, height = 220 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <RePieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius="50%" outerRadius="75%"
            paddingAngle={3} dataKey="value">
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} (${((v/total)*100).toFixed(1)}%)`, '']} />
          <Legend
            formatter={(v) => <span className="text-[10px] text-slate-300">{v}</span>}
            iconType="circle"
            iconSize={8}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Geographic Risk Analysis
──────────────────────────────────────────────────────── */
function RiskHeatmap({ zones, onSelect, selected }: {
  zones: RiskZone[]; onSelect: (z: RiskZone | null) => void; selected: RiskZone | null;
}) {
  // Build a row x col grid; cells without a zone get a faint base color
  const grid: (RiskZone | null)[][] = Array.from({ length: HEATMAP_ROWS }, () =>
    Array.from({ length: HEATMAP_COLS }, () => null)
  );
  for (const z of zones) {
    if (z.gridRow < HEATMAP_ROWS && z.gridCol < HEATMAP_COLS) grid[z.gridRow][z.gridCol] = z;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${HEATMAP_COLS}, minmax(0, 1fr))` }}>
        {grid.flat().map((z, i) => {
          if (!z) {
            return (
              <div key={i} className="aspect-square rounded-md bg-slate-800/30 border border-white/5" />
            );
          }
          const isSelected = selected?.area === z.area;
          return (
            <button
              key={i}
              onClick={() => onSelect(isSelected ? null : z)}
              title={`${z.area} · ${z.morosityPct.toFixed(1)}% morosidad · ${formatMXN(z.perdidaEstimada)}`}
              className={`aspect-square rounded-md border transition-all hover:scale-105 hover:z-10 relative group ${
                isSelected ? 'ring-2 ring-white scale-105 z-10' : ''
              }`}
              style={{
                backgroundColor: colorForLevel(z.level),
                opacity: 0.35 + Math.min(z.morosityPct / 100, 1) * 0.65,
                borderColor: colorForLevel(z.level),
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white drop-shadow uppercase tracking-tight px-0.5 leading-none text-center">
                {z.area.length > 10 ? z.area.slice(0, 8) + '…' : z.area}
              </span>
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} /> Sana &lt;15%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#f59e0b' }} /> Vigilancia 15-30%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#ef4444' }} /> Crítica ≥30%
          </span>
        </div>
        <span className="text-slate-500">Click una zona para ver detalle</span>
      </div>
    </div>
  );
}

function RiskRanking({ zones }: { zones: RiskZone[] }) {
  const sorted = [...zones].sort((a, b) => b.morosityPct - a.morosityPct);
  const max = sorted[0]?.morosityPct || 1;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 px-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Área / Colonia</div>
        <div className="col-span-4">Morosidad</div>
        <div className="col-span-3 text-right">Pérdida Est.</div>
      </div>
      <div className="space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
        {sorted.map((z, i) => (
          <div
            key={z.area}
            className={`grid grid-cols-12 items-center gap-2 px-2 py-2 rounded-lg border ${bgClassForLevel(z.level)} hover:bg-white/5 transition-colors`}
          >
            <div className="col-span-1 text-[10px] font-black text-white">{i + 1}</div>
            <div className="col-span-4">
              <div className="text-xs font-bold text-white">{z.area}</div>
              <div className="text-[9px] text-slate-400 truncate">{z.colonias.slice(0, 2).join(', ')}{z.colonias.length > 2 ? '…' : ''}</div>
            </div>
            <div className="col-span-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(z.morosityPct / max) * 100}%`, background: colorForLevel(z.level) }}
                  />
                </div>
                <span className="text-[10px] font-black text-white w-10 text-right">{z.morosityPct.toFixed(1)}%</span>
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">{z.morosos} de {z.totalClientes} clientes</div>
            </div>
            <div className="col-span-3 text-right">
              <div className="text-xs font-black text-white font-mono">{formatMXN(z.perdidaEstimada)}</div>
              <div className="text-[9px] text-slate-500">detenidos</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────── */
export default function InfoAppCharts() {
  // Filtro por localidad — afecta todo el dashboard
  const [localityFilter, setLocalityFilter] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);

  const filteredAreaData = useMemo(() => {
    if (!localityFilter) return areaData;
    return areaData.filter(a => a.area.toUpperCase().includes(localityFilter.toUpperCase()));
  }, [localityFilter]);

  // Risk filtered (selected zone takes priority over locality)
  const riskZonesView = useMemo(() => {
    if (selectedZone) return [selectedZone];
    if (!localityFilter) return RISK_ZONES;
    const q = localityFilter.toUpperCase();
    return RISK_ZONES.filter(z =>
      z.area.toUpperCase().includes(q) || z.colonias.some(c => c.toUpperCase().includes(q))
    );
  }, [localityFilter, selectedZone]);

  const totals = totalsByLevel();
  const totalRedLoss = totals.perdida.red;
  const totalLoss = totals.perdida.red + totals.perdida.yellow + totals.perdida.green;
  const totalMorosos = totals.morosos.red + totals.morosos.yellow + totals.morosos.green;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">

      {/* Header */}
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-lg font-display font-black text-white tracking-tight uppercase flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Analytics – INFO APP
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Base de datos real · 677 registros · Dic 2025 – Abr 2026 · 12 áreas · 33 promotores · 41 tiendas
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">677 REGISTROS</span>
          <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">DATOS REALES</span>
          <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">LIVE DB</span>
        </div>
      </div>

      {/* Filtro por Localidad — afecta todo el dashboard */}
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <FilterIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Filtro por Localidad</span>
        </div>
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <select
            value={localityFilter}
            onChange={(e) => { setLocalityFilter(e.target.value); setSelectedZone(null); }}
            className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="" className="bg-slate-900">TODAS LAS ZONAS</option>
            {RISK_ZONES.map(z => (
              <option key={z.area} value={z.area} className="bg-slate-900">{z.area}</option>
            ))}
          </select>
          <input
            type="text"
            value={localityFilter}
            onChange={(e) => { setLocalityFilter(e.target.value); setSelectedZone(null); }}
            placeholder="Buscar colonia o área…"
            className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          {(localityFilter || selectedZone) && (
            <button
              onClick={() => { setLocalityFilter(''); setSelectedZone(null); }}
              className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/10 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
        {(localityFilter || selectedZone) && (
          <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            FILTRO ACTIVO: {selectedZone?.area || localityFilter.toUpperCase()}
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Capturas" value="677" sub="Dic 2025 – Abr 2026" color="border-blue-500/20" />
        <KpiCard label="Posteadas" value="413" sub="61.0% del total" color="border-emerald-500/20" />
        <KpiCard label="Abiertas" value="183" sub="27.1% del total" color="border-amber-500/20" />
        <KpiCard label="Promotores Activos" value="33" sub="41 tiendas · 12 áreas" color="border-purple-500/20" />
      </div>

      {/* Row 1: Capturas por mes (full width) */}
      <ChartCard title="Capturas por Mes" icon={TrendingUp} iconColor="text-blue-400">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={capturaByMonth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCapturas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradPosteadas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradAbiertas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="mes" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend formatter={(v) => <span className="text-[10px] text-slate-300 capitalize">{v}</span>} />
            <Area type="monotone" dataKey="capturas"  name="Total"     stroke="#3b82f6" strokeWidth={2} fill="url(#gradCapturas)"  dot={{ fill: '#3b82f6', r: 3 }} />
            <Area type="monotone" dataKey="posteadas" name="Posteadas" stroke="#22c55e" strokeWidth={2} fill="url(#gradPosteadas)" dot={{ fill: '#22c55e', r: 3 }} />
            <Area type="monotone" dataKey="abiertas"  name="Abiertas"  stroke="#f59e0b" strokeWidth={2} fill="url(#gradAbiertas)"  dot={{ fill: '#f59e0b', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 2: Estatus + Estado + Estrategia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Estatus" icon={CheckCircle2} iconColor="text-emerald-400">
          <SimplePie data={estatusData} height={200} />
          <div className="mt-2 space-y-1">
            {estatusData.map(d => (
              <div key={d.name} className="flex justify-between text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Estado del Trámite" icon={XCircle} iconColor="text-red-400">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={estadoData} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} interval={0} angle={-10} textAnchor="end" />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" name="Registros" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {estadoData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1 space-y-1">
            {estadoData.map(d => (
              <div key={d.name} className="flex justify-between text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Estrategia / Producto" icon={Wifi} iconColor="text-teal-400">
          <SimplePie data={estrategiaData} height={200} />
          <div className="mt-2 space-y-1">
            {estrategiaData.map(d => (
              <div key={d.name} className="flex justify-between text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 3: Tipo Cliente + Tipo Línea + Tipo Cliente 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Tipo de Cliente (Línea)" icon={Users2} iconColor="text-indigo-400">
          <SimplePie data={tipoClienteData} height={180} />
          <div className="mt-2 space-y-1">
            {tipoClienteData.map(d => (
              <div key={d.name} className="flex justify-between text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Tipo de Línea" icon={Layers} iconColor="text-purple-400">
          <SimplePie data={tipoLineaData} height={180} />
          <div className="mt-2 space-y-1">
            {tipoLineaData.map(d => (
              <div key={d.name} className="flex justify-between text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Tipo de Cliente (Portabilidad)" icon={Users2} iconColor="text-sky-400">
          <SimplePie data={tipoClienteData2} height={180} />
          <div className="mt-2 space-y-1">
            {tipoClienteData2.map(d => (
              <div key={d.name} className="flex justify-between text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-bold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ────────────────────────────────────────────────────
          ANÁLISIS GEOGRÁFICO DE RIESGO
      ──────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 space-y-5 border border-red-500/10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-display font-black text-white uppercase tracking-wider">
              Análisis Geográfico de Riesgo
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30">
              {totals.morosos.red} morosos críticos
            </span>
            <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {formatMXN(totalRedLoss)} en zona roja
            </span>
          </div>
        </div>

        {/* KPIs riesgo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Zonas Críticas" value={RISK_ZONES.filter(z => z.level === 'red').length} sub="≥30% morosidad" color="border-red-500/30" />
          <KpiCard label="Zonas en Vigilancia" value={RISK_ZONES.filter(z => z.level === 'yellow').length} sub="15-30% morosidad" color="border-amber-500/30" />
          <KpiCard label="Cartera Sana" value={RISK_ZONES.filter(z => z.level === 'green').length} sub="<15% morosidad" color="border-emerald-500/30" />
          <KpiCard label="Pérdida Total Estimada" value={formatMXN(totalLoss)} sub={`${totalMorosos} morosos · ${RISK_ZONES.length} zonas`} color="border-rose-500/30" />
        </div>

        {/* Heatmap + Detalle de zona seleccionada */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartCard title="Mapa de Calor — Morosidad CDMX" icon={Flame} iconColor="text-red-400" className="md:col-span-2">
            <RiskHeatmap zones={riskZonesView} onSelect={setSelectedZone} selected={selectedZone} />
          </ChartCard>

          <ChartCard
            title={selectedZone ? `Detalle: ${selectedZone.area}` : 'Resumen de Riesgo'}
            icon={selectedZone?.level === 'red' ? AlertTriangle : ShieldCheck}
            iconColor={selectedZone ? (selectedZone.level === 'red' ? 'text-red-400' : selectedZone.level === 'yellow' ? 'text-amber-400' : 'text-emerald-400') : 'text-emerald-400'}
          >
            {selectedZone ? (
              <div className="space-y-3">
                <span className={`inline-block text-[9px] font-black px-2 py-1 rounded-lg border ${bgClassForLevel(selectedZone.level)} uppercase tracking-widest`}>
                  {labelForLevel(selectedZone.level)}
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Morosidad</span>
                    <span className="font-black text-white">{selectedZone.morosityPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Total Clientes</span>
                    <span className="font-black text-white">{selectedZone.totalClientes}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Morosos</span>
                    <span className="font-black text-red-300">{selectedZone.morosos}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Ticket Promedio</span>
                    <span className="font-black text-white">{formatMXN(selectedZone.ticketPromedio)}/mes</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-white/10 flex justify-between">
                    <span className="text-[10px] text-slate-400">Pérdida Estimada</span>
                    <span className="text-base font-black text-rose-300 font-mono">{formatMXN(selectedZone.perdidaEstimada)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Colonias incluidas</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedZone.colonias.map(c => (
                      <span key={c} className="text-[9px] bg-slate-800/60 text-slate-300 px-2 py-0.5 rounded-md border border-white/5">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Crítica
                  </span>
                  <span className="text-xs font-black text-white font-mono">{formatMXN(totals.perdida.red)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Vigilancia
                  </span>
                  <span className="text-xs font-black text-white font-mono">{formatMXN(totals.perdida.yellow)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Sana
                  </span>
                  <span className="text-xs font-black text-white font-mono">{formatMXN(totals.perdida.green)}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-white/10">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Selecciona una celda del mapa para ver detalle de colonias, morosidad y pérdida estimada.
                  </p>
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Top Zonas de Riesgo */}
        <ChartCard title="Top Zonas de Riesgo" icon={AlertTriangle} iconColor="text-red-400">
          <RiskRanking zones={riskZonesView} />
        </ChartCard>
      </div>

      {/* Row 4: Área (full wide) */}
      <ChartCard title={`Capturas por Área${localityFilter ? ` · ${localityFilter.toUpperCase()}` : ''}`} icon={MapPin} iconColor="text-rose-400">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={filteredAreaData.length > 0 ? filteredAreaData : areaData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis dataKey="area" type="category" stroke="#475569" fontSize={9} width={115} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
            </defs>
            <Bar dataKey="count" name="Capturas" fill="url(#areaGrad)" radius={[0, 8, 8, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 5: Paquetes */}
      <ChartCard title="Distribución por Paquete" icon={Package} iconColor="text-amber-400">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={paqueteData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis dataKey="paquete" type="category" stroke="#475569" fontSize={9} width={130} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <defs>
              <linearGradient id="paqGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fcd34d" />
              </linearGradient>
            </defs>
            <Bar dataKey="count" name="Registros" fill="url(#paqGrad)" radius={[0, 8, 8, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 6: Etapa PISA + Top Promotores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Etapa PISA" icon={BarChart3} iconColor="text-cyan-400">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={etapaPisaData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="etapa" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, _n: string, props: any) => [
                  `${v} registros`,
                  props?.payload?.label || props?.payload?.etapa
                ]}
              />
              <defs>
                <linearGradient id="etapaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0e7490" />
                </linearGradient>
              </defs>
              <Bar dataKey="count" name="Registros" fill="url(#etapaGrad)" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
            {etapaPisaData.map(d => (
              <div key={d.etapa} className="flex justify-between text-[9px]">
                <span className="text-slate-500">{d.etapa} – {d.label}</span>
                <span className="font-bold text-white">{d.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top 10 Promotores" icon={Users2} iconColor="text-violet-400">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={promotorTop10} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis dataKey="id" type="category" stroke="#475569" fontSize={9} width={58} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <defs>
                <linearGradient id="promGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <Bar dataKey="count" name="Capturas" fill="url(#promGrad)" radius={[0, 8, 8, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 7: Top Tiendas (full) */}
      <ChartCard title="Top 10 Tiendas CAT" icon={Store} iconColor="text-orange-400">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tiendaTop10} margin={{ top: 5, right: 10, left: -15, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="tienda" stroke="#475569" fontSize={9} tickLine={false} axisLine={false}
              angle={-30} textAnchor="end" interval={0} />
            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <defs>
              <linearGradient id="tiendaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#f97316" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
            </defs>
            <Bar dataKey="count" name="Capturas" fill="url(#tiendaGrad)" radius={[6, 6, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Footer note */}
      <div className="text-center py-2">
        <p className="text-[9px] text-slate-600 font-mono">
          INFO APP.xlsx · Origen: CAT Heavenly Dreams · 677 filas · 18 columnas · Actualizado Abr 2026
        </p>
      </div>
    </div>
  );
}
