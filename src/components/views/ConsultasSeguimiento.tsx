import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, X, FileSearch, AlertCircle, Loader2, User, Upload, Lock, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

interface SaleRecord {
  id: string;
  estatus1: string;
  fechaCaptura: string;
  folioSiac: string;
  estatus2: string;
  paquete: string;
  tipoCliente: string;
  tipoServicio: string;
  areaEstrategia: string;
  usuario: string;
  nombrePromotor: string;
  ordenServicio: string;
  telefonoAsig: string;
  fechaPosteo: string;
  tienda: string;
  etapaPisa: string;
  osFinal: string;
  telefonoTelmex: string;
  zona: string;
  clienteMoroso: string;
}

export default function ConsultasSeguimiento() {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const isVendedor = role === 'VENDEDOR';
  const isAdmin = role === 'GERENTE' || role === 'ADMINISTRACION';

  // Identificadores del usuario para scoping por promotor (uid, email, displayName).
  const userIdentifiers = useMemo(() => {
    const ids: string[] = [];
    if (user?.uid) ids.push(user.uid.toLowerCase());
    if (user?.email) ids.push(user.email.toLowerCase());
    if (user?.displayName) ids.push(user.displayName.toLowerCase());
    if ((user as any)?.promotorId) ids.push(String((user as any).promotorId).toLowerCase());
    return ids;
  }, [user]);

  const matchesCurrentUser = (item: SaleRecord) => {
    if (!isVendedor) return true;
    const usu = (item.usuario || '').toLowerCase();
    const promNom = (item.nombrePromotor || '').toLowerCase();
    return userIdentifiers.some(id => id && (usu === id || promNom === id || usu.includes(id) || promNom.includes(id)));
  };

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionMsg, setPermissionMsg] = useState<string | null>(null);
  // Input states
  const [search, setSearch] = useState('');
  const [estatus, setEstatus] = useState('');
  const [promotor, setPromotor] = useState('');
  const [capIni, setCapIni] = useState('');
  const [capFin, setCapFin] = useState('');
  const [posIni, setPosIni] = useState('');
  const [posFin, setPosFin] = useState('');

  const MOCK_DATA: SaleRecord[] = [
    { id: '1', estatus1: 'POSTEADA', fechaCaptura: '2024-04-15', folioSiac: 'SIAC-88273', estatus2: 'POSTEADA', paquete: 'Doble Play 250 MB', tipoCliente: 'Nuevo', tipoServicio: 'Internet + Tel', areaEstrategia: 'Venta Directa', usuario: 'PROM-001', nombrePromotor: 'Juan Pérez', ordenServicio: 'ORD-9921', telefonoAsig: '5512345678', fechaPosteo: '2024-04-16', tienda: 'Sucursal Centro', etapaPisa: 'Activo', osFinal: 'OS-111', telefonoTelmex: '5511223344', zona: 'Norte', clienteMoroso: 'No' },
    { id: '2', estatus1: 'PAGADO', fechaCaptura: '2024-04-18', folioSiac: 'SIAC-88274', estatus2: 'PAGADO', paquete: 'Triple Play 500 MB', tipoCliente: 'Nuevo', tipoServicio: 'Internet', areaEstrategia: 'Venta Directa', usuario: 'PROM-002', nombrePromotor: 'Maria García', ordenServicio: 'ORD-9922', telefonoAsig: '5587654321', fechaPosteo: '2024-04-19', tienda: 'Sucursal Sur', etapaPisa: 'Posteado', osFinal: 'OS-112', telefonoTelmex: '5588776655', zona: 'Sur', clienteMoroso: 'No' },
    { id: '3', estatus1: 'PROCESO', fechaCaptura: '2024-04-20', folioSiac: 'SIAC-88275', estatus2: 'PROCESO', paquete: 'Doble Play 100 MB', tipoCliente: 'Nuevo', tipoServicio: 'Internet + Tel', areaEstrategia: 'Redes Sociales', usuario: 'PROM-001', nombrePromotor: 'Juan Pérez', ordenServicio: 'ORD-9923', telefonoAsig: '5500001111', fechaPosteo: '', tienda: 'Digital', etapaPisa: 'Pendiente', osFinal: '', telefonoTelmex: '5500112233', zona: 'Este', clienteMoroso: 'No' },
  ];

  useEffect(() => {
    api.get('/ventas').then((data: any[]) => {
      if (!data || data.length === 0) {
        setSales(MOCK_DATA);
      } else {
        const formatted = data.map(d => ({
          id: d.idImportado || d.id || '',
          estatus1: d.estado || d.estatus1 || 'PENDIENTE',
          fechaCaptura: d.fechaSolicitud || d.fechaCaptura || d.created_at || '',
          folioSiac: d.folio || d.folioSiac || '',
          estatus2: d.estado2 || d.estatus2 || '',
          paquete: d.paqueteNombre || d.paquete || '',
          tipoCliente: d.tipoCliente || 'Nuevo',
          tipoServicio: d.tipoServicio || '',
          areaEstrategia: d.areaEstrategia || d.estrategia || '',
          usuario: d.usuario || d.promotorId || '',
          nombrePromotor: d.promotorNombre || d.nombres || d.nombrePromotor || 'Sistema',
          ordenServicio: d.orden || d.ordenServicio || '',
          telefonoAsig: d.telefonoAsig || d.telefono || '',
          fechaPosteo: d.fechaPosteo || '',
          tienda: d.tienda || '',
          etapaPisa: d.etapaPisa || d.pisaStatus || '',
          osFinal: d.osFinal || '',
          telefonoTelmex: d.telefonoTitular || d.telefonoTelmex || '',
          zona: d.zona || '',
          clienteMoroso: d.clienteMoroso || ''
        })) as SaleRecord[];
        setSales(formatted);
      }
      setLoading(false);
    }).catch(err => {
      console.warn("API not available or empty, using mock data", err);
      setSales(MOCK_DATA);
      setLoading(false);
    });
  }, []);

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    estatus: '',
    promotor: '',
    capIni: '',
    capFin: '',
    posIni: '',
    posFin: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // More like Excel

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        if (cols.length < 10) continue;
        
        const folio = cols[3];
        if (!folio) continue;
        
        const record = {
          idImportado: cols[0] || '',
          estado: cols[1] || '',
          fechaSolicitud: cols[2] || '',
          folio: cols[3] || '',
          estado2: cols[4] || '',
          paqueteNombre: cols[5] || '',
          tipoCliente: cols[6] || '',
          tipoServicio: cols[7] || '',
          areaEstrategia: cols[8] || '',
          usuario: cols[9] || '',
          promotorNombre: cols[10] || '',
          orden: cols[11] || '',
          telefonoAsig: cols[12] || '',
          fechaPosteo: cols[13] || '',
          tienda: cols[14] || '',
          etapaPisa: cols[15] || '',
          osFinal: cols[16] || '',
          telefonoTitular: cols[17] || '',
          zona: cols[18] || '',
          clienteMoroso: cols[19] || '',
          createdAt: new Date().toISOString()
        };

        try {
          await api.post('/ventas', record);
          successCount++;
        } catch (err) {
          console.error(`Error importando folio ${folio}`, err);
        }
      }
      alert(`¡Importación completada con éxito!\nSe añadieron ${successCount} registros a la base de datos.`);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al leer o importar el archivo CSV.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFilter = () => {
    setAppliedFilters({
      search: search.toLowerCase(),
      estatus,
      promotor: promotor.toLowerCase(),
      capIni,
      capFin,
      posIni,
      posFin
    });
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearch('');
    setEstatus('');
    setPromotor('');
    setCapIni('');
    setCapFin('');
    setPosIni('');
    setPosFin('');
    setAppliedFilters({
      search: '',
      estatus: '',
      promotor: '',
      capIni: '',
      capFin: '',
      posIni: '',
      posFin: ''
    });
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return sales.filter(item => {
      // Privacidad por rol — VENDEDOR solo ve sus propias ventas
      if (!matchesCurrentUser(item)) return false;

      const { search: q, estatus: e, promotor: p, capIni: ci, capFin: cf, posIni: pi, posFin: pf } = appliedFilters;

      const matchGlobal = item.folioSiac.toLowerCase().includes(q) || item.telefonoAsig.includes(q) || item.telefonoTelmex.includes(q) || item.nombrePromotor.toLowerCase().includes(q);
      const matchEstatus = e === "" || item.estatus1 === e;
      const matchPromotor = p === "" || item.nombrePromotor.toLowerCase().includes(p) || item.usuario.toLowerCase().includes(p);
      const matchCap = (!ci || item.fechaCaptura >= ci) && (!cf || item.fechaCaptura <= cf);
      const matchPos = (!pi || (item.fechaPosteo && item.fechaPosteo >= pi)) && (!pf || (item.fechaPosteo && item.fechaPosteo <= pf));

      return matchGlobal && matchEstatus && matchPromotor && matchCap && matchPos;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, sales, isVendedor, userIdentifiers]);

  // Detecta si un vendedor buscó un folio que existe pero no le pertenece
  // → "Folio no encontrado o sin permisos"
  useEffect(() => {
    if (!isVendedor) { setPermissionMsg(null); return; }
    const q = appliedFilters.search;
    if (!q) { setPermissionMsg(null); return; }
    if (filteredData.length > 0) { setPermissionMsg(null); return; }
    const otherFolio = sales.find(item =>
      (item.folioSiac.toLowerCase().includes(q) || item.telefonoAsig.includes(q) || item.telefonoTelmex.includes(q)) && !matchesCurrentUser(item)
    );
    setPermissionMsg(otherFolio ? 'Folio no encontrado o sin permisos' : null);
    if (otherFolio) {
      fetch('/api/audit/moroso-blocked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid'   : user?.uid   || 'anonymous',
          'x-user-email' : user?.email || '',
          ...(user?.sessionToken ? { Authorization: `Bearer ${user.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          folio: otherFolio.folioSiac, cliente_nombre: otherFolio.nombrePromotor,
          motivo: 'busqueda_sin_permisos', intento: 'buscar folio ajeno',
        }),
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, sales, filteredData, isVendedor]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PAGADO': 
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'POSTEADA': 
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'PROCESO': 
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CANCELADA': 
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'NO ELABORADA': 
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: 
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const exportToExcel = () => {
    const headers = ['ID', 'ESTATUS', 'FECHA CAPTURA', 'FOLIO SIAC', 'ESTATUS', 'PAQUETE', 'TIPO DE CLIENTE', 'TIPO DE SERVICIO', 'AREA ESTRATEGIA', 'USUARIO', 'NOMBRE PROMOTOR', 'ORDEN DE SERVICIO', 'TELEFONO ASIG', 'FECHA POSTEO', 'TIENDA', 'ETAPA PISA', 'OS FINAL', 'TELEFONO TELMEX', 'ZONA', 'CLIENTE MOROSO'];
    const rows = filteredData.map(item => [
      item.id,
      item.estatus1,
      item.fechaCaptura,
      item.folioSiac,
      item.estatus2,
      item.paquete,
      item.tipoCliente,
      item.tipoServicio,
      item.areaEstrategia,
      item.usuario,
      item.nombrePromotor,
      item.ordenServicio,
      item.telefonoAsig,
      item.fechaPosteo,
      item.tienda,
      item.etapaPisa,
      item.osFinal,
      item.telefonoTelmex,
      item.zona,
      item.clienteMoroso
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Consultas_SIAC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1 tracking-tight flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-blue-400" />
            Consulta de Ventas - SIAC
          </h1>
          <p className="text-zinc-400 text-sm">
            {isVendedor
              ? 'Búsqueda y seguimiento de tus folios. Solo puedes ver ventas asignadas a tu ID de promotor.'
              : 'Búsqueda avanzada, filtrado y seguimiento de folios.'}
          </p>
        </div>
        {isVendedor && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase tracking-wider">
            <Lock className="w-3 h-3" /> Vista privada — Solo tus ventas
          </span>
        )}
      </div>

      {/* Filter Container */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Global Search */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buscador Global (Folio, Teléfono, Promotor)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Escribe para buscar..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>

          {/* Promotor Filter — solo Admin/Gerente */}
          {!isVendedor && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtrar por Promotor</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={promotor}
                  onChange={(e) => setPromotor(e.target.value)}
                  placeholder="Nombre o ID..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>
          )}

          {/* Status Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estatus SIAC</label>
            <select 
              value={estatus}
              onChange={(e) => setEstatus(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
            >
              <option value="" className="bg-slate-900">TODOS</option>
              <option value="PAGADO" className="bg-slate-900">FOLIO PAGADO</option>
              <option value="POSTEADA" className="bg-slate-900">POSTEADA</option>
              <option value="PROCESO" className="bg-slate-900">PROCESO</option>
              <option value="CANCELADA" className="bg-slate-900">CANCELADA</option>
              <option value="NO ELABORADA" className="bg-slate-900">NO ELABORADA</option>
            </select>
          </div>
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Captura Inicial</label>
            <input type="date" value={capIni} onChange={(e) => setCapIni(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Captura Final</label>
            <input type="date" value={capFin} onChange={(e) => setCapFin(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Posteo Inicial</label>
            <input type="date" value={posIni} onChange={(e) => setPosIni(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Posteo Final</label>
            <input type="date" value={posFin} onChange={(e) => setPosFin(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]" />
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
          {!isVendedor && (
            <>
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
            </>
          )}
          <button 
            onClick={handleFilter}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            <Filter className="w-4 h-4" />
            Filtrar Resultados
          </button>
        </div>
      </div>

      {/* Permission alert (vendedor buscó folio que no le pertenece) */}
      {permissionMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-red-300">{permissionMsg}</p>
            <p className="text-[11px] text-red-400/80">Solo puedes consultar folios asignados a tu ID de promotor. Contacta a Administración si crees que es un error.</p>
          </div>
        </div>
      )}

      {/* Table Wrapper (Excel Style) */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl shadow-md">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">ID</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors">ESTATUS</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors">FECHA CAPTURA</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors">FOLIO SIAC</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">ESTATUS</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">PAQUETE</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">TIPO DE CLIENTE</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">TIPO DE SERVICIO</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">AREA ESTRATEGIA</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">USUARIO</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">NOMBRE PROMOTOR</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">ORDEN DE SERVICIO</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">TELEFONO ASIG</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors">FECHA POSTEO</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">TIENDA</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">ETAPA PISA</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">OS FINAL</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">TELEFONO TELMEX</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">ZONA</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">EXPEDIENTE</th>
                <th className="p-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10">CLIENTE MOROSO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => {
                  // Vendedor: ocultar detalles sensibles de morosidad/cancelación
                  const isMorosoLike = item.estatus1 === 'CANCELADA' || item.estatus1 === 'NO ELABORADA';
                  const displayStatus = isVendedor && isMorosoLike ? 'NO DISPONIBLE' : item.estatus1;
                  const onRowClick = () => {
                    if (isVendedor && isMorosoLike) {
                      alert('Venta no permitida por políticas de riesgo');
                      // Audit: registramos el intento sobre un cliente bloqueado por riesgo.
                      fetch('/api/audit/moroso-blocked', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-user-uid'   : user?.uid   || 'anonymous',
                          'x-user-email' : user?.email || '',
                          ...(user?.sessionToken ? { Authorization: `Bearer ${user.sessionToken}` } : {}),
                        },
                        body: JSON.stringify({
                          folio: item.folioSiac, cliente_nombre: item.nombrePromotor,
                          motivo: item.estatus1, intento: 'consultar detalle',
                        }),
                      }).catch(() => {});
                    } else {
                      alert(`Detalle de Folio: ${item.folioSiac}`);
                    }
                  };
                  return (
                  <tr
                    key={idx}
                    onDoubleClick={onRowClick}
                    className="hover:bg-blue-500/10 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.id}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        isVendedor && isMorosoLike
                          ? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          : getStatusBadge(item.estatus1)
                      )}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.fechaCaptura}</td>
                    <td className="p-4 text-sm font-medium text-blue-400 whitespace-nowrap">{item.folioSiac}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.estatus2}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.paquete}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.tipoCliente}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.tipoServicio}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.areaEstrategia}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.usuario}</td>
                    <td className="p-4 text-sm text-slate-200 font-medium whitespace-nowrap">{item.nombrePromotor}</td>
                    <td className="p-4 text-sm text-slate-400 whitespace-nowrap">{item.ordenServicio || '--'}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.telefonoAsig}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.fechaPosteo || '--'}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.tienda}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.etapaPisa}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.osFinal}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.telefonoTelmex}</td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.zona}</td>
                    <td className="p-4 whitespace-nowrap">
                      {isAdmin ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            alert(`Iniciando descarga de carpeta: EXP_${item.folioSiac}`);
                            // Aquí iría la lógica real de descarga: window.open(`/api/expedientes/download/${item.folioSiac}`)
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-600/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          <Download className="w-3 h-3" /> Descargar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-500 opacity-50 cursor-not-allowed px-3 py-1.5 border border-white/5 rounded-lg">
                          <Lock className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase">Restringido</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-300 whitespace-nowrap">{item.clienteMoroso}</td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={20} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <p>{permissionMsg || 'No se encontraron resultados con los filtros actuales.'}</p>
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
            Mostrando <span className="font-black text-white">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-black text-white">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-black text-white">{filteredData.length}</span> resultados
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
                const delta = 2; // Number of pages to show around current
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
                            ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20 scale-110" 
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

    </div>
  );
}
