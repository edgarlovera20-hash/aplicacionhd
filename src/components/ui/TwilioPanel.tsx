import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MessageSquare, Send, CheckCircle, XCircle,
  Loader2, PhoneCall, MessageCircle, Wifi, WifiOff,
  ChevronDown, Copy, RefreshCw
} from 'lucide-react';
import {
  getTwilioStatus, sendSMS, sendWhatsApp, makeCall,
  formatMxNumber, MESSAGE_TEMPLATES,
  type TwilioStatus
} from '../../services/twilioService';

type Channel = 'sms' | 'whatsapp' | 'call';
type MsgTemplate = keyof typeof MESSAGE_TEMPLATES;

interface TwilioPanelProps {
  /** Número pre-rellenado (del formulario del cliente) */
  defaultPhone?: string;
  /** Nombre del cliente (para plantillas) */
  clientName?: string;
  /** Folio del contrato (para plantillas) */
  folio?: string;
  /** Extras para plantillas */
  extras?: { megas?: string; price?: string; date?: string; time?: string };
  /** Si true muestra en modal, si false en panel inline */
  compact?: boolean;
}

export default function TwilioPanel({
  defaultPhone = '',
  clientName   = 'Cliente',
  folio        = '',
  extras       = {},
  compact      = false,
}: TwilioPanelProps) {
  const [status, setStatus]       = useState<TwilioStatus | null>(null);
  const [channel, setChannel]     = useState<Channel>('sms');
  const [phone, setPhone]         = useState(defaultPhone);
  const [message, setMessage]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<{ ok: boolean; text: string } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    getTwilioStatus().then(setStatus).catch(() =>
      setStatus({ configured: false, hasSms: false, hasWhatsApp: false, fromNumber: null })
    );
  }, []);

  const handleSend = async () => {
    if (!phone.trim() || !message.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const to = formatMxNumber(phone);
      if (channel === 'sms')       await sendSMS(to, message);
      if (channel === 'whatsapp')  await sendWhatsApp(to, message);
      if (channel === 'call')      await makeCall(to);
      setResult({ ok: true, text: channel === 'call' ? 'Llamada iniciada correctamente' : 'Mensaje enviado correctamente' });
    } catch (e: any) {
      setResult({ ok: false, text: e.message || 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (key: MsgTemplate) => {
    const fn = MESSAGE_TEMPLATES[key];
    let text = '';
    if (key === 'confirmacionContrato')
      text = fn(clientName, folio, extras.megas || '___', extras.price || '___');
    else if (key === 'recordatorioCita')
      text = (fn as any)(clientName, extras.date || '___', extras.time || '___');
    else if (key === 'bienvenida')
      text = (fn as any)(clientName, extras.megas || '___');
    else if (key === 'validacionLlamada')
      text = (fn as any)(clientName, 'Asesor HD');
    else if (key === 'seguimientoCandidato')
      text = (fn as any)(clientName, extras.date || '___', extras.time || '___', 'Oficinas HD');
    setMessage(text);
    setShowTemplates(false);
  };

  const channels: { id: Channel; label: string; icon: React.FC<any>; color: string; disabled?: boolean }[] = [
    { id: 'sms',       label: 'SMS',       icon: MessageSquare, color: 'blue',   disabled: !status?.hasSms },
    { id: 'whatsapp',  label: 'WhatsApp',  icon: MessageCircle, color: 'green',  disabled: !status?.hasWhatsApp },
    { id: 'call',      label: 'Llamada',   icon: PhoneCall,     color: 'violet', disabled: !status?.hasSms },
  ];

  if (!status) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <Phone className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Twilio</h3>
            <p className="text-[10px] text-slate-400">Mensajería y llamadas</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium ${
          status.configured
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {status.configured ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {status.configured ? 'Conectado' : 'No configurado'}
        </div>
      </div>

      {!status.configured && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
          Agrega <code className="bg-black/30 px-1 rounded">TWILIO_ACCOUNT_SID</code>,{' '}
          <code className="bg-black/30 px-1 rounded">TWILIO_AUTH_TOKEN</code> y{' '}
          <code className="bg-black/30 px-1 rounded">TWILIO_FROM_NUMBER</code> en tu{' '}
          <code className="bg-black/30 px-1 rounded">.env</code> para activar Twilio.
        </div>
      )}

      {/* Channel selector */}
      <div className="flex gap-2 mb-4">
        {channels.map(ch => {
          const Icon = ch.icon;
          const active = channel === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => !ch.disabled && setChannel(ch.id)}
              disabled={ch.disabled}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all
                ${active
                  ? `bg-${ch.color}-500/20 border-${ch.color}-500/50 text-${ch.color}-400`
                  : ch.disabled
                    ? 'bg-slate-800/30 border-white/5 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/50 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {ch.label}
            </button>
          );
        })}
      </div>

      {/* Phone input */}
      <div className="mb-3">
        <label className="block text-[11px] text-slate-400 mb-1">Número de destino</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+52 55 1234 5678"
          className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {/* Message input (not for call) */}
      {channel !== 'call' && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-slate-400">Mensaje</label>
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
            >
              Plantillas <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 overflow-hidden"
              >
                <div className="bg-slate-800/70 border border-white/10 rounded-xl p-2 space-y-1">
                  {([
                    ['confirmacionContrato', 'Confirmacion de contrato'],
                    ['recordatorioCita',     'Recordatorio de cita'],
                    ['bienvenida',           'Bienvenida al servicio'],
                    ['validacionLlamada',    'Aviso de llamada de validacion'],
                    ['seguimientoCandidato', 'Seguimiento de candidato'],
                  ] as [MsgTemplate, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => applyTemplate(key)}
                      className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder="Escribe tu mensaje..."
            className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none"
          />
          <p className="text-right text-[10px] text-slate-500 mt-0.5">{message.length} / 160 chars</p>
        </div>
      )}

      {channel === 'call' && (
        <div className="mb-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-xs text-violet-300">
          Se iniciara una llamada de voz saliente al numero indicado. Twilio conectara la llamada automaticamente.
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={loading || !status.configured || !phone.trim() || (channel !== 'call' && !message.trim())}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold transition-all"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : channel === 'call' ? (
          <><Phone className="w-4 h-4" /> Iniciar Llamada</>
        ) : (
          <><Send className="w-4 h-4" /> Enviar {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</>
        )}
      </button>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              result.ok
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {result.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            {result.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
