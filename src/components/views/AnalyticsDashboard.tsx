import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart2, MessageSquare, Users, Zap, TrendingUp, RefreshCw } from 'lucide-react';

type Granularity = 'hour' | 'day';
type MetricKey = 'messages_received' | 'leads_created' | 'automations_fired';

interface DataPoint { hour?: string; day?: string; count: number; }
interface ConvStats { byChannel: Array<{ channel: string; count: string }>; byStatus: Array<{ status: string; count: string }>; }
interface LeadFunnel { stage: string; count: string; avg_score: string; avg_days: string; }

const METRIC_OPTIONS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'messages_received', label: 'Mensajes recibidos', color: '#3b82f6' },
  { key: 'leads_created',     label: 'Leads creados',       color: '#10b981' },
  { key: 'automations_fired', label: 'Automatizaciones',    color: '#a855f7' },
];

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366', telegram: '#2CA5E0', facebook: '#1877F2', sms: '#f59e0b', voice: '#ef4444',
};

const STAGE_COLORS: Record<string, string> = {
  new: '#3b82f6', contacted: '#eab308', qualified: '#a855f7', proposal: '#f97316', won: '#22c55e', lost: '#ef4444',
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className={`bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 flex items-center gap-3`}>
      <div className={`p-2 rounded-lg`} style={{ background: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold text-white">{value}</div>
        <div className="text-xs text-zinc-400">{label}</div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [granularity, setGranularity] = useState<Granularity>('hour');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('messages_received');
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [convStats, setConvStats] = useState<ConvStats>({ byChannel: [], byStatus: [] });
  const [leadFunnel, setLeadFunnel] = useState<LeadFunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, convRes, leadsRes] = await Promise.all([
        fetch(`/api/analytics/metrics?metric=${selectedMetric}&granularity=${granularity}`, { credentials: 'include' }),
        fetch('/api/analytics/conversations', { credentials: 'include' }),
        fetch('/api/analytics/leads', { credentials: 'include' }),
      ]);
      if (metricsRes.ok) {
        const d = await metricsRes.json();
        setChartData(d.data || []);
      }
      if (convRes.ok) setConvStats(await convRes.json());
      if (leadsRes.ok) setLeadFunnel(await leadsRes.json());
    } catch {}
    setLoading(false);
    setLastRefresh(new Date());
  }, [selectedMetric, granularity]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const totalMessages = chartData.reduce((s, d) => s + d.count, 0);
  const totalLeads = leadFunnel.reduce((s, d) => s + parseInt(d.count), 0);
  const wonLeads = leadFunnel.find(d => d.stage === 'won');

  const xKey = granularity === 'hour' ? 'hour' : 'day';
  const metricColor = METRIC_OPTIONS.find(m => m.key === selectedMetric)?.color || '#3b82f6';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg"><BarChart2 className="w-5 h-5 text-blue-400" /></div>
          <div>
            <h2 className="text-lg font-bold text-white">Analytics en Tiempo Real</h2>
            <p className="text-xs text-zinc-400">Actualización cada 30s — {lastRefresh.toLocaleTimeString('es-MX')}</p>
          </div>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="p-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Mensajes (hoy)" value={totalMessages} icon={MessageSquare} color="#3b82f6" />
        <StatCard label="Total Leads" value={totalLeads} icon={Users} color="#10b981" />
        <StatCard label="Ganados" value={wonLeads?.count || 0} icon={TrendingUp} color="#22c55e" />
        <StatCard label="Conversaciones" value={convStats.byStatus.reduce((s, d) => s + parseInt(d.count), 0)} icon={Zap} color="#a855f7" />
      </div>

      {/* Main chart */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {METRIC_OPTIONS.map(m => (
            <button key={m.key} onClick={() => setSelectedMetric(m.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                selectedMetric === m.key
                  ? 'border-current text-white'
                  : 'border-zinc-600 text-zinc-400 hover:text-white'
              }`}
              style={selectedMetric === m.key ? { color: m.color, borderColor: m.color, background: `${m.color}20` } : {}}
            >
              {m.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            {(['hour','day'] as const).map(g => (
              <button key={g} onClick={() => setGranularity(g)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  granularity === g ? 'border-zinc-400 text-white' : 'border-zinc-700 text-zinc-500'
                }`}>
                {g === 'hour' ? 'Por hora' : 'Por día'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metricColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={metricColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey={xKey} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
            <Area type="monotone" dataKey="count" stroke={metricColor} fill="url(#metricGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: channel pie + lead funnel */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Channel breakdown */}
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Conversaciones por canal</h3>
          {convStats.byChannel.length === 0 ? (
            <p className="text-xs text-zinc-500 italic text-center py-6">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={convStats.byChannel} dataKey="count" nameKey="channel" cx="50%" cy="50%" outerRadius={60} label={(props: any) => `${props.channel} ${((props.percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {convStats.byChannel.map((entry, i) => (
                    <Cell key={i} fill={CHANNEL_COLORS[entry.channel] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Lead funnel */}
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Embudo de leads</h3>
          {leadFunnel.length === 0 ? (
            <p className="text-xs text-zinc-500 italic text-center py-6">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={leadFunnel} layout="vertical">
                <XAxis type="number" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <YAxis type="category" dataKey="stage" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={60} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {leadFunnel.map((entry, i) => (
                    <Cell key={i} fill={STAGE_COLORS[entry.stage] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
