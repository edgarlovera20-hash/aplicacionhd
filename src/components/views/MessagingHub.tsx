import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Search, Filter, User, CheckCircle, Clock, Archive, RefreshCw, Bot } from 'lucide-react';

type Channel = 'all' | 'whatsapp' | 'telegram' | 'facebook' | 'sms';
type ConvStatus = 'open' | 'assigned' | 'resolved' | 'archived';

interface Conversation {
  id: string;
  channel: string;
  external_id: string;
  status: ConvStatus;
  intent?: string;
  sentiment?: number;
  updated_at: string;
  created_at: string;
  last_message?: string;
  message_count?: string;
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  ai_generated: boolean;
  created_at: string;
}

interface ConvDetail extends Conversation { messages: Message[]; }

const CHANNEL_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  whatsapp: { label: 'WhatsApp', color: 'text-green-400', emoji: '💬' },
  telegram: { label: 'Telegram', color: 'text-blue-400',  emoji: '✈️' },
  facebook: { label: 'Facebook', color: 'text-indigo-400', emoji: '📘' },
  sms:      { label: 'SMS',      color: 'text-yellow-400', emoji: '📱' },
  voice:    { label: 'Voz',      color: 'text-red-400',    emoji: '📞' },
};

const STATUS_LABELS: Record<ConvStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:     { label: 'Abierto',   color: 'text-blue-400',   icon: MessageSquare },
  assigned: { label: 'Asignado',  color: 'text-yellow-400', icon: User },
  resolved: { label: 'Resuelto',  color: 'text-green-400',  icon: CheckCircle },
  archived: { label: 'Archivado', color: 'text-zinc-500',   icon: Archive },
};

function SentimentDot({ score }: { score?: number }) {
  if (score == null) return null;
  const color = score > 0.2 ? 'bg-green-400' : score < -0.2 ? 'bg-red-400' : 'bg-yellow-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={`Sentimiento: ${score.toFixed(2)}`} />;
}

export default function MessagingHub() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel>('all');
  const [statusFilter, setStatusFilter] = useState<ConvStatus | 'all'>('open');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (channelFilter !== 'all') params.set('channel', channelFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const r = await fetch(`/api/conversations?${params}`, { credentials: 'include' });
      if (r.ok) setConversations(await r.json());
    } catch {}
    setLoading(false);
  }, [channelFilter, statusFilter]);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/conversations/${id}`, { credentials: 'include' });
      if (r.ok) setDetail(await r.json());
    } catch {}
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [selectedId, fetchDetail]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [detail?.messages.length]);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId) return;
    setSending(true);
    try {
      const r = await fetch(`/api/conversations/${selectedId}/send`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText }),
      });
      if (r.ok) { setReplyText(''); fetchDetail(selectedId); }
    } finally { setSending(false); }
  };

  const updateStatus = async (id: string, status: ConvStatus) => {
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchConversations();
    if (selectedId === id) fetchDetail(id);
  };

  const filtered = conversations.filter(c =>
    (search === '' || c.external_id.includes(search) || (c.last_message || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[500px] gap-0 bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden">
      {/* ── LEFT PANEL: Conversation list ─────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-zinc-700">
        {/* Search */}
        <div className="p-3 border-b border-zinc-700 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>
          {/* Channel tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {(['all','whatsapp','telegram','facebook'] as const).map(ch => (
              <button key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`flex-shrink-0 text-xs px-2 py-1 rounded-md transition-colors ${
                  channelFilter === ch ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {ch === 'all' ? 'Todos' : CHANNEL_LABELS[ch]?.emoji}
              </button>
            ))}
          </div>
          {/* Status filter */}
          <div className="flex gap-1 overflow-x-auto">
            {(['all','open','assigned','resolved'] as const).map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-shrink-0 text-xs px-2 py-1 rounded-md transition-colors ${
                  statusFilter === s ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}>
                {s === 'all' ? 'Todos' : STATUS_LABELS[s as ConvStatus]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">Sin conversaciones</div>
          )}
          {filtered.map(conv => {
            const ch = CHANNEL_LABELS[conv.channel];
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left px-3 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${
                  selectedId === conv.id ? 'bg-zinc-800' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{ch?.emoji || '💬'}</span>
                  <span className="text-sm text-white font-medium truncate">{conv.external_id}</span>
                  <SentimentDot score={conv.sentiment} />
                  <span className="ml-auto text-xs text-zinc-500">
                    {new Date(conv.updated_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {conv.last_message && (
                  <p className="text-xs text-zinc-400 truncate pl-6">{conv.last_message}</p>
                )}
                <div className="flex items-center gap-2 pl-6 mt-1">
                  {conv.intent && <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 rounded">{conv.intent}</span>}
                  <span className={`text-xs ${STATUS_LABELS[conv.status]?.color || 'text-zinc-500'}`}>
                    {STATUS_LABELS[conv.status]?.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Refresh */}
        <div className="p-2 border-t border-zinc-700">
          <button onClick={fetchConversations} className="w-full flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 py-1 transition-colors">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
        </div>
      </div>

      {/* ── CENTER PANEL: Thread ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            {detail && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700 bg-zinc-800/30">
                <span className="text-xl">{CHANNEL_LABELS[detail.channel]?.emoji || '💬'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{detail.external_id}</span>
                    <span className={`text-xs ${CHANNEL_LABELS[detail.channel]?.color || ''}`}>
                      {CHANNEL_LABELS[detail.channel]?.label}
                    </span>
                  </div>
                  {detail.intent && <span className="text-xs text-zinc-400">Intent: {detail.intent}</span>}
                </div>
                {/* Quick status buttons */}
                <div className="flex gap-1">
                  {(['open','resolved','archived'] as const).map(s => (
                    <button key={s}
                      onClick={() => updateStatus(detail.id, s)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        detail.status === s ? 'border-zinc-400 text-white' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                      }`}>
                      {STATUS_LABELS[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detail?.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm space-y-1 ${
                    msg.direction === 'outbound'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-700 text-zinc-100'
                  }`}>
                    {msg.ai_generated && (
                      <div className="flex items-center gap-1 text-xs opacity-60">
                        <Bot className="w-3 h-3" /> IA
                      </div>
                    )}
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className={`text-xs ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-zinc-500'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div className="p-3 border-t border-zinc-700 flex gap-2">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Escribe una respuesta..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT PANEL: Contact info (only when detail loaded) ─────────────── */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-l border-zinc-700 overflow-hidden"
          >
            <div className="w-[220px] p-4 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Info del contacto</h3>
              <div className="space-y-2 text-xs">
                <div><span className="text-zinc-500">ID:</span> <span className="text-zinc-300 break-all">{detail.external_id}</span></div>
                <div><span className="text-zinc-500">Canal:</span> <span className="text-zinc-300">{detail.channel}</span></div>
                <div><span className="text-zinc-500">Estado:</span> <span className={STATUS_LABELS[detail.status]?.color}>{STATUS_LABELS[detail.status]?.label}</span></div>
                {detail.intent && <div><span className="text-zinc-500">Intent:</span> <span className="text-zinc-300">{detail.intent}</span></div>}
                {detail.sentiment != null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">Sentimiento:</span>
                    <SentimentDot score={detail.sentiment} />
                    <span className="text-zinc-300">{detail.sentiment.toFixed(2)}</span>
                  </div>
                )}
                <div><span className="text-zinc-500">Mensajes:</span> <span className="text-zinc-300">{detail.messages.length}</span></div>
                <div><span className="text-zinc-500">Desde:</span> <span className="text-zinc-300">{new Date(detail.created_at).toLocaleDateString('es-MX')}</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
