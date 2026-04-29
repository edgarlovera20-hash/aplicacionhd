import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import Logo from '../ui/Logo';
import { AuroraButton } from '../ui/aurora-button';
// Sparkles uses Three.js — lazy so vendor-three only loads when auth screen is shown
const Sparkles = lazy(() => import('../ui/sparkles').then(m => ({ default: m.Sparkles })));
import { MatrixText } from '../ui/matrix-text';
import { Mail, Lock, Loader2, User, Phone, Calendar, Briefcase, Users, Eye, EyeOff, Fingerprint, ShieldCheck, X, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import { AssistedPasswordConfirmation } from '../ui/assisted-password-confirmation';
import {
  checkBiometricSupport,
  checkRegistered,
  registerBiometric,
  authenticateWithBiometric,
  isLocallyRegistered,
  clearLocalBiometric,
} from '../../services/webAuthnService';

export default function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const { login } = useAuth();

  // Basic Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration Additional Fields
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

  // ── Biometría ─────────────────────────────────────────────
  const [bioSupport, setBioSupport]       = useState<{ supported: boolean; platform: boolean; type: string } | null>(null);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioLoading, setBioLoading]       = useState(false);
  const [bioError, setBioError]           = useState('');
  const [showBioModal, setShowBioModal]   = useState(false); // modal "activar huella"
  const [lastLoggedUser, setLastLoggedUser] = useState<any>(null); // user object para activar después de login

  // Detectar soporte biométrico al montar
  useEffect(() => {
    checkBiometricSupport().then(setBioSupport);
  }, []);

  // Actualizar estado de registro cuando cambia el email
  useEffect(() => {
    if (!email || !isLogin) return;
    // Primero check local (rápido), luego confirma con servidor
    setBioRegistered(isLocallyRegistered(email));
    checkRegistered(email).then(setBioRegistered);
  }, [email, isLogin]);

  /** Iniciar sesión con huella dactilar */
  const handleBiometricLogin = useCallback(async () => {
    if (!email) { setBioError('Ingresa tu correo primero'); return; }
    setBioLoading(true); setBioError('');
    try {
      const result = await authenticateWithBiometric(email);
      if (result.ok && result.user) {
        login(result.user);
      } else {
        setBioError(result.error || 'Autenticación fallida');
      }
    } finally {
      setBioLoading(false);
    }
  }, [email, login]);

  /** Activar huella después de login con contraseña */
  const handleActivateBiometric = useCallback(async () => {
    if (!lastLoggedUser) return;
    setBioLoading(true); setBioError('');
    try {
      const result = await registerBiometric(
        lastLoggedUser.email,
        lastLoggedUser.uid,
        lastLoggedUser.nombres || lastLoggedUser.email,
      );
      if (result.ok) {
        setBioRegistered(true);
        setShowBioModal(false);
        setMessage('¡Huella dactilar activada exitosamente! La próxima vez puedes iniciar sesión con tu huella.');
        login(lastLoggedUser);
      } else {
        setBioError(result.error || 'No se pudo activar la huella');
      }
    } finally {
      setBioLoading(false);
    }
  }, [lastLoggedUser, login]);

  const generateUsername = (nombres: string, apellido: string) => {
    const clean = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    return `${clean(nombres.split(' ')[0])}.${clean(apellido)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    // Validación estricta manual para registro
    if (!isLogin && !isReset) {
      if (!formData.nombres.trim() || !formData.apellidoPaterno.trim() || !formData.telefonoCelular.trim()) {
        setError('Por favor, completa todos los campos obligatorios del perfil de forma correcta.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isReset) {
        // Implement reset endpoint if needed
        setMessage('Se ha enviado un correo para restablecer tu contraseña (Simulado).');
        setIsReset(false);
      } else if (isLogin) {
        const user = await api.post('/auth/login', { email, password });

        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }

        // Si biometría disponible y no registrada → ofrecer activación
        if (bioSupport?.platform && !bioRegistered) {
          setLastLoggedUser(user);
          setShowBioModal(true);
          // No llamamos login() aquí: esperamos decisión del usuario
        } else {
          login(user);
        }
      } else {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          setLoading(false);
          return;
        }
        
        const username = generateUsername(formData.nombres, formData.apellidoPaterno);
        const newUser = await api.post('/auth/register', {
          email, password, ...formData, usuario: username
        });
        
        setGeneratedUsername(username);
        setMessage(`Cuenta creada exitosamente. Tu usuario es: ${username}`);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Ocurrió un error en la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8 w-full max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center mb-6"
      >
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white/5 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl relative group">
            <div className="absolute inset-0 bg-blue-500/10 rounded-3xl blur-2xl group-hover:bg-blue-500/20 transition-all duration-700" />
            <Logo className="text-[72px] sm:text-[90px] relative z-10" />
          </div>
        </div>
        <div className="space-y-1">
          <MatrixText
            text="HEAVENLY DREAMS"
            className="text-2xl sm:text-3xl text-white tracking-tighter"
            initialDelay={400}
            letterAnimationDuration={480}
            letterInterval={80}
          />
          <p className="text-[9px] sm:text-[10px] text-blue-400 font-black uppercase tracking-[0.4em] opacity-80">
            Enterprise Management System
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full glass-card border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center mb-8 relative z-10">
          <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">
            {isReset ? 'Restablecer Acceso' : (isLogin ? 'Control de Acceso' : 'Registro Dream Team')}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isReset ? 'Introduce tu correo para continuar' : (isLogin ? 'Ingresa tus credenciales autorizadas' : 'Crea tu perfil de ejecutivo profesional')}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm text-center">{error}</div>}
          {message && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl text-sm text-center space-y-2">
              <p className="font-bold">{message}</p>
              {generatedUsername && (
                <div className="bg-green-500/20 p-2 rounded-lg border border-green-500/30">
                  <p className="text-xs uppercase tracking-widest opacity-70">Tu Usuario de Acceso:</p>
                  <p className="text-lg font-mono font-bold">{generatedUsername}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Common Fields */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-white/5 rounded-2xl bg-slate-950/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 transition-all text-sm selection:bg-blue-500/30 selection:text-white"
                  placeholder="ejemplo@hdreams.com"
                  required
                />
              </div>
            </div>

            {!isLogin && !isReset && (
              <>
                <div>
                  <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Nombre(s)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      name="nombres"
                      value={formData.nombres}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-1.5 border border-slate-700 rounded-xl bg-slate-800/50 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                      placeholder="Nombres"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Apellido Paterno</label>
                  <input
                    type="text"
                    name="apellidoPaterno"
                    value={formData.apellidoPaterno}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-1.5 border border-slate-700 rounded-xl bg-slate-800/50 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                    placeholder="Apellido Paterno"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Apellido Materno</label>
                  <input
                    type="text"
                    name="apellidoMaterno"
                    value={formData.apellidoMaterno}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-1.5 border border-slate-700 rounded-xl bg-slate-800/50 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                    placeholder="Apellido Materno"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Fecha de Nacimiento</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <input
                      type="date"
                      name="fechaNacimiento"
                      value={formData.fechaNacimiento}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-1.5 border border-slate-700 rounded-xl bg-slate-800/50 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Teléfono Celular</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <input
                      type="tel"
                      name="telefonoCelular"
                      value={formData.telefonoCelular}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-1.5 border border-slate-700 rounded-xl bg-slate-800/50 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                      placeholder="55 1234 5678"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Supervisor Asignado</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <input
                      type="text"
                      name="supervisorAsignado"
                      value={formData.supervisorAsignado}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-1.5 border border-slate-700 rounded-xl bg-slate-800/50 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                      placeholder="Nombre del Supervisor"
                      required
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Puesto Actual</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <select
                      name="puestoActual"
                      value={formData.puestoActual}
                      onChange={handleInputChange}
                      className="block w-full pl-9 pr-3 py-1.5 border border-slate-700 rounded-xl bg-slate-800/50 text-slate-100 focus:ring-2 focus:ring-blue-500 transition-colors appearance-none text-sm"
                    >
                      <option value="capacitacion">Capacitación</option>
                      <option value="asesor">Asesor</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="asistente_gerente">Asistente Gerente</option>
                      <option value="gerente">Gerente</option>
                      <option value="reclutadora">Reclutadora</option>
                      <option value="administradora">Administradora</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {!isReset && (
              <>
                <div className={isLogin ? "md:col-span-2" : ""}>
                  <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-12 py-3.5 border border-white/5 rounded-2xl bg-slate-950/40 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/30 transition-all text-sm selection:bg-blue-500/30 selection:text-white"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-300 mb-1 uppercase tracking-wider">Confirmar Contraseña</label>
                    <AssistedPasswordConfirmation
                      password={password}
                      onMatch={(matches) => {
                        if (matches) setConfirmPassword(password);
                        else setConfirmPassword('');
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {isLogin && !isReset && (
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-700 rounded bg-slate-800 transition-colors"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-300 cursor-pointer">
                Recordar usuario y contraseña
              </label>
            </div>
          )}

          <AuroraButton
            type="submit"
            disabled={loading}
            wrapperClassName="w-full"
            className="w-full justify-center py-4 disabled:opacity-50"
            glowClassName="from-blue-600 via-cyan-400 to-indigo-600"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isReset ? 'Enviar Instrucciones' : (isLogin ? 'Acceder al Sistema' : 'Completar Registro'))}
          </AuroraButton>

          {/* ── Botón de Huella Digital ──────────────────── */}
          {isLogin && !isReset && bioSupport?.platform && bioRegistered && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">o</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={bioLoading}
                title={`Autenticar con ${bioSupport.type}`}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-[#00ABDF]/10 to-indigo-500/10 border-[#00ABDF]/30 hover:border-[#00ABDF]/60 hover:from-[#00ABDF]/20 hover:to-indigo-500/20 text-white active:scale-[0.98]"
              >
                {bioLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#00ABDF]" />
                ) : (
                  <div className="relative animate-pulse">
                    <Fingerprint className="w-5 h-5 text-[#00ABDF]" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-black/20 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight text-white">
                    {bioLoading ? 'Verificando...' : `Iniciar con ${bioSupport.type}`}
                  </p>
                  {!bioLoading && (
                    <p className="text-[10px] text-slate-500 mt-0.5">Toca para autenticar con biometría</p>
                  )}
                </div>
              </button>
              {bioError && (
                <p className="text-xs text-red-400 text-center flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />{bioError}
                </p>
              )}
            </div>
          )}
        </form>

        {/* ── Modal: Activar Huella Digital ───────────────────────────── */}
        <AnimatePresence>
          {showBioModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 rounded-3xl"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-zinc-900 border border-white/10 rounded-3xl p-7 w-full max-w-sm shadow-2xl text-center space-y-5"
              >
                {/* Ícono animado */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#00ABDF]/20 to-indigo-500/20 border border-[#00ABDF]/30 flex items-center justify-center shadow-lg shadow-[#00ABDF]/10">
                      <Fingerprint className="w-10 h-10 text-[#00ABDF]" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-zinc-900 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Activa tu {bioSupport?.type || 'Huella Digital'}
                  </h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    La próxima vez podrás iniciar sesión de forma instantánea sin escribir tu contraseña. Tu huella <strong className="text-white">nunca abandona tu dispositivo</strong>.
                  </p>
                </div>

                {/* Beneficios */}
                <div className="bg-zinc-800/50 rounded-2xl p-4 space-y-2 text-left">
                  {[
                    { icon: '⚡', text: 'Acceso instantáneo' },
                    { icon: '🔒', text: 'Más seguro que una contraseña' },
                    { icon: '📱', text: 'Solo en este dispositivo' },
                  ].map(b => (
                    <div key={b.text} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <span className="text-base">{b.icon}</span>{b.text}
                    </div>
                  ))}
                </div>

                {bioError && (
                  <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{bioError}
                  </p>
                )}

                <div className="space-y-2">
                  <button
                    onClick={handleActivateBiometric}
                    disabled={bioLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-[#00ABDF] to-indigo-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-[#00ABDF]/20"
                  >
                    {bioLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Activando...</>
                      : <><Fingerprint className="w-4 h-4" /> Activar {bioSupport?.type || 'Huella'}</>
                    }
                  </button>
                  <button
                    onClick={() => { setShowBioModal(false); lastLoggedUser && login(lastLoggedUser); }}
                    className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium"
                  >
                    Ahora no, continuar sin huella
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 relative z-10 border-t border-white/5 pt-5">
          {isReset ? (
            <div className="text-center">
              <button
                onClick={() => { setIsLogin(true); setIsReset(false); setError(''); }}
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-black uppercase tracking-[0.2em]"
              >
                ← Volver al Portal de Acceso
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => { setIsReset(true); setError(''); }}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-medium uppercase tracking-widest whitespace-nowrap"
              >
                ¿Problemas con tu acceso?
              </button>
              <span className="w-px h-3 bg-white/10 shrink-0" />
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-black uppercase tracking-[0.15em] whitespace-nowrap"
              >
                {isLogin ? '¿Nuevo aquí?' : '← Iniciar Sesión'}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Sparkles at bottom of login page — lazy (Three.js) */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 overflow-hidden [mask-image:radial-gradient(60%_60%,white,transparent)]">
        <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#3b82f6,transparent_70%)] before:opacity-25" />
        <div className="absolute -left-1/2 top-1/2 aspect-[1/0.7] z-10 w-[200%] rounded-[100%] border-t border-blue-500/10 bg-slate-950/20" />
        <Suspense fallback={null}>
          <Sparkles
            density={500}
            color="#93c5fd"
            speed={0.5}
            opacity={0.7}
            size={1}
            className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_60%,white,transparent_85%)]"
          />
        </Suspense>
      </div>
    </div>
  );
}
