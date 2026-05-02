import React, { useState, lazy, Suspense } from 'react';
import {
  Home, User, Wallet, Headphones,
  Bell, LogOut, PlusCircle, Activity,
  FileText, ChevronLeft, Menu, Users, Gamepad2, ClipboardCheck, FileSearch, Megaphone, X, Settings as SettingsIcon,
  Loader2, Inbox, TrendingUp
} from 'lucide-react';
import Logo from '../ui/Logo';
import { Role } from '../../App';

// Lazy-loaded components (same chunks as ManagerView — no duplication)
const Profile              = lazy(() => import('./Profile'));
const Recruitment          = lazy(() => import('./Recruitment'));
const CaptureValidation    = lazy(() => import('./CaptureValidation'));
const ConsultasSeguimiento = lazy(() => import('./ConsultasSeguimiento'));
const Payroll              = lazy(() => import('./Payroll'));
const Announcements        = lazy(() => import('./Announcements'));
const SettingsView         = lazy(() => import('./Settings'));
const MessagingHub         = lazy(() => import('./MessagingHub'));
const LeadPipeline         = lazy(() => import('../crm/LeadPipeline'));

const SectionLoader = () => (
  <div className="flex items-center justify-center h-48">
    <Loader2 className="w-7 h-7 animate-spin text-blue-400 opacity-60" />
  </div>
);

interface MobileUserViewProps {
  role: Role;
  onBack: () => void;
  onClearRole: () => void;
}

export default function MobileUserView({ role, onBack, onClearRole }: MobileUserViewProps) {
  const [activeSection, setActiveSection] = useState('Perfil');
  const [showMenu, setShowMenu] = useState(false);

  // Define available sections based on role
  let availableSections: { id: string, label: string, icon: any }[] = [];

  if (role === 'GERENTE') {
    availableSections = [
      { id: 'Dashboard',             label: 'Dashboard',    icon: Activity },
      { id: 'Perfil',                label: 'Perfil',       icon: User },
      { id: 'Captura y Validación',  label: 'Captura',      icon: ClipboardCheck },
      { id: 'Consulta y Seguimiento',label: 'Consultas',    icon: FileSearch },
      { id: 'Nóminas',               label: 'Nóminas',      icon: Wallet },
      { id: 'Reclutamiento',         label: 'Reclutamiento',icon: Users },
      { id: 'Anuncios',              label: 'Anuncios',     icon: Megaphone },
      { id: 'Ajustes',               label: 'Ajustes',      icon: SettingsIcon },
    ];
  } else if (role === 'ADMINISTRACION') {
    availableSections = [
      { id: 'Dashboard',             label: 'Dashboard',    icon: Activity },
      { id: 'Perfil',                label: 'Perfil',       icon: User },
      { id: 'Captura y Validación',  label: 'Captura',      icon: ClipboardCheck },
      { id: 'Consulta y Seguimiento',label: 'Consultas',    icon: FileSearch },
      { id: 'Nóminas',               label: 'Nóminas',      icon: Wallet },
      { id: 'Reclutamiento',         label: 'Reclutamiento',icon: Users },
      { id: 'Anuncios',              label: 'Anuncios',     icon: Megaphone },
      { id: 'Ajustes',               label: 'Ajustes',      icon: SettingsIcon },
    ];
  } else if (role === 'RECLUTADORA') {
    availableSections = [
      { id: 'Perfil',        label: 'Perfil',        icon: User },
      { id: 'Reclutamiento', label: 'Reclutamiento', icon: Users },
      { id: 'Mensajería',    label: 'Mensajería',    icon: Inbox },
      { id: 'Pipeline',      label: 'Pipeline',      icon: TrendingUp },
      { id: 'Perfil',                label: 'Perfil',       icon: User },
      { id: 'Reclutamiento',         label: 'Reclutamiento',icon: Users },
    ];
  } else if (role === 'SUPERVISOR') {
    availableSections = [
      { id: 'Perfil',                label: 'Perfil',       icon: User },
      { id: 'Captura y Validación',  label: 'Captura',      icon: ClipboardCheck },
      { id: 'Consulta y Seguimiento',label: 'Consultas',    icon: FileSearch },
    ];
  } else {
    // VENDEDOR
    availableSections = [
      { id: 'Perfil',                label: 'Perfil',       icon: User },
      { id: 'Captura y Validación',  label: 'Captura',      icon: ClipboardCheck },
      { id: 'Consulta y Seguimiento',label: 'Consultas',    icon: FileSearch },
    ];
  }

  // Bottom nav items (max 4 + Menu if needed)
  const bottomNavItems = availableSections.slice(0, 4);
  const hasMore = availableSections.length > 4;

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    setShowMenu(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617]/90 backdrop-blur-2xl relative z-10 overflow-hidden">
      
      {/* Header */}
      <header className="px-4 sm:px-6 pt-safe-top pt-8 sm:pt-12 pb-4 flex justify-between items-center bg-gradient-to-b from-[#020617] to-transparent shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClearRole} 
            className="p-2 text-slate-300 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10 mr-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Logo className="text-[36px]" />
            <div>
              <h1 className="text-sm font-black text-white tracking-tight leading-none">Heavenly Dreams</h1>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">{role}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 text-slate-300 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#020617]"></span>
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 hide-scrollbar relative">
        {/* Render Active Section */}
        {activeSection === 'Perfil' && <Suspense fallback={<SectionLoader />}><Profile onClearRole={onClearRole} /></Suspense>}
        {activeSection === 'Reclutamiento' && <Suspense fallback={<SectionLoader />}><Recruitment /></Suspense>}
        {activeSection === 'Captura y Validación' && <Suspense fallback={<SectionLoader />}><CaptureValidation /></Suspense>}
        {activeSection === 'Consulta y Seguimiento' && <Suspense fallback={<SectionLoader />}><ConsultasSeguimiento /></Suspense>}
        {activeSection === 'Nóminas' && <Suspense fallback={<SectionLoader />}><Payroll /></Suspense>}
        {activeSection === 'Anuncios' && <Suspense fallback={<SectionLoader />}><Announcements /></Suspense>}
        {activeSection === 'Ajustes'       && <Suspense fallback={<SectionLoader />}><SettingsView /></Suspense>}
        {activeSection === 'Mensajería'    && <Suspense fallback={<SectionLoader />}><MessagingHub /></Suspense>}
        {activeSection === 'Pipeline'      && <Suspense fallback={<SectionLoader />}><LeadPipeline /></Suspense>}
        {activeSection === 'Ajustes' && <Suspense fallback={<SectionLoader />}><SettingsView /></Suspense>}
      </div>

      {/* Full Screen Menu Overlay */}
      {showMenu && (
        <div className="absolute inset-0 z-40 bg-[#020617]/95 backdrop-blur-xl flex flex-col pt-24 px-6 pb-24 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Menú Principal</h2>
            <button onClick={() => setShowMenu(false)} className="p-2 bg-white/10 rounded-full text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {availableSections.map(section => (
              <button
                key={section.id}
                onClick={() => handleNavClick(section.id)}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${activeSection === section.id ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800'}`}
              >
                <section.icon className="w-8 h-8" />
                <span className="text-sm font-medium text-center">{section.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => { if (window.confirm('¿Cerrar sesión? Se perderán los cambios no guardados.')) onBack(); }} className="mt-auto flex items-center justify-center gap-2 w-full py-4 bg-red-500/10 text-red-400 rounded-xl font-bold border border-red-500/20">
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-[#020617]/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center shrink-0 z-30"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', paddingTop: '8px', minHeight: '64px' }}>
        {bottomNavItems.map(item => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeSection === item.id && !showMenu}
            onClick={() => handleNavClick(item.id)}
          />
        ))}
        {hasMore && (
          <NavItem
            icon={Menu}
            label="Menú"
            active={showMenu}
            onClick={() => setShowMenu(true)}
          />
        )}
      </nav>

    </div>
  );
}

// Subcomponents
function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200 active:scale-90 hover:scale-105 ${active ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <Icon className={`w-6 h-6 transition-transform duration-200 ${active ? 'fill-blue-400/20 scale-110' : 'hover:scale-110'}`} />
      <span className="text-[10px] font-medium truncate w-full text-center">{label}</span>
    </button>
  );
}
