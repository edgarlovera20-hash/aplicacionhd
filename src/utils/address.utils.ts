// Address formatting and validation utilities

export interface AddressObject {
  calle?: string;
  numero?: string;
  numeroInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  codigoPostal?: string;
}

/**
 * Format address object into a single line string
 * Example: "Calle Reforma 123, Col. Centro, México, CDMX 06500"
 */
export function formatAddressOneLine(address: AddressObject): string {
  const parts: string[] = [];

  if (address.calle) {
    let streetPart = address.calle;
    if (address.numero) streetPart += ` ${address.numero}`;
    if (address.numeroInterior) streetPart += ` Int. ${address.numeroInterior}`;
    parts.push(streetPart);
  }

  if (address.colonia) parts.push(`Col. ${address.colonia}`);
  if (address.municipio) parts.push(address.municipio);
  if (address.estado) parts.push(address.estado.toUpperCase());
  if (address.codigoPostal) parts.push(address.codigoPostal);

  return parts.filter(p => p).join(', ');
}

/**
 * Format address as multi-line string for display
 */
export function formatAddressMultiLine(address: AddressObject): string {
  const lines: string[] = [];

  if (address.calle) {
    let line = address.calle;
    if (address.numero) line += ` ${address.numero}`;
    if (address.numeroInterior) line += ` Int. ${address.numeroInterior}`;
    lines.push(line);
  }

  if (address.colonia) {
    lines.push(`${address.colonia}${address.codigoPostal ? ` ${address.codigoPostal}` : ''}`);
  }

  if (address.municipio || address.estado) {
    lines.push(
      [address.municipio, address.estado].filter(x => x).join(', ')
    );
  }

  return lines.join('\n');
}

/**
 * Validate address has minimum required fields
 * Returns true if calle, numero, and colonia are present
 */
export function isAddressValid(address: AddressObject): boolean {
  return !!(address.calle && address.numero && address.colonia);
}

/**
 * Check if address is complete (has all fields)
 */
export function isAddressComplete(address: AddressObject): boolean {
  return !!(
    address.calle &&
    address.numero &&
    address.colonia &&
    address.municipio &&
    address.estado &&
    address.codigoPostal
  );
}

/**
 * Get missing required fields
 */
export function getMissingAddressFields(address: AddressObject): string[] {
  const missing: string[] = [];
  if (!address.calle) missing.push('Calle');
  if (!address.numero) missing.push('Número');
  if (!address.colonia) missing.push('Colonia');
  if (!address.municipio) missing.push('Municipio');
  if (!address.estado) missing.push('Estado');
  if (!address.codigoPostal) missing.push('Código Postal');
  return missing;
}

/**
 * Mexican postal code validation (must be 5 digits)
 */
export function isValidPostalCode(code: string): boolean {
  return /^\d{5}$/.test((code || '').trim());
}

/**
 * Mexican state abbreviations and full names
 */
export const MEXICAN_STATES: Record<string, string> = {
  'AG': 'Aguascalientes',
  'BC': 'Baja California',
  'BCS': 'Baja California Sur',
  'CM': 'Campeche',
  'CS': 'Chiapas',
  'CH': 'Chihuahua',
  'CDMX': 'Ciudad de México',
  'CO': 'Coahuila',
  'CL': 'Colima',
  'DG': 'Durango',
  'EM': 'Estado de México',
  'GJ': 'Guanajuato',
  'GR': 'Guerrero',
  'HG': 'Hidalgo',
  'JC': 'Jalisco',
  'MC': 'Michoacán',
  'MN': 'Morelos',
  'MY': 'Nayarit',
  'NL': 'Nuevo León',
  'OC': 'Oaxaca',
  'PB': 'Puebla',
  'QT': 'Querétaro',
  'QR': 'Quintana Roo',
  'SL': 'San Luis Potosí',
  'SN': 'Sinaloa',
  'SO': 'Sonora',
  'TB': 'Tabasco',
  'TM': 'Tamaulipas',
  'TL': 'Tlaxcala',
  'VC': 'Veracruz',
  'YC': 'Yucatán',
  'ZC': 'Zacatecas',
};

/**
 * Expand state abbreviation to full name
 */
export function expandStateAbbr(abbr: string): string {
  const upper = (abbr || '').toUpperCase();
  return MEXICAN_STATES[upper] || upper;
}

/**
 * Get state abbreviation from full name
 */
export function getStateAbbr(fullName: string): string {
  if (!fullName) return '';
  const upper = fullName.toUpperCase();
  for (const [abbr, name] of Object.entries(MEXICAN_STATES)) {
    if (name.toUpperCase() === upper) return abbr;
  }
  return upper;
}
