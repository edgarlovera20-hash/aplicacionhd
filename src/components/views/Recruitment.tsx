import React, { useEffect, useState } from "react";
import { Users, UserPlus, Phone, Briefcase, ChevronRight, CheckCircle, Clock, MessageSquare, Bot, Megaphone, Settings, Plus, Trash2, Info, Save, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "../../lib/utils";
import RecruitmentBot from "./RecruitmentBot";
import { useAuth } from "../../contexts/AuthContext";

// ================= TYPES =================
type User = {
  id: number;
  name: string;
  role: string;
};

type Lead = {
  id: number;
  name: string;
  phone: string;
  status: 'interesado' | 'agendo' | 'confirmocita' | 'confirmodd' | 'bienvenida' | 'no_show';
  appointmentDate?: string;
  appointmentTime?: string;
  interviewer?: string;
  vacancy?: string;
};

type Agent = {
  id: number;
  name: string;
  style: string;
  instructions: string;       // Custom AI behavior rules
  templates: { [key: string]: string };
  // Vacancy info injected into agent knowledge base
  vacancy: {
    puesto: string;
    sueldoSemanal: string;
    edadMin: number;
    edadMax: number;
    horario: string;
    ubicacion: string;
    beneficios: string;
    requisitos: string;
  };
};

type Campaign = {
  id: number;
  name: string;
  platform: "Facebook" | "Instagram";
  status: "Activa" | "Pausada" | "Borrador";
};

// ================= API SERVICE =================
// Nota: Actualmente usando datos simulados para el módulo de Reclutamiento
// La conexión con la API se integrará posteriormente mediante src/api.ts

// ================= MAIN COMPONENT =================

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "agents" | "content" | "crm" | "whatsapp" | "bot">("pipeline");
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const { user } = useAuth();
  
  // Pipeline State
  const [leads, setLeads] = useState<Lead[]>([
    { id: 1, name: "Ana Torres", phone: "5511223344", status: "interesado", vacancy: "Asesor Comercial" },
    { id: 2, name: "Luis Gómez", phone: "5599887766", status: "agendo", appointmentDate: "2024-05-03", appointmentTime: "09:30", interviewer: "Lic. Claudia" }
  ]);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");

  const handleCreateLead = () => {
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      alert("Por favor, ingresa el nombre y teléfono del prospecto.");
      return;
    }
    
    const newLead: Lead = {
      id: Date.now(),
      name: newLeadName,
      phone: newLeadPhone,
      status: "interesado"
    };
    
    setLeads([...leads, newLead]);
    setNewLeadName("");
    setNewLeadPhone("");
    
    alert(`✅ Prospecto creado exitosamente:\nNombre: ${newLeadName}\nTeléfono: ${newLeadPhone}`);
  };

  const renderLeadCard = (lead: Lead) => (
    <div key={lead.id} className="bg-slate-800 border border-white/10 rounded-lg p-3 mb-3 cursor-pointer hover:border-blue-500/50 transition-colors group">
      <div className="flex justify-between items-start">
        <p className="text-sm font-bold text-white">{lead.name}</p>
        <button onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')} className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><Phone className="w-2.5 h-2.5" /> {lead.phone}</p>
      {lead.vacancy && <p className="text-[9px] text-blue-400 font-bold uppercase mt-1">{lead.vacancy}</p>}
      {lead.appointmentDate && (
        <div className="mt-2 bg-slate-900/50 rounded p-1.5 border border-white/5">
          <p className="text-[9px] text-amber-400 font-bold">CITA: {lead.appointmentDate} {lead.appointmentTime}</p>
          {lead.interviewer && <p className="text-[8px] text-slate-500 uppercase">Entrevista: {lead.interviewer}</p>}
        </div>
      )}
    </div>
  );
  
  const DEFAULT_VACANCY = {
    puesto: 'Asesor Comercial Telmex',
    sueldoSemanal: '$2,300 + comisiones',
    edadMin: 18,
    edadMax: 35,
    horario: 'Lunes a Sábado 9:00 AM - 6:00 PM',
    ubicacion: 'Av. Tláhuac 3632 int 301, Col. Culhuacan, Iztapalapa (Metro Culhuacan L12)',
    beneficios: 'Sueldo semanal garantizado, comisiones sin tope, capacitación pagada, posibilidad de crecimiento',
    requisitos: 'Sin experiencia previa requerida, actitud positiva, disponibilidad de tiempo completo',
  };

  const DEFAULT_INSTRUCTIONS = 'Sé amable y profesional. Responde en español mexicano casual. Usa emojis con moderación. Si el candidato tiene dudas, resuélvelas antes de proceder al agendamiento. No presiones demasiado.';

  // Load agents from backend, fallback to defaults
  const [agents, setAgents] = useState<Agent[]>([
    { id: 1, name: "Agente 1 (Formal)", style: "Profesional y formal", instructions: 'Mantén un tono profesional y formal en todo momento. Evita contracciones y usa títulos de cortesía. Sé preciso y directo.', templates: { initial: "Hola, gracias por contactar a HDreams. ¿En qué puedo apoyarle hoy?" }, vacancy: DEFAULT_VACANCY },
    { id: 2, name: "Agente 2 (Amigable)", style: "Cercano y amable", instructions: DEFAULT_INSTRUCTIONS, templates: { initial: "¡Hola! Qué gusto saludarte, soy parte del equipo de HDreams. ¿Cómo estás?" }, vacancy: DEFAULT_VACANCY },
    { id: 3, name: "Agente 3 (Energético)", style: "Entusiasta y directo", instructions: 'Sé muy entusiasta y usa exclamaciones. Motiva al candidato. Resalta los beneficios del trabajo. Usa emojis de energía como 🚀💪⚡', templates: { initial: "¡Hola! ¿Listo para conocer las mejores vacantes de HDreams? ¡Vamos a ello!" }, vacancy: DEFAULT_VACANCY },
    { id: 4, name: "Agente 4 (Empático)", style: "Comprensivo y paciente", instructions: 'Muestra mucha empatía. Si el candidato expresa dudas o miedos, valídalos y tranquilízalos. Explica cada paso con detalle y paciencia.', templates: { initial: "Hola, entiendo que buscar empleo puede ser un proceso importante. Estoy aquí para ayudarte." }, vacancy: DEFAULT_VACANCY },
    { id: 5, name: "Agente 5 (Eficiente)", style: "Rápido y al grano", instructions: 'Ve directo al punto. Usa respuestas cortas y claras. Evita rodeos. Agenda la entrevista lo antes posible sin perder tiempo.', templates: { initial: "Hola, soy tu asistente de reclutamiento. ¿Qué información necesitas sobre nuestras vacantes?" }, vacancy: DEFAULT_VACANCY },
  ]);

  const [savingAgent, setSavingAgent] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const saveAgent = async (agent: Agent) => {
    setSavingAgent(true);
    try {
      const token = user?.sessionToken || '';
      await fetch('/api/recruitment/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(agent),
      });
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // Fallback: save locally if server unreachable
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    } finally {
      setSavingAgent(false);
      setEditingAgent(null);
    }
  };

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: 1, name: "Campaña Reclutamiento Q2", platform: "Facebook", status: "Activa" },
  ]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-1 tracking-tight flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-blue-400" />
          HDreams CRM PRO - Reclutamiento
        </h1>
        <p className="text-zinc-400 text-sm">Gestión de prospectos, agentes y campañas Meta.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl mb-8 overflow-x-auto hide-scrollbar w-fit">
        <TabButton active={activeTab === "bot"} onClick={() => setActiveTab("bot")} label="🤖 Bot WhatsApp" highlight />
        <TabButton active={activeTab === "pipeline"} onClick={() => setActiveTab("pipeline")} label="Pipeline" />
        <TabButton active={activeTab === "agents"} onClick={() => setActiveTab("agents")} label="Agentes & IA" />
        <TabButton active={activeTab === "content"} onClick={() => setActiveTab("content")} label="Meta Content" />
        <TabButton active={activeTab === "crm"} onClick={() => setActiveTab("crm")} label="Conversaciones" />
        <TabButton active={activeTab === "whatsapp"} onClick={() => setActiveTab("whatsapp")} label="Conexión QR" />
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-500">
        {activeTab === "bot" && <RecruitmentBot />}

        {activeTab === "pipeline" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Team & New Lead */}
            <div className="space-y-6">
              {/* Create Lead Form */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  Nuevo Prospecto
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nombre Completo</label>
                    <input
                      type="text"
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Teléfono</label>
                    <input
                      type="text"
                      value={newLeadPhone}
                      onChange={(e) => setNewLeadPhone(e.target.value)}
                      placeholder="Ej. 5512345678"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleCreateLead}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                  >
                    Crear Prospecto
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Pipeline */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl h-full">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-400" />
                  Pipeline de Reclutamiento
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 overflow-x-auto pb-4">
                  {/* Column: INTERESADO */}
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5 min-w-[200px]">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      Interesado ({leads.filter(l => l.status === 'interesado').length})
                    </h3>
                    <div className="space-y-2">
                      {leads.filter(l => l.status === 'interesado').map(renderLeadCard)}
                    </div>
                  </div>
                  {/* Column: AGENDÓ */}
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5 min-w-[200px]">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                      Agendó ({leads.filter(l => l.status === 'agendo').length})
                    </h3>
                    <div className="space-y-2">
                      {leads.filter(l => l.status === 'agendo').map(renderLeadCard)}
                    </div>
                  </div>
                  {/* Column: CONFIRMÓ CITA */}
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5 min-w-[200px]">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      Confirmó Cita ({leads.filter(l => l.status === 'confirmocita').length})
                    </h3>
                    <div className="space-y-2">
                      {leads.filter(l => l.status === 'confirmocita').map(renderLeadCard)}
                    </div>
                  </div>
                  {/* Column: D,DO */}
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5 min-w-[200px]">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                      Conf. D,DO ({leads.filter(l => l.status === 'confirmodd').length})
                    </h3>
                    <div className="space-y-2">
                      {leads.filter(l => l.status === 'confirmodd').map(renderLeadCard)}
                    </div>
                  </div>
                  {/* Column: BIENVENIDA */}
                  <div className="bg-black/20 rounded-xl p-3 border border-white/5 min-w-[200px]">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      Bienvenida ({leads.filter(l => l.status === 'bienvenida').length})
                    </h3>
                    <div className="space-y-2">
                      {leads.filter(l => l.status === 'bienvenida').map(renderLeadCard)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "agents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">Configura la personalidad y base de conocimientos de cada agente IA.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map(agent => (
                <div key={agent.id} className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">{agent.name}</h3>
                      <p className="text-xs text-blue-400 mt-0.5">{agent.style}</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>

                  {/* Vacancy summary */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-1">
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Vacante asignada</p>
                    <p className="text-xs text-slate-200 font-semibold">{agent.vacancy.puesto}</p>
                    <p className="text-[10px] text-slate-400">{agent.vacancy.sueldoSemanal} · {agent.vacancy.edadMin}–{agent.vacancy.edadMax} años</p>
                  </div>

                  {/* Instructions preview */}
                  {agent.instructions && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                      <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Instrucciones IA</p>
                      <p className="text-[10px] text-slate-300 line-clamp-2">{agent.instructions}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setEditingAgent(agent)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Configurar Agente
                  </button>
                </div>
              ))}
            </div>
            {editingAgent && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl my-8">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-400" /> Configurar Agente IA
                    </h2>
                    <button onClick={() => setEditingAgent(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identidad del Agente</h3>
                      <input
                        type="text"
                        placeholder="Nombre del agente"
                        value={editingAgent.name}
                        onChange={(e) => setEditingAgent({...editingAgent, name: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Personalidad (ej: Amable y directo)"
                        value={editingAgent.style}
                        onChange={(e) => setEditingAgent({...editingAgent, style: e.target.value})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm"
                      />
                    </div>

                    {/* Agent Instructions — the AI brain */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5" /> Instrucciones del Agente (Cerebro IA)
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Define cómo debe comportarse la IA. Escribe reglas de personalidad, tono, enfoque, qué enfatizar, etc.
                      </p>
                      <textarea
                        rows={4}
                        placeholder="Ej: Sé muy amable pero firme con la puntualidad. Explica que el trabajo es 100% campo. Enfatiza los bonos semanales. Si el candidato duda, resuelve sus dudas antes de agendar."
                        value={editingAgent.instructions}
                        onChange={(e) => setEditingAgent({...editingAgent, instructions: e.target.value})}
                        className="w-full bg-blue-950/30 border border-blue-500/30 rounded-xl py-3 px-4 text-white text-sm resize-none focus:border-blue-400 focus:outline-none"
                      />
                    </div>

                    {/* Vacancy Info — the knowledge base */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5" /> Información de la Vacante (Base de Conocimientos)
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        El agente usará estos datos exclusivamente para responder dudas sobre el puesto.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">Puesto</label>
                          <input
                            type="text"
                            value={editingAgent.vacancy.puesto}
                            onChange={(e) => setEditingAgent({...editingAgent, vacancy: {...editingAgent.vacancy, puesto: e.target.value}})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">Sueldo Semanal</label>
                          <input
                            type="text"
                            value={editingAgent.vacancy.sueldoSemanal}
                            onChange={(e) => setEditingAgent({...editingAgent, vacancy: {...editingAgent.vacancy, sueldoSemanal: e.target.value}})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">Edad Mínima</label>
                          <input
                            type="number"
                            value={editingAgent.vacancy.edadMin}
                            onChange={(e) => setEditingAgent({...editingAgent, vacancy: {...editingAgent.vacancy, edadMin: parseInt(e.target.value)}})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">Edad Máxima</label>
                          <input
                            type="number"
                            value={editingAgent.vacancy.edadMax}
                            onChange={(e) => setEditingAgent({...editingAgent, vacancy: {...editingAgent.vacancy, edadMax: parseInt(e.target.value)}})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">Horario de Trabajo</label>
                        <input
                          type="text"
                          value={editingAgent.vacancy.horario}
                          onChange={(e) => setEditingAgent({...editingAgent, vacancy: {...editingAgent.vacancy, horario: e.target.value}})}
                          className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">Ubicación / Sucursal</label>
                        <input
                          type="text"
                          value={editingAgent.vacancy.ubicacion}
                          onChange={(e) => setEditingAgent({...editingAgent, vacancy: {...editingAgent.vacancy, ubicacion: e.target.value}})}
                          className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">Beneficios</label>
                        <textarea
                          rows={2}
                          value={editingAgent.vacancy.beneficios}
                          onChange={(e) => setEditingAgent({...editingAgent, vacancy: {...editingAgent.vacancy, beneficios: e.target.value}})}
                          className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-sm resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase">Requisitos</label>
                        <textarea
                          rows={2}
                          value={editingAgent.vacancy.requisitos}
                          onChange={(e) => setEditingAgent({...editingAgent, vacancy: {...editingAgent.vacancy, requisitos: e.target.value}})}
                          className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white text-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* Initial Greeting */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saludo Inicial (WhatsApp)</h3>
                      <textarea
                        rows={3}
                        value={editingAgent.templates.initial}
                        onChange={(e) => setEditingAgent({...editingAgent, templates: {...editingAgent.templates, initial: e.target.value}})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => saveAgent(editingAgent)}
                        disabled={savingAgent}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition-all disabled:opacity-50"
                      >
                        {savingAgent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {savingAgent ? 'Guardando…' : 'Guardar Configuración'}
                      </button>
                      <button onClick={() => setEditingAgent(null)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold">
                        Cancelar
                      </button>
                    </div>
                    {saveSuccess && (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
                        <CheckCircle className="w-4 h-4" /> Configuración guardada correctamente
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "content" && (
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Campañas Meta</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nueva Campaña
              </button>
            </div>
            <div className="space-y-4">
              {campaigns.map(c => (
                <div key={c.id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.platform}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "crm" && (
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">CRM Conversaciones Iniciadas</h2>
            <div className="space-y-4">
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Juan Pérez</p>
                  <p className="text-xs text-slate-400">WhatsApp - Hace 10 min</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">En curso</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">María García</p>
                  <p className="text-xs text-slate-400">Facebook - Hace 1 hora</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">Finalizada</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "whatsapp" && (
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Vincular WhatsApp</h2>
            <p className="text-slate-400 mb-8">Escanea el código QR con tu aplicación de WhatsApp para vincular tu cuenta.</p>
            <div className="w-64 h-64 bg-white rounded-xl mx-auto flex items-center justify-center border-4 border-blue-500">
              <p className="text-black font-bold">QR Placeholder</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, highlight }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl whitespace-nowrap",
        active
          ? highlight ? "bg-green-600 text-white shadow-lg shadow-green-500/20" : "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
          : highlight ? "text-green-400 hover:text-white hover:bg-green-500/10 border border-green-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );
}
