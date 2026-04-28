// OCR extraction utilities for INE and Comprobante de Domicilio
// Parses Gemini Vision API responses to extract structured data

export interface INEData {
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  claveElector?: string;
  numeroCredencial?: string;
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  codigoPostal?: string;
}

export interface ComprobanteData {
  calle?: string;
  numero?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  codigoPostal?: string;
  tipoComprobante?: string; // 'agua', 'luz', 'internet', etc.
  nombre?: string;
  latitud?: number;
  longitud?: number;
}

export interface AddressComponents {
  calle: string;
  numero: string;
  colonia: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
}

/**
 * Extract INE data from OCR response
 * Parses Gemini Vision API text output to find INE-specific fields
 */
export function extractINEData(ocrText: string): INEData {
  const data: INEData = {};

  if (!ocrText) return data;

  // Try to extract name (typically appears as "NOMBRE:" in INE)
  const nameMatch = ocrText.match(/(?:nombre|nombre del elector)\s*[:\-]?\s*([A-Z\s]+?)(?=(?:APELLIDO|FECHA|CLAVE|CREDENCIAL|$))/i);
  if (nameMatch) {
    data.nombres = nameMatch[1].trim();
  }

  // Try to extract birth date (format: dd/mm/yyyy or similar)
  const dobMatch = ocrText.match(/(?:fecha de nacimiento|nacimiento|nac\.)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (dobMatch) {
    data.fechaNacimiento = dobMatch[1];
  }

  // Try to extract elector key (CURP-like pattern: 18 alphanumeric characters)
  const curpMatch = ocrText.match(/(?:clave|clave elector|curp)\s*[:\-]?\s*([A-Z0-9]{18})/i);
  if (curpMatch) {
    data.claveElector = curpMatch[1];
  }

  // Try to extract credential number
  const credMatch = ocrText.match(/(?:credential|credencial|número|num\.)\s*[:\-]?\s*([A-Z0-9]{6,})/i);
  if (credMatch) {
    data.numeroCredencial = credMatch[1];
  }

  // Extract address components
  const addressParts = extractAddressFromText(ocrText);
  Object.assign(data, addressParts);

  return data;
}

/**
 * Extract Comprobante de Domicilio data from OCR response
 * Parses utility bill or address proof document
 */
export function extractComprobanteData(ocrText: string): ComprobanteData {
  const data: ComprobanteData = {};

  if (!ocrText) return data;

  // Detect comprobante type from keywords
  if (/agua|agua pública|agua potable/i.test(ocrText)) {
    data.tipoComprobante = 'agua';
  } else if (/luz|energía|cfe|comisión federal/i.test(ocrText)) {
    data.tipoComprobante = 'luz';
  } else if (/telefónica|teléfono|telmex|infinitum|internet/i.test(ocrText)) {
    data.tipoComprobante = 'internet';
  } else if (/gas|gas natural|pemex/i.test(ocrText)) {
    data.tipoComprobante = 'gas';
  }

  // Extract name/account holder
  const nameMatch = ocrText.match(/(?:titular|nombre|a nombre de)\s*[:\-]?\s*([A-Z\s]{3,}?)(?=calle|dirección|domicilio|$)/i);
  if (nameMatch) {
    data.nombre = nameMatch[1].trim();
  }

  // Extract address components
  const addressParts = extractAddressFromText(ocrText);
  Object.assign(data, addressParts);

  return data;
}

/**
 * Helper: extract address components from OCR text
 * Looks for street, number, colony, city, state, postal code
 */
function extractAddressFromText(text: string): Partial<AddressComponents> {
  const parts: Partial<AddressComponents> = {};

  if (!text) return parts;

  // Street address (calle, avenida, boulevard, etc.)
  const streetMatch = text.match(/(?:calle|avenida|av\.|blvd|boulevard|pasaje)\s+([A-Z\s]+?)(?=número|num\.|no\.|#|\d{1,5})/i);
  if (streetMatch) {
    parts.calle = streetMatch[1].trim();
  }

  // Street number
  const numberMatch = text.match(/(?:número|num\.|no\.|#)\s*(\d+)\s*(?:interior|int\.)?(?:\s*(\d+))?/i);
  if (numberMatch) {
    parts.numero = numberMatch[1];
  }

  // Colony/neighborhood (colonia)
  const coloniaMatch = text.match(/(?:colonia|col\.)\s+([A-Z\s]+?)(?=municipio|delegación|ciudad|código|$)/i);
  if (coloniaMatch) {
    parts.colonia = coloniaMatch[1].trim();
  }

  // Municipality (municipio/delegación)
  const municipioMatch = text.match(/(?:municipio|municipio|delegación|delegación)\s+([A-Z\s]+?)(?=estado|entidad|código|$)/i);
  if (municipioMatch) {
    parts.municipio = municipioMatch[1].trim();
  }

  // State (estado/entidad)
  const stateMatch = text.match(/(?:estado|entidad|estado|prov\.)\s+([A-Z\s]+?)(?=código|cp|postal|$)/i);
  if (stateMatch) {
    parts.estado = stateMatch[1].trim();
  }

  // Postal code
  const postalMatch = text.match(/(?:código postal|c\.p\.|cp|postal code)\s+(\d{5})/i);
  if (postalMatch) {
    parts.codigoPostal = postalMatch[1];
  }

  return parts;
}

/**
 * Compare addresses from INE and Comprobante
 * Returns match status and normalized comparison
 */
export function compareAddresses(
  ineAddress: Partial<AddressComponents>,
  comprobanteAddress: Partial<AddressComponents>
): {
  isMatch: boolean;
  confidence: number; // 0-1 score
  mismatches: string[]; // Fields that don't match
} {
  const mismatches: string[] = [];

  // Normalize both addresses for comparison
  const normalize = (addr: Partial<AddressComponents>) => ({
    calle: normalizeString(addr.calle || ''),
    numero: normalizeString(addr.numero || ''),
    colonia: normalizeString(addr.colonia || ''),
    municipio: normalizeString(addr.municipio || ''),
    estado: normalizeString(addr.estado || ''),
    codigoPostal: (addr.codigoPostal || '').trim(),
  });

  const normIne = normalize(ineAddress);
  const normComprobante = normalize(comprobanteAddress);

  // Compare key fields (calle, numero, colonia, estado are most important)
  const fields = ['calle', 'numero', 'colonia', 'estado'] as const;
  let matchedFields = 0;

  for (const field of fields) {
    if (normIne[field] && normComprobante[field]) {
      const similarity = calculateSimilarity(normIne[field], normComprobante[field]);
      if (similarity < 0.8) {
        mismatches.push(field);
      } else {
        matchedFields++;
      }
    }
  }

  // Calculate confidence: if all compared fields match, high confidence
  const fieldsCompared = fields.filter(f => normIne[f] && normComprobante[f]).length;
  const confidence = fieldsCompared > 0 ? matchedFields / fieldsCompared : 0;
  const isMatch = confidence >= 0.8 && mismatches.length === 0;

  return { isMatch, confidence, mismatches };
}

/**
 * Normalize string for comparison (lowercase, remove accents, trim whitespace)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings (Levenshtein-like)
 * Returns 0-1 where 1 is exact match
 */
function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  // Simple similarity: count matching characters at same position
  let matches = 0;
  const minLen = Math.min(a.length, b.length);

  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) matches++;
  }

  // Also check if one is contained in the other (for flexibility)
  if (a.includes(b) || b.includes(a)) {
    return Math.max(matches / maxLen, 0.85);
  }

  return matches / maxLen;
}
