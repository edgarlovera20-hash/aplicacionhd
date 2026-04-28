/**
 * Análisis Geográfico de Riesgo - Heavenly Dreams
 *
 * Modelo de morosidad por zona / colonia basado en histórico de cobranza
 * (datos reales agregados Dic 2025 – Abr 2026, 677 capturas).
 *
 * Niveles:
 *   - red    ≥ 30% morosidad → Zona Crítica
 *   - yellow 15% – 29.99%    → Zona en Vigilancia
 *   - green  < 15%           → Cartera Sana
 */

export type RiskLevel = 'red' | 'yellow' | 'green';

export interface RiskZone {
  area: string;
  colonias: string[];
  totalClientes: number;
  morosos: number;
  morosityPct: number;       // 0-100
  perdidaEstimada: number;   // MXN
  ticketPromedio: number;    // MXN/mes
  level: RiskLevel;
  lat: number;
  lng: number;
  gridRow: number;           // 0..5  (heatmap row)
  gridCol: number;           // 0..7  (heatmap col)
}

export const RISK_ZONES: RiskZone[] = [
  {
    area: 'IZTAPALAPA',
    colonias: ['CULHUACAN', 'IZTAPALAPA CENTRO', 'CTM CULHUACAN', 'JARDINES CHURUBUSCO', 'SAN ANDRES TETEPILCO'],
    totalClientes: 142, morosos: 56, morosityPct: 39.4,
    perdidaEstimada: 187_320, ticketPromedio: 389, level: 'red',
    lat: 19.359, lng: -99.085, gridRow: 4, gridCol: 5,
  },
  {
    area: 'TLAHUAC',
    colonias: ['ERMITA-TLAHUAC', 'TLAHUAC CENTRO', 'SAN FRANCISCO TLALTENCO', 'LA NOPALERA'],
    totalClientes: 110, morosos: 39, morosityPct: 35.5,
    perdidaEstimada: 132_480, ticketPromedio: 349, level: 'red',
    lat: 19.286, lng: -99.005, gridRow: 5, gridCol: 6,
  },
  {
    area: 'BALBUENA',
    colonias: ['BALBUENA', 'JARDIN BALBUENA', 'MOCTEZUMA', 'AVIACION CIVIL'],
    totalClientes: 79, morosos: 26, morosityPct: 32.9,
    perdidaEstimada: 94_185, ticketPromedio: 389, level: 'red',
    lat: 19.418, lng: -99.106, gridRow: 2, gridCol: 5,
  },
  {
    area: 'TEXCOCO-ZARAGOZA',
    colonias: ['ZARAGOZA', 'TEXCOCO', 'PEÑON DE LOS BAÑOS'],
    totalClientes: 35, morosos: 11, morosityPct: 31.4,
    perdidaEstimada: 41_220, ticketPromedio: 399, level: 'red',
    lat: 19.443, lng: -99.075, gridRow: 2, gridCol: 6,
  },
  {
    area: 'TECAMAC',
    colonias: ['TECAMAC CENTRO', 'OJO DE AGUA', 'LOS HEROES TECAMAC'],
    totalClientes: 24, morosos: 7, morosityPct: 29.2,
    perdidaEstimada: 27_330, ticketPromedio: 349, level: 'yellow',
    lat: 19.708, lng: -98.967, gridRow: 0, gridCol: 7,
  },
  {
    area: 'SOTELO',
    colonias: ['MANUEL AVILA SOTELO', 'TOLUQUILLA', 'PRESIDENTES'],
    totalClientes: 60, morosos: 14, morosityPct: 23.3,
    perdidaEstimada: 49_800, ticketPromedio: 389, level: 'yellow',
    lat: 19.394, lng: -99.231, gridRow: 3, gridCol: 1,
  },
  {
    area: 'MIXCOAC',
    colonias: ['MIXCOAC', 'EXTREMADURA INSURGENTES', 'INSURGENTES MIXCOAC'],
    totalClientes: 45, morosos: 9, morosityPct: 20.0,
    perdidaEstimada: 32_400, ticketPromedio: 449, level: 'yellow',
    lat: 19.376, lng: -99.187, gridRow: 3, gridCol: 3,
  },
  {
    area: 'TOLUCA',
    colonias: ['TOLUCA CENTRO', 'METEPEC', 'SAN MATEO ATENCO'],
    totalClientes: 18, morosos: 3, morosityPct: 16.7,
    perdidaEstimada: 11_745, ticketPromedio: 389, level: 'yellow',
    lat: 19.292, lng: -99.656, gridRow: 4, gridCol: 0,
  },
  {
    area: 'LINDAVISTA',
    colonias: ['LINDAVISTA', 'NUEVA LINDAVISTA', 'GUSTAVO A MADERO'],
    totalClientes: 25, morosos: 3, morosityPct: 12.0,
    perdidaEstimada: 9_345, ticketPromedio: 389, level: 'green',
    lat: 19.490, lng: -99.130, gridRow: 1, gridCol: 4,
  },
  {
    area: 'VALLE-SAN JUAN',
    colonias: ['DEL VALLE', 'SAN JUAN MIXCOAC', 'NAPOLES'],
    totalClientes: 15, morosos: 1, morosityPct: 6.7,
    perdidaEstimada: 3_115, ticketPromedio: 449, level: 'green',
    lat: 19.380, lng: -99.165, gridRow: 3, gridCol: 4,
  },
  {
    area: 'UNIVERSIDAD',
    colonias: ['CIUDAD UNIVERSITARIA', 'COPILCO', 'COYOACAN', 'PEDREGAL'],
    totalClientes: 286, morosos: 17, morosityPct: 5.9,
    perdidaEstimada: 38_080, ticketPromedio: 389, level: 'green',
    lat: 19.331, lng: -99.184, gridRow: 4, gridCol: 3,
  },
  {
    area: 'LOMAS',
    colonias: ['LOMAS DE CHAPULTEPEC', 'POLANCO', 'BOSQUES DE LAS LOMAS'],
    totalClientes: 11, morosos: 0, morosityPct: 0.0,
    perdidaEstimada: 0, ticketPromedio: 649, level: 'green',
    lat: 19.430, lng: -99.215, gridRow: 2, gridCol: 2,
  },
  {
    area: 'SATELITE',
    colonias: ['CIUDAD SATELITE', 'NAUCALPAN', 'JARDINES SATELITE'],
    totalClientes: 4, morosos: 0, morosityPct: 0.0,
    perdidaEstimada: 0, ticketPromedio: 499, level: 'green',
    lat: 19.510, lng: -99.235, gridRow: 1, gridCol: 1,
  },
];

/** Devuelve la zona que coincide con una colonia o área (case-insensitive, partial). */
export function findZoneByLocality(locality: string | undefined | null): RiskZone | null {
  if (!locality) return null;
  const q = locality.trim().toUpperCase();
  if (!q) return null;
  for (const z of RISK_ZONES) {
    if (z.area.toUpperCase() === q || z.area.toUpperCase().includes(q) || q.includes(z.area.toUpperCase())) {
      return z;
    }
    for (const c of z.colonias) {
      const cu = c.toUpperCase();
      if (cu === q || cu.includes(q) || q.includes(cu)) return z;
    }
  }
  return null;
}

export function colorForLevel(level: RiskLevel): string {
  switch (level) {
    case 'red':    return '#ef4444';
    case 'yellow': return '#f59e0b';
    case 'green':  return '#22c55e';
  }
}

export function bgClassForLevel(level: RiskLevel): string {
  switch (level) {
    case 'red':    return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'yellow': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'green':  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
}

export function labelForLevel(level: RiskLevel): string {
  switch (level) {
    case 'red':    return 'Zona Crítica';
    case 'yellow': return 'Vigilancia';
    case 'green':  return 'Cartera Sana';
  }
}

export const HEATMAP_ROWS = 6;
export const HEATMAP_COLS = 8;

export function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
}

export function totalsByLevel() {
  const t = { red: 0, yellow: 0, green: 0 } as Record<RiskLevel, number>;
  const c = { red: 0, yellow: 0, green: 0 } as Record<RiskLevel, number>;
  const m = { red: 0, yellow: 0, green: 0 } as Record<RiskLevel, number>;
  for (const z of RISK_ZONES) {
    t[z.level] += z.perdidaEstimada;
    c[z.level] += z.totalClientes;
    m[z.level] += z.morosos;
  }
  return { perdida: t, clientes: c, morosos: m };
}
