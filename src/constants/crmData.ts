export const PACKAGES = {
  INFINITUM_PURO_NEGOCIO: [
    { price: 349, speed: '120 Megas', security: '1 Dispositivo' },
    { price: 399, speed: '150 Megas', security: '1 Dispositivo' },
    { price: 449, speed: '250 Megas', security: '1 Dispositivo' },
    { price: 499, speed: '350 Megas', security: '1 Dispositivo' },
    { price: 549, speed: '500 Megas', security: '1 Dispositivo' },
    { price: 649, speed: '600 Megas', security: '1 Dispositivo' },
    { price: 899, speed: '850 Megas', security: '1 Dispositivo' },
  ],
  INFINITUM_PURO_RESIDENCIAL: [
    { price: 349, speed: '120', claroVideo: true, antivirus: '1 Disp.', drive: '100 GB', mcafee: '3 Lic.', mail: '1 Cuenta' },
    { price: 399, speed: '150', claroVideo: true, antivirus: '1 Disp.', drive: '100 GB', mcafee: '3 Lic.', mail: '1 Cuenta' },
    { price: 449, speed: '250', claroVideo: true, antivirus: '1 Disp.', drive: '200 GB', mcafee: '3 Lic.', mail: '1 Cuenta' },
    { price: 499, speed: '350', claroVideo: true, antivirus: '1 Disp.', drive: '200 GB', mcafee: '3 Lic.', mail: '1 Cuenta' },
    { price: 549, speed: '500', claroVideo: true, antivirus: '1 Disp.', drive: '200 GB', mcafee: '3 Lic.', mail: '1 Cuenta' },
    { price: 649, speed: '600', claroVideo: true, antivirus: '1 Disp.', drive: '200 GB', mcafee: '3 Lic.', mail: '1 Cuenta' },
    { price: 899, speed: '850', claroVideo: true, antivirus: '1 Disp.', drive: '400 GB', mcafee: '3 Lic.', mail: '1 Cuenta' },
  ],
  DOBLE_PLAY_NEGOCIO: [
    { price: 399, speed: '120', lineas: '1 ADM', factura: '1 Cuenta', drive: '$99.00', web: 'Sin Costo', simetria: '-', extras: 'Sec. Amarilla, Email, Seg. Internet' },
    { price: 549, speed: '250', lineas: '2 ADM', factura: '1 Cuenta', drive: '$99.00', web: 'Sin Costo', simetria: '-', extras: 'Sec. Amarilla, Email, Seg. Internet' },
    { price: 649, speed: '350', lineas: '2 ADM', factura: '1 Cuenta', drive: 'Sin Costo', web: 'Sin Costo', simetria: '-', extras: 'Sec. Amarilla, Email, FB, Google, WA' },
    { price: 799, speed: '500', lineas: '2 ADM', factura: '1 Cuenta', drive: 'Sin Costo', web: 'Sin Costo', simetria: '-', extras: 'Sec. Amarilla, Email, FB, Google, WA' },
    { price: 999, speed: '600', lineas: '2 ADM', factura: '1 Cuenta', drive: 'Sin Costo', web: 'Sin Costo', simetria: '-', extras: 'Sec. Amarilla, Email, FB, Google, WA' },
    { price: 1499, speed: '850', lineas: '2 ADM', factura: 'Básico 1', drive: 'Sin Costo', web: '$400.00', simetria: '-', extras: 'Sec. Amarilla, Email, FB, Google, WA' },
    { price: 1789, speed: '850', lineas: '4 ADM', factura: 'Básico 1', drive: 'Sin Costo', web: '$450.00', simetria: '-', extras: 'Sec. Amarilla, Email, FB, Google, WA' },
    { price: 2289, speed: '1000', lineas: '6 ADM', factura: 'Básico 1', drive: 'Sin Costo', web: '$500.00', simetria: '-', extras: 'Sec. Amarilla, Email, FB, Google, WA' },
  ],
  DOBLE_PLAY_RESIDENCIAL: [
    { price: 389, speed: '120', telefonia: '1 Línea', claroVideo: '5 Disp.', drive: '100 GB', mcafee: '3 lic', mail: 'Sin costo' },
    { price: 435, speed: '150', telefonia: '1 Línea', claroVideo: '5 Disp.', drive: '100 GB', mcafee: '3 lic', mail: 'Sin costo' },
    { price: 499, speed: '250', telefonia: '1 Línea', claroVideo: '5 Disp.', drive: '200 GB', mcafee: '3 lic', mail: 'Sin costo' },
    { price: 599, speed: '350', telefonia: '2 Líneas', claroVideo: '5 Disp.', drive: '200 GB', mcafee: '3 lic', mail: 'Sin costo' },
    { price: 649, speed: '500', telefonia: '2 Líneas', claroVideo: '5 Disp.', drive: '200 GB', mcafee: '3 lic', mail: 'Sin costo' },
    { price: 725, speed: '600', telefonia: '2 Líneas', claroVideo: '5 Disp.', drive: '200 GB', mcafee: '3 lic', mail: 'Sin costo' },
    { price: 999, speed: '850', telefonia: '3 Líneas', claroVideo: '5 Disp.', drive: '400 GB', mcafee: '3 lic', mail: 'Sin costo' },
    { price: 1399, speed: '1000', telefonia: '6 Líneas', claroVideo: '5 Disp.', drive: '400 GB', mcafee: '3 lic', mail: 'Sin costo' },
  ]
};

export const TERMS = {
  NUEVO_RESIDENCIAL: {
    title: 'CLIENTE NUEVO RESIDENCIAL',
    cost: '$1,600 MXN ($400 inicial + $100 x 12 meses)',
    benefits: 'Incluye Claro Video. NO incluye TV abierta.',
    commitment: 'Pospago. Pago puntual de recibo Telmex.'
  },
  NUEVO_NEGOCIO: {
    title: 'CLIENTE NUEVO NEGOCIO',
    cost: '$1,600 MXN ($400 inicial + $100 x 12 meses)',
    benefits: 'Prioridad Business (4h). SLA 99.5%. NO incluye Claro Video.',
    commitment: 'Facturación CFDI 4.0. Pospago empresarial.'
  },
  PORTADO_RESIDENCIAL: {
    title: 'CLIENTE PORTADO RESIDENCIAL',
    cost: '$0 MXN (CONDONADO 100%)',
    benefits: '3 meses gratis (meses 4, 8, 12). Incluye Claro Video.',
    commitment: 'Mantienes tu número. Permanencia 12 meses.'
  },
  PORTADO_NEGOCIO: {
    title: 'CLIENTE PORTADO NEGOCIO',
    cost: '$0 MXN (CONDONADO 100%)',
    benefits: '3 meses gratis (meses 4, 8, 12). Portación hasta 6 líneas. NO incluye Claro Video.',
    commitment: 'Facturación CFDI 4.0. Permanencia 12 meses.'
  }
};
