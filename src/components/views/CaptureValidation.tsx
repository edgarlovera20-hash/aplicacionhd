import React, { useState } from 'react';
import { Bot, ChevronRight, Phone } from 'lucide-react';
import NewSaleForm from './NewSaleForm';
import AIAgentView from './AIAgentView';
import AIValidationCall from './AIValidationCall';

interface CaptureValidationProps {
  onSectionChange?: (section: string) => void;
}

export default function CaptureValidation({ onSectionChange }: CaptureValidationProps) {
  const [activeView, setActiveView] = useState<'menu' | 'new_sale' | 'ai_agent' | 'ai_call'>('menu');
  const [validationStatus, setValidationStatus] = useState<string | null>(null);

  const options = [
    {
      id: 1,
      actionId: 'new_sale',
      title: 'Capturar nueva venta',
      description: 'Acceso al formulario de ingreso de datos de contratos o servicios.',
      emoji: '📝',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      id: 2,
      actionId: 'my_records',
      title: 'Mi Expediente',
      description: 'Consulta el historial completo de todas tus ventas, estados y seguimientos realizados.',
      emoji: '📂',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20'
    },
    {
      id: 3,
      actionId: 'ai_agent',
      title: 'Agente IA (WhatsApp/TG)',
      description: 'Consulta folios, seguimientos y revisión de expedientes completos vía Chatbot inteligente.',
      emoji: '🤖',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    {
      id: 4,
      actionId: 'ai_call',
      title: 'Llamada de Validación IA',
      description: 'Genera un guión inteligente, sigue un checklist interactivo y recibe apoyo de IA en tiempo real durante la llamada.',
      emoji: '📞',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20'
    },
  ];

  const handleAction = (actionId: string) => {
    if (actionId === 'new_sale') {
      setActiveView('new_sale');
    } else if (actionId === 'ai_agent') {
      setActiveView('ai_agent');
    } else if (actionId === 'ai_call') {
      setActiveView('ai_call');
    } else if (actionId === 'my_records' && onSectionChange) {
      onSectionChange('Consulta y Seguimiento');
    } else {
      setValidationStatus(`El módulo se abrirá próximamente.`);
      setTimeout(() => setValidationStatus(null), 3000);
    }
  };

  if (activeView === 'new_sale') {
    return <NewSaleForm onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'ai_agent') {
    return <AIAgentView onBack={() => setActiveView('menu')} />;
  }

  if (activeView === 'ai_call') {
    return <AIValidationCall onBack={() => setActiveView('menu')} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {validationStatus && (
        <div className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-200 p-4 rounded-xl text-center">
          {validationStatus}
        </div>
      )}
      
      {/* AI Greeting Banner */}
      <div className="bg-indigo-900/20 backdrop-blur-md border border-indigo-500/30 rounded-xl p-6 md:p-8 flex gap-6 items-start shadow-lg shadow-indigo-500/10 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50 shrink-0 relative z-10 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Bot className="w-7 h-7 text-indigo-400" />
        </div>
        
        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Sistema Inteligente de Gestión
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Bienvenido al Panel de Control de Captura y Validación.
          </h2>
          
          <p className="text-indigo-200/80 text-[16px] leading-relaxed max-w-3xl">
            ¿Qué operación deseas realizar hoy? Soy tu asistente de gestión. Mi objetivo es ser eficiente, organizado y directo para ayudarte a administrar los contratos, validaciones y soporte.
          </p>
          
          <p className="text-slate-400 text-sm pt-2 font-medium">
            Por favor, selecciona una opción para continuar:
          </p>
        </div>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {options.map((opt) => (
          <button 
            key={opt.id}
            onClick={() => handleAction(opt.actionId)}
            className="flex flex-col text-left bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:-translate-y-1 hover:bg-slate-800/60 hover:border-indigo-500/30 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] transition-all duration-300 group"
          >
            <div className="flex justify-between items-start mb-5">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${opt.bg} ${opt.border} shadow-inner transition-transform group-hover:scale-110 duration-300`}>
                <span className="text-2xl">{opt.emoji}</span>
              </div>
              <span className="text-slate-600 font-mono text-sm font-bold">0{opt.id}</span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-indigo-300 transition-colors">
              {opt.title}
            </h3>
            
            <p className="text-sm text-slate-400 line-clamp-3 mb-6 flex-1 leading-relaxed">
              {opt.description}
            </p>
            
            <div className="mt-auto flex items-center text-sm font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
              Acceder al módulo <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
