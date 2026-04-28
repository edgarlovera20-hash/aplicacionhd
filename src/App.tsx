import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import DataGridHero from './components/ui/data-grid-hero';
import ManagerView from './components/views/ManagerView';
import MobileUserView from './components/views/MobileUserView';
import AuthView from './components/views/AuthView';
import SeguimientoView from './components/views/SeguimientoView';
import Chatbot from './components/ui/Chatbot';

import {
  Crown, ShieldCheck, UserPlus, Users, Tag, LogOut, Loader2,
  Bot, X, MessageCircle,
  Award, TrendingUp, Shield, ChevronLeft,
} from 'lucide-react';
import Logo from './components/ui/Logo';
import { MatrixText } from './components/ui/matrix-text';
// Sparkles uses Three.js — lazy-load so vendor-three only fetches when visible
const Sparkles = lazy(() => import('./components/ui/sparkles').then(m => ({ default: m.Sparkles })));
import { AuroraButton } from './components/ui/aurora-button';
import { useAuth } from './contexts/AuthContext';

export type Role = 'GERENTE' | 'ADMINISTRACION' | 'RECLUTADORA' | 'SUPERVISOR' | 'VENDEDOR' | 'SEGUIMIENTO';

export const VALID_ROLES: Role[] = ['GERENTE', 'ADMINISTRACION', 'RECLUTADORA', 'SUPERVISOR', 'VENDEDOR', 'SEGUIMIENTO'];



export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isBotVisible, setIsBotVisible] = useState(true);
  const [modulePreview, setModulePreview] = useState<{
    title: string; desc: string; icon: any; color: string; role: Role; iconClassName?: string;
  } | null>(null);

  const { user, loading: authLoading, logout } = useAuth();
  const [roleLoading, setRoleLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const constraintsRef = useRef(null);

  useEffect(() => {
    if (!user) setRole(null);
    // Role is always chosen manually from the selector after login
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const handleRoleSelect = async (selectedRole: Role) => {
    if (!user) return;
    
    if (!VALID_ROLES.includes(selectedRole)) {
      console.error(`Intento de asignar un rol inválido: ${selectedRole}`);
      return;
    }
    
    // Using local state for now
    setRole(selectedRole);
  };

  const clearRole = async () => {
    if (!user) return;
    setRoleLoading(true);
    try {
      setRole(null);
    } finally {
      setRoleLoading(false);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0054A6] text-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400">{authLoading ? 'Cargando sesión...' : 'Cargando perfil...'}</p>
      </div>
    );
  }

  return (
    <div ref={constraintsRef} className={`flex flex-col w-full min-h-screen h-screen ${user ? 'overflow-hidden' : 'overflow-y-auto'} bg-[#020617] text-slate-50 font-sans relative`}>
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <DataGridHero
          rows={28}
          cols={50}
          spacing={3}
          duration={4}
          color="hsl(var(--blue))"
          animationType="pulse"
          pulseEffect={true}
          mouseGlow={true}
          opacityMin={0.03}
          opacityMax={0.45}
          background="transparent"
        />
      </div>

      {user && isBotVisible && (
        <motion.div 
          drag
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          className="fixed bottom-6 left-6 z-50 flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsBotVisible(false);
            }}
            className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full p-1 border border-slate-600 z-10 transition-colors"
            title="Ocultar asistente"
          >
            <X className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setShowChat(!showChat)}
            className="w-[60px] h-[60px] rounded-full border-[3px] border-[#E1F5FE] shadow-lg hover:scale-105 transition-transform bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col items-center justify-center text-white"
          >
            <Bot className="w-6 h-6 pointer-events-none" />
            <span className="text-[10px] font-bold leading-none mt-0.5 pointer-events-none">HD</span>
          </button>
        </motion.div>
      )}

      {user && !isBotVisible && (
        <button
          onClick={() => setIsBotVisible(true)}
          className="fixed bottom-6 left-0 z-50 bg-blue-600/50 hover:bg-blue-500/80 backdrop-blur-md border border-blue-400/30 text-white p-2 rounded-r-xl shadow-lg transition-all flex items-center gap-2 group"
          title="Mostrar asistente"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs font-medium w-0 overflow-hidden group-hover:w-auto group-hover:px-1 transition-all whitespace-nowrap">IA</span>
        </button>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {!user ? (
          <AuthView />
        ) : !role && modulePreview ? (
          <ModuleScreen
            {...modulePreview}
            onBack={() => setModulePreview(null)}
            onEnter={() => { handleRoleSelect(modulePreview.role); setModulePreview(null); }}
          />
        ) : !role ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500 overflow-y-auto custom-scrollbar">
            <div className="text-center mb-8">
              <Logo className="text-[80px] mb-4 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)] mx-auto" />
              <MatrixText
                text="DREAM TEAM PORTAL"
                className="text-2xl md:text-3xl text-white mb-1 tracking-tight"
                initialDelay={300}
                letterAnimationDuration={520}
                letterInterval={70}
              />
              <p className="text-slate-400 text-sm max-w-md mx-auto font-light tracking-wide">
                Bienvenido, {user.displayName || 'Usuario'}. Selecciona tu módulo de acceso.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
              <RoleButton
                title="Dirección"
                desc="Control total y métricas"
                icon={Crown}
                color="blue"
                iconClassName="text-amber-400"
                onClick={() => setModulePreview({ title: 'Dirección', desc: 'Control total y métricas', icon: Crown, color: 'blue', role: 'GERENTE', iconClassName: 'text-amber-400' })}
              />
              <RoleButton
                title="Administración"
                desc="Gestión y soporte"
                icon={ShieldCheck}
                color="indigo"
                onClick={() => setModulePreview({ title: 'Administración', desc: 'Gestión y soporte', icon: ShieldCheck, color: 'indigo', role: 'ADMINISTRACION' })}
              />
              <RoleButton
                title="Reclutamiento"
                desc="Selección de talento"
                icon={UserPlus}
                color="pink"
                onClick={() => setModulePreview({ title: 'Reclutamiento', desc: 'Selección de talento', icon: UserPlus, color: 'pink', role: 'RECLUTADORA' })}
              />
              <RoleButton
                title="Supervisión"
                desc="Monitoreo de equipos"
                icon={Users}
                color="purple"
                onClick={() => setModulePreview({ title: 'Supervisión', desc: 'Monitoreo de equipos', icon: Users, color: 'purple', role: 'SUPERVISOR' })}
              />
              <RoleButton
                title="Asesor"
                desc="Captura y seguimiento"
                icon={Tag}
                color="emerald"
                onClick={() => setModulePreview({ title: 'Asesor', desc: 'Captura y seguimiento', icon: Tag, color: 'emerald', role: 'VENDEDOR' })}
              />
              <RoleButton
                title="Gestión de Clientes"
                desc="WhatsApp · Seguimiento · Cobranza"
                icon={MessageCircle}
                color="cyan"
                onClick={() => setModulePreview({ title: 'Gestión de Clientes', desc: 'WhatsApp · Seguimiento · Cobranza', icon: MessageCircle, color: 'cyan', role: 'SEGUIMIENTO' })}
              />
            </div>

            {/* ── KPI Bar fija ── */}
            <div className="mt-8 w-full max-w-4xl">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Award,      label: 'Agentes Activos', value: '482',   iconColor: 'text-blue-400',    bg: 'bg-blue-500/8 border-blue-500/15'    },
                  { icon: TrendingUp, label: 'KPI Global',      value: '94.2%', iconColor: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/15' },
                  { icon: Shield,     label: 'Calidad',         value: '85%',   iconColor: 'text-purple-400',  bg: 'bg-purple-500/8 border-purple-500/15'  },
                ].map(({ icon: Ic, label, value, iconColor, bg }) => (
                  <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg}`}>
                    <Ic className={`w-4 h-4 ${iconColor} shrink-0`} />
                    <div>
                      <p className={`text-sm font-black ${iconColor} leading-none`}>{value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <AuroraButton
                onClick={logout}
                glowClassName="from-red-600 via-rose-400 to-red-600 opacity-40"
                className="flex items-center gap-2 px-6 py-3 text-slate-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </AuroraButton>
            </div>

            {/* Sparkles strip at bottom — lazy (Three.js) */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-56 overflow-hidden [mask-image:radial-gradient(60%_60%,white,transparent)]">
              <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#3b82f6,transparent_70%)] before:opacity-30" />
              <div className="absolute -left-1/2 top-1/2 aspect-[1/0.7] z-10 w-[200%] rounded-[100%] border-t border-blue-500/20 bg-slate-950/30" />
              <Suspense fallback={null}>
                <Sparkles
                  density={700}
                  color="#60a5fa"
                  speed={0.6}
                  opacity={0.8}
                  size={1.2}
                  className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_70%,white,transparent_85%)]"
                />
              </Suspense>
            </div>
          </div>
        ) : (
          <>
            {role && (
              role === 'SEGUIMIENTO'
                ? <SeguimientoView onBack={logout} onClearRole={clearRole} />
                : isMobile
                  ? <MobileUserView role={role} onBack={logout} onClearRole={clearRole} />
                  : <ManagerView role={role} onBack={logout} onClearRole={clearRole} />
            )}
          </>
        )}
      </div>

      {showChat && (
        <div className="fixed inset-0 z-[100] sm:inset-auto sm:bottom-24 sm:left-6 sm:w-[400px] sm:h-[600px] animate-in slide-in-from-bottom-10 duration-300">
          <Chatbot onClose={() => setShowChat(false)} />
        </div>
      )}
    </div>
  );
}

function RoleButton({ title, desc, icon: Icon, color, onClick, iconClassName }: any) {
  const glowMap: any = {
    blue:    'from-blue-600   via-cyan-400    to-blue-600',
    indigo:  'from-indigo-600 via-blue-400    to-indigo-600',
    pink:    'from-pink-600   via-rose-400    to-pink-600',
    purple:  'from-purple-600 via-violet-400  to-purple-600',
    emerald: 'from-emerald-600 via-teal-400   to-emerald-600',
    cyan:    'from-cyan-600   via-sky-400     to-cyan-600',
  };
  const iconColorMap: any = {
    blue:    'text-blue-400',
    indigo:  'text-indigo-400',
    pink:    'text-pink-400',
    purple:  'text-purple-400',
    emerald: 'text-emerald-400',
    cyan:    'text-cyan-400',
  };

  const glow = glowMap[color] || glowMap.blue;
  const iconColor = iconClassName || iconColorMap[color] || iconColorMap.blue;

  return (
    <div className="group relative">
      <div className={`absolute -inset-[2px] rounded-2xl bg-gradient-to-r ${glow} opacity-0 blur-md transition-all duration-500 group-hover:opacity-70 group-hover:blur-lg`} />
      <button
        onClick={onClick}
        className="relative glass-card rounded-2xl p-5 flex flex-col items-center text-center transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5 overflow-hidden border border-slate-700/60 bg-slate-900/50 backdrop-blur-md w-full"
      >
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 border border-white/10 bg-white/5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:border-white/20 group-hover:shadow-[0_0_24px_rgba(255,255,255,0.1)]">
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
        <h2 className="text-base font-display font-bold text-white mb-1">{title}</h2>
        <p className="text-xs text-slate-400 font-light leading-relaxed">{desc}</p>
        <div className={`absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r ${glow} scale-x-0 group-hover:scale-x-100 transition-transform duration-700`} />
      </button>
    </div>
  );
}

function ModuleScreen({ title, desc, icon: Icon, color, iconClassName, onBack, onEnter }: any) {
  const glowMap: any = {
    blue:    'from-blue-600   via-cyan-400    to-blue-600',
    indigo:  'from-indigo-600 via-blue-400    to-indigo-600',
    pink:    'from-pink-600   via-rose-400    to-pink-600',
    purple:  'from-purple-600 via-violet-400  to-purple-600',
    emerald: 'from-emerald-600 via-teal-400   to-emerald-600',
    cyan:    'from-cyan-600   via-sky-400     to-cyan-600',
  };
  const iconColorMap: any = {
    blue: 'text-blue-400', indigo: 'text-indigo-400', pink: 'text-pink-400',
    purple: 'text-purple-400', emerald: 'text-emerald-400', cyan: 'text-cyan-400',
  };
  const bgMap: any = {
    blue: 'bg-blue-500/10 border-blue-500/20', indigo: 'bg-indigo-500/10 border-indigo-500/20',
    pink: 'bg-pink-500/10 border-pink-500/20', purple: 'bg-purple-500/10 border-purple-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20', cyan: 'bg-cyan-500/10 border-cyan-500/20',
  };

  const glow = glowMap[color] || glowMap.blue;
  const iconColor = iconClassName || iconColorMap[color] || iconColorMap.blue;
  const bg = bgMap[color] || bgMap.blue;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
      <div className="text-center max-w-sm w-full">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 border ${bg}`}>
          <Icon className={`w-12 h-12 ${iconColor}`} />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">{title}</h1>
        <p className="text-slate-400 text-sm mb-2">{desc}</p>
        <p className="text-slate-600 text-xs italic mb-10">Módulo en construcción</p>
        <div className="flex flex-col gap-3">
          <AuroraButton
            onClick={onEnter}
            wrapperClassName="w-full"
            className="w-full justify-center py-4"
            glowClassName={`${glow} opacity-60`}
          >
            Entrar al módulo
          </AuroraButton>
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors py-2"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a módulos
          </button>
        </div>
      </div>
    </div>
  );
}
