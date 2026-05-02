// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Configuration — Enterprise CRM
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the navigation structure.
// Add / remove / reorder items here — the Sidebar component reads this config.
// ─────────────────────────────────────────────────────────────────────────────

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, User,
  ClipboardCheck, FileSearch, TrendingUp,
  FileText, Headphones, Kanban, Users,
  Wallet, AlertTriangle,
  BarChart3, BarChart2, Shield, Database,
  Inbox, MessageCircle, Megaphone,
  Brain, Zap, Settings,
} from 'lucide-react';
import type { Role } from '../App';

// ── Types ────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'pro' | 'new' | 'live' | 'count';

export interface SidebarBadge {
  text: string;
  variant: BadgeVariant;
}

export interface SidebarItem {
  /** Must match the `activeSection` string used in ManagerView */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Which roles can see this item */
  roles: Role[];
  badge?: SidebarBadge;
  /** Visual emphasis — used for real-time / messaging channels */
  highlight?: boolean;
}

export type SectionColor = 'blue' | 'indigo' | 'emerald' | 'violet' | 'cyan' | 'amber';

export interface SidebarSection {
  id: string;
  /** Empty string = no header (used for top-level items like Dashboard) */
  label: string;
  color: SectionColor;
  items: SidebarItem[];
}

// ── Role groups (DRY) ────────────────────────────────────────────────────────

const MGT: Role[] = ['GERENTE', 'ADMINISTRACION'];
const OPS: Role[] = ['GERENTE', 'ADMINISTRACION', 'SUPERVISOR', 'VENDEDOR'];
const REC: Role[] = ['GERENTE', 'ADMINISTRACION', 'RECLUTADORA'];
const ALL: Role[] = ['GERENTE', 'ADMINISTRACION', 'RECLUTADORA', 'SUPERVISOR', 'VENDEDOR', 'SEGUIMIENTO'];

// ── Section definitions ──────────────────────────────────────────────────────

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  // ── Overview (no header) ────────────────────────────────────────────────
  {
    id: 'overview',
    label: '',
    color: 'blue',
    items: [
      { id: 'Dashboard', label: 'Dashboard',  icon: LayoutDashboard, roles: ['GERENTE'] },
      { id: 'Perfil',    label: 'Mi Perfil',   icon: User,            roles: ALL },
    ],
  },

  // ── Operaciones ─────────────────────────────────────────────────────────
  {
    id: 'operaciones',
    label: 'Operaciones',
    color: 'blue',
    items: [
      { id: 'Captura y Validación',   label: 'Captura & Validar', icon: ClipboardCheck, roles: OPS },
      { id: 'Consulta y Seguimiento', label: 'Seguimiento',       icon: FileSearch,     roles: OPS },
      { id: 'Pipeline',               label: 'Pipeline Leads',    icon: TrendingUp,     roles: MGT, badge: { text: 'NEW', variant: 'new' } },
    ],
  },

  // ── CRM ─────────────────────────────────────────────────────────────────
  {
    id: 'crm',
    label: 'CRM',
    color: 'indigo',
    items: [
      { id: 'Sales CRM',         label: 'Ventas',        icon: FileText,   roles: MGT },
      { id: 'Soporte a Clientes',label: 'Soporte',       icon: Headphones, roles: MGT },
      { id: 'CRM Interactivo',   label: 'Interactivo',   icon: Kanban,     roles: MGT },
      { id: 'Reclutamiento',     label: 'Reclutamiento', icon: Users,      roles: REC },
    ],
  },

  // ── Finanzas ────────────────────────────────────────────────────────────
  {
    id: 'finanzas',
    label: 'Finanzas',
    color: 'emerald',
    items: [
      { id: 'Nóminas',   label: 'Nóminas',   icon: Wallet,        roles: MGT },
      { id: 'Morosidad', label: 'Morosidad', icon: AlertTriangle, roles: MGT },
    ],
  },

  // ── Inteligencia ────────────────────────────────────────────────────────
  {
    id: 'inteligencia',
    label: 'Inteligencia',
    color: 'violet',
    items: [
      { id: 'Analytics',     label: 'Analytics',     icon: Database,  roles: MGT },
      { id: 'Analytics Pro', label: 'Analytics Pro', icon: BarChart2, roles: MGT, badge: { text: 'PRO', variant: 'pro' } },
      { id: 'Reportes',      label: 'Reportes',      icon: BarChart3, roles: MGT },
      { id: 'Audit Log',     label: 'Auditoría',     icon: Shield,    roles: MGT },
    ],
  },

  // ── Comunicación ────────────────────────────────────────────────────────
  {
    id: 'comunicacion',
    label: 'Comunicación',
    color: 'cyan',
    items: [
      { id: 'Mensajería',           label: 'Mensajería Hub', icon: Inbox,         roles: MGT, highlight: true, badge: { text: '', variant: 'live' } },
      { id: 'Seguimiento Clientes', label: 'WhatsApp CRM',   icon: MessageCircle, roles: MGT, highlight: true, badge: { text: '', variant: 'live' } },
      { id: 'Anuncios',             label: 'Anuncios',       icon: Megaphone,     roles: REC },
    ],
  },

  // ── Sistema ─────────────────────────────────────────────────────────────
  {
    id: 'sistema',
    label: 'Sistema',
    color: 'amber',
    items: [
      { id: 'Agentes IA',       label: 'Agentes IA',       icon: Brain,    roles: ['GERENTE'], badge: { text: 'AI', variant: 'pro' } },
      { id: 'Automatizaciones', label: 'Automatizaciones', icon: Zap,      roles: MGT },
      { id: 'Ajustes',          label: 'Ajustes',          icon: Settings, roles: MGT },
    ],
  },
];

// ── Color style map ──────────────────────────────────────────────────────────
// Pre-defined Tailwind classes — safe for purging.

export interface SectionColorTokens {
  activeBg:     string;
  activeBorder: string;
  activeIcon:   string;
  activeGlow:   string;
  dot:          string;
  sectionLabel: string;
  hoverBg:      string;
}

export const COLOR_TOKENS: Record<SectionColor, SectionColorTokens> = {
  blue: {
    activeBg:     'bg-blue-500/[0.12]',
    activeBorder: 'border-l-blue-500',
    activeIcon:   'text-blue-400',
    activeGlow:   'shadow-[0_0_16px_rgba(59,130,246,0.12)]',
    dot:          'bg-blue-500',
    sectionLabel: 'text-blue-400/50',
    hoverBg:      'hover:bg-blue-500/[0.06]',
  },
  indigo: {
    activeBg:     'bg-indigo-500/[0.12]',
    activeBorder: 'border-l-indigo-500',
    activeIcon:   'text-indigo-400',
    activeGlow:   'shadow-[0_0_16px_rgba(99,102,241,0.12)]',
    dot:          'bg-indigo-500',
    sectionLabel: 'text-indigo-400/50',
    hoverBg:      'hover:bg-indigo-500/[0.06]',
  },
  emerald: {
    activeBg:     'bg-emerald-500/[0.12]',
    activeBorder: 'border-l-emerald-500',
    activeIcon:   'text-emerald-400',
    activeGlow:   'shadow-[0_0_16px_rgba(16,185,129,0.12)]',
    dot:          'bg-emerald-500',
    sectionLabel: 'text-emerald-400/50',
    hoverBg:      'hover:bg-emerald-500/[0.06]',
  },
  violet: {
    activeBg:     'bg-violet-500/[0.12]',
    activeBorder: 'border-l-violet-500',
    activeIcon:   'text-violet-400',
    activeGlow:   'shadow-[0_0_16px_rgba(139,92,246,0.12)]',
    dot:          'bg-violet-500',
    sectionLabel: 'text-violet-400/50',
    hoverBg:      'hover:bg-violet-500/[0.06]',
  },
  cyan: {
    activeBg:     'bg-cyan-500/[0.12]',
    activeBorder: 'border-l-cyan-500',
    activeIcon:   'text-cyan-400',
    activeGlow:   'shadow-[0_0_16px_rgba(6,182,212,0.12)]',
    dot:          'bg-cyan-500',
    sectionLabel: 'text-cyan-400/50',
    hoverBg:      'hover:bg-cyan-500/[0.06]',
  },
  amber: {
    activeBg:     'bg-amber-500/[0.12]',
    activeBorder: 'border-l-amber-500',
    activeIcon:   'text-amber-400',
    activeGlow:   'shadow-[0_0_16px_rgba(245,158,11,0.12)]',
    dot:          'bg-amber-500',
    sectionLabel: 'text-amber-400/50',
    hoverBg:      'hover:bg-amber-500/[0.06]',
  },
};
