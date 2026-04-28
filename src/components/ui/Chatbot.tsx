import React, { useState } from 'react';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { generateResponse } from '../../services/aiService';

export default function Chatbot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: '¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await generateResponse(input, 'GENERAL');
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, hubo un error.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 className="font-bold text-white flex items-center gap-2"><Bot className="w-5 h-5 text-blue-400" /> Asistente IA</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-600/20 text-white ml-auto' : 'bg-slate-800 text-slate-200'}`}>
            {m.text}
          </div>
        ))}
        {loading && <Loader2 className="w-6 h-6 animate-spin text-blue-400" />}
      </div>
      <div className="p-4 border-t border-white/10 flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-slate-950 border border-white/10 rounded-lg p-2 text-white"
          placeholder="Escribe algo..."
        />
        <button 
          onClick={handleSend} 
          className="bg-blue-600 p-2 rounded-lg text-white transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
