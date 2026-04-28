import React, { useState } from 'react';
import {
  Users, Search, Plus, BarChart3, Briefcase,
  ChevronRight, User, Phone, MessageSquare,
  Star, AlertTriangle, CheckCircle2, Circle, Clock,
  Mail, Upload, FileText, Bot, RefreshCw, XCircle,
  Camera, Banknote, QrCode, Facebook, Megaphone,
  Calendar, Send, Target, TrendingUp, Zap, Heart,
  Award, ChevronDown, ChevronUp, Info, Bell, Filter,
  Pencil, Trash2, GitBranch, ArrowDown, ToggleLeft, Play,
  MapPin, DollarSign, Building2, Layers, Save, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type CandidateStatus = 'NUEVO' | 'SCREENING' | 'ENTREVISTA' | 'OBSERVACION' | 'BIENVENIDA' | 'SEGUIMIENTO' | 'RECHAZADO';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CandidateStatus;
  role: string;
  source: string;
  labels: string[];
  score?: number;
  agentAssigned?: string;
  // Tracking CRM fields
  appointmentDate?: string;   // 'YYYY-MM-DD'
  appointmentTime?: string;   // 'HH:MM'
  attendedInterview?: boolean;
  addedToTeam?: boolean;      // "dado de alta"
  attendedWelcome?: boolean;  // "asistió a bienvenida"
  notes?: string;
  recruiterName?: string;
}

interface AgentKPI {
  label: string;
  target: string;
  value: string;
  met: boolean;
}

interface WorkflowStep {
  step: number;
  text: string;
}

type FlowNodeType = 'message' | 'user' | 'condition' | 'action' | 'delay';

interface FlowNode {
  id: string;
  type: FlowNodeType;
  content: string;
  conditionYes?: string;
  conditionNo?: string;
}

interface ConversationFlow {
  id: string;
  name: string;
  agentId: string;
  trigger: string;
  nodes: FlowNode[];
  active: boolean;
}

interface Vacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  modality: 'Presencial' | 'Remoto' | 'Híbrido';
  salaryMin: string;
  salaryMax: string;
  requirements: string[];
  benefits: string[];
  description: string;
  status: 'OPEN' | 'URGENT' | 'PAUSED' | 'CLOSED';
  candidates: number;
  createdAt: string;
}

interface RecruitAgent {
  id: string;
  codeName: string;
  name: string;
  role: string;
  description: string;
  channel: string;
  schedule: string;
  status: 'ACTIVE' | 'IDLE' | 'LEARNING';
  personality: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  interviewsScheduled: number;
  prospectsFollowed: number;
  kpis: AgentKPI[];
  workflow: WorkflowStep[];
  templates: { [key: string]: string };
  whatsappConnected: boolean;
  facebookConnected: boolean;
  whatsappAccount?: string;
  facebookAccount?: string;
  facebookPageId?: string;
}

// ─── Agent Definitions ───────────────────────────────────────────────────────

const recruitAgents: RecruitAgent[] = [
  {
    id: 'AGT-1',
    codeName: 'PRIMER CONTACTO',
    name: 'Alexia',
    role: 'Bot de Bienvenida',
    description: 'Captación y filtrado inicial de candidatos en WhatsApp y Facebook Messenger 24/7.',
    channel: 'WhatsApp Business + Facebook Messenger',
    schedule: '24/7 — respuesta < 2 min',
    status: 'ACTIVE',
    personality: 'Profesional, cálido, empático, rápido',
    color: 'text-blue-400',
    bgColor: 'bg-blue-600/10',
    borderColor: 'border-blue-500/30',
    icon: Bot,
    interviewsScheduled: 12,
    prospectsFollowed: 48,
    kpis: [
      { label: 'T. Respuesta', target: '< 2 min', value: '1.4 min', met: true },
      { label: 'Conversión', target: '> 40%', value: '44%', met: true },
      { label: 'Satisfacción', target: '> 4.0', value: '4.2', met: true },
    ],
    workflow: [
      { step: 1, text: 'Recibe mensaje del candidato' },
      { step: 2, text: 'Saluda personalizado (nombre del perfil)' },
      { step: 3, text: 'Presenta vacantes activas o pregunta posición' },
      { step: 4, text: 'Solicita CV / LinkedIn' },
      { step: 5, text: 'Pre-screening: experiencia, disponibilidad, salario, modalidad' },
      { step: 6, text: 'Si pasa → deriva al Agente 2 (Info-Company)' },
      { step: 7, text: 'Si no califica → agradecimiento + BD futura' },
    ],
    templates: {
      welcome: '¡Hola {nombre}! Gracias por contactar a HDreams. ¿En qué posición estás interesado/a hoy?',
      reject: 'Muchas gracias por tu interés. Por el momento no tenemos una vacante que encaje con tu perfil, pero te tendremos en cuenta para futuras oportunidades. ¡Mucho éxito!',
    },
    whatsappConnected: true,
    facebookConnected: true,
    whatsappAccount: '+52 55 8712 0001',
    facebookAccount: 'HDreams.Captacion',
    facebookPageId: '100094871200001',
  },
  {
    id: 'AGT-2',
    codeName: 'INFO-COMPANY',
    name: 'Sofía',
    role: 'Especialista en Cultura y Beneficios',
    description: 'Responde dudas sobre la empresa, presenta beneficios y evalúa el interés del candidato.',
    channel: 'WhatsApp Business + Facebook Messenger',
    schedule: '24/7',
    status: 'ACTIVE',
    personality: 'Entusiasta, transparente, persuasivo sin ser agresivo',
    color: 'text-purple-400',
    bgColor: 'bg-purple-600/10',
    borderColor: 'border-purple-500/30',
    icon: Heart,
    interviewsScheduled: 0,
    prospectsFollowed: 38,
    kpis: [
      { label: 'Score ≥ 7 derivados', target: '> 60%', value: '68%', met: true },
      { label: 'Tiempo resp.', target: '< 5 min', value: '3.1 min', met: true },
      { label: 'NPS cultura', target: '> 8.0', value: '8.4', met: true },
    ],
    workflow: [
      { step: 1, text: 'Recibe candidato calificado de Agente 1' },
      { step: 2, text: 'Envía "Kit de Bienvenida" (PDF/video)' },
      { step: 3, text: 'Responde preguntas sobre desarrollo, cultura, onboarding' },
      { step: 4, text: 'Evalúa interés genuino (score 1-10)' },
      { step: 5, text: 'Si score ≥ 7 → deriva al Agente 3 (Scheduler)' },
      { step: 6, text: 'Si dudas persisten → ofrece llamada con reclutador humano' },
    ],
    templates: {
      welcome: '¡Hola {nombre}! Soy Sofía, especialista de cultura en HDreams. Me complace contarte todo sobre nosotros 🙌',
      kit: 'Te comparto nuestro Kit de Bienvenida con todo lo que necesitas saber: beneficios, cultura y oportunidades de crecimiento.',
    },
    whatsappConnected: true,
    facebookConnected: true,
    whatsappAccount: '+52 55 8712 0002',
    facebookAccount: 'HDreams.Cultura',
    facebookPageId: '100094871200002',
  },
  {
    id: 'AGT-3',
    codeName: 'SCHEDULER',
    name: 'Bruno',
    role: 'Coordinador de Entrevistas',
    description: 'Agendamiento inteligente con slots en tiempo real, confirmaciones automáticas y gestión de conflictos.',
    channel: 'WhatsApp Business + Facebook Messenger',
    schedule: '24/7',
    status: 'ACTIVE',
    personality: 'Eficiente, organizado, servicial',
    color: 'text-amber-400',
    bgColor: 'bg-amber-600/10',
    borderColor: 'border-amber-500/30',
    icon: Calendar,
    interviewsScheduled: 28,
    prospectsFollowed: 28,
    kpis: [
      { label: 'Confirmación', target: '> 85%', value: '87%', met: true },
      { label: 'Asistencia', target: '> 75%', value: '71%', met: false },
      { label: 'T. agendamiento', target: '< 5 min', value: '4.2 min', met: true },
    ],
    workflow: [
      { step: 1, text: 'Recibe candidato interesado del Agente 2' },
      { step: 2, text: 'Presenta slots disponibles (próximos 7 días)' },
      { step: 3, text: 'Confirma modalidad: Presencial / Virtual / Telefónica' },
      { step: 4, text: 'Envía invitación con fecha, link, entrevistador y prep.' },
      { step: 5, text: 'Agrega a calendario de ambas partes' },
      { step: 6, text: 'Activa recordatorios automáticos' },
      { step: 7, text: 'Pasa control al Agente 4 (Confirmador)' },
    ],
    templates: {
      invite: 'Hola {nombre}! Te confirmamos tu entrevista el {fecha} a las {hora}. Modalidad: {modalidad}. Link: {link}',
      reschedule: 'Entendemos que surgen imprevistos. ¿Cuándo podríamos reagendar tu entrevista? (tienes hasta 2 reagendamientos sin penalización)',
    },
    whatsappConnected: true,
    facebookConnected: true,
    whatsappAccount: '+52 55 8712 0003',
    facebookAccount: 'HDreams.Agendas',
    facebookPageId: '100094871200003',
  },
  {
    id: 'AGT-4',
    codeName: 'CONFIRMADOR',
    name: 'Elena',
    role: 'Seguimiento y Asistencia',
    description: 'Asegura la asistencia a entrevistas mediante un protocolo de recordatorios de 48h, 24h y 2h antes.',
    channel: 'WhatsApp Business + Facebook Messenger',
    schedule: '24/7 — picos 24h y 2h antes',
    status: 'ACTIVE',
    personality: 'Atento, preocupado genuinamente, solucionador',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-600/10',
    borderColor: 'border-emerald-500/30',
    icon: Bell,
    interviewsScheduled: 20,
    prospectsFollowed: 76,
    kpis: [
      { label: 'Tasa asistencia', target: '> 75%', value: '79%', met: true },
      { label: 'Confirmaciones 48h', target: '> 90%', value: '93%', met: true },
      { label: 'Cancelaciones rescatadas', target: '> 30%', value: '38%', met: true },
    ],
    workflow: [
      { step: 1, text: 'DÍA -2 (48h): Confirmación + recordatorio de preparación' },
      { step: 2, text: 'DÍA -1 (24h): Confirmación final + contacto de emergencia' },
      { step: 3, text: 'DÍA 0 (2h): "¿Todo listo?" + link o mapa de ubicación' },
      { step: 4, text: 'POST (30 min): "¿Cómo te fue?" + encuesta de experiencia' },
      { step: 5, text: 'Cancelación → pregunta motivo, reprograma o cierra' },
      { step: 6, text: 'No asistencia → intento de contacto / escalación humana' },
    ],
    templates: {
      reminder48: '¡Hola {nombre}! Te recordamos tu entrevista en HDreams pasado mañana. ¿Tienes alguna duda? 😊',
      reminder2h: '¡Hola! Tu entrevista es en 2 horas. Aquí tienes el link: {link}. ¡Mucho éxito!',
    },
    whatsappConnected: true,
    facebookConnected: true,
    whatsappAccount: '+52 55 8712 0004',
    facebookAccount: 'HDreams.Confirmaciones',
    facebookPageId: '100094871200004',
  },
  {
    id: 'AGT-5',
    codeName: 'POST-INTERVIEW',
    name: 'Dante',
    role: 'Cierre y Seguimiento',
    description: 'Gestiona el cierre del proceso: seleccionados, en espera y rechazados. Mantiene talent pool activo.',
    channel: 'WhatsApp Business + Facebook Messenger',
    schedule: '24/7',
    status: 'LEARNING',
    personality: 'Cerrador profesional, cálido en éxitos, empático en rechazos',
    color: 'text-pink-400',
    bgColor: 'bg-pink-600/10',
    borderColor: 'border-pink-500/30',
    icon: Award,
    interviewsScheduled: 8,
    prospectsFollowed: 32,
    kpis: [
      { label: 'Tasa aceptación oferta', target: '> 70%', value: '74%', met: true },
      { label: 'NPS proceso', target: '> 8.0', value: '7.8', met: false },
      { label: 'Retención talent pool', target: '> 50%', value: '56%', met: true },
    ],
    workflow: [
      { step: 1, text: 'Recibe feedback del entrevistador (24-48h)' },
      { step: 2, text: 'SELECCIONADO → felicitaciones + pasos siguientes + oferta' },
      { step: 3, text: 'EN ESPERA → agradecimiento + tiempo estimado de respuesta' },
      { step: 4, text: 'NO SELECCIONADO → feedback constructivo + talent pool' },
      { step: 5, text: 'Newsletter mensual de vacantes (opt-in)' },
      { step: 6, text: 'Re-engagement cada 6 meses' },
    ],
    templates: {
      selected: '¡Felicitaciones {nombre}! 🎉 Has sido seleccionado/a para el puesto de {role} en HDreams. El siguiente paso es...',
      rejected: 'Hola {nombre}, gracias por tu tiempo. En esta ocasión avanzamos con otro perfil, pero te mantenemos en nuestra base de talento...',
    },
    whatsappConnected: true,
    facebookConnected: true,
    whatsappAccount: '+52 55 8712 0005',
    facebookAccount: 'HDreams.Cierre',
    facebookPageId: '100094871200005',
  },
  {
    id: 'AGT-6',
    codeName: 'CONTENT-MAKER',
    name: 'Marco',
    role: 'Diseñador y Copywriter',
    description: 'Crea todo el contenido visual y textual para reclutamiento: vacantes, campañas Meta, branding de talento.',
    channel: 'Meta Business Suite + Canva Pro',
    schedule: '24/7 — producción < 4h por campaña',
    status: 'ACTIVE',
    personality: 'Creativo, estratégico, orientado a resultados',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-600/10',
    borderColor: 'border-cyan-500/30',
    icon: Megaphone,
    interviewsScheduled: 0,
    prospectsFollowed: 120,
    kpis: [
      { label: 'Engagement rate', target: '> 5%', value: '6.2%', met: true },
      { label: 'Aprobación sin cambios', target: '> 90%', value: '88%', met: false },
      { label: 'T. producción', target: '< 4h', value: '3.1h', met: true },
    ],
    workflow: [
      { step: 1, text: 'Recibe brief de nueva vacante (título, req., salario, zona)' },
      { step: 2, text: 'Investiga mercado y benchmarks de candidatos similares' },
      { step: 3, text: 'Genera 3 opciones de copy + diseño' },
      { step: 4, text: 'Supervisor humano aprueba (24h máx.)' },
      { step: 5, text: 'Programa publicación en redes sociales' },
      { step: 6, text: 'Monitorea engagement y responde comentarios básicos' },
      { step: 7, text: 'Reporta resultados semanalmente con métricas' },
    ],
    templates: {
      ads: '🚀 ¡HDreams busca {role}! Únete a nuestro equipo con {salario} + comisiones. Aplica ya 👇',
      post: '¿Buscas crecer en Telecomunicaciones? En HDreams tienes plan de carrera real. DM o aplica en el link de bio.',
    },
    whatsappConnected: true,
    facebookConnected: true,
  },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockCandidates: Candidate[] = [
  {
    id: 'CAND-2025-0847', name: 'Juan Carlos Martínez López', email: 'juan.m@email.com', phone: '+52 55 1234 5678',
    status: 'ENTREVISTA', role: 'Ejecutivo de Ventas', source: 'Facebook Ads', labels: ['Potencial', 'Titulado', 'CDMX'], score: 8, agentAssigned: 'AGT-3',
    appointmentDate: '2025-04-28', appointmentTime: '10:00', attendedInterview: true, addedToTeam: false, attendedWelcome: false,
    recruiterName: 'Laura V.', notes: 'Muy buena actitud, pendiente oferta formal',
  },
  {
    id: 'CAND-2025-0848', name: 'Ana Sofía Torres', email: 'ana.t@email.com', phone: '+52 33 9876 5432',
    status: 'SCREENING', role: 'Supervisora Reclutamiento', source: 'LinkedIn', labels: ['Senior', 'Inglés'], score: 7, agentAssigned: 'AGT-2',
    appointmentDate: '2025-04-29', appointmentTime: '12:30', attendedInterview: false, addedToTeam: false, attendedWelcome: false,
    recruiterName: 'Laura V.', notes: 'Esperando confirmación de cita',
  },
  {
    id: 'CAND-2025-0849', name: 'Miguel Ángel Ruiz', email: 'm.ruiz@email.com', phone: '+52 55 5555 4444',
    status: 'OBSERVACION', role: 'Promotor de Campo', source: 'Recomendado', labels: ['Experiencia', 'Auto propio'], score: 9, agentAssigned: 'AGT-4',
    appointmentDate: '2025-04-25', appointmentTime: '09:00', attendedInterview: true, addedToTeam: true, attendedWelcome: false,
    recruiterName: 'Carlos M.', notes: 'Dado de alta el 25/04. Bienvenida pendiente',
  },
  {
    id: 'CAND-2025-0850', name: 'Gabriela López Hernández', email: 'g.lopez@email.com', phone: '+52 81 3333 2222',
    status: 'NUEVO', role: 'Ejecutivo de Ventas', source: 'Facebook Ads', labels: ['Nuevo'], score: 0, agentAssigned: 'AGT-1',
    appointmentDate: '', appointmentTime: '', attendedInterview: false, addedToTeam: false, attendedWelcome: false,
    recruiterName: '', notes: 'Prospecto nuevo, sin cita aún',
  },
  {
    id: 'CAND-2025-0851', name: 'Roberto Sánchez', email: 'r.sanchez@email.com', phone: '+52 55 7777 8888',
    status: 'BIENVENIDA', role: 'Supervisor', source: 'WhatsApp', labels: ['Senior', 'CDMX'], score: 9, agentAssigned: 'AGT-5',
    appointmentDate: '2025-04-24', appointmentTime: '11:00', attendedInterview: true, addedToTeam: true, attendedWelcome: true,
    recruiterName: 'Laura V.', notes: 'Proceso completado, ingresó a bienvenida',
  },
  {
    id: 'CAND-2025-0852', name: 'Diana Patricia Flores', email: 'd.flores@email.com', phone: '+52 55 9988 7766',
    status: 'SEGUIMIENTO', role: 'Ejecutivo de Ventas', source: 'Recomendado', labels: ['CDMX', 'Disponible'], score: 6, agentAssigned: 'AGT-4',
    appointmentDate: '2025-04-27', appointmentTime: '15:00', attendedInterview: true, addedToTeam: false, attendedWelcome: false,
    recruiterName: 'Carlos M.', notes: 'Entrevistada, esperando decisión final',
  },
  {
    id: 'CAND-2025-0853', name: 'Fernando Castillo Vega', email: 'f.castillo@email.com', phone: '+52 33 4455 6677',
    status: 'NUEVO', role: 'Promotor de Campo', source: 'Facebook Ads', labels: ['GDL', 'Nuevo'], score: 0, agentAssigned: 'AGT-1',
    appointmentDate: '2025-04-30', appointmentTime: '10:30', attendedInterview: false, addedToTeam: false, attendedWelcome: false,
    recruiterName: '', notes: 'Cita agendada para el 30/04',
  },
  {
    id: 'CAND-2025-0854', name: 'Valeria Mendoza Cruz', email: 'v.mendoza@email.com', phone: '+52 55 3344 5566',
    status: 'BIENVENIDA', role: 'Ejecutivo de Ventas', source: 'LinkedIn', labels: ['Titulada', 'CDMX'], score: 10, agentAssigned: 'AGT-5',
    appointmentDate: '2025-04-23', appointmentTime: '09:30', attendedInterview: true, addedToTeam: true, attendedWelcome: true,
    recruiterName: 'Laura V.', notes: 'Integración exitosa al equipo',
  },
];

// ─── Initial Flows ────────────────────────────────────────────────────────────

const initialFlows: ConversationFlow[] = [
  {
    id: 'FLOW-1', name: 'Bienvenida y Pre-screening', agentId: 'AGT-1', trigger: 'Nuevo mensaje entrante', active: true,
    nodes: [
      { id: 'n1', type: 'message', content: '¡Hola {nombre}! 👋 Gracias por contactar a HDreams. Soy Alexia, tu asistente de reclutamiento. ¿En qué posición estás interesado/a?' },
      { id: 'n2', type: 'user', content: 'Candidato responde con posición de interés' },
      { id: 'n3', type: 'message', content: '¡Perfecto! Tenemos esa posición disponible. Para continuar, ¿podrías compartirme tu CV o perfil de LinkedIn?' },
      { id: 'n4', type: 'user', content: 'Candidato envía CV o enlace' },
      { id: 'n5', type: 'condition', content: '¿Tiene experiencia relevante?', conditionYes: 'Derivar a Agente 2 (Info-Company)', conditionNo: 'Enviar mensaje de agradecimiento y guardar en BD' },
    ],
  },
  {
    id: 'FLOW-2', name: 'Kit de Cultura Empresarial', agentId: 'AGT-2', trigger: 'Candidato derivado de AGT-1', active: true,
    nodes: [
      { id: 'n1', type: 'message', content: '¡Hola {nombre}! Soy Sofía 😊 Me da mucho gusto conectar contigo. Alexia me contó que estás interesado/a en HDreams.' },
      { id: 'n2', type: 'action', content: 'Enviar Kit de Bienvenida PDF + Video cultura' },
      { id: 'n3', type: 'message', content: '¿Tienes alguna pregunta sobre nuestra cultura, beneficios o proceso de crecimiento?' },
      { id: 'n4', type: 'user', content: 'Candidato responde preguntas' },
      { id: 'n5', type: 'condition', content: 'Score de interés ≥ 7/10?', conditionYes: 'Derivar a Bruno (Scheduler) para agendar entrevista', conditionNo: 'Ofrecer llamada con reclutador humano' },
    ],
  },
  {
    id: 'FLOW-3', name: 'Agendamiento de Entrevista', agentId: 'AGT-3', trigger: 'Candidato interesado de AGT-2', active: true,
    nodes: [
      { id: 'n1', type: 'message', content: '¡Hola {nombre}! Soy Bruno 📅 Vamos a agendar tu entrevista. Aquí tienes los horarios disponibles para esta semana:' },
      { id: 'n2', type: 'action', content: 'Mostrar slots disponibles (próximos 7 días)' },
      { id: 'n3', type: 'user', content: 'Candidato selecciona día y hora' },
      { id: 'n4', type: 'message', content: '¿Prefieres modalidad Presencial, Virtual (Zoom/Meet) o Telefónica?' },
      { id: 'n5', type: 'action', content: 'Crear evento en Google Calendar + enviar invitación con link/dirección' },
      { id: 'n6', type: 'message', content: '✅ ¡Todo listo! Tu entrevista está confirmada para el {fecha} a las {hora}. Te enviaré recordatorios automáticos.' },
      { id: 'n7', type: 'action', content: 'Pasar control a Elena (Confirmador)' },
    ],
  },
  {
    id: 'FLOW-4', name: 'Recordatorios y Confirmación', agentId: 'AGT-4', trigger: '48h antes de la entrevista', active: true,
    nodes: [
      { id: 'n1', type: 'delay', content: 'Esperar hasta 48h antes de la entrevista' },
      { id: 'n2', type: 'message', content: '¡Hola {nombre}! 😊 Te recuerdo que tienes una entrevista con HDreams pasado mañana. ¿Todo en orden?' },
      { id: 'n3', type: 'delay', content: 'Esperar hasta 24h antes' },
      { id: 'n4', type: 'message', content: 'Confirmación final: Tu entrevista es mañana. Aquí los datos: {fecha, hora, lugar/link}. ¡Mucho éxito!' },
      { id: 'n5', type: 'delay', content: 'Esperar hasta 2h antes' },
      { id: 'n6', type: 'message', content: '⏰ ¡Tu entrevista es en 2 horas! Aquí el link: {link}. ¿Estás listo/a?' },
    ],
  },
  {
    id: 'FLOW-5', name: 'Cierre del Proceso', agentId: 'AGT-5', trigger: 'Feedback del entrevistador recibido', active: true,
    nodes: [
      { id: 'n1', type: 'condition', content: '¿Resultado de la entrevista?', conditionYes: 'SELECCIONADO → Felicitaciones + próximos pasos', conditionNo: 'NO SELECCIONADO → Agradecimiento + talent pool' },
      { id: 'n2', type: 'message', content: '🎉 ¡Felicitaciones {nombre}! Fuiste seleccionado/a para el puesto. El siguiente paso es reunirte con RRHH para tu oferta formal.' },
      { id: 'n3', type: 'action', content: 'Enviar onboarding preliminar + agendar reunión de oferta' },
    ],
  },
];

// ─── Initial Vacancies ────────────────────────────────────────────────────────

const initialVacancies: Vacancy[] = [
  {
    id: 'VAC-001', title: 'Ejecutivo de Ventas Campo', department: 'Comercial',
    location: 'CDMX, Guadalajara', modality: 'Presencial',
    salaryMin: '12000', salaryMax: '22000',
    requirements: ['Experiencia en ventas (1+ año)', 'Auto propio (deseable)', 'Disponibilidad tiempo completo', 'Manejo de zona'],
    benefits: ['Sueldo base + comisiones', 'Seguro de vida', 'Capacitación continua', 'Plan de carrera'],
    description: 'Buscamos ejecutivos apasionados por las ventas para ofrecer servicios de telecomunicaciones a nivel residencial y empresarial.',
    status: 'OPEN', candidates: 45, createdAt: '01/04/2024',
  },
  {
    id: 'VAC-002', title: 'Supervisor de Reclutamiento', department: 'Capital Humano',
    location: 'CDMX', modality: 'Híbrido',
    salaryMin: '20000', salaryMax: '28000',
    requirements: ['Experiencia en reclutamiento masivo (2+ años)', 'Manejo de ATS', 'Liderazgo de equipos', 'Excel avanzado'],
    benefits: ['Sueldo fijo', 'Bono por desempeño', 'Home office 2 días/semana', 'Prestaciones superiores a ley'],
    description: 'Supervisor para coordinar el equipo de reclutadores y garantizar el cumplimiento de metas de contratación.',
    status: 'URGENT', candidates: 12, createdAt: '10/04/2024',
  },
];

const PIPELINE_STAGES: { key: CandidateStatus; label: string; color: string; count: number }[] = [
  { key: 'NUEVO', label: 'Nuevo', color: 'bg-blue-500', count: 120 },
  { key: 'SCREENING', label: 'Screening', color: 'bg-indigo-500', count: 68 },
  { key: 'ENTREVISTA', label: 'Entrevista', color: 'bg-yellow-500', count: 45 },
  { key: 'OBSERVACION', label: 'Observación', color: 'bg-amber-500', count: 28 },
  { key: 'BIENVENIDA', label: 'Bienvenida', color: 'bg-emerald-500', count: 12 },
  { key: 'SEGUIMIENTO', label: 'Seguimiento', color: 'bg-purple-500', count: 18 },
  { key: 'RECHAZADO', label: 'Rechazado', color: 'bg-red-500', count: 850 },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TalentCRM() {
  const [view, setView] = useState<'dashboard' | 'detail' | 'agents' | 'vacancies' | 'register' | 'prospectos'>('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<RecruitAgent | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'docs' | 'templates' | 'connectivity' | 'workflow' | 'kpis' | 'flow'>('info');
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [flows, setFlows] = useState<ConversationFlow[]>(initialFlows);
  const [vacancies, setVacancies] = useState<Vacancy[]>(initialVacancies);
  const [expandedFlowId, setExpandedFlowId] = useState<string | null>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [showVacancyForm, setShowVacancyForm] = useState(false);
  const [newFlow, setNewFlow] = useState({ name: '', trigger: '' });
  const [reqInput, setReqInput] = useState('');
  const [benInput, setBenInput] = useState('');
  const [vacancyForm, setVacancyForm] = useState<Omit<Vacancy, 'id' | 'candidates' | 'createdAt'>>({
    title: '', department: '', location: '', modality: 'Presencial',
    salaryMin: '', salaryMax: '', requirements: [], benefits: [],
    description: '', status: 'OPEN',
  });

  // ─── Prospectos CRM tracking helpers ─────────────────────────────────────
  const [prospectosSearch, setProspectosSearch] = useState('');
  const [prospectosFilter, setProspectosFilter] = useState<CandidateStatus | 'TODOS'>('TODOS');
  const [editingNote, setEditingNote] = useState<string | null>(null);   // candidate id
  const [noteInput, setNoteInput] = useState('');
  const [editingCita, setEditingCita] = useState<string | null>(null);
  const [citaDate, setCitaDate] = useState<Record<string, string>>({});
  const [citaTime, setCitaTime] = useState<Record<string, string>>({});

  const toggleTracking = (id: string, field: 'attendedInterview' | 'addedToTeam' | 'attendedWelcome') => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, [field]: !c[field] } : c));
  };
  const saveNote = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, notes: noteInput } : c));
    setEditingNote(null);
  };
  const saveCita = (id: string, date: string, time: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, appointmentDate: date, appointmentTime: time } : c));
    setEditingCita(null);
  };

  const handleUpdateStatus = (id: string, newStatus: CandidateStatus) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    if (selectedCandidate?.id === id) setSelectedCandidate(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newC: Candidate = {
      id: `CAND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      role: fd.get('role') as string,
      status: 'NUEVO',
      source: 'Registro Manual',
      labels: ['Nuevo'],
      score: 0,
      agentAssigned: 'AGT-1',
    };
    setCandidates(prev => [newC, ...prev]);
    setView('dashboard');
  };

  // ─── Flow Handlers ────────────────────────────────────────────────────────
  const updateNode = (flowId: string, nodeId: string, field: keyof FlowNode, val: string) => {
    setFlows(prev => prev.map(f => f.id !== flowId ? f : {
      ...f, nodes: f.nodes.map(n => n.id !== nodeId ? n : { ...n, [field]: val })
    }));
  };
  const addNode = (flowId: string) => {
    const newNode: FlowNode = { id: `n${Date.now()}`, type: 'message', content: '' };
    setFlows(prev => prev.map(f => f.id !== flowId ? f : { ...f, nodes: [...f.nodes, newNode] }));
  };
  const deleteNode = (flowId: string, nodeId: string) => {
    setFlows(prev => prev.map(f => f.id !== flowId ? f : { ...f, nodes: f.nodes.filter(n => n.id !== nodeId) }));
  };
  const toggleFlow = (flowId: string) => {
    setFlows(prev => prev.map(f => f.id !== flowId ? f : { ...f, active: !f.active }));
  };
  const deleteFlow = (flowId: string) => {
    setFlows(prev => prev.filter(f => f.id !== flowId));
    if (expandedFlowId === flowId) setExpandedFlowId(null);
  };
  const createFlow = () => {
    if (!newFlow.name.trim() || !selectedAgent) return;
    const flow: ConversationFlow = {
      id: `FLOW-${Date.now()}`, name: newFlow.name, agentId: selectedAgent.id,
      trigger: newFlow.trigger || 'Mensaje entrante', active: true,
      nodes: [{ id: 'n1', type: 'message', content: '' }],
    };
    setFlows(prev => [...prev, flow]);
    setNewFlow({ name: '', trigger: '' });
    setShowFlowModal(false);
    setExpandedFlowId(flow.id);
  };

  // ─── Vacancy Handlers ─────────────────────────────────────────────────────
  const addRequirement = () => {
    if (!reqInput.trim()) return;
    setVacancyForm(f => ({ ...f, requirements: [...f.requirements, reqInput.trim()] }));
    setReqInput('');
  };
  const addBenefit = () => {
    if (!benInput.trim()) return;
    setVacancyForm(f => ({ ...f, benefits: [...f.benefits, benInput.trim()] }));
    setBenInput('');
  };
  const createVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    const v: Vacancy = {
      ...vacancyForm, id: `VAC-${Date.now()}`,
      candidates: 0, createdAt: new Date().toLocaleDateString('es-MX'),
    };
    setVacancies(prev => [v, ...prev]);
    setVacancyForm({ title: '', department: '', location: '', modality: 'Presencial', salaryMin: '', salaryMax: '', requirements: [], benefits: [], description: '', status: 'OPEN' });
    setReqInput(''); setBenInput('');
    setShowVacancyForm(false);
  };

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Prospectos CRM computed ──────────────────────────────────────────────
  const prospectosFilt = candidates.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(prospectosSearch.toLowerCase()) ||
      c.id.toLowerCase().includes(prospectosSearch.toLowerCase()) ||
      c.phone.includes(prospectosSearch) ||
      (c.recruiterName || '').toLowerCase().includes(prospectosSearch.toLowerCase());
    const matchStatus = prospectosFilter === 'TODOS' || c.status === prospectosFilter;
    return matchSearch && matchStatus;
  });

  const prospectosStats = [
    { label: 'Total prospectos',   value: candidates.length,                                   color: 'text-blue-400'    },
    { label: 'Con cita',           value: candidates.filter(c => c.appointmentDate).length,    color: 'text-amber-400'   },
    { label: 'Asistieron entrev.', value: candidates.filter(c => c.attendedInterview).length,  color: 'text-indigo-400'  },
    { label: 'Dados de alta',      value: candidates.filter(c => c.addedToTeam).length,        color: 'text-emerald-400' },
    { label: 'En bienvenida',      value: candidates.filter(c => c.attendedWelcome).length,    color: 'text-purple-400'  },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-950/20 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">DEPARTAMENTO DE RECLUTAMIENTO & IA</h2>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">6 Agentes Autónomos • Pipeline Completo • 24/7</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['dashboard', 'prospectos', 'agents', 'vacancies'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
              view === v ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}>
              {v === 'dashboard' ? 'Pipeline' : v === 'prospectos' ? '📋 Seguimiento' : v === 'agents' ? 'Agentes IA' : 'Vacantes'}
            </button>
          ))}
          <button onClick={() => setView('register')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all shadow-lg shadow-blue-900/20 ml-4">
            <Plus className="w-3 h-3" /> Nuevo
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard label="Prospectos Activos" value="1,420" subValue="+24 nuevos hoy" color="text-blue-400" />
              <KpiCard label="Entrevistas Hoy" value="45" subValue="Bruno agendó 28" color="text-amber-400" />
              <KpiCard label="Bienvenidas Hoy" value="8" subValue="Onboarding activo" color="text-emerald-400" />
              <KpiCard label="Eficiencia Agentes" value="94%" subValue="Promedio 6 bots" color="text-purple-400" />
            </div>

            {/* Pipeline funnel */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Embudo de Reclutamiento</h3>
              <div className="grid grid-cols-7 gap-2">
                {PIPELINE_STAGES.map((s, i) => (
                  <div key={s.key} className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
                    s.key === 'ENTREVISTA' ? 'bg-yellow-500/10 border border-yellow-500/20' : ''
                  )}>
                    <div className={`${s.color} w-2 h-2 rounded-full shadow-[0_0_6px_currentColor] ${s.key === 'ENTREVISTA' ? 'animate-pulse' : ''}`} />
                    <div className="text-xl font-bold text-white">{s.count}</div>
                    <div className={`text-[8px] font-bold uppercase tracking-tighter text-center ${s.key === 'ENTREVISTA' ? 'text-yellow-400' : 'text-slate-500'}`}>{s.label}</div>
                    {i < PIPELINE_STAGES.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-slate-700 hidden md:block absolute" style={{ right: '-8px', top: '50%' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Agent quick status */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              {recruitAgents.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedAgent(a); setView('agents'); }}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-2xl border transition-all hover:scale-[1.02] group",
                    a.bgColor, a.borderColor
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-2", a.bgColor)}>
                    <a.icon className={cn("w-4 h-4", a.color)} />
                  </div>
                  <span className="text-white font-bold text-xs truncate w-full text-center">{a.name}</span>
                  <span className={cn("text-[8px] font-black uppercase tracking-widest mt-1", a.color)}>{a.codeName.split(' ')[0]}</span>
                  <div className={cn(
                    "text-[7px] font-bold px-1.5 py-0.5 rounded-full mt-1.5",
                    a.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                    a.status === 'LEARNING' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-slate-700 text-slate-500'
                  )}>{a.status}</div>
                </button>
              ))}
            </div>

            {/* Candidate table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar candidato, ID, vacante..."
                    className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5 text-slate-400 text-left text-[10px] uppercase font-bold tracking-wider">
                        <th className="px-6 py-4">Candidato / ID</th>
                        <th className="px-6 py-4">Vacante</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Agente</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.map(c => {
                        const agent = recruitAgents.find(a => a.id === c.agentAssigned);
                        return (
                          <tr key={c.id} className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => { setSelectedCandidate(c); setActiveTab('info'); setView('detail'); }}>
                            <td className="px-6 py-4">
                              <p className="font-bold text-white">{c.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{c.id}</p>
                            </td>
                            <td className="px-6 py-4 text-slate-300 text-xs">{c.role}</td>
                            <td className="px-6 py-4">
                              <StatusBadge status={c.status} />
                            </td>
                            <td className="px-6 py-4">
                              {agent && (
                                <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", agent.bgColor, agent.borderColor, agent.color)}>
                                  {agent.name}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Alertas del Día</h3>
                  <div className="space-y-3">
                    <AlertItem text="3 entrevistas hoy a las 10, 12 y 15h" color="text-blue-400" />
                    <AlertItem text="2 candidatos sin confirmar (Bruno)" color="text-amber-400" />
                    <AlertItem text="1 oferta pendiente de firma" color="text-emerald-400" />
                    <AlertItem text="NPS de Dante cayó a 7.8" color="text-red-400" />
                  </div>
                </div>
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Actividad Reciente</h3>
                  <div className="space-y-3">
                    <TimelineItem time="10:32" actor="Alexia" text="12 nuevos leads de FB Ads procesados" />
                    <TimelineItem time="09:15" actor="Bruno" text="Agendó 4 entrevistas para mañana" />
                    <TimelineItem time="08:44" actor="Marco" text="Publicó nueva campaña de vacantes" />
                    <TimelineItem time="08:00" actor="Elena" text="Envió 28 recordatorios de 24h" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PROSPECTOS CRM VIEW ── */}
        {view === 'prospectos' && (
          <motion.div key="prospectos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
              {/* Stats strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {prospectosStats.map(s => (
                  <div key={s.label} className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1">
                    <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Filters bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    value={prospectosSearch}
                    onChange={e => setProspectosSearch(e.target.value)}
                    placeholder="Buscar por nombre, ID, teléfono, reclutador…"
                    className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['TODOS', 'NUEVO', 'SCREENING', 'ENTREVISTA', 'OBSERVACION', 'BIENVENIDA', 'SEGUIMIENTO', 'RECHAZADO'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setProspectosFilter(f)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-all border",
                        prospectosFilter === f
                          ? "bg-blue-600 text-white border-blue-500"
                          : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                      )}
                    >{f}</button>
                  ))}
                </div>
              </div>

              {/* Main tracking table */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-x-auto">
                <table className="w-full text-xs min-w-[1100px]">
                  <thead>
                    <tr className="bg-white/5 text-slate-400 text-left text-[9px] uppercase font-black tracking-widest border-b border-white/5">
                      <th className="px-4 py-3">Candidato</th>
                      <th className="px-4 py-3">Teléfono</th>
                      <th className="px-4 py-3">Vacante</th>
                      <th className="px-4 py-3">Fuente</th>
                      <th className="px-4 py-3">Reclutador</th>
                      <th className="px-4 py-3 text-center">Cita</th>
                      <th className="px-4 py-3 text-center">
                        <span className="flex flex-col items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                          Entrevista
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <span className="flex flex-col items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Alta
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <span className="flex flex-col items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                          Bienvenida
                        </span>
                      </th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Notas</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {prospectosFilt.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center text-slate-500 py-12 text-sm">
                          No se encontraron prospectos con ese criterio.
                        </td>
                      </tr>
                    ) : prospectosFilt.map(c => {
                      const isEditingThisCita = editingCita === c.id;
                      const isEditingThisNote = editingNote === c.id;
                      const citaDateVal = citaDate[c.id] ?? c.appointmentDate ?? '';
                      const citaTimeVal = citaTime[c.id] ?? c.appointmentTime ?? '';
                      const hasCita = !!(c.appointmentDate && c.appointmentTime);
                      const citaIsPast = hasCita && new Date(`${c.appointmentDate}T${c.appointmentTime}`) < new Date();

                      return (
                        <tr key={c.id} className="hover:bg-white/[0.03] transition-colors group">
                          {/* Candidato */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setSelectedCandidate(c); setActiveTab('info'); setView('detail'); }}
                              className="text-left hover:text-blue-400 transition-colors"
                            >
                              <p className="font-bold text-white text-xs group-hover:text-blue-300">{c.name}</p>
                              <p className="text-[9px] text-slate-500 font-mono">{c.id}</p>
                            </button>
                          </td>

                          {/* Teléfono */}
                          <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{c.phone}</td>

                          {/* Vacante */}
                          <td className="px-4 py-3 text-slate-300 text-[10px] max-w-[120px] truncate">{c.role}</td>

                          {/* Fuente */}
                          <td className="px-4 py-3">
                            <span className="text-[8px] font-bold uppercase px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 border border-white/5">{c.source}</span>
                          </td>

                          {/* Reclutador */}
                          <td className="px-4 py-3 text-slate-400 text-[10px]">{c.recruiterName || '—'}</td>

                          {/* Cita */}
                          <td className="px-4 py-3 text-center">
                            {isEditingThisCita ? (
                              <div className="flex flex-col gap-1 min-w-[140px]">
                                <input type="date" value={citaDateVal}
                                  onChange={e => setCitaDate(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  className="bg-slate-800 border border-blue-500/40 rounded-lg px-2 py-1 text-[9px] text-white focus:outline-none w-full"
                                />
                                <input type="time" value={citaTimeVal}
                                  onChange={e => setCitaTime(prev => ({ ...prev, [c.id]: e.target.value }))}
                                  className="bg-slate-800 border border-blue-500/40 rounded-lg px-2 py-1 text-[9px] text-white focus:outline-none w-full"
                                />
                                <div className="flex gap-1">
                                  <button onClick={() => saveCita(c.id, citaDateVal, citaTimeVal)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-1 text-[8px] font-bold transition-all">✓ OK</button>
                                  <button onClick={() => setEditingCita(null)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg py-1 text-[8px] font-bold transition-all">✕</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingCita(c.id); setCitaDate(prev => ({...prev, [c.id]: c.appointmentDate || ''})); setCitaTime(prev => ({...prev, [c.id]: c.appointmentTime || ''})); }}
                                className={cn(
                                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border transition-all hover:scale-105 w-full",
                                  hasCita
                                    ? citaIsPast
                                      ? "bg-slate-800/60 border-slate-600/30 text-slate-400"
                                      : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                    : "bg-slate-800/40 border-white/5 text-slate-600 hover:border-blue-500/30 hover:text-blue-400"
                                )}
                              >
                                {hasCita ? (
                                  <>
                                    <span className="text-[9px] font-bold">{c.appointmentDate}</span>
                                    <span className="flex items-center gap-0.5 text-[10px] font-black">
                                      <Clock className="w-2.5 h-2.5" />{c.appointmentTime}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[9px]">+ Agendar</span>
                                )}
                              </button>
                            )}
                          </td>

                          {/* Asistió a entrevista */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleTracking(c.id, 'attendedInterview')}
                              className={cn(
                                "w-8 h-8 rounded-xl border-2 flex items-center justify-center mx-auto transition-all hover:scale-110",
                                c.attendedInterview
                                  ? "bg-indigo-500/20 border-indigo-400 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                                  : "bg-slate-800/40 border-slate-600/40 text-slate-600 hover:border-indigo-400/50"
                              )}
                              title={c.attendedInterview ? "Asistió ✓" : "No asistió"}
                            >
                              {c.attendedInterview ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Dado de alta */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleTracking(c.id, 'addedToTeam')}
                              className={cn(
                                "w-8 h-8 rounded-xl border-2 flex items-center justify-center mx-auto transition-all hover:scale-110",
                                c.addedToTeam
                                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                  : "bg-slate-800/40 border-slate-600/40 text-slate-600 hover:border-emerald-400/50"
                              )}
                              title={c.addedToTeam ? "Dado de alta ✓" : "Pendiente"}
                            >
                              {c.addedToTeam ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Asistió a bienvenida */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleTracking(c.id, 'attendedWelcome')}
                              className={cn(
                                "w-8 h-8 rounded-xl border-2 flex items-center justify-center mx-auto transition-all hover:scale-110",
                                c.attendedWelcome
                                  ? "bg-purple-500/20 border-purple-400 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                                  : "bg-slate-800/40 border-slate-600/40 text-slate-600 hover:border-purple-400/50"
                              )}
                              title={c.attendedWelcome ? "Asistió a bienvenida ✓" : "Pendiente"}
                            >
                              {c.attendedWelcome ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </button>
                          </td>

                          {/* Estado */}
                          <td className="px-4 py-3">
                            <select
                              value={c.status}
                              onChange={e => handleUpdateStatus(c.id, e.target.value as CandidateStatus)}
                              className="bg-slate-800/60 border border-white/10 rounded-xl px-2 py-1 text-[9px] font-bold text-white focus:outline-none focus:border-blue-500/50 uppercase cursor-pointer"
                            >
                              {(['NUEVO','SCREENING','ENTREVISTA','OBSERVACION','BIENVENIDA','SEGUIMIENTO','RECHAZADO'] as CandidateStatus[]).map(s => (
                                <option key={s} value={s} className="bg-slate-900">{s}</option>
                              ))}
                            </select>
                          </td>

                          {/* Notas */}
                          <td className="px-4 py-3 max-w-[160px]">
                            {isEditingThisNote ? (
                              <div className="flex flex-col gap-1">
                                <textarea
                                  autoFocus
                                  value={noteInput}
                                  onChange={e => setNoteInput(e.target.value)}
                                  rows={2}
                                  className="bg-slate-800 border border-blue-500/40 rounded-lg px-2 py-1 text-[9px] text-white focus:outline-none w-full resize-none"
                                />
                                <div className="flex gap-1">
                                  <button onClick={() => saveNote(c.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-1 text-[8px] font-bold">✓</button>
                                  <button onClick={() => setEditingNote(null)} className="flex-1 bg-slate-700 text-slate-300 rounded-lg py-1 text-[8px] font-bold">✕</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingNote(c.id); setNoteInput(c.notes || ''); }}
                                className="text-left text-[9px] text-slate-400 hover:text-white transition-colors line-clamp-2 w-full group/note"
                              >
                                {c.notes || <span className="text-slate-600 group-hover/note:text-slate-400 italic">+ Agregar nota</span>}
                              </button>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setSelectedCandidate(c); setActiveTab('info'); setView('detail'); }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                              title="Ver detalle"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider pt-1">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500/30 border border-indigo-400 flex items-center justify-center"><CheckCircle2 className="w-2 h-2 text-indigo-400" /></span> Asistió a entrevista</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400 flex items-center justify-center"><CheckCircle2 className="w-2 h-2 text-emerald-400" /></span> Dado de alta</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500/30 border border-purple-400 flex items-center justify-center"><CheckCircle2 className="w-2 h-2 text-purple-400" /></span> Asistió a bienvenida</span>
                <span className="ml-auto text-slate-600">{prospectosFilt.length} de {candidates.length} registros</span>
              </div>
          </motion.div>
        )}

        {/* ── AGENTS VIEW ── */}
        {view === 'agents' && (
          <motion.div key="agents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

            {/* Global status banner */}
            <div className="bg-emerald-600/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/40">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Escuadrón de Agentes Autónomos — Depto. Reclutamiento</h3>
                  <p className="text-slate-400 text-xs">6 Instancias activas • 5 WA Business + 5 Páginas Facebook • Auto-Learning habilitado</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Sincronización Global Activa</span>
              </div>
            </div>

            {/* Agent grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recruitAgents.map(agent => (
                <div key={agent.id} className={cn(
                  "rounded-2xl border p-5 cursor-pointer transition-all hover:scale-[1.01] group relative overflow-hidden",
                  selectedAgent?.id === agent.id ? `${agent.bgColor} ${agent.borderColor}` : "bg-slate-900/40 border-white/10 hover:border-white/20"
                )} onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}>

                  {/* Connection indicators */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", agent.whatsappConnected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" : "bg-slate-700")} title="WhatsApp" />
                    <div className={cn("w-2 h-2 rounded-full", agent.facebookConnected ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)]" : "bg-slate-700")} title="Facebook" />
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", agent.bgColor)}>
                      <agent.icon className={cn("w-6 h-6", agent.color)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-bold">{agent.name}</span>
                        <span className={cn(
                          "text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full border",
                          agent.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          agent.status === 'LEARNING' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          'bg-white/5 text-slate-500 border-white/5'
                        )}>{agent.status}</span>
                      </div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", agent.color)}>{agent.codeName}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{agent.role}</p>
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs mb-4 leading-relaxed">{agent.description}</p>

                  {/* Mini KPIs */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {agent.kpis.map(k => (
                      <div key={k.label} className={cn("rounded-xl p-2 text-center border", k.met ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10")}>
                        <div className={cn("text-sm font-bold", k.met ? "text-emerald-400" : "text-red-400")}>{k.value}</div>
                        <div className="text-[8px] text-slate-500 font-bold uppercase truncate">{k.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[9px] text-slate-500">
                    <Zap className="w-3 h-3" />
                    <span className="truncate">{agent.channel}</span>
                  </div>

                  <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-600">
                    <Clock className="w-3 h-3" />
                    <span>{agent.schedule}</span>
                  </div>

                  {/* Expand indicator */}
                  <div className={cn("flex items-center justify-center gap-1 mt-3 text-[9px] font-bold uppercase tracking-widest transition-colors", agent.color)}>
                    {selectedAgent?.id === agent.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {selectedAgent?.id === agent.id ? 'Cerrar detalles' : 'Ver detalles'}
                  </div>
                </div>
              ))}
            </div>

            {/* Agent detail panel */}
            <AnimatePresence>
              {selectedAgent && (
                <motion.div
                  key={selectedAgent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn("bg-slate-900/60 border rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl", selectedAgent.borderColor)}
                >
                  {/* Panel header */}
                  <div className={cn("p-6 border-b border-white/5 flex justify-between items-center", selectedAgent.bgColor)}>
                    <div className="flex items-center gap-4">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", selectedAgent.bgColor)}>
                        <selectedAgent.icon className={cn("w-8 h-8", selectedAgent.color)} />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white">{selectedAgent.name} — {selectedAgent.codeName}</h4>
                        <p className="text-slate-400 text-xs">{selectedAgent.role} • <span className="italic">{selectedAgent.personality}</span></p>
                      </div>
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold rounded uppercase border border-emerald-500/20">Auto-Learning ON</span>
                    </div>
                    <button onClick={() => setSelectedAgent(null)} className="text-slate-500 hover:text-white transition-colors">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Panel tabs */}
                  <div className="flex gap-1 px-6 pt-4 border-b border-white/5 overflow-x-auto hide-scrollbar">
                    {(['workflow', 'kpis', 'templates', 'connectivity', 'flow'] as const).map(t => (
                      <button key={t} onClick={() => setActiveTab(t)} className={cn(
                        "px-5 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap",
                        activeTab === t ? selectedAgent.color : "text-slate-500 hover:text-slate-300"
                      )}>
                        {t === 'workflow' ? 'Flujo de Trabajo' : t === 'kpis' ? 'KPIs' : t === 'templates' ? 'Plantillas' : t === 'connectivity' ? 'Conectividad' : '⚡ Flujos IA'}
                        {activeTab === t && <motion.div layoutId="agentTabLine" className={cn("absolute bottom-0 left-0 right-0 h-0.5", selectedAgent.bgColor.replace('/10', ''))} style={{ background: selectedAgent.color.replace('text-', 'var(--color-') }} />}
                      </button>
                    ))}
                  </div>

                  <div className="p-8">
                    <AnimatePresence mode="wait">

                      {/* Workflow tab */}
                      {activeTab === 'workflow' && (
                        <motion.div key="workflow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                          <p className="text-slate-400 text-sm mb-6">{selectedAgent.description}</p>
                          {selectedAgent.workflow.map((step, i) => (
                            <div key={step.step} className="flex items-start gap-4">
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black border",
                                i === 0 ? `${selectedAgent.bgColor} ${selectedAgent.borderColor} ${selectedAgent.color}` : "bg-white/5 border-white/10 text-slate-500"
                              )}>
                                {step.step}
                              </div>
                              <div className="flex-1 py-1">
                                <p className={cn("text-sm", i === 0 ? "text-white font-semibold" : "text-slate-300")}>{step.text}</p>
                              </div>
                              {i < selectedAgent.workflow.length - 1 && (
                                <div className="absolute ml-3 mt-7 w-px h-3 bg-white/10" style={{ position: 'static', display: 'block' }} />
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {/* KPIs tab */}
                      {activeTab === 'kpis' && (
                        <motion.div key="kpis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {selectedAgent.kpis.map(kpi => (
                              <div key={kpi.label} className={cn("rounded-2xl p-6 border text-center", kpi.met ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                                <div className={cn("text-3xl font-black mb-2", kpi.met ? "text-emerald-400" : "text-red-400")}>{kpi.value}</div>
                                <div className="text-white font-bold text-sm mb-1">{kpi.label}</div>
                                <div className="text-slate-500 text-[10px] uppercase font-bold">Meta: {kpi.target}</div>
                                <div className={cn("mt-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full inline-block", kpi.met ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                                  {kpi.met ? '✓ Cumplido' : '✗ Por mejorar'}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/30 border border-white/10 rounded-2xl p-5">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Conversaciones Gestionadas</p>
                              <p className="text-3xl font-black text-white">{selectedAgent.prospectsFollowed}</p>
                              <p className="text-slate-500 text-xs mt-1">Prospectos en seguimiento</p>
                            </div>
                            <div className="bg-black/30 border border-white/10 rounded-2xl p-5">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Entrevistas Coordinadas</p>
                              <p className="text-3xl font-black text-white">{selectedAgent.interviewsScheduled}</p>
                              <p className="text-slate-500 text-xs mt-1">Este mes</p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Templates tab */}
                      {activeTab === 'templates' && (
                        <motion.div key="templates" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(selectedAgent.templates).map(([key, value]) => (
                            <div key={key} className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Plantilla: {key}</label>
                              <textarea
                                defaultValue={value}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-slate-200 outline-none focus:border-blue-500/30 min-h-[140px] transition-all resize-none"
                              />
                            </div>
                          ))}
                          <div className="md:col-span-2 flex justify-between items-center pt-2">
                            <span className="text-emerald-400 text-xs animate-pulse">🤖 Aprendiendo de las últimas 50 conversaciones...</span>
                            <div className="flex gap-3">
                              <button className="px-6 py-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest">Compartir</button>
                              <button className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-900/20">Sincronizar</button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Connectivity tab */}
                      {activeTab === 'connectivity' && (
                        <motion.div key="connectivity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-8">

                          {/* This agent's accounts */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* WhatsApp */}
                            <div className="bg-black/40 border border-emerald-500/20 rounded-3xl p-6 flex flex-col items-center text-center">
                              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-3">
                                <QrCode className="w-8 h-8" />
                              </div>
                              <h5 className="text-white font-bold mb-1">WhatsApp Business</h5>
                              {selectedAgent.whatsappAccount && (
                                <p className="text-emerald-400 font-mono font-bold text-sm mb-1">{selectedAgent.whatsappAccount}</p>
                              )}
                              <p className="text-slate-500 text-[10px] mb-4">Cuenta exclusiva de {selectedAgent.name}</p>
                              <div className="w-36 h-36 bg-white rounded-2xl p-3 mb-4 shadow-xl relative">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=HDreams-${selectedAgent.id}-WA`} alt="QR" className="w-full h-full" referrerPolicy="no-referrer" />
                                {selectedAgent.whatsappConnected && (
                                  <div className="absolute inset-0 bg-emerald-500/90 flex flex-col items-center justify-center text-white rounded-2xl">
                                    <CheckCircle2 className="w-10 h-10 mb-1" />
                                    <span className="text-[9px] font-black uppercase">Sincronizado</span>
                                  </div>
                                )}
                              </div>
                              <button className={cn("w-full py-2.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest", selectedAgent.whatsappConnected ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-600 text-white")}>
                                {selectedAgent.whatsappConnected ? '● Conectado — Desconectar' : 'Vincular Cuenta'}
                              </button>
                            </div>

                            {/* Facebook */}
                            <div className="bg-black/40 border border-blue-500/20 rounded-3xl p-6 flex flex-col items-center text-center">
                              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-3">
                                <Facebook className="w-8 h-8" />
                              </div>
                              <h5 className="text-white font-bold mb-1">Facebook / Meta</h5>
                              {selectedAgent.facebookAccount && (
                                <p className="text-blue-400 font-mono font-bold text-sm mb-1">@{selectedAgent.facebookAccount}</p>
                              )}
                              <p className="text-slate-500 text-[10px] mb-4">Página exclusiva de {selectedAgent.name}</p>
                              {selectedAgent.facebookConnected ? (
                                <div className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-blue-400" />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-white font-bold text-xs">@{selectedAgent.facebookAccount}</p>
                                    <p className="text-slate-500 text-[9px] font-mono">ID: {selectedAgent.facebookPageId}</p>
                                  </div>
                                  <CheckCircle2 className="w-5 h-5 text-blue-400 ml-auto shrink-0" />
                                </div>
                              ) : (
                                <div className="w-full p-6 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center gap-2 mb-4">
                                  <Facebook className="w-8 h-8 text-slate-700" />
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sin página vinculada</span>
                                </div>
                              )}
                              <button className={cn("w-full py-2.5 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest", selectedAgent.facebookConnected ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-blue-600 text-white")}>
                                {selectedAgent.facebookConnected ? '● Conectado — Desvincular' : 'Conectar con Facebook'}
                              </button>
                            </div>
                          </div>

                          {/* Global Accounts Overview — 5 WA + 5 FB */}
                          <div className="bg-black/20 border border-white/5 rounded-3xl p-6">
                            <div className="flex items-center gap-3 mb-5">
                              <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
                                <Zap className="w-4 h-4 text-yellow-400" />
                              </div>
                              <div>
                                <p className="text-white font-bold text-sm">Cuentas del Departamento</p>
                                <p className="text-slate-500 text-[10px]">5 WhatsApp Business · 5 Páginas Facebook · 10 cuentas activas</p>
                              </div>
                              <div className="ml-auto flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Todas Activas</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* WhatsApp Accounts */}
                              <div>
                                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                  <span className="w-4 h-4 bg-emerald-500/20 rounded flex items-center justify-center text-[8px]">📱</span>
                                  WhatsApp Business (5 cuentas)
                                </p>
                                <div className="space-y-2">
                                  {recruitAgents.filter(a => a.whatsappAccount).map(a => (
                                    <div key={a.id} className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2.5">
                                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", a.bgColor)}>
                                        <a.icon className={cn("w-3.5 h-3.5", a.color)} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white text-[10px] font-bold">{a.name}</p>
                                        <p className="text-emerald-400 font-mono text-[9px]">{a.whatsappAccount}</p>
                                      </div>
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Facebook Accounts */}
                              <div>
                                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                  <span className="w-4 h-4 bg-blue-500/20 rounded flex items-center justify-center text-[8px]">📘</span>
                                  Facebook Pages (5 cuentas)
                                </p>
                                <div className="space-y-2">
                                  {recruitAgents.filter(a => a.facebookAccount).map(a => (
                                    <div key={a.id} className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/10 rounded-xl px-3 py-2.5">
                                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", a.bgColor)}>
                                        <a.icon className={cn("w-3.5 h-3.5", a.color)} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white text-[10px] font-bold">{a.name}</p>
                                        <p className="text-blue-400 font-mono text-[9px]">@{a.facebookAccount}</p>
                                      </div>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Flow Editor tab */}
                      {activeTab === 'flow' && (
                        <motion.div key="flow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                          {/* header */}
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-white font-bold text-sm">Flujos de Conversación</h4>
                              <p className="text-slate-500 text-[10px] mt-0.5">{flows.filter(f => f.agentId === selectedAgent.id).length} flujos configurados para {selectedAgent.name}</p>
                            </div>
                            <button onClick={() => setShowFlowModal(true)} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", selectedAgent.bgColor, selectedAgent.color, "border", selectedAgent.borderColor)}>
                              <Plus className="w-3 h-3" /> Crear Flujo
                            </button>
                          </div>

                          {/* Flow list */}
                          {flows.filter(f => f.agentId === selectedAgent.id).length === 0 && (
                            <div className="text-center py-12 text-slate-600 text-xs font-bold uppercase tracking-widest">Sin flujos configurados</div>
                          )}
                          {flows.filter(f => f.agentId === selectedAgent.id).map(flow => (
                            <div key={flow.id} className="bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
                              {/* Flow header row */}
                              <div className="flex items-center gap-3 px-5 py-4">
                                <GitBranch className={cn("w-4 h-4 shrink-0", selectedAgent.color)} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-bold text-sm truncate">{flow.name}</p>
                                  <p className="text-slate-500 text-[10px]">Trigger: {flow.trigger}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => toggleFlow(flow.id)} className={cn("text-[8px] font-black uppercase px-2 py-1 rounded-full border transition-all", flow.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-slate-500 border-white/10")}>
                                    {flow.active ? 'ACTIVO' : 'PAUSADO'}
                                  </button>
                                  <button onClick={() => setExpandedFlowId(expandedFlowId === flow.id ? null : flow.id)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                                    {expandedFlowId === flow.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => deleteFlow(flow.id)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Node editor */}
                              <AnimatePresence>
                                {expandedFlowId === flow.id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5">
                                    <div className="p-5 space-y-3">
                                      {flow.nodes.map((node, idx) => (
                                        <div key={node.id} className="relative">
                                          {/* connector line */}
                                          {idx > 0 && <div className="w-px h-3 bg-white/10 mx-auto -mt-3 mb-0" />}
                                          <div className={cn(
                                            "bg-slate-900/60 rounded-xl border p-4",
                                            node.type === 'message' ? 'border-blue-500/20' :
                                            node.type === 'user' ? 'border-slate-500/30' :
                                            node.type === 'condition' ? 'border-amber-500/20' :
                                            node.type === 'action' ? 'border-purple-500/20' :
                                            'border-orange-500/20'
                                          )}>
                                            <div className="flex items-center gap-2 mb-3">
                                              <select
                                                value={node.type}
                                                onChange={e => updateNode(flow.id, node.id, 'type', e.target.value as FlowNodeType)}
                                                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 outline-none cursor-pointer"
                                              >
                                                <option value="message">💬 Mensaje Bot</option>
                                                <option value="user">👤 Resp. Usuario</option>
                                                <option value="condition">🔀 Condición</option>
                                                <option value="action">⚡ Acción</option>
                                                <option value="delay">⏱ Espera</option>
                                              </select>
                                              <span className="text-slate-600 text-[9px] font-bold ml-auto">Nodo {idx + 1}</span>
                                              <button onClick={() => deleteNode(flow.id, node.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                            <textarea
                                              value={node.content}
                                              onChange={e => updateNode(flow.id, node.id, 'content', e.target.value)}
                                              placeholder={node.type === 'message' ? 'Texto del mensaje del bot...' : node.type === 'user' ? 'Descripción de la respuesta esperada...' : node.type === 'condition' ? 'Condición a evaluar...' : node.type === 'action' ? 'Acción a ejecutar...' : 'Tiempo de espera...'}
                                              className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none focus:border-blue-500/30 resize-none min-h-[72px] transition-all"
                                            />
                                            {node.type === 'condition' && (
                                              <div className="grid grid-cols-2 gap-3 mt-3">
                                                <div>
                                                  <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1 block">✓ Si (SÍ)</label>
                                                  <input value={node.conditionYes || ''} onChange={e => updateNode(flow.id, node.id, 'conditionYes', e.target.value)}
                                                    placeholder="Rama positiva..." className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 text-[11px] text-emerald-300 outline-none" />
                                                </div>
                                                <div>
                                                  <label className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1 block">✗ No (NO)</label>
                                                  <input value={node.conditionNo || ''} onChange={e => updateNode(flow.id, node.id, 'conditionNo', e.target.value)}
                                                    placeholder="Rama negativa..." className="w-full bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-[11px] text-red-300 outline-none" />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      <button onClick={() => addNode(flow.id)} className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-[10px] font-bold text-slate-500 hover:border-blue-500/30 hover:text-blue-400 transition-all flex items-center justify-center gap-2">
                                        <Plus className="w-3 h-3" /> Agregar Nodo
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}

                          {/* Create Flow Modal */}
                          <AnimatePresence>
                            {showFlowModal && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                                  className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                                  <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-white font-bold text-lg">Nuevo Flujo de Conversación</h4>
                                    <button onClick={() => setShowFlowModal(false)} className="text-slate-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
                                  </div>
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nombre del Flujo *</label>
                                      <input value={newFlow.name} onChange={e => setNewFlow(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Ej. Bienvenida inicial" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/40" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Trigger / Disparador</label>
                                      <input value={newFlow.trigger} onChange={e => setNewFlow(f => ({ ...f, trigger: e.target.value }))}
                                        placeholder="Ej. Nuevo mensaje entrante" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/40" />
                                    </div>
                                    <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Agente Asignado</p>
                                      <p className={cn("text-sm font-bold mt-1", selectedAgent.color)}>{selectedAgent.name} — {selectedAgent.codeName}</p>
                                    </div>
                                    <button onClick={createFlow} className={cn("w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all", selectedAgent.bgColor, selectedAgent.color, "border", selectedAgent.borderColor, "hover:opacity-90")}>
                                      Crear Flujo →
                                    </button>
                                  </div>
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── VACANCIES ── */}
        {view === 'vacancies' && (
          <motion.div key="vacancies" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

            {/* Vacancy creation form */}
            <AnimatePresence>
              {showVacancyForm && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-slate-900/80 backdrop-blur-2xl border border-purple-500/20 rounded-3xl p-8 shadow-2xl">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-white">Nueva Vacante</h3>
                      <p className="text-slate-500 text-xs mt-1">Marco (Content-Maker) generará automáticamente el contenido publicitario</p>
                    </div>
                    <button onClick={() => setShowVacancyForm(false)} className="text-slate-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={createVacancy} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Título del Puesto *</label>
                        <input required value={vacancyForm.title} onChange={e => setVacancyForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Ej. Ejecutivo de Ventas Campo" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-purple-500/40 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Departamento</label>
                        <input value={vacancyForm.department} onChange={e => setVacancyForm(f => ({ ...f, department: e.target.value }))}
                          placeholder="Ej. Comercial" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-purple-500/40 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ubicación</label>
                        <input value={vacancyForm.location} onChange={e => setVacancyForm(f => ({ ...f, location: e.target.value }))}
                          placeholder="Ej. CDMX, Guadalajara" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-purple-500/40 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Modalidad</label>
                        <select value={vacancyForm.modality} onChange={e => setVacancyForm(f => ({ ...f, modality: e.target.value as any }))}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-purple-500/40 outline-none cursor-pointer">
                          <option value="Presencial">Presencial</option>
                          <option value="Remoto">Remoto</option>
                          <option value="Híbrido">Híbrido</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                        <select value={vacancyForm.status} onChange={e => setVacancyForm(f => ({ ...f, status: e.target.value as any }))}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-purple-500/40 outline-none cursor-pointer">
                          <option value="OPEN">Abierta</option>
                          <option value="URGENT">Urgente</option>
                          <option value="PAUSED">Pausada</option>
                          <option value="CLOSED">Cerrada</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sueldo Mínimo ($MXN)</label>
                        <input value={vacancyForm.salaryMin} onChange={e => setVacancyForm(f => ({ ...f, salaryMin: e.target.value }))}
                          placeholder="Ej. 12000" type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-purple-500/40 outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sueldo Máximo ($MXN)</label>
                        <input value={vacancyForm.salaryMax} onChange={e => setVacancyForm(f => ({ ...f, salaryMax: e.target.value }))}
                          placeholder="Ej. 22000" type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-purple-500/40 outline-none" />
                      </div>

                      {/* Requirements */}
                      <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Requisitos</label>
                        <div className="flex gap-2">
                          <input value={reqInput} onChange={e => setReqInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                            placeholder="Agregar requisito y presionar Enter..." className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-purple-500/40 outline-none" />
                          <button type="button" onClick={addRequirement} className="px-4 py-3 bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-2xl text-xs font-bold hover:bg-purple-600/30 transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {vacancyForm.requirements.map((r, i) => (
                            <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300">
                              {r}
                              <button type="button" onClick={() => setVacancyForm(f => ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-red-400 transition-colors">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Benefits */}
                      <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Beneficios</label>
                        <div className="flex gap-2">
                          <input value={benInput} onChange={e => setBenInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                            placeholder="Agregar beneficio y presionar Enter..." className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:border-purple-500/40 outline-none" />
                          <button type="button" onClick={addBenefit} className="px-4 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-2xl text-xs font-bold hover:bg-emerald-600/30 transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {vacancyForm.benefits.map((b, i) => (
                            <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-full text-xs text-emerald-300">
                              {b}
                              <button type="button" onClick={() => setVacancyForm(f => ({ ...f, benefits: f.benefits.filter((_, j) => j !== i) }))} className="text-emerald-600 hover:text-red-400 transition-colors">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Descripción del Puesto</label>
                        <textarea value={vacancyForm.description} onChange={e => setVacancyForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Describe las responsabilidades principales del rol..." rows={4}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-purple-500/40 outline-none resize-none" />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98]">
                      Publicar Vacante →
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vacancy grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vacancies.map(v => (
                <VacancyCard key={v.id} title={v.title} locations={v.location} salary={`$${parseInt(v.salaryMin).toLocaleString()} - $${parseInt(v.salaryMax).toLocaleString()}`} candidates={v.candidates} status={v.status} modality={v.modality} department={v.department} requirements={v.requirements} benefits={v.benefits} />
              ))}
              <div onClick={() => setShowVacancyForm(v => !v)} className="min-h-[200px] bg-white/2 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 group hover:border-purple-500/30 transition-all cursor-pointer">
                <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform", showVacancyForm ? "bg-purple-600/20" : "bg-purple-600/10")}>
                  {showVacancyForm ? <XCircle className="w-8 h-8 text-purple-400" /> : <Plus className="w-8 h-8 text-purple-400" />}
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{showVacancyForm ? 'Cancelar' : 'Crear Nueva Vacante'}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── REGISTER ── */}
        {view === 'register' && (
          <motion.div key="register" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-2xl mx-auto">
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white">Alta de Candidato</h3>
                  <p className="text-slate-500 text-sm mt-1">El Agente "PRIMER CONTACTO" tomará el control automáticamente.</p>
                </div>
                <button onClick={() => setView('dashboard')} className="p-2 text-slate-500 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form className="space-y-5" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input name="name" type="text" required placeholder="Ej. Juan Pérez" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input name="phone" type="tel" required placeholder="+52..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
                    <input name="email" type="email" required placeholder="email@ejemplo.com" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-blue-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Vacante / Posición</label>
                  <input name="role" type="text" required placeholder="Ej. Ejecutivo de Ventas" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-blue-500 outline-none" />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] text-sm uppercase tracking-widest">
                    Registrar e Iniciar Pipeline IA →
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* ── CANDIDATE DETAIL ── */}
        {view === 'detail' && selectedCandidate && (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                <button onClick={() => setView('dashboard')} className="absolute top-8 right-8 text-slate-500 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>

                <div className="flex flex-col md:flex-row gap-6 mb-8">
                  <div className="w-24 h-24 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <User className="w-12 h-12 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-2">{selectedCandidate.name}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 font-mono text-[11px]">
                        <Briefcase className="w-4 h-4" /> {selectedCandidate.id}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-blue-400">
                        <Phone className="w-4 h-4" /> {selectedCandidate.phone}
                      </span>
                      <StatusBadge status={selectedCandidate.status} />
                      {selectedCandidate.score !== undefined && selectedCandidate.score > 0 && (
                        <span className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                          <Star className="w-3 h-3" /> Score: {selectedCandidate.score}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 border-b border-white/5 mb-8">
                  <TabBtn label="Información" active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={User} />
                  <TabBtn label="Conversación" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={MessageSquare} />
                  <TabBtn label="Documentos" active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} icon={FileText} />
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'info' && (
                    <motion.div key="ci" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-10 text-sm">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Datos del Candidato</h4>
                          <div className="space-y-2">
                            <InfoLine label="Nombre" value={selectedCandidate.name} />
                            <InfoLine label="Email" value={selectedCandidate.email} />
                            <InfoLine label="Fuente" value={selectedCandidate.source} />
                            <InfoLine label="Estado" value={selectedCandidate.status} />
                          </div>
                          <div className="pt-3 flex flex-wrap gap-2">
                            {(['ENTREVISTA', 'OBSERVACION', 'BIENVENIDA', 'SEGUIMIENTO', 'RECHAZADO'] as CandidateStatus[]).map(s => (
                              <button key={s} onClick={() => handleUpdateStatus(selectedCandidate.id, s)} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 hover:text-white transition-all">
                                → {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Vacante de Interés</h4>
                          <div className="space-y-2">
                            <InfoLine label="Posición" value={selectedCandidate.role} />
                            <InfoLine label="Expectativa" value="$18k - $22k" />
                            <InfoLine label="Disponibilidad" value="Inmediata" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Historial</h4>
                          <TimelineItem time="Hoy 10:32" actor="Alexia" text="Primer contacto vía WhatsApp" />
                          <TimelineItem time="Hoy 10:46" actor="Alexia" text="CV solicitado y recibido" />
                          <TimelineItem time="Hoy 11:15" actor="Sofía" text="Kit de bienvenida enviado" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'chat' && (
                    <motion.div key="cc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                      <div className="bg-black/20 rounded-3xl p-6 h-[360px] overflow-y-auto space-y-6">
                        <Bubble author="Alexia" text="¡Hola! Gracias por contactar a HDreams. ¿En qué posición estás interesado/a?" time="10:32" />
                        <Bubble author="CANDIDATO" text="Hola, vi su anuncio en Facebook. Estoy interesado en el puesto de Ejecutivo." time="10:34" variant="user" />
                        <Bubble author="Alexia" text="Perfecto. ¿Podrías compartirme tu CV? Y cuéntame un poco tu experiencia en ventas." time="10:35" />
                        <Bubble author="Sofía" text="Hola! Soy Sofía. Aquí está el kit de beneficios de HDreams 📋 ¿Tienes alguna pregunta sobre nuestra cultura?" time="11:15" />
                      </div>
                      <div className="relative">
                        <textarea placeholder="Mensaje manual al candidato..." className="w-full bg-white/5 border border-white/10 rounded-3xl py-4 pl-6 pr-32 text-sm outline-none focus:border-blue-500/30 transition-all resize-none h-20 text-white" />
                        <div className="absolute right-3 bottom-3 flex gap-2">
                          <button className="p-2 text-slate-500 hover:text-white"><Upload className="w-5 h-5" /></button>
                          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg">ENVIAR</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'docs' && (
                    <motion.div key="cd" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <DocSquare label="CV.pdf" icon={FileText} status="VER" />
                      <DocSquare label="INE.jpg" icon={Camera} status="OK" />
                      <DocSquare label="Solicitud.pdf" icon={FileText} status="PEN" />
                      <div className="aspect-square rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-2 group hover:border-blue-500/30 transition-all cursor-pointer">
                        <Plus className="w-8 h-8 text-slate-700 group-hover:text-blue-500" />
                        <span className="text-[10px] font-bold text-slate-700 group-hover:text-slate-500 uppercase">Subir</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-5">Acciones</h4>
                <div className="space-y-2">
                  <SideButton icon={MessageSquare} label="WhatsApp Manual" primary color="bg-blue-600" />
                  <SideButton icon={Calendar} label="Agendar Entrevista" />
                  <SideButton icon={Star} label="Calificar Candidato" color="bg-emerald-600/20 text-emerald-400 border-emerald-500/20" />
                  <SideButton icon={Users} label="Asignar a Agente" />
                  <SideButton icon={XCircle} label="Archivar / Rechazar" color="text-red-400 hover:bg-red-500/10" />
                </div>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Agente Asignado</h4>
                {(() => {
                  const ag = recruitAgents.find(a => a.id === selectedCandidate.agentAssigned);
                  return ag ? (
                    <div className={cn("p-4 rounded-2xl border flex items-center gap-3", ag.bgColor, ag.borderColor)}>
                      <ag.icon className={cn("w-5 h-5", ag.color)} />
                      <div>
                        <p className="text-white font-bold text-sm">{ag.name}</p>
                        <p className={cn("text-[9px] font-bold uppercase", ag.color)}>{ag.codeName}</p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CandidateStatus }) {
  const map: Record<CandidateStatus, string> = {
    NUEVO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    SCREENING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    ENTREVISTA: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    OBSERVACION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    BIENVENIDA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    SEGUIMIENTO: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    RECHAZADO: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", map[status])}>{status}</span>;
}

function KpiCard({ label, value, subValue, color }: any) {
  return (
    <motion.div
      animate={{ borderColor: ['rgba(255,255,255,0.1)', 'rgba(59,130,246,0.2)', 'rgba(255,255,255,0.1)'] }}
      transition={{ repeat: Infinity, duration: 3 }}
      className="bg-slate-900/40 backdrop-blur-md border p-4 rounded-xl"
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[9px] text-slate-400 mt-1 font-bold">{subValue}</p>
    </motion.div>
  );
}

function AlertItem({ text, color }: any) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
      <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
      <span className={`text-[11px] font-bold ${color}`}>{text}</span>
    </div>
  );
}

function TabBtn({ label, active, onClick, icon: Icon }: any) {
  return (
    <button onClick={onClick} className={cn("px-5 py-4 flex items-center gap-2 text-xs font-bold transition-all relative", active ? "text-blue-400" : "text-slate-500 hover:text-slate-300")}>
      <Icon className="w-4 h-4" />
      {label}
      {active && <motion.div layoutId="detailTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_-2px_8px_rgba(59,130,246,0.5)]" />}
    </button>
  );
}

function InfoLine({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-lg transition-colors">
      <span className="text-slate-500 font-medium text-sm">{label}:</span>
      <span className="text-slate-200 font-bold text-sm">{value}</span>
    </div>
  );
}

function TimelineItem({ time, actor, text }: any) {
  return (
    <div className="relative pl-6 border-l border-white/10 ml-2 pb-3 last:pb-0">
      <div className="absolute left-[-4.5px] top-1 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      <div className="text-[10px] font-bold text-slate-500 mb-0.5">{time} • {actor}</div>
      <div className="text-xs text-slate-300 font-medium">{text}</div>
    </div>
  );
}

function Bubble({ author, text, time, variant }: any) {
  return (
    <div className={`flex flex-col ${variant === 'user' ? 'items-end' : 'items-start'} gap-1.5`}>
      <span className={`text-[9px] font-bold uppercase tracking-widest ${variant === 'user' ? 'text-blue-400' : 'text-emerald-400'}`}>{author}</span>
      <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${variant === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'}`}>
        {text}
      </div>
      <span className="text-[8px] text-slate-600 font-bold">{time}</span>
    </div>
  );
}

function DocSquare({ label, icon: Icon, status }: any) {
  return (
    <div className="aspect-square bg-slate-900/60 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 p-4 group hover:border-blue-500/30 transition-all cursor-pointer">
      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
        <Icon className="w-5 h-5 text-slate-500 group-hover:text-blue-500" />
      </div>
      <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-200 text-center uppercase tracking-tighter truncate w-full px-1">{label}</span>
      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${status === 'OK' ? 'bg-emerald-500/20 text-emerald-400' : status === 'VER' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{status}</span>
    </div>
  );
}

function SideButton({ icon: Icon, label, primary, color }: any) {
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-xs font-bold group",
      primary ? `${color || 'bg-blue-600'} text-white border-white/10 shadow-lg hover:scale-[1.02]` : `${color || 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`
    )}>
      <Icon className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
      {label}
    </button>
  );
}

function VacancyCard({ title, locations, salary, candidates, status, modality, department, requirements, benefits }: any) {
  const statusMap: Record<string, string> = {
    OPEN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    URGENT: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    PAUSED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    CLOSED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  const statusLabel: Record<string, string> = { OPEN: 'Abierta', URGENT: 'Urgente', PAUSED: 'Pausada', CLOSED: 'Cerrada' };
  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-4 hover:border-purple-500/30 transition-all group">
      <div className="flex justify-between items-start">
        <div className="w-12 h-12 bg-purple-600/10 rounded-2xl flex items-center justify-center text-purple-400">
          <Briefcase className="w-6 h-6" />
        </div>
        <span className={cn("px-2 py-1 rounded border text-[8px] font-black uppercase tracking-widest", statusMap[status] || statusMap.OPEN)}>
          {statusLabel[status] || status}
        </span>
      </div>
      <div>
        <h4 className="text-white font-bold text-lg leading-tight">{title}</h4>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {locations && <span className="flex items-center gap-1 text-[9px] text-slate-500 font-bold"><MapPin className="w-2.5 h-2.5" />{locations}</span>}
          {modality && <span className="flex items-center gap-1 text-[9px] text-slate-500 font-bold"><Layers className="w-2.5 h-2.5" />{modality}</span>}
          {department && <span className="flex items-center gap-1 text-[9px] text-slate-500 font-bold"><Building2 className="w-2.5 h-2.5" />{department}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400">
        <Banknote className="w-3 h-3" /> {salary}
      </div>
      {requirements && requirements.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {requirements.slice(0, 3).map((r: string, i: number) => (
            <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/8 rounded-full text-[8px] text-slate-400 font-bold">{r}</span>
          ))}
          {requirements.length > 3 && <span className="text-[8px] text-slate-500 font-bold px-1">+{requirements.length - 3}</span>}
        </div>
      )}
      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] text-slate-400 font-bold">{candidates} Candidatos</span>
        </div>
        <button className="text-[10px] font-black text-purple-400 uppercase tracking-widest hover:text-white transition-colors">Ver Detalles</button>
      </div>
    </div>
  );
}
