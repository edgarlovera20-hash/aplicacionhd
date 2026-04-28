import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, ArrowLeft, MessageSquare, Phone, 
  CheckCircle2, AlertCircle, FileText, User, 
  MapPin, Video, CheckSquare, ShieldCheck, Search,
  QrCode, Share2, ExternalLink, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIAgentViewProps {
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  timestamp: string;
  data?: any;
}

const EXPEDIENTE_CHECKLIST = [
  { id: 'havi', label: 'HAVI', icon: FileText },
  { id: 'id', label: 'INE o CURP', icon: User },
  { id: 'address', label: 'Comprobante de Domicilio / Autorización', icon: MapPin },
  { id: 'terms', label: 'Términos y Condiciones (Videofirma)', icon: Video },
  { id: 'siac', label: 'Captura de Folio SIAC', icon: CheckSquare },
];

export default function AIAgentView({ onBack }: AIAgentViewProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'connect'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      text: '¡Hola! Soy tu asistente de gestión inteligente de HDreams. 🤖\n\nPuedo ayudarte a consultar el estado de tus folios y verificar si tus expedientes están listos para validación.\n\n¿Qué folio deseas consultar hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate Bot Intelligence
    setTimeout(() => {
      let botResponse = "";
      let botData = null;

      const inputLower = inputValue.toLowerCase();
      
      if (inputLower.includes('con-') || inputLower.includes('folio')) {
        const folioMatch = inputValue.match(/con-\d+-\d+/i) || ["CON-2024-04-1847"];
        const folioId = folioMatch[0].toUpperCase();
        
        botResponse = `He encontrado el registro para el folio **${folioId}**. Aquí está el desglose actual de los documentos recibidos:`;
        botData = {
          folio: folioId,
          type: 'checklist',
          checks: {
            havi: true,
            id: true,
            address: true,
            terms: true,
            siac: false
          }
        };
      } else if (inputLower.includes('hola') || inputLower.includes('buen')) {
        botResponse = "¡Hola de nuevo! Estoy listo para revisar cualquier folio que necesites. Solo escribe el número de contrato.";
      } else {
        botResponse = "Lo siento, no he entendido esa solicitud. Por favor, proporcióname un número de folio (ej. CON-2024-04-1847) para que pueda revisar el expediente.";
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: botResponse,
        data: botData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 glass-card border-white/5 p-5 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-5 relative z-10">
          <button 
            onClick={onBack}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white border border-white/5 active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-white font-display font-black text-base uppercase tracking-tighter">HDreams Cognitive AI</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em]">Neural Engine Online</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 relative z-10">
          <button 
            onClick={() => setActiveTab(activeTab === 'chat' ? 'connect' : 'chat')}
            className={`px-5 py-2.5 rounded-xl border flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 ${
              activeTab === 'connect' 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xl shadow-emerald-600/20' 
                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            {activeTab === 'chat' ? <QrCode className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            {activeTab === 'chat' ? 'Vincular Canales' : 'Chat Inteligente'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'chat' ? (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Chat Area */}
            <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-4 overflow-y-auto space-y-4 custom-scrollbar" ref={scrollRef}>
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] md:max-w-[70%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${msg.role === 'bot' ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {msg.role === 'bot' ? 'IA HDREAMS' : 'VENDEDOR'}
                        </span>
                        <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                      </div>
                      
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-white/10'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        
                        {msg.data?.type === 'checklist' && (
                          <div className="mt-4 space-y-2 p-3 bg-black/30 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Revisión de Expediente</span>
                              <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-bold">FOLIO: {msg.data.folio}</div>
                            </div>
                            
                            {EXPEDIENTE_CHECKLIST.map((item) => {
                              const isDone = msg.data.checks[item.id];
                              return (
                                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                  <div className="flex items-center gap-2">
                                    <item.icon className={`w-3.5 h-3.5 ${isDone ? 'text-emerald-400' : 'text-slate-500'}`} />
                                    <span className={`text-[11px] ${isDone ? 'text-slate-200' : 'text-slate-500'}`}>{item.label}</span>
                                  </div>
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-500" />
                                  )}
                                </div>
                              );
                            })}
                            
                            <div className="pt-2 mt-2 border-t border-white/5">
                              <p className={`text-[10px] font-bold text-center ${Object.values(msg.data.checks).every(v => v) ? 'text-emerald-400 font-bold' : 'text-rose-400 animate-pulse'}`}>
                                {Object.values(msg.data.checks).every(v => v) 
                                  ? '✅ EXPEDIENTE COMPLETO PARA VALIDACIÓN' 
                                  : '⚠️ EXPEDIENTE INCOMPLETO - FALTA SIAC'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="flex justify-start"
                  >
                    <div className="bg-slate-800/80 p-3 rounded-2xl rounded-tl-none border border-white/10">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="relative group">
              <div className="flex items-center gap-2 p-2 bg-slate-900 border border-white/10 rounded-2xl focus-within:border-emerald-500/50 transition-all shadow-xl">
                <input 
                  type="text" 
                  placeholder="Introduce un folio (ej: CON-2024-04-1847)..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-transparent border-none outline-none text-white px-3 py-2 text-sm"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 px-2 flex items-center gap-1.5">
                <Bot className="w-3 h-3" /> Escribe un número de folio para que el bot verifique los componentes del expediente en tiempo real.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="connect"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-8"
          >
            <div className="max-w-md space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <QrCode className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">Vincular Dispositivos</h3>
              <p className="text-slate-400 text-sm">Escanea el código QR desde WhatsApp o Telegram en tu móvil para recibir las notificaciones y realizar consultas directamente desde tu chat.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
              {/* WhatsApp Card */}
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-6 flex flex-col items-center">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                  <Phone className="w-3 h-3" /> WhatsApp
                </div>
                
                {/* Simulated QR Code */}
                <div className="w-48 h-48 bg-white p-3 rounded-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                    <div className="w-40 h-40 grid grid-cols-8 gap-1 p-1">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-emerald-900/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white px-4 py-2 rounded-xl text-emerald-600 font-bold text-xs shadow-xl">Vincular Ahora</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-400 font-medium">Escanea con WhatsApp Web</p>
                  <p className="text-[10px] text-slate-600 mt-1">Configuración {'>'} Dispositivos vinculados</p>
                </div>
              </div>

              {/* Telegram Card */}
              <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-6 flex flex-col items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                  <Share2 className="w-3 h-3" /> Telegram
                </div>
                
                <div className="w-48 h-48 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 relative overflow-hidden group border-dashed">
                   <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 opacity-10"
                   >
                     < Globe className="w-full h-full" />
                   </motion.div>
                   <Bot className="w-16 h-16 text-blue-400" />
                </div>

                <div className="w-full space-y-3">
                  <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    Abrir @HDreams_Bot <ExternalLink className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] text-slate-500 font-medium text-center">O busca el bot manualmente en Telegram</p>
                </div>
              </div>
            </div>

            <div className="pt-8 w-full border-t border-white/5 flex flex-col items-center gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Servidor CDMX</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">API Encryptada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cloud Sync</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
