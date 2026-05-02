// ─────────────────────────────────────────────────────────────────────────────
// EnterpriseSidebar — Production-grade SaaS sidebar
// ─────────────────────────────────────────────────────────────────────────────
// Features:
//   ✓ Role-based item filtering       ✓ Collapsible (persisted)
//   ✓ Section color system             ✓ Active state w/ left indicator + glow
//   ✓ Badges (PRO / NEW / LIVE / count)✓ Tooltips in collapsed mode
//   ✓ Micro-interactions (translateX)  ✓ Keyboard navigation (a11y)
//   ✓ Mobile overlay support           ✓ Custom scrollbar
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, ChevronsLeft, ChevronsRight, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import Logo from './Logo';
import {
  SIDEBAR_SECTIONS,
  COLOR_TOKENS,
  type SidebarItem,
  type SidebarBadge,
  type SectionColor,
  type SidebarSection,
} from '../../configs/sidebarConfig';
import type { Role } from '../../App';

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'hdreams_sidebar_collapsed';
const EXPANDED_W = 'w-[260px]';
const COLLAPSED_W = 'w-[72px]';

// ── Props ────────────────────────────────────────────────────────────────────

interface EnterpriseSidebarProps {
  role: Role;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  onClearRole: () => void;
  /** Mobile overlay control (parent manages backdrop) */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ── Badge Component ──────────────────────────────────────────────────────────

const ItemBadge: React.FC<{ badge: SidebarBadge }> = ({ badge }) => {
  switch (badge.variant) {
    case 'pro':
      return (
        <span className="ml-auto shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-600/80 to-fuchsia-500/80 text-white shadow-sm">
          {badge.text}
        </span>
      );
    case 'new':
      return (
        <span className="ml-auto shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/20">
          {badge.text}
        </span>
      );
    case 'live':
      return (
        <span className="ml-auto shrink-0 relative flex h-2 w-2" aria-label="En vivo">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
        </span>
      );
    case 'count':
      return (
        <span className="ml-auto shrink-0 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-black rounded-full bg-red-500/20 text-red-400 border border-red-500/20 px-1">
          {badge.text}
        </span>
      );
    default:
      return null;
  }
};

// ── Nav Item Component ───────────────────────────────────────────────────────

interface NavItemProps {
  item: SidebarItem;
  active: boolean;
  collapsed: boolean;
  color: SectionColor;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, active, collapsed, color, onClick }) => {
  const tokens = COLOR_TOKENS[color];
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Base
        'group relative w-full flex items-center rounded-xl transition-all duration-200 outline-none',
        // Border-left indicator
        'border-l-[3px]',
        // Sizing
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
        // States
        active
          ? cn(
              tokens.activeBg,
              tokens.activeBorder,
              tokens.activeGlow,
              'text-white',
            )
          : cn(
              'border-l-transparent text-slate-400',
              tokens.hoverBg,
              'hover:text-white',
              // Micro-interaction: slide right on hover
              !collapsed && 'hover:translate-x-[3px]',
            ),
        // Focus
        'focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950',
        // Active press
        'active:scale-[0.97]',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'shrink-0 flex items-center justify-center rounded-lg transition-all duration-200',
          collapsed ? 'w-9 h-9' : 'w-8 h-8',
          active
            ? cn(tokens.activeIcon.replace('text-', 'bg-').replace('400', '500/20'), tokens.activeIcon)
            : cn('bg-white/[0.04] text-slate-400', 'group-hover:text-white group-hover:bg-white/[0.08]'),
        )}
      >
        <Icon className={cn('transition-transform duration-200 group-hover:scale-110', collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]')} />
      </div>

      {/* Label */}
      {!collapsed && (
        <span className="text-[13px] font-semibold tracking-wide truncate leading-tight">
          {item.label}
        </span>
      )}

      {/* Badge */}
      {!collapsed && item.badge && <ItemBadge badge={item.badge} />}

      {/* Active dot (collapsed mode) */}
      {collapsed && active && (
        <span className={cn('absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full', tokens.dot)} />
      )}

      {/* Tooltip (collapsed mode) */}
      {collapsed && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-full ml-3 z-[60]',
            'px-3 py-1.5 rounded-lg',
            'bg-zinc-900 border border-white/10 shadow-xl shadow-black/40',
            'text-[11px] font-semibold text-white whitespace-nowrap',
            'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0',
            'transition-all duration-200 delay-150',
          )}
        >
          {item.label}
          {item.badge && item.badge.variant === 'pro' && (
            <span className="ml-1.5 text-[8px] font-black text-violet-400">{item.badge.text}</span>
          )}
        </div>
      )}
    </button>
  );
};

// ── Section Header Component ─────────────────────────────────────────────────

interface SectionHeaderProps {
  section: SidebarSection;
  collapsed: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ section, collapsed }) => {
  if (!section.label) return null;
  const tokens = COLOR_TOKENS[section.color];

  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-2 my-1">
        <div className={cn('w-5 h-px rounded-full opacity-30', tokens.dot)} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 pt-5 pb-1.5">
      <div className={cn('w-1 h-1 rounded-full', tokens.dot)} />
      <span className={cn('text-[10px] font-bold uppercase tracking-[0.2em]', tokens.sectionLabel)}>
        {section.label}
      </span>
    </div>
  );
};

// ── Main Sidebar Component ───────────────────────────────────────────────────

const EnterpriseSidebar: React.FC<EnterpriseSidebarProps> = ({
  role,
  activeSection,
  onNavigate,
  onLogout,
  onClearRole,
  mobileOpen = false,
  onMobileClose,
}) => {
  // Persist collapsed state
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Auto-collapse on tablets (< 1024px), otherwise read from storage
    if (window.innerWidth < 1024) return true;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? saved === '1' : false;
  });

  const navRef = useRef<HTMLElement>(null);

  // Auto-collapse/expand on resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1280) setCollapsed(false);
      else if (window.innerWidth < 1024) setCollapsed(true);
      // Close mobile overlay on desktop
      if (window.innerWidth >= 768) onMobileClose?.();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [onMobileClose]);

  // Persist collapsed state
  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  // Keyboard: Escape closes mobile sidebar
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMobileClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  // Filter items by role
  const filterByRole = (items: SidebarItem[]) =>
    items.filter(item => item.roles.includes(role));

  // Count visible items per section (skip empty sections)
  const visibleSections = SIDEBAR_SECTIONS
    .map(section => ({ ...section, items: filterByRole(section.items) }))
    .filter(section => section.items.length > 0);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    onMobileClose?.();
  };

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión? Se perderán los cambios no guardados.')) {
      onLogout();
    }
  };

  return (
    <>
      {/* ── Mobile backdrop ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        aria-label="Menú principal"
        className={cn(
          // Layout
          'flex flex-col rounded-2xl relative z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          // Background
          'bg-slate-950/80 backdrop-blur-2xl border border-white/[0.06]',
          // Shadow
          'shadow-[0_0_60px_rgba(0,0,0,0.3)]',
          // Width
          collapsed ? COLLAPSED_W : EXPANDED_W,
          // Positioning
          'fixed md:relative inset-y-0 left-0 m-3',
          // Mobile slide
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-[calc(100%+24px)] md:translate-x-0',
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="relative h-16 flex items-center px-4 border-b border-white/[0.06] shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/20 border border-white/10">
                <Logo className="text-[22px]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white tracking-tight leading-none truncate">
                  Heavenly Dreams
                </h1>
                <p className="text-[8px] text-blue-400 font-bold tracking-[0.3em] uppercase mt-0.5">
                  Enterprise CRM
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/20 border border-white/10">
              <Logo className="text-[22px]" />
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapse}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className={cn(
              'absolute -right-3 top-1/2 -translate-y-1/2 z-50',
              'w-7 h-7 rounded-full',
              'bg-blue-600 border-2 border-white',
              'flex items-center justify-center',
              'text-white hover:bg-blue-500 hover:scale-110',
              'transition-all duration-200 shadow-[0_0_15px_rgba(59,130,246,0.5)]',
              'hidden md:flex',
            )}
          >
            {collapsed
              ? <ChevronsRight className="w-3 h-3" />
              : <ChevronsLeft className="w-3 h-3" />
            }
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav
          ref={navRef}
          className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar"
          aria-label="Navegación del sistema"
        >
          {visibleSections.map(section => (
            <div key={section.id} role="group" aria-label={section.label || 'Principal'}>
              <SectionHeader section={section} collapsed={collapsed} />
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={activeSection === item.id}
                    collapsed={collapsed}
                    color={section.color}
                    onClick={() => handleNavigate(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.06] p-2 space-y-1 shrink-0">
          {/* Module selector */}
          <button
            onClick={onClearRole}
            title={collapsed ? 'Cambiar módulo' : undefined}
            className={cn(
              'group w-full flex items-center rounded-xl transition-all duration-200',
              collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5',
              'text-slate-400 hover:text-white hover:bg-white/[0.04]',
              'active:scale-[0.97]',
            )}
          >
            <Layers className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="text-xs font-semibold tracking-wide">Cambiar Módulo</span>
            )}
            {collapsed && (
              <div className="pointer-events-none absolute left-full ml-3 z-[60] px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 shadow-xl shadow-black/40 text-[11px] font-semibold text-white whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 delay-150">
                Cambiar Módulo
              </div>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
            className={cn(
              'group w-full flex items-center rounded-xl transition-all duration-200',
              collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5',
              'text-slate-400 hover:text-red-400 hover:bg-red-500/[0.06]',
              'active:scale-[0.97]',
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="text-xs font-bold tracking-wide">Salir del Sistema</span>
            )}
            {collapsed && (
              <div className="pointer-events-none absolute left-full ml-3 z-[60] px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 shadow-xl shadow-black/40 text-[11px] font-semibold text-white whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 delay-150">
                Cerrar Sesión
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default EnterpriseSidebar;
