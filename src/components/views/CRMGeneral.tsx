import React, { useState, useEffect } from 'react';
import { AlertTriangle, UserX, ClipboardList, MessageSquare, Bot, ArrowLeft, Loader2, Search, Filter, MessageCircle, Send } from 'lucide-react';
import { aiAgent, CustomerData } from '../../services/aiAgent';
import { api } from '../../api';

export default function CRMGeneral() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Record<string, CustomerData[]>>({});
  const [loading, setLoading] = useState(true);
  const [aiResponses, setAiResponses] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

  useEffect(() => {
    api.get('/ventas').then((data: any[]) => {
      const grouped: Record<string, CustomerData[]> = {
        "Validaciones Pendientes": [],
        "No Contestaron": [],
        "No Localizados": [],
        "Rechazados": []
      };

      data.forEach(d => {
        const customer: CustomerData = {
          nombre: (d.nombres || '') + ' ' + (d.apellidoPaterno || ''),
          deuda: d.deuda || 0,
          diasAtraso: d.diasAtraso || 0,
          esNuevo: true,
          telefono: d.telefonoTitular || d.telefono || '',
          prioridad: d.prioridad || 'Media'
        };

        if (d.estado === 'pendiente') grouped["Validaciones Pendientes"].push(customer);
        else if (d.estado === 'no_contesto') grouped["No Contestaron"].push(customer);
        else if (d.estado === 'no_localizado') grouped["No Localizados"].push(customer);
        else if (d.estado === 'rechazado') grouped["Rechazados"].push(customer);
      });

      setCustomers(grouped);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setCustomers({
        "Validaciones Pendientes": [],
        "No Contestaron": [],
        "No Localizados": [],
        "Rechazados": []
      });
      setLoading(false);
    });
  }, []);

  const statuses = [
    { title: "Validaciones Pendientes", count: customers["Validaciones Pendientes"]?.length || 0, icon: ClipboardList, color: "text-yellow-400" },
    { title: "No Contestaron", count: customers["No Contestaron"]?.length || 0, icon: UserX, color: "text-orange-400" },
    { title: "No Localizados", count: customers["No Localizados"]?.length || 0, icon: AlertTriangle, color: "text-red-400" },
    { title: "Rechazados", count: customers["Rechazados"]?.length || 0, icon: MessageSquare, color: "text-purple-400" },
  ];

  const handleQualifyLead = async (customer: CustomerData, index: number) => {
    const key = `${selectedStatus}-${index}`;
    setLoadingAi(prev => ({ ...prev, [key]: true }));
    
    let eventType: 'BIENVENIDA' | 'COBRANZA_MOROSO' | 'FALLA_TECNICA' | 'RECUPERACION_CHURN' | 'ATENCION_GENERAL' = 'ATENCION_GENERAL';
    
    if (selectedStatus === 'Validaciones Pendientes') eventType = 'BIENVENIDA';
    if (selectedStatus === 'Rechazados') eventType = 'RECUPERACION_CHURN';
    if (customer.deuda > 0) eventType = 'COBRANZA_MOROSO';

    try {
      const response = await aiAgent.generateResponse(customer, eventType, 'Por favor, califica este lead y genera un mensaje de contacto inicial.');
      setAiResponses(prev => ({ ...prev, [key]: response }));
    } catch (error) {
      setAiResponses(prev => ({ ...prev, [key]: "Error al generar la respuesta de IA." }));
    } finally {
      setLoadingAi(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleWhatsApp = (customer: CustomerData, message?: string) => {
    const text = message ? encodeURIComponent(message) : encodeURIComponent(`Hola ${customer.nombre}, te contactamos de HDreamsApp...`);
    window.open(`https://wa.me/${customer.telefono}?text=${text}`, '_blank');
  };

  const filteredCustomers = (selectedStatus ? customers[selectedStatus] : []).filter(c => {
    const matchesSearch = c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || c.telefono.includes(searchQuery);
    const matchesPriority = filterPriority === "all" || c.prioridad?.toLowerCase() === filterPriority.toLowerCase();
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      {selectedStatus ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <button 
                onClick={() => setSelectedStatus(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al CRM General
              </button>
              <h2 className="text-2xl font-bold text-white">{selectedStatus}</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o tel..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 w-full sm:w-64"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select 
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="pl-10 pr-8 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                >
                  <option value="all">Todas las Prioridades</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredCustomers.map((customer, index) => {
              const key = `${selectedStatus}-${index}`;
              return (
                <div key={index} className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-white">
                        {customer.nombre.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{customer.nombre}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            customer.prioridad === 'Alta' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            customer.prioridad === 'Media' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {customer.prioridad}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">Tel: {customer.telefono} • Deuda: ${customer.deuda}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => handleQualifyLead(customer, index)}
                        disabled={loadingAi[key]}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                      >
                        {loadingAi[key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                        {loadingAi[key] ? 'Analizando...' : 'Calificar con IA'}
                      </button>
                      <button 
                        onClick={() => handleWhatsApp(customer, aiResponses[key])}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                  
                  {aiResponses[key] && (
                    <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 relative group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Sugerencia de Contacto IA</span>
                        </div>
                        <button 
                          onClick={() => handleWhatsApp(customer, aiResponses[key])}
                          className="text-[10px] bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Usar en WhatsApp
                        </button>
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap italic leading-relaxed">"{aiResponses[key]}"</p>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notas del Expediente</label>
                    <textarea
                      value={notes[key] || ""}
                      onChange={(e) => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full mt-2 bg-slate-950/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                      placeholder="Añade comentarios sobre el seguimiento..."
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
            
            {filteredCustomers.length === 0 && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center text-slate-400">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No se encontraron clientes que coincidan con los filtros.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">CRM General</h2>
            <div className="flex gap-2">
              <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                Agente IA Activo
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statuses.map((s) => (
              <StatusCard key={s.title} {...s} onClick={() => setSelectedStatus(s.title)} />
            ))}
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Flujos Automatizados (WhatsApp)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5 hover:border-blue-500/30 transition-colors cursor-pointer group">
                <h4 className="text-blue-400 font-bold text-sm mb-1 group-hover:text-blue-300">Bienvenida Automática</h4>
                <p className="text-xs text-slate-500">Envía mensaje de bienvenida al confirmar instalación.</p>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5 hover:border-orange-500/30 transition-colors cursor-pointer group">
                <h4 className="text-orange-400 font-bold text-sm mb-1 group-hover:text-orange-300">Recordatorio de Pago</h4>
                <p className="text-xs text-slate-500">IA detecta morosidad y sugiere pago por WhatsApp.</p>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-colors cursor-pointer group">
                <h4 className="text-purple-400 font-bold text-sm mb-1 group-hover:text-purple-300">Encuesta de Satisfacción</h4>
                <p className="text-xs text-slate-500">Envío de NPS tras 7 días de servicio activo.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ title, count, icon: Icon, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-left transition-all hover:bg-slate-800/60 hover:border-blue-500/50 group"
    >
      <div className="flex items-center gap-4 mb-4">
        <Icon className={`w-8 h-8 ${color} group-hover:scale-110 transition-transform`} />
        <h4 className="text-slate-300 font-medium">{title}</h4>
      </div>
      <p className="text-3xl font-bold text-white">{count}</p>
    </button>
  );
}
