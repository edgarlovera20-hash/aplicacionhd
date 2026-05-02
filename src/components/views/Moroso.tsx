import { api } from '../../api';
import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, Search, X, Filter, Phone, DollarSign, Calendar, Bot, Loader2, Send, Download, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CustomerData, EventType, aiAgent } from '../../services/aiAgent';

interface MorosoRecord {
    id: string;
    fechaCaptura: string;
    folioSiac: string;
    nombreCliente1: string;
    telefonoTelmex: string;
    tienda: string;
    nombreCliente2: string;
    direccion1: string;
    direccion2: string;
    direccion3: string;
    entreCalle1: string;
    entreCalle2: string;
    telefonoTitular: string;
    telefonoReferencia: string;
    area: string;
    fechaConex: string;
    subdireccion: string;
    pago: string;
    ciudad: string;
    primSem: string;
    segunSem: string;
    bajaPrevia: string;
    folioProm: string;
    saldoTotal: string;
    saldoTelecom: string;
    saldoTercero: string;
    saldoVenfin: string;
    usuario: string;
    nombrePromotor: string;

    // Campos originales para la UI
    deuda?: number;
    diasAtraso?: number;
    estado?: string;
    paquete?: string;
}

export default function Morosidad() {
    const [morosos, setMorosos] = useState<MorosoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [estado, setEstado] = useState('');
    const [promotor, setPromotor] = useState('');
    
    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get('/ventas').then((data: any[]) => {
            const formatted = data.map((d, i) => ({
                id: d.idImportado || d.id || `M-${i}`,
                fechaCaptura: d.fechaCaptura || d.fechaSolicitud || d.created_at || '',
                folioSiac: d.folioSiac || d.folio || '',
                nombreCliente1: d.nombres || d.cliente || 'Desconocido',
                telefonoTelmex: d.telefonoTelmex || '',
                tienda: d.tienda || '',
                nombreCliente2: d.nombres || d.cliente || 'Desconocido',
                direccion1: d.direccion1 || d.calle || '',
                direccion2: d.direccion2 || d.colonia || '',
                direccion3: d.direccion3 || '',
                entreCalle1: d.entreCalle1 || d.entrecalle1 || '',
                entreCalle2: d.entreCalle2 || d.entrecalle2 || '',
                telefonoTitular: d.telefonoTitular || d.telefono || '0000000000',
                telefonoReferencia: d.telefonoReferencia || '',
                area: d.area || '',
                fechaConex: d.fechaConex || '',
                subdireccion: d.subdireccion || '',
                pago: d.pago || '',
                ciudad: d.ciudad || d.municipio || '',
                primSem: d.primSem || '',
                segunSem: d.segunSem || '',
                bajaPrevia: d.bajaPrevia || '',
                folioProm: d.folioProm || '',
                saldoTotal: d.saldoTotal || d.rentaMensual || '500',
                saldoTelecom: d.saldoTelecom || '',
                saldoTercero: d.saldoTercero || '',
                saldoVenfin: d.saldoVenfin || '',
                usuario: d.usuario || d.promotorId || '',
                nombrePromotor: d.promotorNombre || d.nombrePromotor || 'Sistema',

                deuda: d.rentaMensual ? Number(d.rentaMensual) : 500,
                diasAtraso: Math.floor(Math.random() * 30) + 1,
                estado: d.estadoMoroso || 'Sin contactar',
                paquete: d.paqueteNombre || 'N/A'
            }));
      setMorosos(formatted);
      setLoading(false);
    }).catch(() => {
      setMorosos([]);
      setLoading(false);
    });
  }, []);
  
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    estado: '',
    promotor: ''
  });

  const promotores = useMemo(() => {
    const unique = Array.from(new Set(morosos.map(m => m.nombrePromotor)));
    return unique.sort();
  }, [morosos]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // AI Chat State
  const [selectedClient, setSelectedClient] = useState<MorosoRecord | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleFilter = () => {
    setAppliedFilters({
      search: search.toLowerCase(),
      estado,
      promotor
    });
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearch('');
    setEstado('');
    setPromotor('');
    setAppliedFilters({ search: '', estado: '', promotor: '' });
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return morosos.filter(item => {
      const { search: q, estado: e, promotor: p } = appliedFilters;
      const matchGlobal = item.id.toLowerCase().includes(q) || item.nombreCliente1.toLowerCase().includes(q) || item.telefonoTitular.includes(q);
      const matchEstado = e === "" || item.estado === e;
      const matchPromotor = p === "" || item.nombrePromotor === p;
      return matchGlobal && matchEstado && matchPromotor;
    });
  }, [appliedFilters, morosos]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Sin contactar': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      case 'Recordatorio enviado': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Promesa de pago': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Inlocalizable': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Notificación legal': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const openAiChat = (client: MorosoRecord) => {
    setSelectedClient(client);
    setChatHistory([]);
    setChatMessage('');
  };

  const closeAiChat = () => {
    setSelectedClient(null);
    setChatHistory([]);
    setChatMessage('');
  };

  const handleSendAiMessage = async () => {
    if (!selectedClient || !chatMessage.trim()) return;

    const userMsg = chatMessage.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsAiLoading(true);

    const customerData: CustomerData = {
      nombre: selectedClient.nombreCliente1,
      deuda: selectedClient.deuda || 0,
      diasAtraso: selectedClient.diasAtraso || 0,
      esNuevo: false,
      telefono: selectedClient.telefonoTitular
    };

    // Para la sección de morosidad, el evento principal siempre es COBRANZA_MOROSO
    const eventType: EventType = 'COBRANZA_MOROSO';

    const response = await aiAgent.generateResponse(customerData, eventType, userMsg);
    
    setChatHistory(prev => [...prev, { role: 'ai', content: response }]);
    setIsAiLoading(false);
  };

  // Import / Export CSV
  const exportToExcel = () => {
    const headers = [
      'ID', 'FECHA DE CAPTURA', 'FOLIO SIAC', 'NOMBRE DEL CLIENTE', 'TELEFONO TELMEX', 
      'TIENDA', 'NOMBRE DEL CLIENTE', 'DIRECCION_1', 'DIRECCION_2', 'DIRECCION_3', 
      'ENTRE_CALLE1', 'ENTRE_CALLE2', 'TELEFONO DE TITULAR', 'TELEFONO DE REFERENCIA', 
      'AREA', 'FECHA_CONEX', 'SUBDIRECCION', 'PAGO', 'CIUDAD', 'PRIM_SEM', 'SEGUN_SEM', 
      'BAJA_PREVIA', 'FOLIOPROM', 'SALDO_TOTAL', 'SALDO_TELECOM', 'SALDO_TERCERO', 
      'SALDO_VENFIN', 'USUARIO', 'NOMBRE DE PROMOTOR'
    ];
    
    const rows = filteredData.map(item => [
      item.id, item.fechaCaptura, item.folioSiac, item.nombreCliente1, item.telefonoTelmex,
      item.tienda, item.nombreCliente2, item.direccion1, item.direccion2, item.direccion3,
      item.entreCalle1, item.entreCalle2, item.telefonoTitular, item.telefonoReferencia,
      item.area, item.fechaConex, item.subdireccion, item.pago, item.ciudad, item.primSem,
      item.segunSem, item.bajaPrevia, item.folioProm, item.saldoTotal, item.saldoTelecom,
      item.saldoTercero, item.saldoVenfin, item.usuario, item.nombrePromotor
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Clientes_Morosos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      let successCount = 0;
      // Skip header, process rows
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 29) continue;
        
        const id = cols[0];
        if (!id) continue;
        
        const record = {
          idImportado: cols[0] || '',
          fechaCaptura: cols[1] || '',
          folioSiac: cols[2] || '',
          nombres: cols[3] || '',
          telefonoTelmex: cols[4] || '',
          tienda: cols[5] || '',
          // cols[6] is duplicated name, skip for backend
          direccion1: cols[7] || '',
          direccion2: cols[8] || '',
          direccion3: cols[9] || '',
          entreCalle1: cols[10] || '',
          entreCalle2: cols[11] || '',
          telefonoTitular: cols[12] || '',
          telefonoReferencia: cols[13] || '',
          area: cols[14] || '',
          fechaConex: cols[15] || '',
          subdireccion: cols[16] || '',
          pago: cols[17] || '',
          ciudad: cols[18] || '',
          primSem: cols[19] || '',
          segunSem: cols[20] || '',
          bajaPrevia: cols[21] || '',
          folioProm: cols[22] || '',
          saldoTotal: cols[23] || '',
          saldoTelecom: cols[24] || '',
          saldoTercero: cols[25] || '',
          saldoVenfin: cols[26] || '',
          usuario: cols[27] || '',
          nombrePromotor: cols[28] || '',
          
          estadoMoroso: 'Sin contactar',
          createdAt: new Date().toISOString()
        };

        try {
          await api.post('/ventas', record);
          successCount++;
        } catch (err) {
          console.error(`Error importando ID ${id}`, err);
        }
      }
      alert(`¡Importación completada con éxito!\nSe añadieron ${successCount} registros de morosos.`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Hubo un error al leer o importar el archivo CSV.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-1 tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          Gestión de Morosidad
        </h1>
        <p className="text-zinc-400 text-sm">Seguimiento de cuentas por cobrar y automatización de cobranza con IA.</p>
      </div>

      {/* Filter Container */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Global Search */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buscar Cliente o Folio</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ID, Nombre o Teléfono..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
              />
            </div>
          </div>

          {/* Status Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado de Cobranza</label>
            <select 
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all appearance-none"
            >
              <option value="" className="bg-slate-900">TODOS LOS ESTADOS</option>
              <option value="Sin contactar" className="bg-slate-900">Sin contactar</option>
              <option value="Recordatorio enviado" className="bg-slate-900">Recordatorio enviado</option>
              <option value="Promesa de pago" className="bg-slate-900">Promesa de pago</option>
              <option value="Inlocalizable" className="bg-slate-900">Inlocalizable</option>
              <option value="Notificación legal" className="bg-slate-900">Notificación legal</option>
            </select>
          </div>

          {/* Promoter Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrar por Promotor</label>
            <select 
              value={promotor}
              onChange={(e) => setPromotor(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all appearance-none"
            >
              <option value="" className="bg-slate-900">TODOS LOS PROMOTORES</option>
              {promotores.map(p => (
                <option key={p} value={p} className="bg-slate-900">{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors border border-white/5"
          >
            <X className="w-4 h-4" />
            Limpiar Filtros
          </button>
          
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={importFromCSV}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-sm font-medium rounded-xl transition-colors border border-purple-500/20 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isImporting ? 'Importando...' : 'Importar CSV'}
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-medium rounded-xl transition-colors border border-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>

          <button 
            onClick={handleFilter}
            className="flex items-center gap-2 px-6 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-red-500/20"
          >
            <Filter className="w-4 h-4" />
            Filtrar Morosos
          </button>
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl shadow-md">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">ID</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">CLIENTE</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">TELÉFONO</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">PROMOTOR</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">PAQUETE</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">DEUDA</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">DÍAS ATRASO</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">ESTADO</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 text-right">ACCIONES IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-red-500/10 transition-colors group"
                  >
                    <td className="p-4 text-sm font-medium text-slate-400 whitespace-nowrap">{item.id}</td>
                    <td className="p-4 text-sm text-slate-200 font-medium whitespace-nowrap">{item.nombreCliente1}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {item.telefonoTitular}
                    </td>
                    <td className="p-4 text-sm text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-blue-400 border border-blue-500/20">
                          {item.nombrePromotor.charAt(0)}
                        </div>
                        {item.nombrePromotor}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-400 whitespace-nowrap">{item.paquete}</td>
                    <td className="p-4 text-sm font-bold text-red-400 whitespace-nowrap flex items-center">
                      <DollarSign className="w-4 h-4" />
                      {item.saldoTotal}
                    </td>
                    <td className="p-4 text-sm text-amber-400 font-medium whitespace-nowrap flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {item.diasAtraso} días
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        getStatusBadge(item.estado)
                      )}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => openAiChat(item)}
                        className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors group/btn relative"
                      >
                        <Bot className="w-4 h-4" />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                          Generar Mensaje IA
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-slate-600" />
                      <p>No se encontraron registros con los filtros actuales.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
          <p className="text-sm text-slate-400 whitespace-nowrap order-2 lg:order-1">
            Mostrando <span className="font-black text-white">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-black text-white">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-black text-white">{filteredData.length}</span> registros
          </p>
          
          <div className="flex items-center gap-3 order-1 lg:order-2 overflow-x-auto pb-2 lg:pb-0 max-w-full custom-scrollbar">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
            >
              Anterior
            </button>
            
            <div className="flex items-center gap-1.5">
              {(() => {
                const pages = [];
                const delta = 2;
                const left = currentPage - delta;
                const right = currentPage + delta;
                
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center border",
                          currentPage === i 
                            ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20 scale-110" 
                            : "bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-700 hover:text-white"
                        )}
                      >
                        {i}
                      </button>
                    );
                  } else if (i === left - 1 || i === right + 1) {
                    pages.push(<span key={i} className="text-slate-600 px-1">...</span>);
                  }
                }
                return pages;
              })()}
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/5"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[600px] max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <Bot className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Agente de Cobranza IA</h3>
                  <p className="text-xs text-slate-400">Cliente: {selectedClient.nombreCliente1} | Deuda: ${selectedClient.saldoTotal}</p>
                </div>
              </div>
              <button onClick={closeAiChat} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {chatHistory.length === 0 && (
                <div className="text-center text-slate-500 mt-10">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Genera un mensaje de cobranza persuasivo para WhatsApp.</p>
                  <p className="text-xs mt-1">El cliente tiene {selectedClient.diasAtraso} días de atraso.</p>
                  <button 
                    onClick={() => {
                      setChatMessage("Genera un mensaje inicial de recordatorio de pago amigable pero firme, sugiriendo la domiciliación.");
                      setTimeout(() => handleSendAiMessage(), 100);
                    }}
                    className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-300 transition-colors"
                  >
                    Generar mensaje inicial automáticamente
                  </button>
                </div>
              )}
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                    msg.role === 'user' 
                      ? "bg-red-600/80 text-white rounded-br-none" 
                      : "bg-slate-800 text-slate-200 border border-white/5 rounded-bl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 border border-white/5 rounded-2xl rounded-bl-none px-4 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Redactando mensaje...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-slate-900/50 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                  placeholder="Instrucciones para la IA..." 
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  disabled={isAiLoading}
                />
                <button 
                  onClick={handleSendAiMessage}
                  disabled={!chatMessage.trim() || isAiLoading}
                  className="p-2.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600/80 text-white rounded-xl transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
