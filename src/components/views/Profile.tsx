import React, { useState, useRef } from 'react';
import {
  Camera, Crown, Flame, Trophy, Target, TrendingUp,
  Award, Star, Zap, ChevronRight, Medal, Clock,
  BarChart2, Shield, Sparkles, QrCode, Wifi, IdCard,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import EmployeeBadge from '../EmployeeBadge';

/* ────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────── */

/** Derive a human-readable puesto label from the role string */
function getPuesto(role?: string | null): string {
  const map: Record<string, string> = {
    GERENTE:         'Director / Gerente General',
    ADMINISTRACION:  'Administrativo(a)',
    RECLUTADORA:     'Reclutadora de Talento',
    SUPERVISOR:      'Supervisor de Ventas',
    VENDEDOR:        'Asesor Comercial',
    gerente:         'Director / Gerente General',
    administradora:  'Administrativo(a)',
    reclutadora:     'Reclutadora de Talento',
    supervisor:      'Supervisor de Ventas',
    asesor:          'Asesor Comercial',
    capacitacion:    'Agente en Capacitación',
    asistente_gerente: 'Asistente de Gerencia',
  };
  return map[role ?? ''] ?? 'Colaborador(a)';
}

/** Generate a stable employee matricula from uid */
function generateMatricula(uid: string): string {
  // Take the numeric part of the uid if it exists (USR-EDGAR-001 → 001)
  const match = uid.match(/(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    return `HD-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
  }
  // Fallback: hash the uid string to 4 digits
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) & 0xffff;
  }
  return `HD-${new Date().getFullYear()}-${String(hash % 10000).padStart(4, '0')}`;
}

/* ────────────────────────────────────────────────────────
   Mock data (kept for leaderboard / achievements)
──────────────────────────────────────────────────────── */
const leaderboardData = [
  { id: 1, name: 'Ana García',    points: 1850, folios: 60, level: 18, rank: 1 },
  { id: 2, name: 'Edgar Lovera', points: 1625, folios: 50, level: 4,  rank: 2 },
  { id: 3, name: 'Carlos M.',    points: 1420, folios: 45, level: 14, rank: 3 },
  { id: 4, name: 'Elena R.',     points: 980,  folios: 30, level: 9,  rank: 4 },
  { id: 5, name: 'Luis P.',      points: 850,  folios: 25, level: 8,  rank: 5 },
];

const medals = [
  { id: 1, name: 'Primera Venta',   icon: Star,      color: 'text-yellow-400', bg: 'bg-yellow-400/10', unlocked: true },
  { id: 2, name: 'Vendedor Activo', icon: TrendingUp, color: 'text-blue-400',   bg: 'bg-blue-400/10',   unlocked: true },
  { id: 3, name: 'En Racha',        icon: Flame,      color: 'text-orange-400', bg: 'bg-orange-400/10', unlocked: true },
  { id: 4, name: 'Nivel 5',         icon: Shield,     color: 'text-purple-400', bg: 'bg-purple-400/10', unlocked: false },
  { id: 5, name: 'Top 1 Semanal',   icon: Crown,      color: 'text-yellow-300', bg: 'bg-yellow-300/10', unlocked: false },
];

const timeline = [
  { id: 1, type: 'medal', title: 'Desbloqueaste "En Racha"',  time: 'Hace 2 horas',  icon: Flame,      color: 'text-orange-400' },
  { id: 2, type: 'sale',  title: 'Venta Pagada (+25 XP)',      time: 'Ayer',           icon: DollarSign, color: 'text-emerald-400' },
  { id: 3, type: 'level', title: 'Alcanzaste el Nivel 4',      time: 'Hace 3 días',   icon: Zap,        color: 'text-blue-400' },
];

function DollarSign(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────
   Inline ID card (compact, embedded in profile)
──────────────────────────────────────────────────────── */
function InlineIDCard({
  name,
  matricula,
  puesto,
  avatar,
  uid,
  onExpand,
}: {
  name: string;
  matricula: string;
  puesto: string;
  avatar: string | null;
  uid: string;
  onExpand: () => void;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2140 60%, #0a1628 100%)',
        border: '1px solid rgba(0,171,223,0.25)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
      onClick={onExpand}
    >
      {/* Subtle glow */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[#00ABDF]/10 blur-2xl pointer-events-none" />

      {/* Top accent line */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, #0284c7, #00ABDF, #38bdf8)' }}
      />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#00ABDF] flex items-center justify-center">
              <Wifi className="w-3 h-3 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-[10px] tracking-tight leading-none">Heavenly Dreams</p>
              <p className="text-[#00ABDF] text-[7px] font-bold tracking-[0.2em] uppercase">Infinitum ®</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Matrícula</p>
            <p className="text-[#00ABDF] font-black text-[10px] font-mono">{matricula}</p>
          </div>
        </div>

        {/* Photo + info */}
        <div className="flex gap-4 items-center">
          {/* Avatar */}
          <div
            className="w-[72px] h-[88px] rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{
              background: 'rgba(0,171,223,0.08)',
              border: '1.5px solid rgba(0,171,223,0.3)',
            }}
          >
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-[#00ABDF]/40 select-none">{initials}</span>
            )}
          </div>

          {/* Data */}
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.15em]">Nombre</p>
              <p className="text-white font-black text-sm leading-tight">{name}</p>
            </div>
            <div>
              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.15em]">Puesto</p>
              <p className="text-[#00ABDF] font-bold text-[10px] leading-tight">{puesto}</p>
            </div>
            <div>
              <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.15em]">Clave</p>
              <p className="text-slate-400 font-mono text-[9px] tracking-wide">{uid.slice(0, 16)}</p>
            </div>
          </div>
        </div>

        {/* Expand hint */}
        <div className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#00ABDF]/5 border border-[#00ABDF]/10 group-hover:bg-[#00ABDF]/10 transition-all">
          <IdCard className="w-3 h-3 text-[#00ABDF]" />
          <span className="text-[9px] font-bold text-[#00ABDF] uppercase tracking-widest">Ver credencial completa</span>
        </div>
      </div>

      {/* Bottom accent */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, #0284c7, #00ABDF, #38bdf8)' }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────── */
export default function Profile({ onClearRole }: { onClearRole?: () => void }) {
  const { user } = useAuth();

  // Derive real data from auth context
  const realName      = user?.displayName || 'Empleado HD';
  const realRole      = user?.role        || 'VENDEDOR';
  const realUid       = user?.uid         || 'USR-0000-0001';
  const realEmail     = user?.email       || '';
  const realMatricula = generateMatricula(realUid);
  const realPuesto    = getPuesto(realRole);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name:  realName,
    role:  realRole,
    phone: '',
    curp:  '',
    email: realEmail,
  });
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'all-time'>('weekly');
  const [showBadge, setShowBadge] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'weekly'   as const, label: 'Semanal', icon: Clock    },
    { id: 'monthly'  as const, label: 'Mensual', icon: BarChart2 },
    { id: 'all-time' as const, label: 'Global',  icon: Trophy   },
  ];

  // XP / gamification (mock)
  const xp         = 470;
  const streakDays = 8;
  const rank       = 2;
  const ventasPagadas  = 45;
  const foliosTotales  = 50;

  const level          = Math.floor(xp / 100);
  const xpCurrentLevel = xp % 100;
  const missingXP      = (level + 1) * 100 - xp;
  const progressPercent = (xpCurrentLevel / 100) * 100;
  const successRate     = foliosTotales > 0 ? ((ventasPagadas / foliosTotales) * 100).toFixed(1) : 0;

  const isManager    = realRole === 'GERENTE' || realRole === 'gerente';
  const hasFireStreak = streakDays >= 7;
  const isTop3       = rank <= 3;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">

      {/* AI BANNER */}
      <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-3 bg-blue-500/20 rounded-2xl shadow-lg shadow-blue-500/10">
            <Sparkles className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-white font-display font-black text-sm uppercase tracking-wider">AI Insight Management</h4>
            <p className="text-slate-400 text-xs mt-1 font-medium">
              Rendimiento extraordinario detectado. Estás a solo{' '}
              <strong className="text-blue-400">{missingXP} XP</strong> de la élite Nivel {level + 1}.
            </p>
          </div>
        </div>
        <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 relative z-10 active:scale-95">
          Ver Desafíos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-1 space-y-5">

          {/* PROFILE CARD */}
          <div className={cn(
            'bg-[#020617]/80 backdrop-blur-xl rounded-3xl p-6 relative overflow-hidden transition-all duration-500',
            isTop3 ? 'ring-2 ring-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.15)]' : 'border border-white/10'
          )}>
            {isTop3 && (
              <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 animate-[spin_4s_linear_infinite] pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-4 group">
                <div className={cn(
                  'w-28 h-28 rounded-full bg-slate-800 border-4 flex items-center justify-center overflow-hidden transition-all duration-300',
                  isTop3 ? 'border-yellow-400/80' : 'border-slate-700',
                  hasFireStreak && 'shadow-[0_0_25px_rgba(249,115,22,0.5)]'
                )}>
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-slate-500">
                      {realName.charAt(0)}
                    </span>
                  )}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>

                {isManager && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-tr from-yellow-500 to-yellow-300 rounded-full flex items-center justify-center shadow-lg border-2 border-[#020617]" title="Gerente">
                    <Crown className="w-4 h-4 text-yellow-950" />
                  </div>
                )}
                {hasFireStreak && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.8)] border-2 border-[#020617]" title={`${streakDays} días en racha`}>
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="w-full space-y-3 mt-4">
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 px-4 text-white text-sm"
                    placeholder="Nombre"
                  />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 px-4 text-white text-sm"
                    placeholder="Teléfono"
                  />
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 px-4 text-white text-sm"
                    placeholder="Correo electrónico"
                  />
                  <input
                    type="text"
                    value={profileData.curp}
                    onChange={(e) => setProfileData({ ...profileData, curp: e.target.value.toUpperCase() })}
                    maxLength={18}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 px-4 text-white text-sm font-mono uppercase tracking-wider"
                    placeholder="CURP (18 caracteres)"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg">Guardar</button>
                    <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-lg">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{profileData.name}</h2>
                  <p className="text-sm text-[#00ABDF] uppercase tracking-widest font-bold mt-1">{realPuesto}</p>
                  {profileData.phone && (
                    <p className="text-xs text-slate-400 mt-1">Tel: {profileData.phone}</p>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setShowBadge(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#00ABDF]/20 hover:bg-[#00ABDF]/30 border border-[#00ABDF]/30 text-[#00ABDF] text-xs font-bold rounded-full transition-all"
                    >
                      <IdCard className="w-3.5 h-3.5" /> Credencial
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-full transition-all"
                    >
                      Editar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── EMPLOYEE ID CARD (inline) ── */}
          <InlineIDCard
            name={profileData.name}
            matricula={realMatricula}
            puesto={realPuesto}
            avatar={avatar}
            uid={realUid}
            onExpand={() => setShowBadge(true)}
          />

          {/* XP bar */}
          <div className="bg-slate-900/50 border border-white/8 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-white">Nivel {level}</span>
              <span className="text-[10px] text-slate-400">{xp} / {(level + 1) * 100} XP</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">Faltan <span className="text-blue-400 font-bold">{missingXP} XP</span> para Nivel {level + 1}</p>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Leaderboard */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-400" /> Leaderboard
            </h3>
            <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
              <div className="flex gap-2 p-1.5 bg-slate-900/50 border border-white/5 rounded-2xl w-fit">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95',
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {leaderboardData.map((u, idx) => (
                <div
                  key={u.id}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-xl transition-colors',
                    u.name === profileData.name
                      ? 'bg-blue-500/10 border border-blue-500/20'
                      : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                    idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                    idx === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-slate-800 text-slate-500'
                  )}>
                    {u.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', u.name === profileData.name ? 'text-blue-400' : 'text-slate-200')}>
                      {u.name}
                    </p>
                    <p className="text-[10px] text-slate-500">LVL {u.level} · {u.folios} folios</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{u.points}</p>
                    <p className="text-[10px] text-slate-500">PTS</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-blue-400" /> Historial de Logros
            </h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-white/10 before:to-transparent">
              {timeline.map((item) => (
                <div key={item.id} className="relative flex items-center gap-4 group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#020617] bg-slate-800 shadow shrink-0 z-10">
                    <item.icon className={cn('w-4 h-4', item.color)} />
                  </div>
                  <div className="flex-1 bg-slate-800/50 p-4 rounded-xl border border-white/5 shadow-sm">
                    <h4 className="font-bold text-slate-200 text-sm">{item.title}</h4>
                    <time className="text-xs font-medium text-slate-500">{item.time}</time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal credencial */}
      {showBadge && (
        <EmployeeBadge
          onClose={() => setShowBadge(false)}
          name={profileData.name}
          matricula={realMatricula}
          puesto={realPuesto}
          area="Heavenly Dreams SAS de CV"
          avatar={avatar}
          uid={realUid}
          curp={profileData.curp}
          email={profileData.email}
        />
      )}
    </div>
  );
}
