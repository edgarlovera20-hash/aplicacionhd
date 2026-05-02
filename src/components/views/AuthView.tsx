import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import Logo from '../ui/Logo';
import { AuroraButton } from '../ui/aurora-button';
const Sparkles = lazy(() => import('../ui/sparkles').then(m => ({ default: m.Sparkles })));
import { MatrixText } from '../ui/matrix-text';
import { Mail, Lock, Loader2, User, Phone, Calendar, Briefcase, Users, Eye, EyeOff, Fingerprint, ShieldCheck, X, CheckCircle2, AlertCircle, Smartphone, ArrowRight, ChevronDown, Sparkles as SparklesIcon } from 'lucide-react';
import {
  checkBiometricSupport,
  checkRegistered,
  registerBiometric,
  authenticateWithBiometric,
  isLocallyRegistered,
} from '../../services/webAuthnService';

export default function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const { login } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    telefonoCelular: '',
    supervisorAsignado: '',
    puestoActual: 'capacitacion'
  });

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [generatedUsername, setGeneratedUsername] = useState('');

  // Biometría
  const [bioSupport, setBioSupport] = useState<{ supported: boolean; platform: boolean; type: string } | null>(null);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState('');
  const [showBioModal, setShowBioModal] = useState(false);
  const [lastLoggedUser, setLastLoggedUser] = useState<any>(null);

  useEffect(() => {
    checkBiometricSupport().then(setBioSupport);
  }, []);

  useEffect(() => {
    if (!email || !isLogin) return;
    setBioRegistered(isLocallyRegistered(email));
    checkRegistered(email).then(setBioRegistered);
  }, [email, isLogin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isReset) {
        setMessage('Instrucciones enviadas a tu correo.');
        setIsReset(false);
      } else if (isLogin) {
        const user = await api.post('/auth/login', { email, password });
        if (rememberMe) localStorage.setItem('remembered_email', email);
        if (bioSupport?.platform && !bioRegistered) {
          setLastLoggedUser(user);
          setShowBioModal(true);
        } else {
          login(user);
        }
      } else {
        if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden.');
        const username = `${formData.nombres.split(' ')[0]}.${formData.apellidoPaterno}`.toLowerCase();
        await api.post('/auth/register', { email, password, ...formData, usuario: username });
        setGeneratedUsername(username);
        setMessage(`¡Bienvenido al Dream Team! Usuario: ${username}`);
      }
    } catch (err: any) {
      setError(err.message || 'Error en el proceso.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email) { setBioError('Ingresa tu correo'); return; }
    setBioLoading(true);
    try {
      const result = await authenticateWithBiometric(email);
      if (result.ok && result.user) login(result.user);
      else setBioError(result.error || 'Fallo');
    } finally { setBioLoading(false); }
  };

  const handleActivateBiometric = async () => {
    if (!lastLoggedUser) return;
    setBioLoading(true);
    try {
      const result = await registerBiometric(lastLoggedUser.email, lastLoggedUser.uid, lastLoggedUser.nombres || lastLoggedUser.email);
      if (result.ok) { setShowBioModal(false); login(lastLoggedUser); }
      else setBioError(result.error || 'Error');
    } finally { setBioLoading(false); }
  };

  return (
    <div className="relative min-h-screen bg-[#020617] overflow-x-hidden selection:bg-blue-500/30 selection:text-white flex flex-col items-center">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e293b,transparent)] opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,#0f172a,transparent)] opacity-30" />
        <Suspense fallback={null}>
          <Sparkles density={40} color="#3b82f6" speed={0.1} opacity={0.2} size={1.2} className="absolute inset-0" />
        </Suspense>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-4xl px-4 py-12 flex flex-col items-center">
        
        {/* Animated Header */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "circOut" }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-6">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 1, -1, 0]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="p-5 bg-white/5 rounded-[3rem] border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.1)] backdrop-blur-2xl relative z-10"
            >
              <Logo className="text-[90px] sm:text-[120px]" />
            </motion.div>
            <div className="absolute -inset-4 bg-blue-500/20 rounded-[4rem] blur-3xl -z-10 animate-pulse" />
          </div>
          
          <div className="space-y-3">
            <MatrixText
              text="HEAVENLY DREAMS"
              className="text-4xl sm:text-6xl text-white font-black tracking-tight"
              initialDelay={500}
            />
            <motion.div 
              initial={{ opacity: 0, letterSpacing: "0.2em" }}
              animate={{ opacity: 1, letterSpacing: "0.5em" }}
              transition={{ delay: 1, duration: 1.5 }}
              className="text-[10px] sm:text-[14px] text-blue-400 font-black uppercase flex items-center justify-center gap-3"
            >
              <span className="h-px w-8 bg-blue-500/30" />
              Enterprise Management System
              <span className="h-px w-8 bg-blue-500/30" />
            </motion.div>
          </div>
        </motion.div>

        {/* Dynamic Form Perspective Container */}
        <motion.div
          layout
          className="w-full relative"
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          {/* Form Card */}
          <div className="glass-card border-white/10 rounded-[3rem] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)] flex flex-col md:flex-row">
            
            {/* Left Sidebar Info (Visual Attraction) */}
            <div className="w-full md:w-1/3 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between items-start relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <SparklesIcon className="w-32 h-32 text-white" />
              </div>
              
              <div className="space-y-6 relative z-10">
                <div className="p-3 bg-white/10 rounded-2xl w-fit">
                  {isLogin ? <Lock className="w-6 h-6 text-blue-400" /> : <User className="w-6 h-6 text-emerald-400" />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                    {isLogin ? 'Acceso Seguro' : 'Únete al Equipo'}
                  </h3>
                  <p className="text-slate-400 text-sm mt-2 font-medium">
                    {isLogin 
                      ? 'Gestiona tus operaciones con el poder de la IA avanzada.' 
                      : 'Tu dream team comienza aquí.'}
                  </p>
                </div>
              </div>

              {!isLogin && (
                <div className="mt-8 space-y-4 w-full">
                  {[
                    { label: 'Identidad', active: true },
                    { label: 'Personal', active: false },
                    { label: 'Profesional', active: false }
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${step.active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-white/10'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${step.active ? 'text-white' : 'text-slate-600'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-8 space-y-4">
                <button
                  onClick={() => { setIsLogin(!isLogin); setIsReset(false); setError(''); setMessage(''); }}
                  className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {isLogin ? 'Crear Cuenta' : 'Ya tengo cuenta'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                  type="button"
                  onClick={() => alert('Aviso de Privacidad: Sus datos están protegidos bajo cifrado de extremo a extremo.')}
                  className="block text-[9px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Aviso de Privacidad
                </button>
              </div>
            </div>

            {/* Right Form Area (Scrollable Flow) */}
            <div className="w-full md:w-2/3 p-6 sm:p-10 max-h-[70vh] md:max-h-none overflow-y-auto custom-scrollbar bg-slate-950/20">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold">
                    <AlertCircle className="w-5 h-5" /> {error}
                  </motion.div>
                )}
                
                {message && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3 text-emerald-400 font-black">
                      <CheckCircle2 className="w-6 h-6" /> {message}
                    </div>
                    {generatedUsername && (
                      <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/20 text-center">
                        <p className="text-[10px] uppercase font-bold opacity-60">Usuario:</p>
                        <p className="text-2xl font-mono font-black tracking-tighter">{generatedUsername}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Form Fields Flow */}
                <div className="space-y-6">
                  {/* Phase 1: Identity */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Credenciales</span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type="email"
                          placeholder="ejemplo@hdreams.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all"
                          required
                        />
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Tu Contraseña"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/40 transition-all"
                          required
                          minLength={6}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {!isLogin && (
                        <div className="relative group">
                          <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                          <input
                            type="password"
                            placeholder="Confirmar Contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full pl-12 pr-4 py-4 bg-white/5 border rounded-2xl text-white text-sm focus:outline-none focus:ring-4 transition-all ${
                              confirmPassword && password === confirmPassword ? 'border-emerald-500/40 focus:ring-emerald-500/10' : 'border-white/5 focus:ring-blue-500/10'
                            }`}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phase 2: Personal (Registration Only) */}
                  {!isLogin && !isReset && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pt-4">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Datos Personales</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input name="nombres" type="text" placeholder="Nombre completo" value={formData.nombres} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" required />
                        </div>
                        <input name="apellidoPaterno" type="text" placeholder="Ap. Paterno" value={formData.apellidoPaterno} onChange={handleInputChange} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" required />
                        <input name="apellidoMaterno" type="text" placeholder="Ap. Materno" value={formData.apellidoMaterno} onChange={handleInputChange} className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" required />
                        <div className="relative group">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input name="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" required />
                        </div>
                        <div className="relative group">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input name="telefonoCelular" type="tel" placeholder="55 1234 5678" value={formData.telefonoCelular} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" required />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Perfil de Trabajo</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <input name="supervisorAsignado" type="text" placeholder="Nombre del Supervisor" value={formData.supervisorAsignado} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" required />
                        </div>
                        <div className="relative group">
                          <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                          <select name="puestoActual" value={formData.puestoActual} onChange={handleInputChange} className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white text-sm appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all">
                            <option value="capacitacion">Capacitación</option>
                            <option value="asesor">Asesor</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="asistente_gerente">Asistente Gerente</option>
                            <option value="gerente">Gerente</option>
                            <option value="reclutadora">Reclutadora</option>
                            <option value="administradora">Administradora</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Submission & Footer */}
                <div className="pt-6 space-y-6">
                  {isLogin && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-0 transition-all" />
                        <span className="text-xs text-slate-500 group-hover:text-slate-300 font-bold uppercase tracking-widest transition-colors">Recordar acceso</span>
                      </label>
                      <button type="button" onClick={() => setIsReset(true)} className="text-xs text-slate-500 hover:text-blue-400 font-bold uppercase tracking-widest transition-colors">¿Problemas?</button>
                    </div>
                  )}

                  <AuroraButton
                    type="submit"
                    disabled={loading}
                    wrapperClassName="w-full"
                    className="w-full justify-center py-5 text-base font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(59,130,246,0.3)]"
                    glowClassName="from-blue-600 via-cyan-400 to-indigo-600"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isReset ? 'Recuperar' : (isLogin ? 'Entrar al Sistema' : 'Completar Registro'))}
                  </AuroraButton>

                  {isLogin && bioSupport?.platform && bioRegistered && (
                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={bioLoading}
                      className="w-full py-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-4 transition-all group"
                    >
                      <Fingerprint className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-black text-white uppercase tracking-widest">Acceso Biométrico</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Footer Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 2 }}
          className="mt-12 text-[10px] text-slate-500 font-bold uppercase tracking-[0.6em] text-center"
        >
          © 2026 Heavenly Dreams SAS de CV • Elite Management
        </motion.p>
      </div>

      {/* Biometric Modal Overlay */}
      <AnimatePresence>
        {showBioModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-zinc-900 border border-white/10 rounded-[3rem] p-10 max-w-sm w-full text-center space-y-8 shadow-[0_0_100px_rgba(59,130,246,0.2)]">
              <div className="relative inline-block">
                <Fingerprint className="w-20 h-20 text-blue-400" />
                <div className="absolute -inset-4 bg-blue-500/20 blur-2xl -z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase">Biometría</h3>
                <p className="text-slate-400 text-sm">Entra al sistema sin contraseñas en este dispositivo.</p>
              </div>
              <div className="space-y-3">
                <button onClick={handleActivateBiometric} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all">Activar Ahora</button>
                <button onClick={() => { setShowBioModal(false); login(lastLoggedUser); }} className="text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Omitir por ahora</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
