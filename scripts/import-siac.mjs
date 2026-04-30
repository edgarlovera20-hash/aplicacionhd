#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Importador de SIAC → MockDB + Libro Excel de 4 hojas
//
// Lee: EDGAR DAVID LOVERA JUAREZ.xlsx (export del sistema SIAC con la data
//                                       maestra de ventas/posteos)
//
// Escribe:
//   1. .mockdb.json — agrega los registros como ventas (no reemplaza las
//      existentes; backup automático a .mockdb.json.bak antes de tocarlo)
//   2. EDGAR DAVID LOVERA JUAREZ - 4 hojas.xlsx — libro con 4 hojas
//      derivadas:
//        · Ventas               (toda la lista, 1 fila por folio SIAC)
//        · Usuarios             (promotores únicos con conteo y montos)
//        · Morosidad            (ventas viejas sin fecha de posteo)
//        · Ventas Nuevas        (LINEA NUEVA agrupada por promotor)
//
// Uso: node scripts/import-siac.mjs
// ─────────────────────────────────────────────────────────────────────────────

import xlsxPkg from 'xlsx';
const xlsx = xlsxPkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SOURCE_XLSX = path.join(ROOT, 'EDGAR DAVID LOVERA JUAREZ.xlsx');
const OUTPUT_XLSX = path.join(ROOT, 'EDGAR DAVID LOVERA JUAREZ - 4 hojas.xlsx');
const MOCKDB_PATH = path.join(ROOT, '.mockdb.json');

// ── 1. Cargar source workbook ────────────────────────────────────────────────
console.log('▶ Leyendo:', SOURCE_XLSX);
if (!fs.existsSync(SOURCE_XLSX)) {
  console.error('✗ No existe el archivo source. Aborto.');
  process.exit(1);
}
const wb = xlsx.readFile(SOURCE_XLSX);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
console.log(`  ${rows.length} registros leídos de hoja "${wb.SheetNames[0]}"`);

// ── 2. Helpers ───────────────────────────────────────────────────────────────

// Excel guarda fechas como serial numbers (días desde 1900-01-01).
// Convertirlas a ISO date.
const excelDateToISO = (val) => {
  if (val === '' || val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val !== 'number') return String(val);
  // Serial number Excel → JS Date
  // Excel epoch: 1900-01-01 (off by 1 día por bug histórico de Lotus 1-2-3)
  const ms = (val - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

// Renta mensual: extraer del paquete (ej. "INF19-PAQUETE 389" → 389)
const parsePackagePrice = (paquete) => {
  if (!paquete) return 0;
  const m = String(paquete).match(/(\d{3,4})\s*$/);
  return m ? parseInt(m[1], 10) : 0;
};

// Estado del posteo: hay FECHA POSTEO → posteada/aprobada
//                    no hay y > 30d → morosa/atorada
//                    no hay y < 30d → pendiente
const computeEstado = (fechaCaptura, fechaPosteo, estatusOriginal) => {
  if (fechaPosteo && String(fechaPosteo).trim() !== '') return 'posteada';
  const captura = excelDateToISO(fechaCaptura);
  if (!captura) return (estatusOriginal || 'pendiente').toString().toLowerCase();
  const days = Math.floor((Date.now() - new Date(captura).getTime()) / 86400000);
  if (days > 30) return 'atorada';
  return 'pendiente';
};

// ── 3. Mapear filas a schema mockdb ──────────────────────────────────────────
const ventasMapeadas = rows.map((r) => {
  const folio = String(r['FOLIO SIAC'] || '').trim();
  const fechaCaptura = excelDateToISO(r['FECHA  DE CAPTURA '] ?? r['FECHA DE CAPTURA'] ?? r['FECHA CAPTURA']);
  const fechaPosteo  = excelDateToISO(r['FECHA DE POSTEO']    ?? r['FECHA POSTEO']);
  const paquete      = String(r['PAQUETE'] || '').trim();
  const tipoCliente  = String(r['TIPO DE CLIENTE'] || '').trim();
  const promotor     = String(r['PROMOTOR'] ?? r['NOMBRE PROMOTOR'] ?? r['CLAVE PROMOTOE'] ?? '').trim();
  const orden        = String(r['ORDEN DE SERVICIO'] || '').trim();
  const telefono     = String(r['TELEFONO'] ?? r['FELEFONO TELMEX'] ?? '').trim();
  const tienda       = String(r['TIENDA'] || '').trim();
  const etapaPisa    = String(r['ETAPA PISA'] ?? r['PROCESO'] ?? '').trim();
  const tipoLinea    = String(r['TIPO DE LINEA'] || 'RESIDENCIAL').trim();
  const zona         = String(r['ZONA'] || '').trim();
  const area         = String(r['AREA'] ?? r['ESTRATEGIA'] ?? '').trim();
  const estatusOrig  = String(r['ESTATUS'] || '').trim();

  return {
    folio: 'SIAC-' + folio,                                  // namespace para no colisionar con FOL-* del CRM
    estado: computeEstado(r['FECHA  DE CAPTURA '] ?? r['FECHA CAPTURA'], r['FECHA DE POSTEO'] ?? r['FECHA POSTEO'], estatusOrig),
    paqueteNombre: paquete,
    nombres: '',                                             // SIAC no trae nombre del cliente
    telefonoTitular: telefono,
    rentaMensual: parsePackagePrice(paquete),
    data: {
      origen: 'SIAC',
      folioSiacOriginal: folio,
      estatusOriginal: estatusOrig,
      etapaPisa,
      fechaCaptura,
      fechaPosteo,
      tipoCliente,
      tipoLinea,
      promotor,
      orden,
      tienda,
      zona,
      area,
    },
  };
});

// ── 4. Actualizar .mockdb.json ───────────────────────────────────────────────
console.log('▶ Actualizando MockDB:', MOCKDB_PATH);
let mockdb = { ventas: [], users: [] };
if (fs.existsSync(MOCKDB_PATH)) {
  fs.copyFileSync(MOCKDB_PATH, MOCKDB_PATH + '.bak');
  console.log('  Backup → .mockdb.json.bak');
  mockdb = JSON.parse(fs.readFileSync(MOCKDB_PATH, 'utf8'));
}

// Quitar SIAC-* previos (re-import idempotente) y agregar los nuevos
const ventasNoSiac = (mockdb.ventas || []).filter(v => !String(v.folio || '').startsWith('SIAC-'));
mockdb.ventas = [...ventasNoSiac, ...ventasMapeadas];
fs.writeFileSync(MOCKDB_PATH, JSON.stringify(mockdb, null, 2), 'utf8');
console.log(`  ${ventasMapeadas.length} ventas SIAC importadas (preservadas ${ventasNoSiac.length} ventas locales)`);

// ── 5. Generar libro Excel de 4 hojas ────────────────────────────────────────
console.log('▶ Generando:', OUTPUT_XLSX);

// Hoja 1: VENTAS — la lista completa con columnas amigables
const sheetVentas = ventasMapeadas.map(v => ({
  'Folio SIAC':      v.data.folioSiacOriginal,
  'Folio MockDB':    v.folio,
  'Estatus Sistema': v.estado,
  'Etapa PISA':      v.data.etapaPisa,
  'Estatus Origen':  v.data.estatusOriginal,
  'Fecha Captura':   v.data.fechaCaptura,
  'Fecha Posteo':    v.data.fechaPosteo,
  'Paquete':         v.paqueteNombre,
  'Renta':           v.rentaMensual,
  'Tipo Cliente':    v.data.tipoCliente,
  'Tipo Línea':      v.data.tipoLinea,
  'Promotor':        v.data.promotor,
  'Área/Clave':      v.data.area,
  'Orden Servicio':  v.data.orden,
  'Teléfono':        v.telefonoTitular,
  'Tienda':          v.data.tienda,
  'Zona':            v.data.zona,
}));

// Hoja 2: USUARIOS — promotores únicos con métricas
const promotoresMap = new Map();
for (const v of ventasMapeadas) {
  const key = v.data.promotor || '(sin promotor)';
  const e = promotoresMap.get(key) || {
    'Promotor': key,
    'Total Ventas': 0,
    'Posteadas': 0,
    'Pendientes': 0,
    'Atoradas': 0,
    'Renta Total': 0,
    'Última Captura': '',
  };
  e['Total Ventas']++;
  if (v.estado === 'posteada')   e['Posteadas']++;
  if (v.estado === 'pendiente')  e['Pendientes']++;
  if (v.estado === 'atorada')    e['Atoradas']++;
  e['Renta Total'] += v.rentaMensual;
  if (v.data.fechaCaptura > e['Última Captura']) e['Última Captura'] = v.data.fechaCaptura;
  promotoresMap.set(key, e);
}
const sheetUsuarios = Array.from(promotoresMap.values()).sort((a, b) => b['Total Ventas'] - a['Total Ventas']);

// Hoja 3: MOROSIDAD — ventas atoradas (capturadas pero sin postear > 30d)
const sheetMorosidad = sheetVentas
  .filter(r => r['Estatus Sistema'] === 'atorada')
  .map(r => ({
    ...r,
    'Días Atrás': r['Fecha Captura']
      ? Math.floor((Date.now() - new Date(r['Fecha Captura']).getTime()) / 86400000)
      : '',
  }))
  .sort((a, b) => (b['Días Atrás'] || 0) - (a['Días Atrás'] || 0));

// Hoja 4: VENTAS NUEVAS DE USUARIOS — solo LINEA NUEVA por promotor
const sheetVentasNuevas = sheetVentas
  .filter(r => /linea\s+nueva/i.test(r['Tipo Cliente']))
  .sort((a, b) => String(a['Promotor']).localeCompare(String(b['Promotor'])));

const wbOut = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wbOut, xlsx.utils.json_to_sheet(sheetVentas),       'Ventas');
xlsx.utils.book_append_sheet(wbOut, xlsx.utils.json_to_sheet(sheetUsuarios),     'Usuarios');
xlsx.utils.book_append_sheet(wbOut, xlsx.utils.json_to_sheet(sheetMorosidad),    'Morosidad');
xlsx.utils.book_append_sheet(wbOut, xlsx.utils.json_to_sheet(sheetVentasNuevas), 'Ventas Nuevas');

xlsx.writeFile(wbOut, OUTPUT_XLSX);

// ── 6. Reporte ───────────────────────────────────────────────────────────────
console.log('\n📊 RESUMEN');
console.log(`  Ventas totales:        ${sheetVentas.length}`);
console.log(`  Promotores únicos:     ${sheetUsuarios.length}`);
console.log(`  Ventas en morosidad:   ${sheetMorosidad.length}`);
console.log(`  Ventas nuevas (línea): ${sheetVentasNuevas.length}`);
console.log(`\n✓ Excel generado: ${path.basename(OUTPUT_XLSX)}`);
console.log(`✓ MockDB actualizado: .mockdb.json (backup en .mockdb.json.bak)`);
console.log('\nTOP 5 promotores por ventas:');
sheetUsuarios.slice(0, 5).forEach((u, i) =>
  console.log(`  ${i + 1}. ${u['Promotor']}: ${u['Total Ventas']} ventas, $${u['Renta Total'].toLocaleString()} renta total`)
);
