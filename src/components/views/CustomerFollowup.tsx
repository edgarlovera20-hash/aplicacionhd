import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare, Phone, Search, Filter, Plus, Send, Check, CheckCheck,
  Clock, AlertTriangle, ChevronRight, X, Ticket, DollarSign, Bell,
  User, Users, TrendingUp, TrendingDown, Zap, RefreshCw, MoreVertical,
  Paperclip, Smile, ChevronDown, Calendar, Star, Edit2, Trash2,
  Activity, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle,
  Wifi, WifiOff, MessageCircle, CreditCard, FileText, Download,
  BarChart2, Eye, Tag, Shield, Headphones
} from 'lucide-react';
import { cn } from '../../lib/utils';

/* ═══════════════════════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════════════════════ */
type EstadoPago   = 'nuevo' | 'al_corriente' | 'pendiente' | 'moroso' | 'inactivo';
type TicketEstado = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
type MsgDir       = 'inbound' | 'outbound';
type MsgEstado    = 'enviado' | 'entregado' | 'leido' | 'error';
type Tab          = 'dashboard' | 'clientes' | 'flujos' | 'reportes';
type DetailTab    = 'chat' | 'info' | 'tickets' | 'pagos' | 'recordatorios';

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  folio: string;
  paquete: string;
  renta: number;
  megas: string;
  estado_pago: EstadoPago;
  fecha_alta: string;
  fecha_ultimo_pago?: string;
  agente_id: string;
  agente_nombre: string;
  beneficio_activado: boolean;
  domiciliado: boolean;
  colonia: string;
  municipio: string;
  notas?: string;
  mensajes_sin_leer: number;
  ultimo_contacto?: string;
}

interface WAButton {
  label: string;
  action: 'domiciliar' | 'pagar_ahora' | 'compromiso_pago' | 'ver_factura' | string;
  payload?: any;
}

interface Mensaje {
  id: string;
  cliente_id: string;
  texto: string;
  fecha: string;
  tipo: MsgDir;
  estado: MsgEstado;
  plantilla?: string;
  agente?: string;
  buttons?: WAButton[];        // WhatsApp interactive buttons
}

interface Ticket_ {
  id: string;
  cliente_id: string;
  asunto: string;
  descripcion: string;
  estado: TicketEstado;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  fecha_apertura: string;
  fecha_cierre?: string;
  agente_id: string;
}

interface Pago {
  id: string;
  cliente_id: string;
  monto: number;
  fecha: string;
  estado: 'pendiente' | 'pagado' | 'rechazado';
  metodo: string;
  referencia?: string;
}

interface Recordatorio {
  id: string;
  cliente_id: string;
  tipo: string;
  fecha_programada: string;
  estado: 'pendiente' | 'enviado' | 'cancelado';
  mensaje: string;
}

/* ═══════════════════════════════════════════════════════════
   PLANTILLAS WhatsApp
═══════════════════════════════════════════════════════════ */
const PLANTILLAS = [
  {
    id: 'bienvenida',
    label: '👋 Bienvenida',
    color: 'emerald',
    texto: (c: Cliente) =>
      `¡Hola ${c.nombre.split(' ')[0]}! 👋\n\nSoy *${c.agente_nombre}*, tu agente asignado de *Promotor Autorizado Infinitum – Heavenly Dreams*.\n\nTu servicio *${c.paquete}* (${c.megas} Mbps) ya está registrado con folio: *${c.folio}*.\n\n📋 Renta mensual: $${c.renta} MXN\n📅 Fecha de activación: ${c.fecha_alta}\n\n¿Tienes alguna duda o necesitas ayuda con tu servicio? Aquí estoy para ti. 😊`,
  },
  {
    id: 'activacion_telmex',
    label: '⚡ Activación Telmex',
    color: 'blue',
    texto: (c: Cliente) =>
      `¡Hola ${c.nombre.split(' ')[0]}! ⚡\n\nTe comparto los pasos para activar tu *Cuenta Telmex* y acceder a todos tus beneficios:\n\n1️⃣ Descarga la app *Mi Telmex* (iOS / Android)\n2️⃣ Registra tu número con folio *${c.folio}*\n3️⃣ Activa *Claro Video* (plataforma de streaming incluida)\n4️⃣ Elige tu plataforma gratis: Netflix 🎬 o HBO Max 🎭 (6 meses sin costo)\n\n${c.domiciliado ? '✅ Ya tienes domiciliación activa → +6 meses adicionales de tu plataforma elegida 🎉' : '💡 Domicilia tu pago y obtén *6 meses extra* de streaming. Toca el botón para iniciar.'}\n\n¿Necesitas ayuda con algún paso? 📞 800 123 2222`,
    botones: (c: Cliente): WAButton[] => c.domiciliado
      ? []
      : [
          { label: '✅ Quiero Domiciliar', action: 'domiciliar', payload: { clienteId: c.id, folio: c.folio } },
          { label: '💳 Pagar ahora',       action: 'pagar_ahora', payload: { clienteId: c.id, folio: c.folio } },
        ],
  },
  {
    id: 'primer_pago',
    label: '💳 Primer pago',
    color: 'amber',
    texto: (c: Cliente) =>
      `Hola ${c.nombre.split(' ')[0]}, te recordamos que tu primer pago de *$${c.renta} MXN* está próximo a vencer.\n\n✅ Paga fácil y sin filas:\n• App Mi Telmex\n• OXXO Pay con referencia de tu factura\n• Domiciliación bancaria (y obtén 6 meses de streaming gratis)\n\n⚠️ *Recuerda: NO realices pagos en efectivo a promotores o técnicos.*\n\nSoporte: 800 123 2222 | WhatsApp: 55 6469 4609`,
  },
  {
    id: 'recordatorio_moroso',
    label: '⚠️ Recordatorio moroso',
    color: 'orange',
    texto: (c: Cliente) =>
      `Hola ${c.nombre.split(' ')[0]}, te informamos que tu servicio *${c.paquete}* presenta un adeudo pendiente.\n\n📌 Folio: *${c.folio}*\n💰 Saldo: *$${c.renta} MXN*\n📅 Último pago: ${c.fecha_ultimo_pago || 'Sin registro'}\n\nPara evitar la *suspensión del servicio*, te pedimos regularizar tu cuenta a la brevedad.\n\n📲 Opciones de pago:\n• App Mi Telmex\n• Tiendas de conveniencia (OXXO, 7-Eleven)\n• Domiciliación\n\n¿Necesitas apoyo? Escríbeme y con gusto te ayudo. 🙏`,
  },
  {
    id: 'moroso_critico',
    label: '🔴 Moroso crítico',
    color: 'red',
    texto: (c: Cliente) =>
      `*AVISO IMPORTANTE* ⚠️\n\nHola ${c.nombre.split(' ')[0]}, tu servicio *${c.paquete}* está en riesgo de *SUSPENSIÓN DEFINITIVA* por adeudo mayor a 30 días.\n\n📌 Folio: *${c.folio}*\n💰 Adeudo acumulado: *$${c.renta * 2} MXN*\n\nPara mantener tu servicio activo y evitar cargos adicionales, es urgente que regularices tu cuenta *HOY*.\n\n📞 Llámanos: 800 123 2222\n💬 WhatsApp: 55 6469 4609\n\nEstamos aquí para ayudarte a encontrar la mejor solución. 🤝`,
  },
  {
    id: 'pago_recibido',
    label: '✅ Pago recibido',
    color: 'green',
    texto: (c: Cliente) =>
      `✅ *¡Pago confirmado!*\n\nHola ${c.nombre.split(' ')[0]}, hemos recibido correctamente tu pago de *$${c.renta} MXN*.\n\n📌 Folio: *${c.folio}*\n📅 Fecha: ${new Date().toLocaleDateString('es-MX')}\n\n¡Gracias por estar al corriente! Tu servicio continúa activo sin interrupciones. 🎉\n\n¿Algo más en que pueda ayudarte? 😊`,
  },
  {
    id: 'encuesta',
    label: '⭐ Encuesta',
    color: 'purple',
    texto: (c: Cliente) =>
      `¡Hola ${c.nombre.split(' ')[0]}! ⭐\n\nEn *Heavenly Dreams* nos importa tu experiencia.\n\n¿Cómo calificarías la atención recibida?\n\n1️⃣ Muy mala\n2️⃣ Mala\n3️⃣ Regular\n4️⃣ Buena\n⭐ Excelente\n\nTu opinión nos ayuda a mejorar. ¡Gracias! 🙏`,
  },
];

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
═══════════════════════════════════════════════════════════ */
const MOCK_CLIENTES: Cliente[] = [
  { id: 'CLI-001', nombre: 'María González Torres', telefono: '5512345678', email: 'maria.gt@gmail.com', folio: 'FOL-881023', paquete: 'Doble Play 500 MB', renta: 599, megas: '500', estado_pago: 'al_corriente', fecha_alta: '2026-01-15', fecha_ultimo_pago: '2026-04-01', agente_id: 'AGT-001', agente_nombre: 'Laura Sánchez', beneficio_activado: true, domiciliado: true, colonia: 'Del Valle', municipio: 'Benito Juárez', mensajes_sin_leer: 0, ultimo_contacto: '2026-04-25' },
  { id: 'CLI-002', nombre: 'Carlos Ramírez Vega', telefono: '5598765432', email: 'carlos.rv@hotmail.com', folio: 'FOL-882044', paquete: 'Triple Play 1 Gbps', renta: 899, megas: '1000', estado_pago: 'moroso', fecha_alta: '2025-12-01', fecha_ultimo_pago: '2026-02-01', agente_id: 'AGT-002', agente_nombre: 'Jorge Méndez', beneficio_activado: false, domiciliado: false, colonia: 'Coyoacán', municipio: 'Coyoacán', notas: 'Promete pagar este viernes', mensajes_sin_leer: 3, ultimo_contacto: '2026-04-20' },
  { id: 'CLI-003', nombre: 'Ana Lucía Moreno', telefono: '5534567890', email: 'ana.moreno@gmail.com', folio: 'FOL-883105', paquete: 'Doble Play 250 MB', renta: 449, megas: '250', estado_pago: 'pendiente', fecha_alta: '2026-03-20', fecha_ultimo_pago: '2026-03-20', agente_id: 'AGT-001', agente_nombre: 'Laura Sánchez', beneficio_activado: true, domiciliado: false, colonia: 'Narvarte', municipio: 'Benito Juárez', mensajes_sin_leer: 1, ultimo_contacto: '2026-04-22' },
  { id: 'CLI-004', nombre: 'Roberto Flores Díaz', telefono: '5545678901', email: 'rflores@empresa.com', folio: 'FOL-884216', paquete: 'Doble Play 500 MB', renta: 599, megas: '500', estado_pago: 'nuevo', fecha_alta: '2026-04-24', agente_id: 'AGT-003', agente_nombre: 'Diana Torres', beneficio_activado: false, domiciliado: false, colonia: 'Polanco', municipio: 'Miguel Hidalgo', mensajes_sin_leer: 0 },
  { id: 'CLI-005', nombre: 'Patricia Hernández', telefono: '5556789012', email: 'pathi@gmail.com', folio: 'FOL-885327', paquete: 'Triple Play 500 MB', renta: 749, megas: '500', estado_pago: 'al_corriente', fecha_alta: '2026-02-01', fecha_ultimo_pago: '2026-04-02', agente_id: 'AGT-002', agente_nombre: 'Jorge Méndez', beneficio_activado: true, domiciliado: true, colonia: 'Lindavista', municipio: 'Gustavo A. Madero', mensajes_sin_leer: 0, ultimo_contacto: '2026-04-15' },
  { id: 'CLI-006', nombre: 'Eduardo Martínez Luna', telefono: '5567890123', email: 'edmar@yahoo.com', folio: 'FOL-886438', paquete: 'Doble Play 250 MB', renta: 449, megas: '250', estado_pago: 'moroso', fecha_alta: '2025-10-15', fecha_ultimo_pago: '2026-01-15', agente_id: 'AGT-001', agente_nombre: 'Laura Sánchez', beneficio_activado: false, domiciliado: false, colonia: 'Iztapalapa', municipio: 'Iztapalapa', notas: 'Difícil de contactar', mensajes_sin_leer: 5, ultimo_contacto: '2026-04-10' },
  { id: 'CLI-007', nombre: 'Sofía Ramos Castillo', telefono: '5578901234', email: 'sofia.rc@gmail.com', folio: 'FOL-887549', paquete: 'Triple Play 1 Gbps', renta: 899, megas: '1000', estado_pago: 'al_corriente', fecha_alta: '2026-01-20', fecha_ultimo_pago: '2026-04-03', agente_id: 'AGT-003', agente_nombre: 'Diana Torres', beneficio_activado: true, domiciliado: true, colonia: 'Santa Fe', municipio: 'Álvaro Obregón', mensajes_sin_leer: 0, ultimo_contacto: '2026-04-20' },
  { id: 'CLI-008', nombre: 'Miguel Ángel Soto', telefono: '5589012345', email: 'masoto@protonmail.com', folio: 'FOL-888660', paquete: 'Doble Play 500 MB', renta: 599, megas: '500', estado_pago: 'pendiente', fecha_alta: '2026-04-01', fecha_ultimo_pago: '2026-04-01', agente_id: 'AGT-002', agente_nombre: 'Jorge Méndez', beneficio_activado: false, domiciliado: false, colonia: 'Xochimilco', municipio: 'Xochimilco', mensajes_sin_leer: 2, ultimo_contacto: '2026-04-23' },
  { id: 'CLI-009', nombre: 'Alejandra Cruz Pérez', telefono: '5590123456', email: 'ale.cruz@gmail.com', folio: 'FOL-889771', paquete: 'Doble Play 250 MB', renta: 449, megas: '250', estado_pago: 'nuevo', fecha_alta: '2026-04-25', agente_id: 'AGT-001', agente_nombre: 'Laura Sánchez', beneficio_activado: false, domiciliado: false, colonia: 'Tlalpan', municipio: 'Tlalpan', mensajes_sin_leer: 0 },
  { id: 'CLI-010', nombre: 'Fernando Jiménez Ruiz', telefono: '5501234567', email: 'fjimenez@outlook.com', folio: 'FOL-890882', paquete: 'Triple Play 500 MB', renta: 749, megas: '500', estado_pago: 'moroso', fecha_alta: '2025-11-01', fecha_ultimo_pago: '2026-01-01', agente_id: 'AGT-003', agente_nombre: 'Diana Torres', beneficio_activado: false, domiciliado: false, colonia: 'Cuauhtémoc', municipio: 'Cuauhtémoc', notas: 'Acordó pago el 30 de abril', mensajes_sin_leer: 0, ultimo_contacto: '2026-04-18' },
  { id: 'CLI-011', nombre: 'Valeria López Mendoza', telefono: '5512309876', email: 'vale.lm@gmail.com', folio: 'FOL-891993', paquete: 'Doble Play 500 MB', renta: 599, megas: '500', estado_pago: 'al_corriente', fecha_alta: '2026-02-15', fecha_ultimo_pago: '2026-04-04', agente_id: 'AGT-002', agente_nombre: 'Jorge Méndez', beneficio_activado: true, domiciliado: false, colonia: 'Insurgentes Sur', municipio: 'Benito Juárez', mensajes_sin_leer: 0, ultimo_contacto: '2026-04-15' },
  { id: 'CLI-012', nombre: 'Héctor Villanueva', telefono: '5523450987', email: 'hvillanueva@yahoo.com', folio: 'FOL-893104', paquete: 'Doble Play 250 MB', renta: 449, megas: '250', estado_pago: 'inactivo', fecha_alta: '2025-08-01', fecha_ultimo_pago: '2025-11-01', agente_id: 'AGT-001', agente_nombre: 'Laura Sánchez', beneficio_activado: false, domiciliado: false, colonia: 'Tepito', municipio: 'Cuauhtémoc', notas: 'Solicitó cancelación', mensajes_sin_leer: 0, ultimo_contacto: '2026-03-01' },
];

const MOCK_MENSAJES: Record<string, Mensaje[]> = {
  'CLI-001': [
    { id: 'm1', cliente_id: 'CLI-001', texto: '¡Hola María! 👋\n\nSoy Laura Sánchez...', fecha: '2026-01-15T10:00:00', tipo: 'outbound', estado: 'leido', plantilla: 'bienvenida', agente: 'Laura Sánchez' },
    { id: 'm2', cliente_id: 'CLI-001', texto: 'Hola! Gracias. ¿Cómo activo Netflix?', fecha: '2026-01-15T10:15:00', tipo: 'inbound', estado: 'leido' },
    { id: 'm3', cliente_id: 'CLI-001', texto: '¡Claro! Te mando los pasos para activar tu beneficio de Netflix...', fecha: '2026-01-15T10:18:00', tipo: 'outbound', estado: 'leido', plantilla: 'activacion_telmex', agente: 'Laura Sánchez' },
    { id: 'm4', cliente_id: 'CLI-001', texto: 'Perfecto, ya lo pude activar. Muchas gracias!', fecha: '2026-01-15T10:45:00', tipo: 'inbound', estado: 'leido' },
    { id: 'm5', cliente_id: 'CLI-001', texto: 'Qué bueno 🎉 ¡Disfruta tu servicio! Cualquier duda aquí estaré.', fecha: '2026-01-15T10:47:00', tipo: 'outbound', estado: 'leido', agente: 'Laura Sánchez' },
  ],
  'CLI-002': [
    { id: 'm1', cliente_id: 'CLI-002', texto: '¡Hola Carlos! 👋 Soy Jorge Méndez...', fecha: '2025-12-01T09:00:00', tipo: 'outbound', estado: 'leido', plantilla: 'bienvenida', agente: 'Jorge Méndez' },
    { id: 'm2', cliente_id: 'CLI-002', texto: 'Ok', fecha: '2025-12-01T11:00:00', tipo: 'inbound', estado: 'leido' },
    { id: 'm3', cliente_id: 'CLI-002', texto: 'Carlos, te recordamos que tu pago de $899 está pendiente...', fecha: '2026-03-05T09:00:00', tipo: 'outbound', estado: 'leido', plantilla: 'recordatorio_moroso', agente: 'Jorge Méndez' },
    { id: 'm4', cliente_id: 'CLI-002', texto: 'Si sé, te pago el viernes', fecha: '2026-03-05T12:00:00', tipo: 'inbound', estado: 'leido' },
    { id: 'm5', cliente_id: 'CLI-002', texto: 'AVISO IMPORTANTE ⚠️\n\nCarlos, tu servicio está en riesgo...', fecha: '2026-04-20T09:00:00', tipo: 'outbound', estado: 'entregado', plantilla: 'moroso_critico', agente: 'Jorge Méndez' },
    { id: 'm6', cliente_id: 'CLI-002', texto: 'Ahorita no tengo. Dame unos días', fecha: '2026-04-20T14:00:00', tipo: 'inbound', estado: 'leido' },
    { id: 'm7', cliente_id: 'CLI-002', texto: '¿cuándo?', fecha: '2026-04-22T10:00:00', tipo: 'inbound', estado: 'leido' },
    { id: 'm8', cliente_id: 'CLI-002', texto: 'hay descuento si pago todo junto?', fecha: '2026-04-24T15:00:00', tipo: 'inbound', estado: 'enviado' },
  ],
  'CLI-003': [
    { id: 'm1', cliente_id: 'CLI-003', texto: '¡Hola Ana! Bienvenida a Heavenly Dreams...', fecha: '2026-03-20T10:00:00', tipo: 'outbound', estado: 'leido', plantilla: 'bienvenida', agente: 'Laura Sánchez' },
    { id: 'm2', cliente_id: 'CLI-003', texto: 'Gracias! Tengo una duda, ¿el wifi llega a toda la casa?', fecha: '2026-03-20T10:30:00', tipo: 'inbound', estado: 'leido' },
    { id: 'm3', cliente_id: 'CLI-003', texto: 'Tu servicio es de 250 Mbps. Para mejor cobertura puedes solicitar un extensor WiFi...', fecha: '2026-03-20T10:35:00', tipo: 'outbound', estado: 'leido', agente: 'Laura Sánchez' },
    { id: 'm4', cliente_id: 'CLI-003', texto: 'Hola Ana, tu pago de $449 vence pronto. Te recuerdo las opciones...', fecha: '2026-04-22T09:00:00', tipo: 'outbound', estado: 'leido', plantilla: 'primer_pago', agente: 'Laura Sánchez' },
    { id: 'm5', cliente_id: 'CLI-003', texto: 'Ok ya pague por OXXO', fecha: '2026-04-22T16:00:00', tipo: 'inbound', estado: 'enviado' },
  ],
};

const MOCK_TICKETS: Ticket_[] = [
  { id: 'TKT-001', cliente_id: 'CLI-002', asunto: 'No hay internet hace 2 días', descripcion: 'Cliente reporta falla total de servicio.', estado: 'en_proceso', prioridad: 'alta', fecha_apertura: '2026-04-19T10:00:00', agente_id: 'AGT-002' },
  { id: 'TKT-002', cliente_id: 'CLI-003', asunto: 'WiFi no llega a habitación', descripcion: 'Señal débil en área trasera del domicilio.', estado: 'resuelto', prioridad: 'media', fecha_apertura: '2026-03-22T09:00:00', fecha_cierre: '2026-03-24T11:00:00', agente_id: 'AGT-001' },
  { id: 'TKT-003', cliente_id: 'CLI-006', asunto: 'Factura incorrecta', descripcion: 'Cargo duplicado en estado de cuenta.', estado: 'abierto', prioridad: 'alta', fecha_apertura: '2026-04-15T14:00:00', agente_id: 'AGT-001' },
  { id: 'TKT-004', cliente_id: 'CLI-008', asunto: 'No puede activar Netflix', descripcion: 'Error al registrar cuenta en beneficio.', estado: 'abierto', prioridad: 'baja', fecha_apertura: '2026-04-23T11:00:00', agente_id: 'AGT-002' },
];

const MOCK_PAGOS: Record<string, Pago[]> = {
  'CLI-001': [
    { id: 'PAG-001', cliente_id: 'CLI-001', monto: 599, fecha: '2026-01-15', estado: 'pagado', metodo: 'Domiciliación', referencia: 'DOM-2026-01' },
    { id: 'PAG-002', cliente_id: 'CLI-001', monto: 599, fecha: '2026-02-15', estado: 'pagado', metodo: 'Domiciliación', referencia: 'DOM-2026-02' },
    { id: 'PAG-003', cliente_id: 'CLI-001', monto: 599, fecha: '2026-03-15', estado: 'pagado', metodo: 'Domiciliación', referencia: 'DOM-2026-03' },
    { id: 'PAG-004', cliente_id: 'CLI-001', monto: 599, fecha: '2026-04-01', estado: 'pagado', metodo: 'Domiciliación', referencia: 'DOM-2026-04' },
  ],
  'CLI-002': [
    { id: 'PAG-005', cliente_id: 'CLI-002', monto: 899, fecha: '2025-12-01', estado: 'pagado', metodo: 'OXXO', referencia: 'OXX-1234' },
    { id: 'PAG-006', cliente_id: 'CLI-002', monto: 899, fecha: '2026-01-01', estado: 'pagado', metodo: 'Transferencia', referencia: 'TRF-5678' },
    { id: 'PAG-007', cliente_id: 'CLI-002', monto: 899, fecha: '2026-02-01', estado: 'pagado', metodo: 'App Telmex', referencia: 'APP-9012' },
    { id: 'PAG-008', cliente_id: 'CLI-002', monto: 899, fecha: '2026-03-01', estado: 'pendiente', metodo: '—', referencia: '' },
    { id: 'PAG-009', cliente_id: 'CLI-002', monto: 899, fecha: '2026-04-01', estado: 'pendiente', metodo: '—', referencia: '' },
  ],
};

const MOCK_RECORDATORIOS: Record<string, Recordatorio[]> = {
  'CLI-002': [
    { id: 'REC-001', cliente_id: 'CLI-002', tipo: 'Recordatorio moroso', fecha_programada: '2026-04-28T09:00:00', estado: 'pendiente', mensaje: 'Recordatorio automático: adeudo >30 días' },
    { id: 'REC-002', cliente_id: 'CLI-002', tipo: 'SLA agente 48h', fecha_programada: '2026-04-27T09:00:00', estado: 'pendiente', mensaje: 'Tarea: Contactar cliente con adeudo crítico' },
  ],
  'CLI-003': [
    { id: 'REC-003', cliente_id: 'CLI-003', tipo: 'Confirmar pago', fecha_programada: '2026-04-26T10:00:00', estado: 'pendiente', mensaje: 'Verificar recepción de pago en OXXO' },
  ],
  'CLI-004': [
    { id: 'REC-004', cliente_id: 'CLI-004', tipo: 'Bienvenida automática', fecha_programada: '2026-04-24T14:00:00', estado: 'enviado', mensaje: 'Mensaje de bienvenida enviado' },
    { id: 'REC-005', cliente_id: 'CLI-004', tipo: 'Activación Telmex', fecha_programada: '2026-04-26T10:00:00', estado: 'pendiente', mensaje: 'Recordar al cliente activar su cuenta Telmex' },
  ],
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const ESTADO_CFG: Record<EstadoPago, { label: string; color: string; bg: string; dot: string }> = {
  nuevo:        { label: 'Nuevo',        color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    dot: 'bg-blue-400' },
  al_corriente: { label: 'Al corriente', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  pendiente:    { label: 'Pendiente',    color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',  dot: 'bg-amber-400' },
  moroso:       { label: 'Moroso',       color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',      dot: 'bg-red-400 animate-pulse' },
  inactivo:     { label: 'Inactivo',     color: 'text-zinc-500',    bg: 'bg-zinc-500/10 border-zinc-500/20',    dot: 'bg-zinc-500' },
};

const TICKET_COLOR: Record<TicketEstado, string> = {
  abierto:    'bg-red-500/10 text-red-400 border-red-500/20',
  en_proceso: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  resuelto:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cerrado:    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const PRIORIDAD_COLOR: Record<string, string> = {
  baja:    'text-zinc-400',
  media:   'text-amber-400',
  alta:    'text-orange-400',
  critica: 'text-red-400',
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60)    return 'Hace un momento';
  if (diff < 3600)  return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800) return d.toLocaleDateString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const inputCls = "w-full px-3 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#00ABDF]/50";

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function CustomerFollowup() {
  const [tab, setTab]           = useState<Tab>('dashboard');
  const [clientes]              = useState<Cliente[]>(MOCK_CLIENTES);
  const [mensajes, setMensajes] = useState<Record<string, Mensaje[]>>(MOCK_MENSAJES);
  const [tickets, setTickets]   = useState<Ticket_[]>(MOCK_TICKETS);
  const [pagos]                 = useState<Record<string, Pago[]>>(MOCK_PAGOS);
  const [recordatorios]         = useState<Record<string, Recordatorio[]>>(MOCK_RECORDATORIOS);

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [detailTab, setDetailTab]             = useState<DetailTab>('chat');

  // Filtros
  const [search, setSearch]           = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoPago | ''>('');
  const [filterAgente, setFilterAgente] = useState('');

  // KPIs
  const kpis = useMemo(() => {
    const total       = clientes.length;
    const al_corriente = clientes.filter(c => c.estado_pago === 'al_corriente').length;
    const morosos     = clientes.filter(c => c.estado_pago === 'moroso').length;
    const pendientes  = clientes.filter(c => c.estado_pago === 'pendiente').length;
    const nuevos      = clientes.filter(c => c.estado_pago === 'nuevo').length;
    const benefActiv  = clientes.filter(c => c.beneficio_activado).length;
    const domiciliados = clientes.filter(c => c.domiciliado).length;
    const sinLeer     = clientes.reduce((s, c) => s + c.mensajes_sin_leer, 0);
    const tktsAbiertos = tickets.filter(t => t.estado === 'abierto' || t.estado === 'en_proceso').length;
    const tktsResueltos = tickets.filter(t => t.estado === 'resuelto').length;
    return { total, al_corriente, morosos, pendientes, nuevos, benefActiv, domiciliados, sinLeer, tktsAbiertos, tktsResueltos };
  }, [clientes, tickets]);

  const filteredClientes = useMemo(() => clientes.filter(c => {
    if (search && !c.nombre.toLowerCase().includes(search.toLowerCase()) &&
        !c.telefono.includes(search) && !c.folio.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEstado && c.estado_pago !== filterEstado) return false;
    if (filterAgente && c.agente_id !== filterAgente) return false;
    return true;
  }), [clientes, search, filterEstado, filterAgente]);

  const agentes = useMemo(() => [...new Map(clientes.map(c => [c.agente_id, c.agente_nombre])).entries()], [clientes]);

  const sendMessage = (clienteId: string, texto: string, plantilla?: string, buttons?: WAButton[]) => {
    const msg: Mensaje = {
      id: 'msg-' + Date.now(),
      cliente_id: clienteId,
      texto,
      fecha: new Date().toISOString(),
      tipo: 'outbound',
      estado: 'enviado',
      plantilla,
      agente: 'Tú',
      buttons: buttons && buttons.length ? buttons : undefined,
    };
    setMensajes(prev => ({ ...prev, [clienteId]: [...(prev[clienteId] || []), msg] }));
  };

  const addTicket = (t: Omit<Ticket_, 'id' | 'fecha_apertura'>) => {
    setTickets(prev => [...prev, { ...t, id: 'TKT-' + Date.now(), fecha_apertura: new Date().toISOString() }]);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950/30">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <div className="p-2 bg-[#00ABDF]/10 rounded-xl border border-[#00ABDF]/20">
                <MessageCircle className="w-5 h-5 text-[#00ABDF]" />
              </div>
              Seguimiento a Clientes
            </h1>
            <p className="text-zinc-500 text-xs mt-0.5 ml-11">Canal único WhatsApp · Agente asignado · Gestión de morosos</p>
          </div>
          <div className="flex items-center gap-2">
            {kpis.sinLeer > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ABDF]/10 border border-[#00ABDF]/20 rounded-xl">
                <MessageSquare className="w-3.5 h-3.5 text-[#00ABDF]" />
                <span className="text-xs font-bold text-[#00ABDF]">{kpis.sinLeer} sin leer</span>
              </div>
            )}
            {kpis.morosos > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-bold text-red-400">{kpis.morosos} morosos</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mt-4">
          {([
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'clientes',  label: `Clientes (${clientes.length})`, icon: Users },
            { id: 'flujos',    label: 'Flujos Auto', icon: Zap },
            { id: 'reportes',  label: 'Reportes',    icon: BarChart2 },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                tab === t.id
                  ? "bg-[#00ABDF] text-white shadow-lg shadow-[#00ABDF]/20"
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'dashboard' && <DashboardTab kpis={kpis} clientes={clientes} tickets={tickets} mensajes={mensajes} onSelectCliente={(c) => { setSelectedCliente(c); setTab('clientes'); }} />}
        {tab === 'clientes' && (
          <div className="flex h-full">
            {/* Lista */}
            <div className={cn("flex flex-col border-r border-white/5 transition-all duration-300", selectedCliente ? "w-80 shrink-0" : "flex-1")}>
              {/* Filtros */}
              <div className="p-3 border-b border-white/5 space-y-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-8 pr-3 py-2 bg-zinc-950/50 border border-white/5 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#00ABDF]/50" />
                </div>
                {!selectedCliente && (
                  <div className="flex gap-2">
                    <select value={filterEstado} onChange={e => setFilterEstado(e.target.value as EstadoPago | '')}
                      className="flex-1 px-3 py-2 bg-zinc-950/50 border border-white/5 rounded-xl text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#00ABDF]/50">
                      <option value="">Todos los estados</option>
                      {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filterAgente} onChange={e => setFilterAgente(e.target.value)}
                      className="flex-1 px-3 py-2 bg-zinc-950/50 border border-white/5 rounded-xl text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#00ABDF]/50">
                      <option value="">Todos los agentes</option>
                      {agentes.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {/* Lista clientes */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredClientes.map(c => (
                  <ClienteRow
                    key={c.id}
                    cliente={c}
                    selected={selectedCliente?.id === c.id}
                    compact={!!selectedCliente}
                    onClick={() => { setSelectedCliente(c); setDetailTab('chat'); }}
                    lastMsg={(mensajes[c.id] || []).at(-1)}
                  />
                ))}
                {filteredClientes.length === 0 && (
                  <div className="py-16 text-center text-zinc-600 text-sm">Sin resultados</div>
                )}
              </div>
            </div>

            {/* Panel detalle */}
            {selectedCliente && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <ClienteDetailPanel
                  cliente={selectedCliente}
                  mensajes={mensajes[selectedCliente.id] || []}
                  tickets={tickets.filter(t => t.cliente_id === selectedCliente.id)}
                  pagos={pagos[selectedCliente.id] || []}
                  recordatorios={recordatorios[selectedCliente.id] || []}
                  detailTab={detailTab}
                  onTabChange={setDetailTab}
                  onSendMessage={(txt, plt, btns) => sendMessage(selectedCliente.id, txt, plt, btns)}
                  onAddTicket={addTicket}
                  onClose={() => setSelectedCliente(null)}
                />
              </div>
            )}
          </div>
        )}
        {tab === 'flujos'   && <FlujoTab />}
        {tab === 'reportes' && <ReportesTab kpis={kpis} clientes={clientes} tickets={tickets} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FILA DE CLIENTE EN LISTA
═══════════════════════════════════════════════════════════ */
function ClienteRow({ cliente: c, selected, compact, onClick, lastMsg }: {
  cliente: Cliente; selected: boolean; compact: boolean;
  onClick: () => void; lastMsg?: Mensaje;
}) {
  const cfg = ESTADO_CFG[c.estado_pago];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-white/5 transition-all",
        selected ? "bg-[#00ABDF]/10 border-l-2 border-l-[#00ABDF]" : "hover:bg-zinc-800/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center text-sm font-bold text-white">
            {c.nombre.charAt(0)}
          </div>
          <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900", cfg.dot)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className={cn("text-sm font-semibold truncate", selected ? "text-white" : "text-zinc-200")}>{c.nombre}</p>
            {c.mensajes_sin_leer > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#00ABDF] text-white text-[10px] font-black flex items-center justify-center shrink-0">{c.mensajes_sin_leer}</span>
            )}
          </div>
          {!compact && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", cfg.bg, cfg.color)}>{cfg.label}</span>
              <span className="text-[11px] text-zinc-500 truncate">{lastMsg?.texto.slice(0, 30) || c.folio}</span>
            </div>
          )}
          {compact && (
            <p className="text-[11px] text-zinc-500 truncate">{c.telefono}</p>
          )}
        </div>
        {!compact && lastMsg && (
          <span className="text-[10px] text-zinc-600 shrink-0">{fmtDate(lastMsg.fecha)}</span>
        )}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   PANEL DETALLE CLIENTE
═══════════════════════════════════════════════════════════ */
function ClienteDetailPanel({ cliente, mensajes, tickets, pagos, recordatorios, detailTab, onTabChange, onSendMessage, onAddTicket, onClose }: {
  cliente: Cliente;
  mensajes: Mensaje[];
  tickets: Ticket_[];
  pagos: Pago[];
  recordatorios: Recordatorio[];
  detailTab: DetailTab;
  onTabChange: (t: DetailTab) => void;
  onSendMessage: (txt: string, plantilla?: string, buttons?: WAButton[]) => void;
  onAddTicket: (t: Omit<Ticket_, 'id' | 'fecha_apertura'>) => void;
  onClose: () => void;
}) {
  const cfg = ESTADO_CFG[cliente.estado_pago];
  const sinLeerTickets = tickets.filter(t => t.estado === 'abierto').length;
  const pagosAtrasados = pagos.filter(p => p.estado === 'pendiente').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header cliente */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3 shrink-0 bg-zinc-900/30">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00ABDF]/30 to-indigo-600/30 border border-[#00ABDF]/20 flex items-center justify-center text-base font-black text-white">
            {cliente.nombre.charAt(0)}
          </div>
          <span className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900", cfg.dot)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">{cliente.nombre}</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500">+52 {cliente.telefono}</span>
            <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border", cfg.bg, cfg.color)}>{cfg.label}</span>
          </div>
        </div>
        <button
          onClick={() => window.open(`https://api.whatsapp.com/send?phone=52${cliente.telefono}`, '_blank')}
          className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-emerald-400 transition-colors" title="Abrir WhatsApp"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-white/5 shrink-0 bg-zinc-900/20 px-4">
        {([
          { id: 'chat',         label: 'Chat',          icon: MessageSquare },
          { id: 'info',         label: 'Info',          icon: User },
          { id: 'tickets',      label: `Tickets${sinLeerTickets > 0 ? ` (${sinLeerTickets})` : ''}`, icon: Ticket },
          { id: 'pagos',        label: `Pagos${pagosAtrasados > 0 ? ` ⚠` : ''}`, icon: CreditCard },
          { id: 'recordatorios', label: 'Alertas',      icon: Bell },
        ] as { id: DetailTab; label: string; icon: React.ElementType }[]).map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-all border-b-2 whitespace-nowrap",
              detailTab === t.id
                ? "border-[#00ABDF] text-[#00ABDF]"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {detailTab === 'chat' && (
          <ChatTab
            cliente={cliente}
            mensajes={mensajes}
            onSend={onSendMessage}
          />
        )}
        {detailTab === 'info' && <InfoTab cliente={cliente} />}
        {detailTab === 'tickets' && <TicketsTab cliente={cliente} tickets={tickets} onAdd={onAddTicket} />}
        {detailTab === 'pagos' && <PagosTab cliente={cliente} pagos={pagos} />}
        {detailTab === 'recordatorios' && <RecordatoriosTab cliente={cliente} recordatorios={recordatorios} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB — CHAT WhatsApp
═══════════════════════════════════════════════════════════ */
function ChatTab({ cliente, mensajes, onSend }: { cliente: Cliente; mensajes: Mensaje[]; onSend: (txt: string, plt?: string, buttons?: WAButton[]) => void }) {
  const [input, setInput]           = useState('');
  const [showTemplates, setShow]    = useState(false);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  const sendFree = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const sendTemplate = (plt: typeof PLANTILLAS[number]) => {
    const buttons = (plt as any).botones ? (plt as any).botones(cliente) as WAButton[] : undefined;
    onSend(plt.texto(cliente), plt.id, buttons);
    setShow(false);
  };

  // ── Handler cuando el cliente "presiona" un botón interactivo ──────
  const handleButtonAction = async (btn: WAButton) => {
    if (btn.action === 'domiciliar') {
      try {
        const r = await fetch('/api/seguimiento/domiciliacion-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clienteId: cliente.id }),
        });
        const d = await r.json();
        const txt = `🏦 *Domiciliación bancaria*\n\nFolio: *${cliente.folio}*\nMonto: *$${cliente.renta} MXN/mes*\n\n👉 Link seguro de pago (válido 24h):\n${d.link}\n\n✨ Bonus: al activar domiciliación obtienes *6 meses extra* de tu plataforma de streaming.\n\n¿Dudas? Responde y te apoyo.`;
        onSend(txt, 'domiciliacion_link');
      } catch {
        onSend('No pude generar el link en este momento, intentamos de nuevo.', 'domiciliacion_link');
      }
    } else if (btn.action === 'pagar_ahora') {
      onSend(`💳 *Opciones de pago inmediato*\n\n• App Mi Telmex (folio ${cliente.folio})\n• OXXO Pay con referencia de tu factura\n• Transferencia SPEI: CLABE 012180001234567890`, 'pagar_ahora');
    } else if (btn.action === 'compromiso_pago') {
      const fecha = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
      onSend(`📌 Compromiso de Pago registrado para el *${fecha}*. Te enviaremos un recordatorio cordial ese día.`, 'compromiso_confirmado');
    }
  };

  // Agrupar mensajes por fecha
  const grouped = useMemo(() => {
    const groups: { date: string; msgs: Mensaje[] }[] = [];
    let lastDate = '';
    for (const m of mensajes) {
      const d = new Date(m.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
      if (d !== lastDate) { groups.push({ date: d, msgs: [] }); lastDate = d; }
      groups[groups.length - 1].msgs.push(m);
    }
    return groups;
  }, [mensajes]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Background pattern WA-style */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 custom-scrollbar relative">
        {grouped.map(group => (
          <div key={group.date}>
            <div className="flex justify-center my-3">
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900/80 px-3 py-1 rounded-full border border-white/5">{group.date}</span>
            </div>
            {group.msgs.map(m => (
              <BubbleMsg key={m.id} msg={m} onButtonClick={handleButtonAction} />
            ))}
          </div>
        ))}
        {mensajes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <MessageSquare className="w-10 h-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm font-medium">Sin mensajes aún</p>
            <p className="text-zinc-600 text-xs mt-1">Envía un mensaje de bienvenida para iniciar</p>
            <button onClick={() => setShow(true)} className="mt-4 px-4 py-2 bg-[#00ABDF]/10 border border-[#00ABDF]/20 rounded-xl text-[#00ABDF] text-xs font-bold flex items-center gap-2 hover:bg-[#00ABDF]/20 transition-colors">
              <Zap className="w-3.5 h-3.5" /> Usar plantilla de bienvenida
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Templates dropdown */}
      {showTemplates && (
        <div className="absolute bottom-[72px] left-0 right-0 mx-4 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-20">
          <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-300 flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-[#00ABDF]" /> Plantillas de mensaje</p>
            <button onClick={() => setShow(false)} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {PLANTILLAS.map(plt => (
              <button
                key={plt.id}
                onClick={() => sendTemplate(plt)}
                className="w-full text-left px-4 py-3 hover:bg-zinc-800/50 transition-colors border-b border-white/5 last:border-0"
              >
                <p className="text-sm font-semibold text-zinc-200">{plt.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{plt.texto(cliente).slice(0, 80)}...</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* IA Classifier Panel — solo cuando el último mensaje es inbound de moroso */}
      <IAClassifierPanel cliente={cliente} mensajes={mensajes} onSend={onSend} />

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-white/5 bg-zinc-900/60 shrink-0">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShow(!showTemplates)}
            className={cn("p-2.5 rounded-xl border transition-colors shrink-0",
              showTemplates ? "bg-[#00ABDF]/20 border-[#00ABDF]/30 text-[#00ABDF]" : "bg-zinc-800/50 border-white/10 text-zinc-400 hover:text-white"
            )}
            title="Plantillas"
          >
            <Zap className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFree(); } }}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#00ABDF]/50 resize-none"
          />
          <button
            onClick={sendFree}
            disabled={!input.trim()}
            className="p-2.5 bg-[#00ABDF] hover:bg-[#00ABDF]/80 text-white rounded-xl transition-colors disabled:opacity-30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1.5 pl-1">
          WhatsApp · {cliente.nombre.split(' ')[0]} · +52 {cliente.telefono}
          {' · '}<span className="text-[#00ABDF] cursor-pointer hover:underline" onClick={() => window.open(`https://api.whatsapp.com/send?phone=52${cliente.telefono}`, '_blank')}>Abrir en WA ↗</span>
        </p>
      </div>
    </div>
  );
}

function BubbleMsg({ msg, onButtonClick }: { msg: Mensaje; onButtonClick?: (btn: WAButton) => void }) {
  const isOut = msg.tipo === 'outbound';
  return (
    <div className={cn("flex mb-1.5", isOut ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%] rounded-2xl shadow-sm", isOut ? "bg-[#00ABDF]/20 border border-[#00ABDF]/20 rounded-tr-sm" : "bg-zinc-800/70 border border-white/5 rounded-tl-sm")}>
        <div className="px-4 py-2.5">
          {msg.plantilla && (
            <div className="flex items-center gap-1 mb-1.5">
              <Zap className="w-2.5 h-2.5 text-[#00ABDF]" />
              <span className="text-[9px] font-bold text-[#00ABDF] uppercase tracking-wider">Plantilla</span>
            </div>
          )}
          {msg.agente && isOut && (
            <p className="text-[10px] font-bold text-[#00ABDF]/70 mb-1">{msg.agente}</p>
          )}
          <p className="text-sm text-zinc-100 whitespace-pre-line leading-relaxed">{msg.texto}</p>
          <div className={cn("flex items-center gap-1 mt-1", isOut ? "justify-end" : "justify-start")}>
            <span className="text-[10px] text-zinc-500">{new Date(msg.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
            {isOut && (
              msg.estado === 'leido'    ? <CheckCheck className="w-3 h-3 text-[#00ABDF]" /> :
              msg.estado === 'entregado' ? <CheckCheck className="w-3 h-3 text-zinc-500" /> :
              msg.estado === 'error'     ? <XCircle className="w-3 h-3 text-red-400" /> :
              <Check className="w-3 h-3 text-zinc-500" />
            )}
          </div>
        </div>
        {/* WhatsApp interactive buttons (renderizados como en WA real) */}
        {msg.buttons && msg.buttons.length > 0 && (
          <div className="border-t border-white/10 divide-y divide-white/10">
            {msg.buttons.map((b, i) => (
              <button
                key={i}
                onClick={() => onButtonClick?.(b)}
                className="w-full text-center text-[13px] font-semibold text-[#00ABDF] py-2.5 hover:bg-[#00ABDF]/10 transition-colors"
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IA CLASSIFIER — analiza última respuesta inbound y sugiere acción
═══════════════════════════════════════════════════════════ */
type ClassifyResult = {
  category: 'no_puede_pagar' | 'promete_pagar' | 'pago_realizado' | 'queja' | 'duda' | 'otro';
  sugerencia: string;
  compromisoPago?: { fecha: string; monto: number; estado: string } | null;
  aiUsed?: boolean;
};

const CATEGORY_META: Record<ClassifyResult['category'], { label: string; color: string; icon: string }> = {
  no_puede_pagar:  { label: 'No puede pagar',   color: 'bg-red-500/10 border-red-500/30 text-red-300',         icon: '🆘' },
  promete_pagar:   { label: 'Promete pagar',    color: 'bg-amber-500/10 border-amber-500/30 text-amber-300',   icon: '⏳' },
  pago_realizado:  { label: 'Pago realizado',   color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', icon: '✅' },
  queja:           { label: 'Queja / Reclamo',  color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', icon: '⚠️' },
  duda:            { label: 'Duda',             color: 'bg-blue-500/10 border-blue-500/30 text-blue-300',       icon: '❓' },
  otro:            { label: 'Otro',             color: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-300',       icon: '💬' },
};

function IAClassifierPanel({
  cliente, mensajes, onSend,
}: {
  cliente: Cliente; mensajes: Mensaje[];
  onSend: (txt: string, plt?: string, buttons?: WAButton[]) => void;
}) {
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const lastInbound = useMemo(() => {
    for (let i = mensajes.length - 1; i >= 0; i--) {
      if (mensajes[i].tipo === 'inbound') return mensajes[i];
      if (mensajes[i].tipo === 'outbound') return null; // ya respondimos
    }
    return null;
  }, [mensajes]);

  // Auto-clasifica cuando hay un nuevo mensaje inbound de moroso
  useEffect(() => {
    if (!lastInbound) { setResult(null); return; }
    if (cliente.estado_pago !== 'moroso' && cliente.estado_pago !== 'pendiente') { setResult(null); return; }
    let cancelled = false;
    setLoading(true);
    fetch('/api/seguimiento/classify-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: lastInbound.texto, monto: cliente.renta, clienteId: cliente.id }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) setResult(d); })
      .catch(() => { if (!cancelled) setResult(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lastInbound?.id, cliente.id, cliente.estado_pago, cliente.renta]);

  if (!lastInbound) return null;
  if (cliente.estado_pago !== 'moroso' && cliente.estado_pago !== 'pendiente') return null;
  if (loading && !result) {
    return (
      <div className="px-4 py-2 border-t border-white/5 bg-purple-500/5 shrink-0 flex items-center gap-2">
        <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
        <span className="text-xs text-purple-300">Clasificando respuesta con IA...</span>
      </div>
    );
  }
  if (!result) return null;
  const meta = CATEGORY_META[result.category];

  const aceptar = () => {
    onSend(result.sugerencia, `ia_${result.category}`);
    if (result.category === 'no_puede_pagar' && result.compromisoPago) {
      // En el siguiente paso, ofrecer botón de confirmación
      setTimeout(() => {
        const fechaTxt = new Date(result.compromisoPago!.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
        onSend(
          `📌 Para confirmar tu *Compromiso de Pago* del ${fechaTxt}, toca el botón:`,
          'compromiso_pago_propuesta',
          [{ label: '✅ Confirmar compromiso', action: 'compromiso_pago', payload: { fecha: result.compromisoPago!.fecha, monto: result.compromisoPago!.monto } }]
        );
      }, 600);
    }
  };

  return (
    <div className="border-t border-purple-500/20 bg-gradient-to-r from-purple-500/5 via-purple-500/10 to-purple-500/5 shrink-0">
      <div className="px-4 py-2.5 flex items-start gap-3">
        <div className="text-lg shrink-0">{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-300">IA detectó</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", meta.color)}>{meta.label}</span>
            {result.aiUsed && <span className="text-[9px] text-purple-400/60 font-mono">Gemini</span>}
            {result.compromisoPago && (
              <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                +3d → {new Date(result.compromisoPago.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-300 line-clamp-2">{result.sugerencia.split('\n')[0]}</p>
        </div>
        <button
          onClick={aceptar}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1 transition-all"
        >
          <Send className="w-3 h-3" />
          {result.category === 'no_puede_pagar' ? 'Enviar + Compromiso' : 'Enviar sugerencia'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB — INFO
═══════════════════════════════════════════════════════════ */
function InfoTab({ cliente: c }: { cliente: Cliente }) {
  const cfg = ESTADO_CFG[c.estado_pago];
  return (
    <div className="overflow-y-auto h-full custom-scrollbar p-5 space-y-5">
      {/* Alerta moroso */}
      {(c.estado_pago === 'moroso') && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-xs font-bold">Cliente Moroso — Acción requerida</p>
            <p className="text-red-400/70 text-xs mt-0.5">SLA: 48 horas para contactar y acordar plan de pago.</p>
          </div>
        </div>
      )}

      {/* Datos principales */}
      <Section title="Datos del Servicio">
        <InfoRow label="Folio"      value={c.folio} mono />
        <InfoRow label="Paquete"    value={c.paquete} />
        <InfoRow label="Velocidad"  value={`${c.megas} Mbps`} />
        <InfoRow label="Renta"      value={`$${c.renta} MXN/mes`} bold />
        <InfoRow label="Estado"     value={<span className={cn("text-xs font-bold uppercase", cfg.color)}>{cfg.label}</span>} />
        <InfoRow label="Alta"       value={c.fecha_alta} />
        {c.fecha_ultimo_pago && <InfoRow label="Último pago" value={c.fecha_ultimo_pago} />}
      </Section>

      <Section title="Datos de Contacto">
        <InfoRow label="Nombre"   value={c.nombre} />
        <InfoRow label="WhatsApp" value={`+52 ${c.telefono}`} mono />
        <InfoRow label="Email"    value={c.email} />
        <InfoRow label="Colonia"  value={`${c.colonia}, ${c.municipio}`} />
      </Section>

      <Section title="Beneficios y Configuración">
        <InfoRow label="Beneficio activado" value={
          <span className={cn("flex items-center gap-1 text-xs font-bold", c.beneficio_activado ? "text-emerald-400" : "text-zinc-500")}>
            {c.beneficio_activado ? <><CheckCircle2 className="w-3.5 h-3.5" /> Activo</> : <><XCircle className="w-3.5 h-3.5" /> No activado</>}
          </span>
        } />
        <InfoRow label="Domiciliación" value={
          <span className={cn("text-xs font-bold", c.domiciliado ? "text-emerald-400" : "text-zinc-500")}>
            {c.domiciliado ? '✅ Domiciliado' : '❌ Sin domiciliar'}
          </span>
        } />
      </Section>

      <Section title="Agente Responsable">
        <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-xl border border-white/5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00ABDF]/30 to-indigo-600/30 flex items-center justify-center text-sm font-bold text-white">{c.agente_nombre.charAt(0)}</div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">{c.agente_nombre}</p>
            <p className="text-xs text-zinc-500">{c.agente_id} · Agente único asignado</p>
          </div>
        </div>
      </Section>

      {c.notas && (
        <Section title="Notas">
          <p className="text-sm text-zinc-400 bg-amber-500/5 border border-amber-500/10 rounded-xl px-3 py-2.5">{c.notas}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono = false, bold = false }: { label: string; value: React.ReactNode; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={cn("text-xs text-zinc-200", mono && "font-mono", bold && "font-bold text-white")}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB — TICKETS
═══════════════════════════════════════════════════════════ */
function TicketsTab({ cliente, tickets, onAdd }: { cliente: Cliente; tickets: Ticket_[]; onAdd: (t: Omit<Ticket_, 'id' | 'fecha_apertura'>) => void }) {
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ asunto: '', descripcion: '', prioridad: 'media' as Ticket_['prioridad'] });

  const submit = () => {
    if (!newForm.asunto) return;
    onAdd({ ...newForm, cliente_id: cliente.id, estado: 'abierto', agente_id: cliente.agente_id });
    setShowNew(false);
    setNewForm({ asunto: '', descripcion: '', prioridad: 'media' });
  };

  return (
    <div className="overflow-y-auto h-full custom-scrollbar p-5 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{tickets.length} Tickets</p>
        <button onClick={() => setShowNew(!showNew)} className="text-xs flex items-center gap-1.5 text-[#00ABDF] hover:text-white transition-colors font-bold">
          <Plus className="w-3.5 h-3.5" /> Nuevo ticket
        </button>
      </div>

      {showNew && (
        <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 space-y-3">
          <input value={newForm.asunto} onChange={e => setNewForm(p => ({...p, asunto: e.target.value}))} placeholder="Asunto del ticket..." className={inputCls} />
          <textarea value={newForm.descripcion} onChange={e => setNewForm(p => ({...p, descripcion: e.target.value}))} placeholder="Descripción..." rows={2} className={cn(inputCls, "resize-none")} />
          <select value={newForm.prioridad} onChange={e => setNewForm(p => ({...p, prioridad: e.target.value as Ticket_['prioridad']}))} className={inputCls}>
            <option value="baja">Baja prioridad</option>
            <option value="media">Media prioridad</option>
            <option value="alta">Alta prioridad</option>
            <option value="critica">Crítica</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-xl text-xs text-zinc-400 border border-white/10 hover:text-white transition-colors">Cancelar</button>
            <button onClick={submit} className="flex-1 py-2 rounded-xl text-xs text-white bg-[#00ABDF] hover:bg-[#00ABDF]/80 transition-colors font-semibold">Crear ticket</button>
          </div>
        </div>
      )}

      {tickets.length === 0 && !showNew && (
        <div className="py-10 text-center text-zinc-600 text-sm">
          <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Sin tickets registrados
        </div>
      )}

      {tickets.map(t => (
        <div key={t.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-100 leading-snug">{t.asunto}</p>
            <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0", TICKET_COLOR[t.estado])}>{t.estado.replace('_', ' ')}</span>
          </div>
          {t.descripcion && <p className="text-xs text-zinc-400">{t.descripcion}</p>}
          <div className="flex items-center justify-between text-[10px] text-zinc-600">
            <span className={cn("font-bold", PRIORIDAD_COLOR[t.prioridad])}>⬆ {t.prioridad}</span>
            <span>{t.id} · {new Date(t.fecha_apertura).toLocaleDateString('es-MX')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB — PAGOS
═══════════════════════════════════════════════════════════ */
function PagosTab({ cliente, pagos }: { cliente: Cliente; pagos: Pago[] }) {
  const totalPagado  = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0);
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0);

  return (
    <div className="overflow-y-auto h-full custom-scrollbar p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Total pagado</p>
          <p className="text-xl font-black text-emerald-300 font-mono">${totalPagado.toLocaleString('es-MX')}</p>
        </div>
        <div className={cn("border rounded-xl p-3", totalPendiente > 0 ? "bg-red-500/10 border-red-500/20" : "bg-zinc-900/50 border-white/5")}>
          <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", totalPendiente > 0 ? "text-red-400" : "text-zinc-500")}>Adeudo</p>
          <p className={cn("text-xl font-black font-mono", totalPendiente > 0 ? "text-red-300" : "text-zinc-400")}>${totalPendiente.toLocaleString('es-MX')}</p>
        </div>
      </div>

      {pagos.length === 0 && (
        <div className="py-10 text-center text-zinc-600 text-sm">
          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Sin historial de pagos
        </div>
      )}

      <div className="space-y-2">
        {pagos.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-zinc-950/50 border border-white/5 rounded-xl">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              p.estado === 'pagado'   ? "bg-emerald-500/20" :
              p.estado === 'rechazado' ? "bg-red-500/20" : "bg-amber-500/20"
            )}>
              {p.estado === 'pagado' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
               p.estado === 'rechazado' ? <XCircle className="w-4 h-4 text-red-400" /> :
               <Clock className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-zinc-100 font-mono">${p.monto.toLocaleString('es-MX')}</p>
                <span className={cn("text-[10px] font-bold uppercase",
                  p.estado === 'pagado' ? "text-emerald-400" :
                  p.estado === 'rechazado' ? "text-red-400" : "text-amber-400"
                )}>{p.estado}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span>{p.fecha}</span>
                {p.metodo !== '—' && <><span>·</span><span>{p.metodo}</span></>}
                {p.referencia && <><span>·</span><span className="font-mono">{p.referencia}</span></>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-zinc-600 text-center">Renta mensual: <span className="text-zinc-400 font-bold">${cliente.renta} MXN</span></p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB — RECORDATORIOS
═══════════════════════════════════════════════════════════ */
function RecordatoriosTab({ cliente, recordatorios }: { cliente: Cliente; recordatorios: Recordatorio[] }) {
  return (
    <div className="overflow-y-auto h-full custom-scrollbar p-5 space-y-4">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{recordatorios.length} Alertas programadas</p>

      {recordatorios.length === 0 && (
        <div className="py-10 text-center text-zinc-600 text-sm">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Sin recordatorios activos
        </div>
      )}

      {recordatorios.map(r => (
        <div key={r.id} className={cn("border rounded-xl p-4 space-y-2",
          r.estado === 'pendiente' ? "bg-amber-500/5 border-amber-500/20" :
          r.estado === 'enviado'   ? "bg-emerald-500/5 border-emerald-500/20" :
          "bg-zinc-900/50 border-white/5"
        )}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-100">{r.tipo}</p>
            <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
              r.estado === 'pendiente' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              r.estado === 'enviado'   ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
            )}>{r.estado}</span>
          </div>
          <p className="text-xs text-zinc-400">{r.mensaje}</p>
          <p className="text-[11px] text-zinc-600 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(r.fecha_programada).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB — DASHBOARD
═══════════════════════════════════════════════════════════ */
function DashboardTab({ kpis, clientes, tickets, mensajes, onSelectCliente }: {
  kpis: Record<string, number>;
  clientes: Cliente[];
  tickets: Ticket_[];
  mensajes: Record<string, Mensaje[]>;
  onSelectCliente: (c: Cliente) => void;
}) {
  const morosos   = clientes.filter(c => c.estado_pago === 'moroso').sort((a, b) => (a.fecha_ultimo_pago || '') < (b.fecha_ultimo_pago || '') ? -1 : 1);
  const pendientes = clientes.filter(c => c.estado_pago === 'pendiente');

  // Compute hours-since-last-unanswered-inbound per client.
  // The clock starts at the most recent inbound after which we have NOT responded.
  const now = Date.now();
  const sinLeer = useMemo(() => {
    const enriched = clientes
      .filter(c => c.mensajes_sin_leer > 0)
      .map(c => {
        const msgs = mensajes[c.id] || [];
        let lastInboundTs: number | null = null;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].tipo === 'outbound') break; // ya respondimos a partir de aquí
          if (msgs[i].tipo === 'inbound') {
            lastInboundTs = new Date(msgs[i].fecha).getTime();
          }
        }
        // Fallback al campo ultimo_contacto si no hay mensaje en mock
        if (!lastInboundTs && c.ultimo_contacto) {
          lastInboundTs = new Date(c.ultimo_contacto + 'T08:00:00').getTime();
        }
        const hoursWaiting = lastInboundTs ? Math.floor((now - lastInboundTs) / (1000 * 60 * 60)) : 0;
        return { c, hoursWaiting };
      });
    // Más urgente arriba (más horas esperando) — los críticos (>4h) primero
    return enriched.sort((a, b) => b.hoursWaiting - a.hoursWaiting);
  }, [clientes, mensajes, now]);

  return (
    <div className="overflow-y-auto h-full custom-scrollbar p-5 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total clientes', val: kpis.total, color: 'text-zinc-100', icon: Users, sub: 'Registrados en sistema' },
          { label: 'Al corriente', val: kpis.al_corriente, color: 'text-emerald-400', icon: CheckCircle2, sub: `${((kpis.al_corriente / kpis.total) * 100).toFixed(0)}% del total` },
          { label: 'Morosos', val: kpis.morosos, color: 'text-red-400', icon: AlertTriangle, sub: kpis.morosos > 0 ? 'Requieren atención urgente' : 'Sin morosos ✅' },
          { label: 'Sin leer', val: kpis.sinLeer, color: 'text-[#00ABDF]', icon: MessageSquare, sub: 'Mensajes pendientes' },
        ].map(k => (
          <div key={k.label} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{k.label}</p>
              <k.icon className={cn("w-4 h-4", k.color)} />
            </div>
            <p className={cn("text-3xl font-black font-mono", k.color)}>{k.val}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Estado de la cartera */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Estado de Cartera</p>
          <div className="space-y-3">
            {[
              { label: 'Al corriente', val: kpis.al_corriente, color: 'bg-emerald-500', estado: 'al_corriente' },
              { label: 'Pendientes',   val: kpis.pendientes,   color: 'bg-amber-500',   estado: 'pendiente' },
              { label: 'Morosos',      val: kpis.morosos,      color: 'bg-red-500',     estado: 'moroso' },
              { label: 'Nuevos',       val: kpis.nuevos,       color: 'bg-blue-500',    estado: 'nuevo' },
              { label: 'Inactivos',    val: kpis.total - kpis.al_corriente - kpis.pendientes - kpis.morosos - kpis.nuevos, color: 'bg-zinc-600', estado: 'inactivo' },
            ].map(s => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">{s.label}</span>
                  <span className="font-bold text-zinc-200">{s.val} ({((s.val / kpis.total) * 100).toFixed(0)}%)</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", s.color)} style={{ width: `${(s.val / kpis.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs text-zinc-500">
            <div>Beneficios activos: <span className="text-emerald-400 font-bold">{kpis.benefActiv}</span></div>
            <div>Domiciliados: <span className="text-blue-400 font-bold">{kpis.domiciliados}</span></div>
          </div>
        </div>

        {/* Morosos urgentes */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Morosos Urgentes</p>
            <span className="text-[10px] text-zinc-600">{morosos.length} casos</span>
          </div>
          <div className="space-y-2">
            {morosos.length === 0 && <p className="text-zinc-600 text-xs text-center py-4">Sin morosos ✅</p>}
            {morosos.slice(0, 4).map(c => (
              <button key={c.id} onClick={() => onSelectCliente(c)} className="w-full flex items-center gap-3 p-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 rounded-xl transition-all text-left">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-300 shrink-0">{c.nombre.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{c.nombre}</p>
                  <p className="text-[10px] text-red-400">Último pago: {c.fecha_ultimo_pago || 'Sin registro'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-red-300">${c.renta * 2}</p>
                  <p className="text-[10px] text-zinc-600">adeudo</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mensajes sin leer — Dashboard de Urgencia */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-[#00ABDF]" /> Sin Responder</p>
            <div className="flex items-center gap-2">
              {sinLeer.filter(x => x.hoursWaiting >= 4).length > 0 && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/40 animate-pulse">
                  {sinLeer.filter(x => x.hoursWaiting >= 4).length} urgentes
                </span>
              )}
              <span className="text-[10px] text-zinc-600">{sinLeer.length} clientes</span>
            </div>
          </div>
          <div className="space-y-2">
            {sinLeer.length === 0 && <p className="text-zinc-600 text-xs text-center py-4">Todo respondido ✅</p>}
            {sinLeer.map(({ c, hoursWaiting }) => {
              const isUrgent = hoursWaiting >= 4;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCliente(c)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left border",
                    isUrgent
                      ? "bg-fuchsia-500/10 hover:bg-fuchsia-500/15 border-fuchsia-500/40 shadow-[0_0_18px_rgba(217,70,239,0.45),0_0_4px_rgba(217,70,239,0.6)] animate-[neonPulse_2.4s_ease-in-out_infinite]"
                      : "bg-[#00ABDF]/5 hover:bg-[#00ABDF]/10 border-[#00ABDF]/10 hover:border-[#00ABDF]/20"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isUrgent ? "bg-fuchsia-500/30 text-fuchsia-100 ring-2 ring-fuchsia-400/60" : "bg-[#00ABDF]/20 text-[#00ABDF]"
                  )}>{c.nombre.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold truncate", isUrgent ? "text-fuchsia-100" : "text-zinc-200")}>{c.nombre}</p>
                    <p className={cn("text-[10px] flex items-center gap-1", isUrgent ? "text-fuchsia-300 font-bold" : "text-zinc-500")}>
                      <Clock className="w-2.5 h-2.5" />
                      {hoursWaiting > 0
                        ? (hoursWaiting < 24 ? `${hoursWaiting}h sin responder` : `${Math.floor(hoursWaiting/24)}d ${hoursWaiting%24}h sin responder`)
                        : `Último contacto: ${c.ultimo_contacto || '—'}`}
                    </p>
                  </div>
                  <span className={cn(
                    "w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0",
                    isUrgent ? "bg-fuchsia-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.9)]" : "bg-[#00ABDF] text-white"
                  )}>{c.mensajes_sin_leer}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tickets abiertos */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Ticket className="w-3.5 h-3.5 text-amber-400" /> Tickets Activos</p>
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="text-amber-400 font-bold">{kpis.tktsAbiertos} abiertos</span>
            <span>·</span>
            <span className="text-emerald-400 font-bold">{kpis.tktsResueltos} resueltos</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tickets.filter(t => t.estado !== 'cerrado' && t.estado !== 'resuelto').map(t => {
            const cliente = clientes.find(c => c.id === t.cliente_id);
            return (
              <div key={t.id} className="flex items-start gap-3 p-3 bg-zinc-950/50 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", t.prioridad === 'critica' ? 'bg-red-400' : t.prioridad === 'alta' ? 'bg-orange-400' : 'bg-amber-400')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 leading-snug">{t.asunto}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{cliente?.nombre} · {t.id}</p>
                </div>
                <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0", TICKET_COLOR[t.estado])}>{t.estado.replace('_', ' ')}</span>
              </div>
            );
          })}
          {tickets.filter(t => t.estado !== 'cerrado' && t.estado !== 'resuelto').length === 0 && (
            <p className="text-zinc-600 text-xs col-span-2 text-center py-4">Sin tickets activos ✅</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB — FLUJOS AUTOMÁTICOS
═══════════════════════════════════════════════════════════ */
function FlujoTab() {
  const flujos = [
    { id: 1, nombre: 'Bienvenida Automática', trigger: 'Nuevo cliente registrado', delay: '5 minutos', plantilla: 'bienvenida', activo: true, stats: { enviados: 47, leidos: 43, conversiones: 38 } },
    { id: 2, nombre: 'Activación Telmex', trigger: 'Bienvenida entregada + 24h', delay: '24 horas', plantilla: 'activacion_telmex', activo: true, stats: { enviados: 42, leidos: 38, conversiones: 31 } },
    { id: 3, nombre: 'Recordatorio Primer Pago', trigger: 'Alta + 25 días (5 días antes del vencimiento)', delay: '25 días', plantilla: 'primer_pago', activo: true, stats: { enviados: 35, leidos: 29, conversiones: 27 } },
    { id: 4, nombre: 'Alerta Moroso Temprana', trigger: 'Sin pago a los 31 días', delay: '31 días', plantilla: 'recordatorio_moroso', activo: true, stats: { enviados: 18, leidos: 14, conversiones: 8 } },
    { id: 5, nombre: 'Moroso Crítico + Tarea', trigger: 'Sin pago a los 45 días', delay: '45 días', plantilla: 'moroso_critico', activo: true, stats: { enviados: 9, leidos: 7, conversiones: 4 } },
    { id: 6, nombre: 'Confirmación de Pago', trigger: 'Webhook pago recibido', delay: 'Inmediato', plantilla: 'pago_recibido', activo: false, stats: { enviados: 0, leidos: 0, conversiones: 0 } },
    { id: 7, nombre: 'Encuesta de Satisfacción', trigger: 'Ticket resuelto', delay: '2 horas', plantilla: 'encuesta', activo: false, stats: { enviados: 12, leidos: 10, conversiones: 9 } },
  ];

  const [estados, setEstados] = useState<Record<number, boolean>>(Object.fromEntries(flujos.map(f => [f.id, f.activo])));

  return (
    <div className="overflow-y-auto h-full custom-scrollbar p-5 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-zinc-100 font-bold text-sm">Flujos Automáticos de Mensajería</h3>
          <p className="text-zinc-500 text-xs mt-0.5">Los mensajes se envían automáticamente según los triggers configurados.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-400">{Object.values(estados).filter(Boolean).length} activos</span>
        </div>
      </div>

      {/* Diagrama de flujo visual */}
      <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Ciclo de Vida del Cliente</p>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {[
            { label: 'Nuevo',       icon: '🆕', color: 'bg-blue-500/20 border-blue-500/30' },
            { label: 'Bienvenida',  icon: '👋', color: 'bg-indigo-500/20 border-indigo-500/30' },
            { label: 'Activación',  icon: '⚡', color: 'bg-purple-500/20 border-purple-500/30' },
            { label: '1er Pago',    icon: '💳', color: 'bg-amber-500/20 border-amber-500/30' },
            { label: 'Al corriente',icon: '✅', color: 'bg-emerald-500/20 border-emerald-500/30' },
            { label: 'Seguimiento', icon: '📊', color: 'bg-teal-500/20 border-teal-500/30' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <div className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center shrink-0 min-w-[80px]", s.color)}>
                <span className="text-lg">{s.icon}</span>
                <span className="text-[10px] font-bold text-zinc-300 whitespace-nowrap">{s.label}</span>
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />}
            </React.Fragment>
          ))}
          <div className="flex flex-col items-center justify-center ml-4 shrink-0">
            <div className="w-px h-6 bg-zinc-700" />
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <span className="text-base">⚠️</span>
              <p className="text-[9px] font-bold text-red-400 mt-1">Moroso</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de flujos */}
      <div className="space-y-3">
        {flujos.map(f => {
          const plt = PLANTILLAS.find(p => p.id === f.plantilla);
          const tasa = f.stats.enviados > 0 ? ((f.stats.conversiones / f.stats.enviados) * 100).toFixed(0) : '—';
          return (
            <div key={f.id} className={cn("bg-zinc-950/40 border rounded-2xl p-4 transition-all", estados[f.id] ? "border-white/10" : "border-white/5 opacity-60")}>
              <div className="flex items-start gap-4">
                <div className="text-xl shrink-0 mt-0.5">{plt ? plt.label.split(' ')[0] : '📨'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-zinc-100">{f.nombre}</p>
                    <button
                      onClick={() => setEstados(p => ({ ...p, [f.id]: !p[f.id] }))}
                      className={cn("relative w-10 h-5 rounded-full transition-colors shrink-0",
                        estados[f.id] ? "bg-[#00ABDF]" : "bg-zinc-700"
                      )}
                    >
                      <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                        estados[f.id] ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> {f.trigger}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Delay: {f.delay}</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-[#00ABDF]" /> Plantilla: {f.plantilla}</span>
                  </div>
                  {f.stats.enviados > 0 && (
                    <div className="flex gap-4 mt-3 text-[10px]">
                      <span className="text-zinc-400">📤 <strong className="text-zinc-200">{f.stats.enviados}</strong> enviados</span>
                      <span className="text-zinc-400">👁 <strong className="text-zinc-200">{f.stats.leidos}</strong> leídos</span>
                      <span className="text-zinc-400">✅ <strong className="text-emerald-400">{tasa}%</strong> conversión</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuración webhook */}
      <div className="bg-zinc-950/40 border border-[#00ABDF]/20 rounded-2xl p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-[#00ABDF] flex items-center gap-2"><Wifi className="w-3.5 h-3.5" /> Webhook WhatsApp (Meta Cloud API)</p>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">URL del Webhook</p>
            <code className="block text-[11px] font-mono bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2 text-[#00ABDF]">
              POST https://tu-dominio.com/api/whatsapp/webhook
            </code>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Variables de entorno requeridas</p>
            <code className="block text-[11px] font-mono bg-zinc-900/80 border border-white/10 rounded-lg px-3 py-2 text-emerald-300 space-y-0.5 whitespace-pre">
              {`WA_PHONE_NUMBER_ID=your_phone_id
WA_ACCESS_TOKEN=your_token
WA_VERIFY_TOKEN=your_verify_token
WA_APP_SECRET=your_app_secret`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB — REPORTES
═══════════════════════════════════════════════════════════ */
function ReportesTab({ kpis, clientes, tickets }: { kpis: Record<string, number>; clientes: Cliente[]; tickets: Ticket_[] }) {
  const tasaConversion = kpis.total > 0 ? ((kpis.al_corriente / kpis.total) * 100).toFixed(1) : '0';
  const tasaBeneficio  = kpis.total > 0 ? ((kpis.benefActiv / kpis.total) * 100).toFixed(1) : '0';
  const tasaDomicilio  = kpis.total > 0 ? ((kpis.domiciliados / kpis.total) * 100).toFixed(1) : '0';
  const resolucionTickets = tickets.length > 0 ? ((kpis.tktsResueltos / tickets.length) * 100).toFixed(0) : '0';

  const agenteStats = useMemo(() => {
    const map = new Map<string, { nombre: string; total: number; alCorriente: number; morosos: number }>();
    for (const c of clientes) {
      if (!map.has(c.agente_id)) map.set(c.agente_id, { nombre: c.agente_nombre, total: 0, alCorriente: 0, morosos: 0 });
      const s = map.get(c.agente_id)!;
      s.total++;
      if (c.estado_pago === 'al_corriente') s.alCorriente++;
      if (c.estado_pago === 'moroso') s.morosos++;
    }
    return [...map.values()];
  }, [clientes]);

  const downloadCSV = () => {
    const headers = ['Folio', 'Nombre', 'Telefono', 'Estado Pago', 'Paquete', 'Renta', 'Agente', 'Alta', 'Beneficio', 'Domiciliado'];
    const rows = clientes.map(c => [c.folio, c.nombre, c.telefono, c.estado_pago, c.paquete, c.renta, c.agente_nombre, c.fecha_alta, c.beneficio_activado ? 'Si' : 'No', c.domiciliado ? 'Si' : 'No'].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clientes_seguimiento_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-y-auto h-full custom-scrollbar p-5 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-zinc-100 font-bold text-sm">Reportes y Métricas</h3>
        <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-[#00ABDF]/10 border border-[#00ABDF]/20 rounded-xl text-[#00ABDF] text-xs font-bold hover:bg-[#00ABDF]/20 transition-colors">
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      {/* KPI métricas clave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Cartera sana', val: `${tasaConversion}%`, sub: 'Clientes al corriente', color: 'text-emerald-400', trend: '+2.3% vs mes anterior' },
          { label: 'Activación Telmex', val: `${tasaBeneficio}%`, sub: 'Beneficio activado', color: 'text-blue-400', trend: '+5.1% vs mes anterior' },
          { label: 'Domiciliación', val: `${tasaDomicilio}%`, sub: 'Pagos domiciliados', color: 'text-purple-400', trend: '+1.8% vs mes anterior' },
          { label: 'Resolución tickets', val: `${resolucionTickets}%`, sub: 'Tickets resueltos', color: 'text-amber-400', trend: 'Tiempo medio: 18h' },
        ].map(m => (
          <div key={m.label} className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-2">{m.label}</p>
            <p className={cn("text-3xl font-black font-mono", m.color)}>{m.val}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{m.sub}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">{m.trend}</p>
          </div>
        ))}
      </div>

      {/* Por agente */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Rendimiento por Agente</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-white/5">
                <th className="pb-3 text-left">Agente</th>
                <th className="pb-3 text-center">Clientes</th>
                <th className="pb-3 text-center">Al corriente</th>
                <th className="pb-3 text-center">Morosos</th>
                <th className="pb-3 text-center">Tasa sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {agenteStats.map(a => (
                <tr key={a.nombre} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#00ABDF]/20 flex items-center justify-center text-xs font-bold text-[#00ABDF]">{a.nombre.charAt(0)}</div>
                      <span className="text-zinc-200 font-medium">{a.nombre}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center text-zinc-300 font-mono">{a.total}</td>
                  <td className="py-3 text-center text-emerald-400 font-bold">{a.alCorriente}</td>
                  <td className="py-3 text-center">
                    <span className={cn("font-bold", a.morosos > 0 ? "text-red-400" : "text-zinc-500")}>{a.morosos}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className={cn("text-sm font-black", ((a.alCorriente / a.total) * 100) >= 80 ? "text-emerald-400" : "text-amber-400")}>
                      {((a.alCorriente / a.total) * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Funnel recuperación morosos */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Funnel Recuperación Morosos</p>
        <div className="space-y-2">
          {[
            { label: 'Morosos identificados', val: kpis.morosos, pct: 100, color: 'bg-red-500' },
            { label: 'Contactados', val: Math.floor(kpis.morosos * 0.9), pct: 90, color: 'bg-orange-500' },
            { label: 'Respondieron', val: Math.floor(kpis.morosos * 0.65), pct: 65, color: 'bg-amber-500' },
            { label: 'Acordaron pago', val: Math.floor(kpis.morosos * 0.45), pct: 45, color: 'bg-yellow-500' },
            { label: 'Pagaron', val: Math.floor(kpis.morosos * 0.30), pct: 30, color: 'bg-emerald-500' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-44 shrink-0">{s.label}</span>
              <div className="flex-1 h-5 bg-zinc-800 rounded-lg overflow-hidden">
                <div className={cn("h-full rounded-lg flex items-center justify-end pr-2 transition-all", s.color)} style={{ width: `${s.pct}%` }}>
                  <span className="text-[9px] font-black text-white">{s.val}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-zinc-400 w-10 text-right">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
