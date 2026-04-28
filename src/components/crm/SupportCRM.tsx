import React, { useState } from 'react';
import {
  Headphones, Search, Plus, ChevronRight, AlertTriangle,
  CheckCircle2, Phone, MessageSquare, User, RefreshCw,
  Wallet, FileText, Ban, Clock, XCircle, Upload, Camera,
  CreditCard, ShieldAlert, Bot, Send, MapPin, Bell, Zap,
  Tag, Star, Activity, BarChart3, Home, Wrench, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LocationMap } from '../ui/expand-map';
import { cn } from '../../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type ClientStatus = 'NUEVO' | 'ACTIVO' | 'MOROSO' | 'SUSPENDIDO' | 'QUEJA';
type MorosoDays = 'leve' | 'grave' | 'critico';

interface SupportLabel {
  id: string;
  emoji: string;
  text: string;
  color: string;
  category: string;
}

interface PaymentRecord {
  month: string;
  status: 'pagado' | 'vencido' | 'pendiente';
  amount: string;
  method?: string;
}

interface SupportClient {
  id: string;
  serviceNo: string;
  name: string;
  curp: string;
  phone: string;
  email: string;
  address: string;
  status: ClientStatus;
  morosoDays?: number;
  moroso?: MorosoDays;
  package: string;
  price: string;
  balance: string;
  labels: string[];
  payments: PaymentRecord[];
  lastContact: string;
  contactAttempts: number;
  originalVendor: string;
  contractDate: string;
}

interface Ticket {
  id: string;
  client: string;
  type: string;
  priority: 'critico' | 'urgente' | 'normal';
  status: 'abierto' | 'en_proceso' | 'resuelto';
  created: string;
}

interface Installation {
  id: string;
  client: string;
  address: string;
  city: string;
  time: string;
  status: 'confirmado' | 'en_camino' | 'pendiente' | 'cancelado' | 'instalado';
}

// ─── Data ────────────────────────────────────────────────────────────────────

const SUPPORT_LABELS: SupportLabel[] = [
  { id: 's1',  emoji: '🔴', text: 'Moroso 45 días',       color: 'bg-red-500/10 text-red-400 border-red-500/20',        category: 'Cobranza' },
  { id: 's2',  emoji: '📞', text: 'Contactado',            color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     category: 'Cobranza' },
  { id: 's3',  emoji: '📞', text: 'No contacto',           color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',  category: 'Cobranza' },
  { id: 's4',  emoji: '⏰', text: 'Promesa de pago',       color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  category: 'Cobranza' },
  { id: 's5',  emoji: '💳', text: 'Ofrecer convenio',      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', category: 'Cobranza' },
  { id: 's6',  emoji: '✅', text: 'Pago confirmado',       color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', category: 'Cobranza' },
  { id: 's7',  emoji: '🎯', text: 'Retención prioritaria', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',     category: 'Cobranza' },
  { id: 's8',  emoji: '🔧', text: 'Falla técnica',         color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', category: 'Soporte' },
  { id: 's9',  emoji: '💻', text: 'Velocidad lenta',       color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', category: 'Soporte' },
  { id: 's10', emoji: '🔌', text: 'Sin servicio',          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',     category: 'Soporte' },
  { id: 's11', emoji: '🔥', text: 'Crítico 4h',            color: 'bg-red-500/10 text-red-400 border-red-500/20',        category: 'Prioridad' },
  { id: 's12', emoji: '⚡', text: 'Urgente 24h',           color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',  category: 'Prioridad' },
  { id: 's13', emoji: '🚨', text: 'Fraude detectado',      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',     category: 'Prioridad' },
  { id: 's14', emoji: '🎉', text: 'Cliente satisfecho',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', category: 'Resultado' },
  { id: 's15', emoji: '😞', text: 'Cliente insatisfecho',  color: 'bg-red-500/10 text-red-400 border-red-500/20',        category: 'Resultado' },
];

// ─── Clientes reales — Cartera Morosidad Edgar David Lovera Juárez / Org. Zuriel ─
const mockClients: SupportClient[] = [
  {
    id: '151398892', serviceNo: '22952335',
    name: 'Luis Enrique Reyes Núñez',
    curp: 'FOLIO-351040',
    phone: '55 3543-3980', email: 'dreams.rap.96@gmail.com',
    address: 'Xochiapan 108, Pedregal de Sto. Domingo, Coyoacán, CP 04369',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,198/mes', balance: '$1,198',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,198', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,198', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,198', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,198' },
    ],
    lastContact: 'Sin contacto', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '12/04/2025',
  },
  {
    id: '151396798', serviceNo: '22936702',
    name: 'Abarrotes Vázquez',
    curp: 'FOLIO-350703',
    phone: '55 1560-6962', email: '189.188.37.12@cv.com',
    address: 'Cto. Martínez de Castro 460, San Mateo Xalpa, Xochimilco, CP 16800',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Infinitum 200 MB', price: '$899/mes', balance: '$899',
    labels: ['s1', 's3'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$899', method: 'OXXO' },
      { month: 'Feb 2025', status: 'pagado', amount: '$899', method: 'OXXO' },
      { month: 'Mar 2025', status: 'pagado', amount: '$899', method: 'OXXO' },
      { month: 'Abr 2025', status: 'vencido', amount: '$899' },
    ],
    lastContact: 'Jue 23:00', contactAttempts: 2,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '28/03/2025',
  },
  {
    id: '151397079', serviceNo: '22930703',
    name: 'Dolores Michel Hernández Molina',
    curp: 'FOLIO-348485',
    phone: '55 5038-6441', email: 'danalin76@gmail.com',
    address: 'Tepatla 2, Santa María Tepepan, Xochimilco, CP 16020',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,198/mes', balance: '$1,198',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,198', method: 'OXXO' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,198', method: 'OXXO' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,198', method: 'OXXO' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,198' },
    ],
    lastContact: 'Sin contacto', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '18/03/2025',
  },
  {
    id: '151364539', serviceNo: '22500822',
    name: 'Isaac Iván Monzón Lara',
    curp: 'FOLIO-348467',
    phone: '55 2156-3494', email: 'monzonivan10@gmail.com',
    address: 'Pino 5, Santa Cruz de Guadalupe, Xochimilco, CP 16860',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Infinitum 100 MB', price: '$849/mes', balance: '$849',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$849', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$849', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$849', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$849' },
    ],
    lastContact: 'Sin contacto', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '05/02/2025',
  },
  {
    id: '151365764', serviceNo: '22519592',
    name: 'Soriano Abarrotes',
    curp: 'FOLIO-346126',
    phone: '55 2121-6592', email: 'sorianomar902@gmail.com',
    address: 'Altuna 4 Int 503, Centro Área 2, Cuauhtémoc, CP 06010',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play Plus', price: '$1,593/mes', balance: '$1,593',
    labels: ['s1', 's2', 's4'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,593', method: 'CAC Parque Vía' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,593', method: 'CAC Parque Vía' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,593', method: 'CAC Parque Vía' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,593' },
    ],
    lastContact: 'Jue 18:00', contactAttempts: 3,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '10/02/2025',
  },
  {
    id: '151373324', serviceNo: '22598475',
    name: 'María Eugenia Cadena Arvizu',
    curp: 'FOLIO-346126',
    phone: '55 1539-3690', email: 'cadenaitzelyoselin@gmail.com',
    address: 'Miguel Lerdo de Tejada 5, Campamento 2 de Octubre, Iztapalapa',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,298/mes', balance: '$1,298',
    labels: ['s1', 's3'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,298', method: 'OXXO' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,298', method: 'OXXO' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,298', method: 'OXXO' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,298' },
    ],
    lastContact: 'Sin contacto', contactAttempts: 2,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '20/02/2025',
  },
  {
    id: '151355954', serviceNo: '22413180',
    name: 'Cándido Ortiz González',
    curp: 'FOLIO-345495',
    phone: '55 2632-6714', email: 'armando.agui1824@gmail.com',
    address: 'Río Grijalva 12, San José Las Palmas, La Paz, CP 56512',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Infinitum 100 MB', price: '$849/mes', balance: '$849',
    labels: ['s1', 's3'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$849', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$849', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$849', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$849' },
    ],
    lastContact: 'Vie 08:00', contactAttempts: 2,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '15/01/2025',
  },
  {
    id: '151383206', serviceNo: '22765664',
    name: 'Génesis Jharline Sánchez García',
    curp: 'FOLIO-350703',
    phone: '55 2472-1038', email: 'alegriasolid@gmail.com',
    address: 'Carlos Bossio 15, Estrella Culhuacán, Iztapalapa, CP 09800',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,359/mes', balance: '$1,359',
    labels: ['s1', 's3'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,359', method: 'OXXO' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,359', method: 'OXXO' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,359', method: 'OXXO' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,359' },
    ],
    lastContact: 'Dom 11:00', contactAttempts: 2,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '05/03/2025',
  },
  {
    id: '151373288', serviceNo: '22598508',
    name: 'Rafael Morales Hernández',
    curp: 'FOLIO-346126',
    phone: '55 1716-1708', email: 'rafaelmoraleshernades04@gmail.com',
    address: 'Benito Gómez Farías 4, Benito Juárez Secc. 2, Iztapalapa',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Infinitum 200 MB', price: '$909/mes', balance: '$909',
    labels: ['s1', 's2', 's4'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$909', method: 'CAC Prado Norte' },
      { month: 'Feb 2025', status: 'pagado', amount: '$909', method: 'CAC Prado Norte' },
      { month: 'Mar 2025', status: 'pagado', amount: '$909', method: 'CAC Prado Norte' },
      { month: 'Abr 2025', status: 'vencido', amount: '$909' },
    ],
    lastContact: 'Sáb 05:00', contactAttempts: 3,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '20/02/2025',
  },
  {
    id: '151399096', serviceNo: '22950926',
    name: 'Emilio Sandoval Ferro',
    curp: 'FOLIO-350703',
    phone: '55 2460-5040', email: 'emilioferro45@gmail.com',
    address: 'Lic. Martínez de Castro, San Mateo Xalpa, Xochimilco',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play Plus', price: '$1,486/mes', balance: '$1,486',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,486', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,486', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,486', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,486' },
    ],
    lastContact: 'Mar 22:00', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '10/04/2025',
  },
  {
    id: '151377634', serviceNo: '22681884',
    name: 'Diana Fabiola Gallegos Jiménez',
    curp: 'FOLIO-345495',
    phone: '55 1272-5999', email: 'gabebuchis85@gmail.com',
    address: 'Rep. Honduras 40, Centro Área 3, Cuauhtémoc',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Infinitum 100 MB', price: '$849/mes', balance: '$849',
    labels: ['s1', 's3'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$849', method: 'OXXO' },
      { month: 'Feb 2025', status: 'pagado', amount: '$849', method: 'OXXO' },
      { month: 'Mar 2025', status: 'pagado', amount: '$849', method: 'OXXO' },
      { month: 'Abr 2025', status: 'vencido', amount: '$849' },
    ],
    lastContact: 'Mié 00:00', contactAttempts: 2,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '01/03/2025',
  },
  {
    id: '151396936', serviceNo: '22929376',
    name: 'Abarrotes (Marián)',
    curp: 'FOLIO-350703',
    phone: '55 2155-9507', email: 'marian.iphone@icloud.com',
    address: 'Cda. Cuauhtémoc 68, Santiago Tepalcatlalpan, Xochimilco, CP 16200',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,290/mes', balance: '$1,290',
    labels: ['s1', 's3'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,290', method: 'OXXO' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,290', method: 'OXXO' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,290', method: 'OXXO' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,290' },
    ],
    lastContact: 'Lun 15:00', contactAttempts: 2,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '28/03/2025',
  },
  {
    id: '151363167', serviceNo: '22484293',
    name: 'Ingrid Eréndida Flores García',
    curp: 'FOLIO-348485',
    phone: '55 2156-3113', email: 'erendidaflores187@gmail.com',
    address: 'Matamoros 33, San Mateo Xalpa, Xochimilco',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Infinitum 100 MB', price: '$795/mes', balance: '$795',
    labels: ['s1', 's3'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$795', method: 'OXXO' },
      { month: 'Feb 2025', status: 'pagado', amount: '$795', method: 'OXXO' },
      { month: 'Mar 2025', status: 'pagado', amount: '$795', method: 'OXXO' },
      { month: 'Abr 2025', status: 'vencido', amount: '$795' },
    ],
    lastContact: 'Sáb 10:00', contactAttempts: 2,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '30/01/2025',
  },
  {
    id: '151347418', serviceNo: '22315423',
    name: 'Flor Esmeralda Alfaro García',
    curp: 'FOLIO-346126',
    phone: '55 2642-5375', email: 'alfaroesmeralda744@gmail.com',
    address: '1er de Calvario 7, Selene, Tláhuac',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Infinitum 100 MB', price: '$788/mes', balance: '$788',
    labels: ['s1', 's2', 's4'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$788', method: 'OXXO Way' },
      { month: 'Feb 2025', status: 'pagado', amount: '$788', method: 'OXXO Way' },
      { month: 'Mar 2025', status: 'pagado', amount: '$788', method: 'OXXO Way' },
      { month: 'Abr 2025', status: 'vencido', amount: '$788' },
    ],
    lastContact: 'Mar 22:00', contactAttempts: 3,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '10/01/2025',
  },
  {
    id: '151379104', serviceNo: '22700772',
    name: 'Dolores Vanessa Martínez Flores',
    curp: 'FOLIO-350703',
    phone: '55 2465-2211', email: 'vanessamartinez69408@gmail.com',
    address: 'Santa María 13, Apatlaco, Iztapalapa, CP 09430',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,298/mes', balance: '$1,298',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,298', method: 'Cargo Automático' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,298', method: 'Cargo Automático' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,298', method: 'Cargo Automático' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,298' },
    ],
    lastContact: 'Sin contacto', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '05/03/2025',
  },
  {
    id: '151386732', serviceNo: '22783613',
    name: 'Eduardo Guerrero Tovar',
    curp: 'FOLIO-345495',
    phone: '55 4317-7320', email: 'eduardoguerrerotovar973@gmail.com',
    address: 'Ferrocarril 7, San Nicolás Totolapan, La Magdalena, CP 10900',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,298/mes', balance: '$1,298',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,298', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,298', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,298', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,298' },
    ],
    lastContact: 'Sin contacto', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '15/03/2025',
  },
  {
    id: '151401517', serviceNo: '22994224',
    name: 'Vanessa Carreño Garnica',
    curp: 'FOLIO-350677',
    phone: '55 2615-7842', email: 'maxcruz660@gmail.com',
    address: 'Venucia 117-A, Belvedere Ajusco, Tlalpan, CP 14720',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,298/mes', balance: '$1,298',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,298', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,298', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,298', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,298' },
    ],
    lastContact: 'Jue 17:00', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '14/04/2025',
  },
  {
    id: '151396770', serviceNo: '22935569',
    name: 'Yennifer Paredes Mondragón',
    curp: 'FOLIO-350703',
    phone: '55 2460-3795', email: 'flaqitamoon33@gmail.com',
    address: 'La Granja 43, San Bartolo Ameyalco, Álvaro Obregón, CP 10010',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,372/mes', balance: '$1,372',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,372', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,372', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,372', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,372' },
    ],
    lastContact: 'Sáb 18:00', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '28/03/2025',
  },
  {
    id: '151384631', serviceNo: '22764779',
    name: 'Jonathan Ramírez Robles',
    curp: 'FOLIO-351040',
    phone: '55 1661-3670', email: 'jonathanbrenda427@gmail.com',
    address: 'La Escondida 15, Santa Rosa Xochiac, Álvaro Obregón',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play 200 MB', price: '$1,353/mes', balance: '$1,353',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,353', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,353', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,353', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,353' },
    ],
    lastContact: 'Lun 18:00', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '10/03/2025',
  },
  {
    id: '151388766', serviceNo: '22808562',
    name: 'Belleza Nails',
    curp: 'FOLIO-346126',
    phone: '55 5131-7923', email: 'leo280390@gmail.com',
    address: 'Altuna 4 Int 404, Centro Área 2, Cuauhtémoc, CP 06010',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play Plus', price: '$1,399/mes', balance: '$1,399',
    labels: ['s3', 's5'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,399', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,399', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,399', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,399' },
    ],
    lastContact: 'Mié 04:00', contactAttempts: 1,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '20/03/2025',
  },
  {
    id: '151401217', serviceNo: '22982670',
    name: 'Karina Liliana Murrieta Alvarado',
    curp: 'FOLIO-351037',
    phone: '55 9180-6941', email: 'cortesrubioscar@gmail.com',
    address: 'Canal de Apatlaco 225, Apatlaco, Iztapalapa, CP 09430',
    status: 'MOROSO', morosoDays: 30, moroso: 'leve',
    package: 'Doble Play Plus', price: '$1,507/mes', balance: '$1,507',
    labels: ['s2', 's4'],
    payments: [
      { month: 'Ene 2025', status: 'pagado', amount: '$1,507', method: 'App Telmex' },
      { month: 'Feb 2025', status: 'pagado', amount: '$1,507', method: 'App Telmex' },
      { month: 'Mar 2025', status: 'pagado', amount: '$1,507', method: 'App Telmex' },
      { month: 'Abr 2025', status: 'vencido', amount: '$1,507' },
    ],
    lastContact: 'Dom 19:00', contactAttempts: 3,
    originalVendor: 'Edgar D. Lovera J.', contractDate: '12/04/2025',
  },
];

const mockInstallations: Installation[] = [
  { id: 'INS-001', client: 'María E. Rodríguez', address: 'Av. Revolución 1234', city: 'Monterrey', time: '10:00', status: 'instalado' },
  { id: 'INS-002', client: 'Juan Pérez', address: 'Reforma 456', city: 'CDMX', time: '11:30', status: 'en_camino' },
  { id: 'INS-003', client: 'Ana López', address: 'Hidalgo 789', city: 'Guadalajara', time: '14:00', status: 'pendiente' },
];

const mockTickets: Ticket[] = [
  { id: 'TKT-001', client: 'Carmen Díaz', type: 'Sin servicio', priority: 'critico', status: 'abierto', created: 'Hoy 09:00' },
  { id: 'TKT-002', client: 'Roberto S.', type: 'Velocidad lenta', priority: 'urgente', status: 'en_proceso', created: 'Ayer 14:30' },
];

const COLLECTION_TEMPLATES = [
  { emoji: '💳', label: 'Convenio ofrecido', text: 'Hola {nombre}, podemos ofrecerte un convenio de {n} pagos de ${monto}. Tu servicio continuará activo. ¿Aceptas? Responde SÍ.' },
  { emoji: '📅', label: 'Promesa de pago', text: 'Hola {nombre}, confirmamos tu promesa de pago para el {fecha}. Te enviaremos recordatorio el día anterior.' },
  { emoji: '⏸️', label: 'Suspensión inminente', text: 'Hola {nombre}, tu servicio será suspendido en 48h si no regularizas tu adeudo de ${monto}. Paga aquí: [link]' },
  { emoji: '🎉', label: 'Pago recibido', text: '¡Gracias {nombre}! Recibimos tu pago de ${monto}. Tu servicio sigue activo. ¡Gracias por tu preferencia!' },
];

const SEGMENT_BUTTONS: { key: ClientStatus | 'TODOS'; label: string; color: string; count: number }[] = [
  { key: 'TODOS',      label: 'Todos',       color: 'text-slate-400',   count: 1247 },
  { key: 'NUEVO',      label: 'Nuevos',      color: 'text-emerald-400', count: 45   },
  { key: 'ACTIVO',     label: 'Activos',     color: 'text-blue-400',    count: 1147 },
  { key: 'MOROSO',     label: 'Morosos',     color: 'text-red-400',     count: 42   },
  { key: 'SUSPENDIDO', label: 'Suspendidos', color: 'text-slate-400',   count: 13   },
  { key: 'QUEJA',      label: 'Quejas',      color: 'text-amber-400',   count: 8    },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SupportCRM({ initialFilter }: { initialFilter?: string }) {
  const [clients, setClients] = useState<SupportClient[]>(mockClients);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'TODOS'>(
    (initialFilter as ClientStatus) || 'TODOS'
  );
  const [view, setView] = useState<'crm' | 'detail' | 'installations' | 'tickets'>('crm');
  const [selectedClient, setSelectedClient] = useState<SupportClient | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'payments' | 'whatsapp' | 'labels' | 'history'>('info');
  const [message, setMessage] = useState('');
  const [showLabelPanel, setShowLabelPanel] = useState(false);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.serviceNo.includes(search);
    const matchStatus = statusFilter === 'TODOS' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleLabel = (clientId: string, labelId: string) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const has = c.labels.includes(labelId);
      return { ...c, labels: has ? c.labels.filter(l => l !== labelId) : [...c.labels, labelId] };
    }));
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => {
        if (!prev) return null;
        const has = prev.labels.includes(labelId);
        return { ...prev, labels: has ? prev.labels.filter(l => l !== labelId) : [...prev.labels, labelId] };
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-950/20 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-600/20 rounded-xl border border-red-500/30">
            <Headphones className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">SUPPORT-CRM</h2>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Atención al Cliente & Cobranza</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['crm', 'installations', 'tickets'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
              view === v ? "bg-red-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}>
              {v === 'crm' ? 'Clientes' : v === 'installations' ? 'Instalaciones' : 'Tickets'}
            </button>
          ))}
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all ml-4">
            <Plus className="w-3 h-3" /> Nuevo Ticket
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── CLIENT LIST ── */}
        {view === 'crm' && (
          <motion.div key="crm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SupportKpi label="Clientes activos" value="1,247" sub="Cartera total" color="text-blue-400" />
              <SupportKpi label="Instalaciones hoy" value="8" sub="En curso" color="text-emerald-400" />
              <SupportKpi label="Morosos +30 días" value="42" sub="Requieren acción" color="text-red-400" />
              <SupportKpi label="Tickets abiertos" value="23" sub="Pendientes" color="text-amber-400" />
            </div>

            {/* Alerts */}
            <div className="bg-red-600/5 border border-red-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest">Alertas Críticas</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AlertChip emoji="💳" text="15 pagos vencen hoy" color="text-red-400" />
                <AlertChip emoji="⏸️" text="3 servicios suspendidos" color="text-amber-400" />
                <AlertChip emoji="😞" text="1 queja formal activa" color="text-rose-400" />
                <AlertChip emoji="🔧" text="5 instalaciones urgentes" color="text-orange-400" />
              </div>
            </div>

            {/* Segment filter */}
            <div className="flex gap-2 flex-wrap">
              {SEGMENT_BUTTONS.map(s => (
                <button key={s.key} onClick={() => setStatusFilter(s.key)} className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all flex items-center gap-2",
                  statusFilter === s.key ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                )}>
                  <span className={s.color}>{s.count}</span> {s.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente, número de servicio, folio, teléfono..."
                className="w-full bg-slate-900/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 text-sm"
              />
            </div>

            {/* Table */}
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-left">
                    <th className="px-6 py-4">Cliente / No. Servicio</th>
                    <th className="px-6 py-4">Paquete</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Adeudo</th>
                    <th className="px-6 py-4">Etiquetas</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-white/5 cursor-pointer group transition-colors" onClick={() => { setSelectedClient(c); setActiveTab('info'); setView('detail'); }}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{c.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Serv: {c.serviceNo}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{c.package}</td>
                      <td className="px-6 py-4">
                        <ClientStatusBadge status={c.status} moroso={c.moroso} />
                        {c.morosoDays && <p className="text-[9px] text-red-400 font-bold mt-0.5">{c.morosoDays} días</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("font-bold text-sm", c.balance !== '$0' ? "text-red-400" : "text-emerald-400")}>{c.balance}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap max-w-[120px]">
                          {c.labels.slice(0, 2).map(lid => {
                            const l = SUPPORT_LABELS.find(x => x.id === lid);
                            return l ? <span key={lid} className={cn("text-[8px] font-bold px-1 py-0.5 rounded border", l.color)}>{l.emoji}</span> : null;
                          })}
                          {c.labels.length > 2 && <span className="text-[8px] text-slate-500">+{c.labels.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-red-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── INSTALLATIONS ── */}
        {view === 'installations' && (
          <motion.div key="inst" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Mapa de Instalaciones del Día
              </h3>
              <div className="w-full bg-slate-950/60 rounded-2xl border border-white/5 p-6 flex flex-wrap gap-8 items-start justify-center">
                {mockInstallations.map(ins => {
                  const statusColor =
                    ins.status === 'instalado' ? '#34D399' :
                    ins.status === 'en_camino' ? '#F59E0B' :
                    ins.status === 'confirmado' ? '#60A5FA' :
                    ins.status === 'cancelado'  ? '#F87171' : '#94A3B8';
                  const statusLabel =
                    ins.status === 'instalado' ? '✓ Instalado' :
                    ins.status === 'en_camino' ? 'En camino' :
                    ins.status === 'confirmado' ? 'Confirmado' :
                    ins.status === 'cancelado'  ? 'Cancelado'  : 'Pendiente';
                  return (
                    <div key={ins.id} className="flex flex-col items-center gap-3 pb-6">
                      <LocationMap
                        location={`${ins.client.split(' ')[0]} · ${ins.city}`}
                        coordinates={`${ins.address} • ${ins.time}`}
                        statusColor={statusColor}
                        statusLabel={statusLabel}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-left">
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Dirección</th>
                    <th className="px-6 py-4">Hora</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockInstallations.map(ins => (
                    <tr key={ins.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{ins.client}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{ins.address}, {ins.city}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs">{ins.time}</td>
                      <td className="px-6 py-4">
                        <InstallStatusBadge status={ins.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:bg-emerald-500/20"><MessageSquare className="w-3 h-3" /></button>
                          <button className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20"><Phone className="w-3 h-3" /></button>
                          {ins.status === 'pendiente' && <button className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 hover:bg-amber-500/20"><RefreshCw className="w-3 h-3" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Installation labels */}
            <div className="flex gap-3 items-center text-xs">
              <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Etiquetas:</span>
              {[
                { emoji: '🟢', label: 'Instalado', color: 'text-emerald-400' },
                { emoji: '🟡', label: 'En proceso', color: 'text-amber-400' },
                { emoji: '🔴', label: 'No contesta', color: 'text-red-400' },
                { emoji: '⚫', label: 'Cancelado', color: 'text-slate-500' },
                { emoji: '⭐', label: 'Satisfecho', color: 'text-blue-400' },
              ].map(l => (
                <span key={l.label} className={cn("text-[10px] font-bold", l.color)}>{l.emoji} {l.label}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── TICKETS ── */}
        {view === 'tickets' && (
          <motion.div key="tick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <SupportKpi label="Abiertos" value="23" sub="Requieren atención" color="text-red-400" />
              <SupportKpi label="En proceso" value="8" sub="Asignados" color="text-amber-400" />
              <SupportKpi label="Resueltos hoy" value="12" sub="Cerrados" color="text-emerald-400" />
            </div>
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-left">
                    <th className="px-6 py-4">Ticket / Cliente</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Prioridad</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockTickets.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{t.client}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{t.id}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{t.type}</td>
                      <td className="px-6 py-4">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border",
                          t.priority === 'critico' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          t.priority === 'urgente' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}>{t.priority.toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded border",
                          t.status === 'abierto' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          t.status === 'en_proceso' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        )}>{t.status.replace('_', ' ').toUpperCase()}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{t.created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── CLIENT DETAIL ── */}
        {view === 'detail' && selectedClient && (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Moroso alert banner */}
              {selectedClient.status === 'MOROSO' && (
                <div className="bg-red-600/10 border border-red-500/30 rounded-2xl p-5 flex items-start gap-4">
                  <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-bold text-sm mb-1">⚠️ Cliente con mora de {selectedClient.morosoDays} días</p>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Adeudo: <span className="text-red-400 font-bold">{selectedClient.balance}</span> •
                      Intentos de contacto: {selectedClient.contactAttempts} •
                      Acción recomendada: <span className="text-amber-400 font-bold">Llamada de retención + convenio de pago</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 relative">
                <button onClick={() => setView('crm')} className="absolute top-6 right-6 text-slate-500 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <User className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedClient.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[11px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">Serv: {selectedClient.serviceNo}</span>
                      <span className="text-[11px] text-blue-400 font-bold flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedClient.phone}</span>
                      <ClientStatusBadge status={selectedClient.status} moroso={selectedClient.moroso} />
                    </div>
                    <p className="text-slate-500 text-xs mt-2">Contrato desde {selectedClient.contractDate} • Vendedor: {selectedClient.originalVendor}</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-white/5">
                  {(['info', 'payments', 'whatsapp', 'history'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={cn(
                      "px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                      activeTab === t ? "text-red-400" : "text-slate-500 hover:text-slate-300"
                    )}>
                      {t === 'info' ? 'Información' : t === 'payments' ? 'Pagos' : t === 'whatsapp' ? 'WhatsApp' : 'Historial'}
                      {activeTab === t && <motion.div layoutId="suppTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <AnimatePresence mode="wait">

                    {/* Info */}
                    {activeTab === 'info' && (
                      <motion.div key="ci" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <SInfoSection title="Información del Cliente" icon={User}>
                            <SInfoLine label="Nombre" value={selectedClient.name} />
                            <SInfoLine label="CURP" value={selectedClient.curp} mono />
                            <SInfoLine label="Teléfono" value={selectedClient.phone} />
                            <SInfoLine label="Email" value={selectedClient.email} />
                            <SInfoLine label="Dirección" value={selectedClient.address} />
                          </SInfoSection>
                        </div>
                        <div>
                          <SInfoSection title="Servicio Activo" icon={Activity}>
                            <SInfoLine label="Paquete" value={selectedClient.package} />
                            <SInfoLine label="Precio" value={selectedClient.price} />
                            <SInfoLine label="Adeudo" value={selectedClient.balance} />
                            <SInfoLine label="Último contacto" value={selectedClient.lastContact} />
                            <SInfoLine label="Intentos contacto" value={`${selectedClient.contactAttempts} intentos`} />
                          </SInfoSection>
                        </div>
                      </motion.div>
                    )}

                    {/* Payments */}
                    {activeTab === 'payments' && (
                      <motion.div key="cp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <div className="overflow-hidden rounded-2xl border border-white/10">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-white/5 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-left">
                                <th className="px-5 py-3">Mes</th>
                                <th className="px-5 py-3">Estado</th>
                                <th className="px-5 py-3">Monto</th>
                                <th className="px-5 py-3">Método</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {selectedClient.payments.length > 0 ? selectedClient.payments.map((p, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                  <td className="px-5 py-3 text-slate-300 font-medium">{p.month}</td>
                                  <td className="px-5 py-3">
                                    <span className={cn(
                                      "text-[9px] font-bold px-2 py-0.5 rounded border",
                                      p.status === 'pagado' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                      p.status === 'vencido' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                    )}>
                                      {p.status === 'pagado' ? '✅ Pagado' : p.status === 'vencido' ? '❌ Vencido' : '⏳ Pendiente'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-white font-bold">{p.amount}</td>
                                  <td className="px-5 py-3 text-slate-500 text-xs">{p.method || '—'}</td>
                                </tr>
                              )) : (
                                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500 text-xs">Sin historial de pagos</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {selectedClient.balance !== '$0' && (
                          <div className="mt-4 flex justify-between items-center p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                            <span className="text-red-400 font-bold text-sm">Adeudo total: {selectedClient.balance}</span>
                            <button className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-500 transition-all">
                              💳 Generar Convenio
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* WhatsApp */}
                    {activeTab === 'whatsapp' && (
                      <motion.div key="cw" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cuenta: +52 56 6135 0223 (Soporte Principal)</p>
                        <div className="bg-black/30 rounded-2xl p-5 h-[280px] overflow-y-auto space-y-4">
                          <SupportBubble sender="SUPPORT-360" text={`Hola ${selectedClient.name.split(' ')[0]}, tu pago de abril venció el 20/04. Evita suspensión pagando aquí: [link]`} time="15/05 10:00" />
                          <SupportBubble sender="SUPPORT-360" text="Recordatorio: Opciones de pago: 1) Pago total 2) Convenio 3 meses 3) Ver detalles" time="25/05 09:15" />
                          <SupportBubble sender="Agente María" text={`Hola ${selectedClient.name.split(' ')[0]}, soy María de atención a clientes. Veo tu adeudo de 3 meses. ¿Podemos ofrecerte un convenio?`} time="10/06 14:30" isHuman />
                          <SupportBubble sender="CLIENTE" text="Hola María, perdí mi empleo hace 2 meses. ¿Puedo pagar en partes?" time="10/06 15:45" variant="user" />
                          <SupportBubble sender="Agente María" text="Entiendo tu situación. Convenio: 6 pagos de $300. Tu servicio continuará activo. ¿Aceptas?" time="10/06 16:00" isHuman />
                        </div>
                        <div className="relative">
                          <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Escribir mensaje al cliente..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-28 text-sm text-white outline-none focus:border-red-500/30 resize-none h-20"
                          />
                          <div className="absolute right-3 bottom-3 flex gap-2">
                            <button className="p-2 text-slate-500 hover:text-white"><Upload className="w-4 h-4" /></button>
                            <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                              <Send className="w-3 h-3" /> Enviar
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Plantillas de Cobranza</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {COLLECTION_TEMPLATES.map(t => (
                              <button key={t.label} onClick={() => setMessage(t.text)} className="flex-none px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap">
                                {t.emoji} {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* History */}
                    {activeTab === 'history' && (
                      <motion.div key="ch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                        <STimeline time="15/05 10:00" actor="SUPPORT-360" text="WhatsApp: Recordatorio automático de pago vencido" />
                        <STimeline time="20/05 14:30" actor="Agente Cobranza" text="Llamada: No contestó — Etiqueta: 📞 No contacto" />
                        <STimeline time="25/05 09:15" actor="SUPPORT-360" text="WhatsApp: Segundo recordatorio + opciones de pago" />
                        <STimeline time="01/06 11:00" actor="Agente Cobranza" text="Llamada: Cliente promete pagar el 10/06 — Etiqueta: ⏰ Promesa pago" />
                        <STimeline time="10/06 09:00" actor="SUPPORT-360" text="WhatsApp: Recordatorio de promesa — SIN PAGO" />
                        <STimeline time="10/06 14:30" actor="Agente María" text="Conversación manual: Oferta de convenio en curso" />
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Quick actions */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Acciones Rápidas</h4>
                <div className="space-y-2">
                  <SActionBtn icon={MessageSquare} label="WhatsApp Recordatorio" primary color="bg-red-600" />
                  <SActionBtn icon={Phone} label="Llamar Urgente" />
                  <SActionBtn icon={CreditCard} label="Ofrecer Convenio" color="bg-purple-600/20 text-purple-400 border-purple-500/20" />
                  <SActionBtn icon={Tag} label="Agregar Etiqueta" />
                  <SActionBtn icon={RefreshCw} label="Escalar a Supervisor" />
                  <SActionBtn icon={Ban} label="Suspender Servicio" color="text-amber-400 hover:bg-amber-500/10" />
                  <SActionBtn icon={XCircle} label="Cancelar Servicio" color="text-red-400 hover:bg-red-500/10" />
                  <SActionBtn icon={CheckCircle2} label="Reactivar (si pagó)" color="bg-emerald-600/20 text-emerald-400 border-emerald-500/20" />
                </div>
              </div>

              {/* Labels */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Etiquetas Activas</h4>
                  <button onClick={() => setShowLabelPanel(!showLabelPanel)} className="text-[9px] font-bold text-blue-400 uppercase">
                    {showLabelPanel ? 'Cerrar' : '+ Gestionar'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedClient.labels.map(lid => {
                    const l = SUPPORT_LABELS.find(x => x.id === lid);
                    return l ? (
                      <button key={lid} onClick={() => toggleLabel(selectedClient.id, lid)} className={cn("text-[8px] font-bold px-2 py-1 rounded-full border transition-all hover:opacity-70", l.color)}>
                        {l.emoji} {l.text}
                      </button>
                    ) : null;
                  })}
                </div>
                {showLabelPanel && (
                  <div className="space-y-3 border-t border-white/5 pt-3">
                    {['Cobranza', 'Soporte', 'Prioridad', 'Resultado'].map(cat => (
                      <div key={cat}>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mb-1.5">{cat}</p>
                        <div className="flex flex-wrap gap-1">
                          {SUPPORT_LABELS.filter(l => l.category === cat).map(l => (
                            <button key={l.id} onClick={() => toggleLabel(selectedClient.id, l.id)} className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded-full border transition-all",
                              selectedClient.labels.includes(l.id) ? l.color : "bg-white/5 text-slate-500 border-white/10 hover:bg-white/10"
                            )}>
                              {l.emoji} {l.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Visibilidad</h4>
                <div className="flex flex-wrap gap-2">
                  {['Cobranza', 'Soporte', 'Supervisor', 'Técnico'].map(r => (
                    <span key={r} className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10">{r}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClientStatusBadge({ status, moroso }: { status: ClientStatus; moroso?: string }) {
  const map: Record<ClientStatus, string> = {
    NUEVO:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    ACTIVO:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    MOROSO:     'bg-red-500/10 text-red-400 border-red-500/20',
    SUSPENDIDO: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    QUEJA:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", map[status])}>{status}</span>;
}

function InstallStatusBadge({ status }: { status: Installation['status'] }) {
  const map: Record<string, string> = {
    instalado:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    en_camino:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    pendiente:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
    cancelado:   'bg-red-500/10 text-red-400 border-red-500/20',
    confirmado:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  const label: Record<string, string> = { instalado: 'Instalado', en_camino: 'En camino', pendiente: 'Pendiente', cancelado: 'Cancelado', confirmado: 'Confirmado' };
  return <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", map[status])}>{label[status]}</span>;
}

function SupportKpi({ label, value, sub, color }: any) {
  return (
    <div className="bg-slate-900/40 border border-white/10 p-4 rounded-xl backdrop-blur-md">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-[9px] text-slate-400 mt-1 font-bold">{sub}</p>
    </div>
  );
}

function AlertChip({ emoji, text, color }: any) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl">
      <span>{emoji}</span>
      <span className={cn("text-[10px] font-bold", color)}>{text}</span>
    </div>
  );
}

function SInfoSection({ title, icon: Icon, children }: any) {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Icon className="w-3 h-3" /> {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SInfoLine({ label, value, mono }: any) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-slate-500 text-xs">{label}:</span>
      <span className={cn("text-slate-200 font-bold text-xs", mono && "font-mono text-[10px]")}>{value}</span>
    </div>
  );
}

function SupportBubble({ sender, text, time, variant, isHuman }: any) {
  return (
    <div className={cn("flex flex-col gap-1", variant === 'user' ? "items-end" : "items-start")}>
      <span className={cn("text-[8px] font-bold uppercase tracking-widest", isHuman ? "text-amber-400" : variant === 'user' ? "text-blue-400" : "text-red-400")}>
        {sender}
      </span>
      <div className={cn(
        "px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[85%]",
        variant === 'user' ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-none"
      )}>{text}</div>
      <span className="text-[8px] text-slate-600">{time}</span>
    </div>
  );
}

function STimeline({ time, actor, text }: any) {
  return (
    <div className="relative pl-6 border-l border-white/10 ml-2 pb-3 last:pb-0">
      <div className="absolute left-[-4.5px] top-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
      <div className="text-[10px] font-bold text-slate-500 mb-0.5">{time} • {actor}</div>
      <div className="text-xs text-slate-300 font-medium">{text}</div>
    </div>
  );
}

function SActionBtn({ icon: Icon, label, primary, color }: any) {
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-xs font-bold group",
      primary ? `${color || 'bg-red-600'} text-white border-white/10 hover:scale-[1.01]` : `${color || 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'}`
    )}>
      <Icon className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
      {label}
    </button>
  );
}
