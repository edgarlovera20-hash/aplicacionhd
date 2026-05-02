import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Loader2, Brain, RotateCcw, ChevronDown } from 'lucide-react';
import { generateResponse, saveInteraction, loadChatContext, maybeAutoCompress, ChatMessage } from '../../services/aiService';

const STORAGE_KEY = 'hdreams_chat_history';
const MAX_HISTORY  = 40; // máximo de mensajes a mantener en localStorage
const AUTO_COMPRESS_EVERY = 15; // comprimir cada N interacciones guardadas

function loadHistory(): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function persistHistory(msgs: ChatMessage[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY))); }
  catch { /* storage lleno */ }
}

export default function Chatbot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages]     = useState<ChatMessage[]>(() => {
    const saved = loadHistory();
    return saved.length > 0 ? saved : [{ role: 'model', text: '¡Hola! Soy tu asistente IA de Heavenly Dreams. Aprendo de cada conversación para ayudarte mejor. ¿En qué puedo apoyarte?' }];
  });
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [learnedContext, setLearnedContext] = useState('');
  const [showContext, setShowContext]       = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Cargar contexto aprendido al montar
  useEffect(() => {
    loadChatContext().then(ctx => {
      if (ctx) setLearnedContext(ctx);
    });
  }, []);

  // Auto-scroll al fondo en nuevos mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    persistHistory(nextMessages);
    setInput('');
    setLoading(true);

    try {
      // Pasar las últimas 10 interacciones como contexto al modelo
      const history = nextMessages.slice(-11, -1);
      const aiText  = await generateResponse(text, 'GENERAL', history);
      const aiMsg: ChatMessage = { role: 'model', text: aiText };
      const finalMessages = [...nextMessages, aiMsg];
      setMessages(finalMessages);
      persistHistory(finalMessages);

      // Guardar interacción en la memoria del agente (auto-aprendizaje)
      await saveInteraction(text, aiText);
      const newCount = interactionCount + 1;
      setInteractionCount(newCount);

      // Auto-comprimir cuando acumula N interacciones
      if (newCount % AUTO_COMPRESS_EVERY === 0) {
        maybeAutoCompress().then(() => {
          loadChatContext().then(ctx => { if (ctx) setLearnedContext(ctx); });
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, hubo un error. Intenta de nuevo.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = () => {
    const initial: ChatMessage[] = [{ role: 'model', text: 'Historial borrado. ¿En qué puedo ayudarte?' }];
    setMessages(initial);
    persistHistory(initial);
  };

  return (
    <div className="fixed bottom-6 right-6 w-[360px] sm:w-[400px] h-[520px] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
        <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30">
          <Bot className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-none">Asistente IA</h3>
          <p className="text-[9px] text-slate-500 mt-0.5 leading-none">HDreams · Auto-aprendizaje activado</p>
        </div>
        <div className="flex items-center gap-1">
          {learnedContext && (
            <button
              onClick={() => setShowContext(c => !c)}
              title="Ver contexto aprendido"
              className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
            >
              <Brain className="w-4 h-4" />
            </button>
          )}
          <button onClick={clearHistory} title="Limpiar historial" className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contexto aprendido (colapsable) */}
      {showContext && learnedContext && (
        <div className="px-4 py-3 bg-indigo-950/40 border-b border-indigo-500/20">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <Brain className="w-3 h-3" /> Contexto aprendido
            </p>
            <button onClick={() => setShowContext(false)} className="text-slate-600 hover:text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">{learnedContext}</p>
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {m.role === 'model' && (
              <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-blue-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-zinc-800/80 text-slate-200 rounded-tl-sm border border-white/5'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-blue-400" />
            </div>
            <div className="bg-zinc-800/80 border border-white/5 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 transition-colors"
          placeholder="Escribe un mensaje..."
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-white flex items-center justify-center transition-all shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
