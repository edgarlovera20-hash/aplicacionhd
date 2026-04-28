import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, CreditCard, FileText, Banknote, Search, Calendar, TrendingUp, CheckCircle2, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../../api';

// --- MOCK DATA FOR MANAGEMENT ---
const mockUsers = [
  { id: 'UUID-123', name: 'Edgar Lovera' },
  { id: 'UUID-456', name: 'Ana García' },
];

const mockSalesData = [
  { folio_siac: '9876543', estatus_pisa: 'Terminado', monto_comision: 500 },
  { folio_siac: '9876550', estatus_pisa: 'En Curso', monto_comision: 350 },
];

type Tab = 'seguimiento' | 'comprobantes' | 'bancarios' | 'adelantos' | 'gestion';

export default function Payroll() {
  const [activeTab, setActiveTab] = useState<Tab>('seguimiento');
  const [isAdmin, setIsAdmin] = useState(true); // Should be derived from user role

  const tabs = [
    { id: 'seguimiento', label: 'Mi Seguimiento', icon: TrendingUp },
    { id: 'comprobantes', label: 'Mis Comprobantes', icon: FileText },
    { id: 'bancarios', label: 'Datos Bancarios', icon: CreditCard },
    { id: 'adelantos', label: 'Adelantos', icon: Banknote },
    ...(isAdmin ? [{ id: 'gestion', label: 'Gestión de Nóminas', icon: Download }] : []),
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1 tracking-tight">Nóminas y Comisiones</h1>
          <p className="text-zinc-400 text-sm">Gestiona tus pagos, comprobantes y datos bancarios.</p>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/10" 
                  : "bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 border border-white/5"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 min-h-[500px] shadow-xl">
        {activeTab === 'seguimiento' && <SeguimientoTab />}
        {activeTab === 'comprobantes' && <ComprobantesTab />}
        {activeTab === 'bancarios' && <BancariosTab />}
        {activeTab === 'adelantos' && <AdelantosTab />}
        {activeTab === 'gestion' && <GestionTab isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

function SeguimientoTab() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ventas').then((data: any[]) => {
      if (!data || data.length === 0) {
        setSales([]);
        setLoading(false);
        return;
      }
      const formatted = data.map(d => {
        const isPosteada = d.estado?.toUpperCase() === 'POSTEADA' || d.estatus?.toUpperCase() === 'POSTEADA' || d.pisaStatus?.toUpperCase() === 'POSTEADO';
        const isPaid = d.pagoRecibo || d.estadoPago === 'Pagado' || d.primerPago;
        
        let calculatedCommission = 0;
        if (isPosteada) calculatedCommission += 200;
        if (isPaid) calculatedCommission += 200;

        return {
          id: d.folio,
          client: (d.nombres || '') + ' ' + (d.apellidoPaterno || ''),
          package: d.paqueteNombre || 'N/A',
          commission: calculatedCommission,
          posteoBonus: isPosteada ? 200 : 0,
          pagoBonus: isPaid ? 200 : 0,
          status: d.estadoPago || d.estado || 'Pendiente'
        };
      });
      setSales(formatted);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setSales([]);
      setLoading(false);
    });
  }, []);

  const totalCommission = sales.reduce((acc, s) => acc + s.commission, 0);

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-5 shadow-inner">
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium mb-1">FOLIOS ACTIVOS</div>
          <div className="text-2xl font-mono font-bold text-zinc-100">{sales.length}</div>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-5 shadow-inner">
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium mb-1">COMISIÓN ACUMULADA</div>
          <div className="text-2xl font-mono font-bold text-emerald-400">{formatCurrency(totalCommission)}</div>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-5 shadow-inner">
          <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium mb-1">REGLA COMISION</div>
          <div className="text-[10px] text-zinc-400 mt-1 leading-tight">
            Posteo: <span className="text-blue-400">$200</span><br />
            1er Pago: <span className="text-emerald-400">$200</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500 border-b border-white/5">
            <tr>
              <th className="pb-4 font-medium uppercase tracking-wider text-[11px]">Folio</th>
              <th className="pb-4 font-medium uppercase tracking-wider text-[11px]">Cliente</th>
              <th className="pb-4 font-medium uppercase tracking-wider text-[11px] text-center">Posteo</th>
              <th className="pb-4 font-medium uppercase tracking-wider text-[11px] text-center">1er Pago</th>
              <th className="pb-4 font-medium uppercase tracking-wider text-[11px] text-right">Total</th>
              <th className="pb-4 font-medium uppercase tracking-wider text-[11px] text-right">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sales.map(sale => (
              <tr key={sale.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="py-4 font-mono font-medium text-zinc-100">{sale.id}</td>
                <td className="py-4 text-zinc-300">
                  {sale.client}
                  <p className="text-[10px] text-zinc-500">{sale.package}</p>
                </td>
                <td className="py-4 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold",
                    sale.posteoBonus > 0 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-zinc-800 text-zinc-600"
                  )}>
                    {sale.posteoBonus > 0 ? '+$200' : '$0'}
                  </span>
                </td>
                <td className="py-4 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold",
                    sale.pagoBonus > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-600"
                  )}>
                    {sale.pagoBonus > 0 ? '+$200' : '$0'}
                  </span>
                </td>
                <td className="py-4 text-right text-emerald-400 font-mono font-medium">{formatCurrency(sale.commission)}</td>
                <td className="py-4 text-right">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                    sale.posteoBonus > 0 ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
                  )}>
                    {sale.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComprobantesTab() {
  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-zinc-700/50 rounded-2xl p-10 text-center hover:bg-zinc-800/30 transition-colors cursor-pointer bg-zinc-950/20">
        <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
        <h3 className="text-zinc-100 font-medium mb-1">Subir Comprobante</h3>
        <p className="text-zinc-400 text-sm">Arrastra tu imagen o PDF aquí, o haz clic para seleccionar</p>
      </div>
      
      <h3 className="text-zinc-100 font-medium">Historial de Comprobantes</h3>
      <div className="text-center py-10 text-zinc-500 text-sm bg-zinc-950/30 rounded-xl border border-white/5">
        No hay comprobantes subidos aún.
      </div>
    </div>
  );
}

function BancariosTab() {
  const KEY = 'hdreams_bank_data';
  const def = { banco: '', titular: '', cuenta: '', clabe: '', rfc: '' };
  const [form, setForm] = useState(() => { try { return { ...def, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return def; } });
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const inp = 'w-full bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/50';

  /** Enmascara mostrando solo los ultimos 4 digitos. */
  const maskTail = (v: string) => {
    const s = String(v || '').replace(/\s+/g, '');
    if (!s) return '';
    return s.length <= 4 ? '****' : '****' + s.slice(-4);
  };

  const save = () => {
    let prev: typeof def = def;
    try { prev = { ...def, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch {}
    const diff = (Object.keys(form) as Array<keyof typeof form>).filter(k => form[k] !== (prev as any)[k]);
    localStorage.setItem(KEY, JSON.stringify(form));
    setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2500);

    // Audit: cualquier cambio en datos bancarios queda registrado en seguridad.
    if (diff.length > 0) {
      const user = (() => { try { return JSON.parse(localStorage.getItem('hdreams_user') || '{}'); } catch { return {}; } })();
      fetch('/api/profile/bank/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid'   : user.uid   || 'anonymous',
          'x-user-email' : user.email || '',
          ...(user.sessionToken ? { Authorization: `Bearer ${user.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          banco: form.banco, titular: form.titular,
          cuenta_mascarada: maskTail(form.cuenta),
          clabe_mascarada : maskTail(form.clabe),
          rfc: form.rfc, _diff: diff,
        }),
      }).catch(() => {});
    }
  };
  const BANCOS = ['BBVA','Santander','Banamex','HSBC','Banorte','Scotiabank','Inbursa','BANBAJIO','Otros'];
  return (
    <div className="max-w-md space-y-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-zinc-300">Datos Bancarios para Pago de Nómina</h3>
        {saved && <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Guardado</span>}
      </div>
      {(['banco','titular','cuenta','clabe','rfc'] as const).map(k => {
        const labels: Record<string,string> = { banco:'Banco', titular:'Titular de la cuenta', cuenta:'Número de cuenta', clabe:'CLABE Interbancaria (18 dígitos)', rfc:'RFC (opcional)' };
        const placeholders: Record<string,string> = { banco:'Selecciona tu banco', titular:'Nombre completo del titular', cuenta:'Número de cuenta', clabe:'18 dígitos', rfc:'RFC del titular' };
        if (k === 'banco') return (
          <div key={k}>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">{labels[k]}</label>
            {editing
              ? <select className={inp} value={form.banco} onChange={e => setForm(p=>({...p, banco:e.target.value}))}>
                  <option value="">Seleccionar…</option>{BANCOS.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              : <div className={cn(inp, 'cursor-default')}>{form.banco || <span className="text-zinc-600">Sin configurar</span>}</div>}
          </div>
        );
        return (
          <div key={k}>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">{labels[k]}</label>
            {editing
              ? <input className={cn(inp, (k==='cuenta'||k==='clabe') && 'font-mono')} value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={placeholders[k]}/>
              : <div className={cn(inp,'cursor-default', (k==='cuenta'||k==='clabe') && 'font-mono')}>{(form as any)[k] || <span className="text-zinc-600">Sin configurar</span>}</div>}
          </div>
        );
      })}
      <div className="flex gap-3 pt-2">
        {editing
          ? <>
              <button onClick={()=>setEditing(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={save} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">Guardar Datos</button>
            </>
          : <button onClick={()=>setEditing(true)} className="bg-zinc-800/80 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ring-1 ring-white/5">Editar Datos</button>
        }
      </div>
      <p className="text-[11px] text-zinc-600">Tus datos bancarios se almacenan localmente en este dispositivo y se usan para los recibos de nómina.</p>
    </div>
  );
}

function AdelantosTab() {
  const [monto, setMonto]   = useState('');
  const [motivo, setMotivo] = useState('');
  const [sending, setSending] = useState(false);
  const [advances, setAdvances] = useState<any[]>([]);
  const [toast, setToast]   = useState('');
  const notify = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),3000); };
  const inp = 'w-full bg-zinc-900/50 border border-white/5 rounded-xl p-3 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50';

  useEffect(() => {
    fetch('/api/payroll/advances').then(r=>r.json()).then(setAdvances).catch(()=>{});
  }, []);

  const submit = async () => {
    if (!monto || parseFloat(monto) <= 0) return notify('Ingresa un monto válido');
    if (!motivo.trim()) return notify('Describe el motivo del adelanto');
    setSending(true);
    try {
      const user = (() => { try { return JSON.parse(localStorage.getItem('hdreams_user') || '{}'); } catch { return {}; } })();
      const r = await fetch('/api/payroll/advances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid'   : user.uid   || 'anonymous',
          'x-user-email' : user.email || '',
          ...(user.sessionToken ? { Authorization: `Bearer ${user.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          monto: parseFloat(monto), motivo,
          agente_nombre: user.displayName || user.email || 'Asesor',
          agente_uid   : user.uid,
          estado       : 'pendiente',
        }),
      });
      const adv = await r.json();
      setAdvances(prev => [adv, ...prev]);
      setMonto(''); setMotivo('');
      notify('✅ Solicitud enviada — pendiente de aprobación');
    } catch { notify('Error al enviar solicitud'); }
    finally { setSending(false); }
  };

  const estadoClr = (e: string) => e==='aprobado'?'text-emerald-400':e==='rechazado'?'text-red-400':'text-amber-400';
  const fmt$ = (n: number) => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-6 shadow-inner">
        <h3 className="text-zinc-100 font-semibold mb-5">Solicitar Adelanto de Nómina</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Monto solicitado</label>
            <input type="number" className={inp} value={monto} onChange={e=>setMonto(e.target.value)} placeholder="$0.00"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Motivo</label>
            <textarea className={cn(inp,'resize-none h-24')} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Describe brevemente el motivo del adelanto…"/>
          </div>
          <button onClick={submit} disabled={sending||!monto||!motivo.trim()} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin"/>Enviando…</> : 'Enviar Solicitud'}
          </button>
        </div>
      </div>

      {advances.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-300 mb-3">Mis solicitudes de adelanto</h3>
          <div className="space-y-2">
            {advances.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{fmt$(a.monto)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{a.motivo}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-xs font-bold uppercase tracking-wider', estadoClr(a.estado))}>{a.estado}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-MX') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl text-sm text-zinc-100 z-50">{toast}</div>}
    </div>
  );
}

function GestionTab({ isAdmin }: { isAdmin: boolean }) {
  type UIState = 'IDLE' | 'LOADING' | 'PREVIEW' | 'SUCCESS';
  
  const [uiState, setUiState] = useState<UIState>('IDLE');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [week, setWeek] = useState('16');
  const [userId, setUserId] = useState(isAdmin ? 'UUID-123' : 'all');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancaria');
  const [receiptData, setReceiptData] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleFetchData = async () => {
    setUiState('LOADING');
    
    // Simulate API Call - In production, this would fetch from 'ventas' filtered by userId and status
    setTimeout(() => {
      const selectedUser = mockUsers.find(u => u.id === userId) || mockUsers[0];
      
      // Simulate results with the new commission logic
      const simulatedSales = [
        { folio_siac: '9876543', estatus_pisa: 'Posteada', monto_comision: 400, detalle: '($200 Posteo + $200 Pago)' },
        { folio_siac: '9876550', estatus_pisa: 'Posteada', monto_comision: 200, detalle: '($200 Posteo)' },
        { folio_siac: '9876588', estatus_pisa: 'Posteada', monto_comision: 400, detalle: '($200 Posteo + $200 Pago)' },
      ];
      
      const sales = userId === 'all' ? [] : simulatedSales;
      
      const subtotal = sales.reduce((acc, v) => acc + v.monto_comision, 0);
      const descuentos = 0; 
      const total_neto = subtotal - descuentos;

      setReceiptData({
        header: {
          empresa: "HEAVENLY DREAMS SAS DE CV",
          titulo: "Recibo de Pago de Comisiones",
          semana: parseInt(week),
          anio: parseInt(year)
        },
        personal: {
          promotor_id: selectedUser.id,
          nombre_promotor: selectedUser.name,
          gerente_nombre: "Edgar David Lovera Juárez"
        },
        periodo: {
          fecha_pago: new Date().toISOString().split('T')[0],
          ventas_desde: "2024-04-13",
          ventas_hasta: "2024-04-19"
        },
        metodo_pago: paymentMethod,
        detalle_ventas: sales,
        totales: {
          subtotal,
          descuentos,
          total_neto
        }
      });
      
      setUiState('PREVIEW');
    }, 1000);
  };

  const handleSave = () => {
    // Simulate POST request
    setUiState('SUCCESS');
    setTimeout(() => setUiState('IDLE'), 3000);
  };

  const exportToPDF = async () => {
    if (!receiptRef.current || !receiptData) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Nomina_S${receiptData.header.semana}_${receiptData.personal.nombre_promotor.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF", error);
    }
  };

  const [importing, setImporting] = useState(false);
  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      alert('Sincronización completa. Se han actualizado los estatus de folios y pagos de la semana en curso.');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 bg-zinc-950/30 p-4 rounded-xl border border-white/5 relative">
        <div className="absolute -top-3 right-4">
           <button 
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-[10px] font-bold uppercase rounded-lg border border-emerald-500/20 transition-all"
           >
             {importing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
             Importar Actualización
           </button>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Asesor</label>
          <select 
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={!isAdmin}
          >
            {isAdmin && <option value="all">Seleccionar asesor...</option>}
            {mockUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Semana</label>
          <input 
            type="number" 
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50" 
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Año</label>
          <input 
            type="number" 
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50" 
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={handleFetchData}
            disabled={uiState === 'LOADING' || userId === 'all'}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all h-[42px] flex items-center shadow-lg shadow-indigo-500/20"
          >
            {uiState === 'LOADING' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generar Recibo'}
          </button>
        </div>
      </div>

      {/* UI States */}
      {uiState === 'IDLE' && (
        <div className="text-center py-20 text-zinc-500 bg-zinc-950/20 rounded-2xl border border-white/5 border-dashed">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Selecciona un asesor y haz clic en "Generar Recibo" para ver la nómina.</p>
        </div>
      )}

      {uiState === 'LOADING' && (
        <div className="text-center py-20 text-zinc-500 bg-zinc-950/20 rounded-2xl border border-white/5">
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-indigo-500" />
          <p>Consultando base de datos...</p>
        </div>
      )}

      {uiState === 'SUCCESS' && (
        <div className="text-center py-20 text-emerald-500 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-1">¡Nómina Registrada!</h3>
          <p className="text-emerald-400/80 text-sm">El historial ha sido actualizado correctamente.</p>
        </div>
      )}

      {uiState === 'PREVIEW' && receiptData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Editable Fields outside the receipt for clean PDF */}
          <div className="mb-6 flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
            <label className="text-sm font-medium text-blue-400 whitespace-nowrap">Método de Pago:</label>
            <input 
              type="text" 
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setReceiptData({...receiptData, metodo_pago: e.target.value});
              }}
              className="bg-black/40 border border-blue-500/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 max-w-xs"
            />
          </div>

          {/* Receipt Template (Target for PDF) */}
          <div className="bg-white text-zinc-900 p-10 rounded-sm max-w-3xl mx-auto shadow-2xl relative" ref={receiptRef}>
            <div className="text-center border-b-2 border-zinc-900 pb-5 mb-8">
              <h2 className="font-bold text-2xl tracking-tight">{receiptData.header.empresa}</h2>
              <p className="text-sm text-zinc-600 mt-1">Avenida Tláhuac 3632, Interior A301, Colonia Culhuacán CTM Zona VIII, C.P. 09800, Iztapalapa, CDMX</p>
              <h3 className="font-bold mt-4 text-lg">{receiptData.header.titulo}</h3>
              <p className="text-sm font-medium">Semana {receiptData.header.semana} del Año {receiptData.header.anio}</p>
            </div>

            <div className="space-y-5 text-sm text-justify leading-relaxed">
              <p>
                Yo, <strong>{receiptData.personal.nombre_promotor}</strong>, recibo el pago de mis comisiones por mis ventas 
                posteadas de la empresa Heavenly Dreams SAs de CV y del gerente {receiptData.personal.gerente_nombre}, 
                correspondiente a la semana en curso.
              </p>
              <p>
                Recibiendo el pago el día <strong>{receiptData.periodo.fecha_pago}</strong>, que abarca mis ventas posteadas 
                del día <strong>{receiptData.periodo.ventas_desde}</strong> al día <strong>{receiptData.periodo.ventas_hasta}</strong>.
              </p>
              <p>
                Recibiendo y aceptando el esquema de comisiones, recibiendo el pago por un 
                total neto de <strong>{formatCurrency(receiptData.totales.total_neto)}</strong> vía <strong>{receiptData.metodo_pago}</strong>.
              </p>
            </div>

            <div className="mt-10">
              <table className="w-full text-sm border-collapse border border-zinc-300">
                <thead className="bg-zinc-200/50">
                  <tr>
                    <th className="border border-zinc-300 p-3 text-left font-semibold">Folio SIAC</th>
                    <th className="border border-zinc-300 p-3 text-left font-semibold">Estatus / Detalle</th>
                    <th className="border border-zinc-300 p-3 text-right font-semibold">Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.detalle_ventas.length > 0 ? (
                    receiptData.detalle_ventas.map((venta: any, idx: number) => (
                      <tr key={idx}>
                        <td className="border border-zinc-300 p-3">{venta.folio_siac}</td>
                        <td className="border border-zinc-300 p-3">
                          <span className="font-bold">{venta.estatus_pisa}</span>
                          {venta.detalle && <p className="text-[10px] text-zinc-500 mt-0.5">{venta.detalle}</p>}
                        </td>
                        <td className="border border-zinc-300 p-3 text-right font-bold">{formatCurrency(venta.monto_comision)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="border border-zinc-300 p-6 text-center italic text-zinc-500 bg-zinc-50/50">
                        No hay folios posteados en esta semana
                      </td>
                    </tr>
                  )}
                </tbody>
                {receiptData.detalle_ventas.length > 0 && (
                  <tfoot className="bg-zinc-50 font-semibold">
                    <tr>
                      <td colSpan={2} className="border border-zinc-300 p-3 text-right">Subtotal:</td>
                      <td className="border border-zinc-300 p-3 text-right">{formatCurrency(receiptData.totales.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-zinc-300 p-3 text-right text-red-600">Descuentos/Adelantos:</td>
                      <td className="border border-zinc-300 p-3 text-right text-red-600">-{formatCurrency(receiptData.totales.descuentos)}</td>
                    </tr>
                    <tr className="bg-zinc-200">
                      <td colSpan={2} className="border border-zinc-300 p-3 text-right text-lg">Total Neto:</td>
                      <td className="border border-zinc-300 p-3 text-right text-lg">{formatCurrency(receiptData.totales.total_neto)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="mt-24 grid grid-cols-2 gap-10 text-center">
              <div>
                <div className="border-b border-zinc-900 w-56 mx-auto mb-3"></div>
                <p className="text-sm font-bold">Firma del Promotor/Supervisor</p>
                <p className="text-xs text-zinc-600 mt-1">{receiptData.personal.nombre_promotor}</p>
              </div>
              <div>
                <div className="border-b border-zinc-900 w-56 mx-auto mb-3"></div>
                <p className="text-sm font-bold">Firma del Gerente</p>
                <p className="text-xs text-zinc-600 mt-1">{receiptData.personal.gerente_nombre}</p>
              </div>
            </div>

            <div className="mt-16 text-center text-xs text-zinc-500">
              <p>Documento generado el {new Date().toLocaleString()}</p>
              <p className="mt-1">Heavenly Dreams SAs de CV — Todos los derechos reservados.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button 
              onClick={exportToPDF}
              className="bg-zinc-800/80 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors h-11 flex items-center ring-1 ring-white/5 gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
            <button 
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all h-11 flex items-center shadow-lg shadow-emerald-500/20 gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Registrar Nómina
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
