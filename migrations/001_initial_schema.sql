-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 001 — Schema inicial HDreams CRM
-- Crea todas las tablas que antes vivían solo en MockDB JSON.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tabla de control de migraciones ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(10) PRIMARY KEY,
  applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- ── USUARIOS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  uid            VARCHAR(255) UNIQUE NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  usuario        VARCHAR(255) UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(50)  DEFAULT 'vendedor',
  nombres        VARCHAR(255),
  apellidos      VARCHAR(255),
  status         VARCHAR(20)  DEFAULT 'active',
  must_reset_password BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ── VENTAS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  folio           VARCHAR(255) PRIMARY KEY,
  estado          VARCHAR(50)  DEFAULT 'pendiente',
  paquete_nombre  VARCHAR(255),
  nombres         VARCHAR(255),
  telefono        VARCHAR(50),
  renta_mensual   NUMERIC(10,2),
  agente_uid      VARCHAR(255),
  agente_nombre   VARCHAR(255),
  data            JSONB,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ventas_estado     ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_agente_uid ON ventas(agente_uid);
CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas(created_at DESC);

-- ── CLIENTES SEGUIMIENTO ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes_seguimiento (
  id                  VARCHAR(255) PRIMARY KEY,
  nombre              VARCHAR(255) NOT NULL,
  telefono            VARCHAR(50)  NOT NULL,
  email               VARCHAR(255),
  folio               VARCHAR(255),
  paquete             VARCHAR(255),
  renta               NUMERIC(10,2) DEFAULT 0,
  megas               VARCHAR(50),
  estado_pago         VARCHAR(20)  DEFAULT 'nuevo'
                      CHECK (estado_pago IN ('nuevo','al_corriente','pendiente','moroso','inactivo')),
  fecha_alta          DATE,
  fecha_ultimo_pago   DATE,
  agente_id           VARCHAR(255),
  agente_nombre       VARCHAR(255),
  supervisor_id       VARCHAR(255),
  beneficio_activado  BOOLEAN DEFAULT FALSE,
  domiciliado         BOOLEAN DEFAULT FALSE,
  colonia             VARCHAR(255),
  municipio           VARCHAR(255),
  notas               TEXT,
  mensajes_sin_leer   INTEGER DEFAULT 0,
  ultimo_contacto     DATE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_clientes_estado_pago  ON clientes_seguimiento(estado_pago);
CREATE INDEX IF NOT EXISTS idx_clientes_agente_id    ON clientes_seguimiento(agente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_supervisor   ON clientes_seguimiento(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono     ON clientes_seguimiento(telefono);

-- ── CONVERSACIONES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversaciones (
  id          VARCHAR(255) PRIMARY KEY,
  cliente_id  VARCHAR(255) NOT NULL REFERENCES clientes_seguimiento(id) ON DELETE CASCADE,
  texto       TEXT,
  fecha       TIMESTAMP,
  tipo        VARCHAR(20) CHECK (tipo IN ('inbound','outbound')),
  estado      VARCHAR(20) CHECK (estado IN ('enviado','entregado','leido','error')),
  plantilla   VARCHAR(255),
  agente      VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conversaciones_cliente ON conversaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_fecha   ON conversaciones(fecha DESC);

-- ── TICKETS SOPORTE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets_soporte (
  id              VARCHAR(255) PRIMARY KEY,
  cliente_id      VARCHAR(255) REFERENCES clientes_seguimiento(id) ON DELETE SET NULL,
  asunto          VARCHAR(500),
  descripcion     TEXT,
  estado          VARCHAR(20) DEFAULT 'abierto'
                  CHECK (estado IN ('abierto','en_proceso','resuelto','cerrado')),
  prioridad       VARCHAR(20) DEFAULT 'media'
                  CHECK (prioridad IN ('baja','media','alta','critica')),
  fecha_apertura  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre    TIMESTAMP,
  agente_id       VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_tickets_estado    ON tickets_soporte(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridad ON tickets_soporte(prioridad);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente   ON tickets_soporte(cliente_id);

-- ── PAGOS SEGUIMIENTO ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos_seguimiento (
  id          VARCHAR(255) PRIMARY KEY,
  cliente_id  VARCHAR(255) REFERENCES clientes_seguimiento(id) ON DELETE SET NULL,
  monto       NUMERIC(10,2) NOT NULL,
  fecha       DATE,
  estado      VARCHAR(20) CHECK (estado IN ('pendiente','pagado','rechazado')),
  metodo      VARCHAR(50),
  referencia  VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente ON pagos_seguimiento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha   ON pagos_seguimiento(fecha DESC);

-- ── CONTRATOS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id                   VARCHAR(255) PRIMARY KEY,
  folio                VARCHAR(255) UNIQUE,
  cliente_nombre       VARCHAR(255) NOT NULL,
  cliente_telefono     VARCHAR(50),
  cliente_email        VARCHAR(255),
  paquete              VARCHAR(255),
  renta                NUMERIC(10,2),
  megas                VARCHAR(50),
  fecha_inicio         DATE,
  fecha_fin            DATE,
  meses_permanencia    INTEGER DEFAULT 12,
  estado               VARCHAR(20) DEFAULT 'activo'
                       CHECK (estado IN ('activo','suspendido','cancelado','por_vencer','vencido')),
  portabilidad         VARCHAR(255),
  agente_id            VARCHAR(255),
  agente_nombre        VARCHAR(255),
  domicilio            TEXT,
  municipio            VARCHAR(255),
  notas                TEXT,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_contracts_estado   ON contracts(estado);
CREATE INDEX IF NOT EXISTS idx_contracts_agente   ON contracts(agente_id);
CREATE INDEX IF NOT EXISTS idx_contracts_fecha_fin ON contracts(fecha_fin);

-- ── FACTURAS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                 VARCHAR(255) PRIMARY KEY,
  folio_pago         VARCHAR(255) UNIQUE,
  contrato_id        VARCHAR(255) REFERENCES contracts(id) ON DELETE SET NULL,
  cliente_nombre     VARCHAR(255),
  cliente_email      VARCHAR(255),
  concepto           TEXT,
  monto              NUMERIC(10,2),
  iva                NUMERIC(10,2) DEFAULT 0,
  total              NUMERIC(10,2),
  metodo_pago        VARCHAR(30),
  estado             VARCHAR(20) DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente','pagado','cancelado','vencido')),
  fecha_emision      DATE,
  fecha_vencimiento  DATE,
  fecha_pago         DATE,
  agente_id          VARCHAR(255),
  notas              TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invoices_estado    ON invoices(estado);
CREATE INDEX IF NOT EXISTS idx_invoices_contrato  ON invoices(contrato_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vencimiento ON invoices(fecha_vencimiento);

-- ── INVENTARIO ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id                VARCHAR(255) PRIMARY KEY,
  tipo              VARCHAR(30)
                    CHECK (tipo IN ('sim','modem','equipo','accesorio','uniforme','carpeta','anexo')),
  descripcion       VARCHAR(500),
  serie             VARCHAR(255),
  numero            VARCHAR(255),
  estado            VARCHAR(30) DEFAULT 'disponible'
                    CHECK (estado IN ('disponible','asignado','dañado','en_reparacion','baja')),
  cliente_nombre    VARCHAR(255),
  contrato_id       VARCHAR(255) REFERENCES contracts(id) ON DELETE SET NULL,
  asignado_a        VARCHAR(255),
  talla             VARCHAR(20),
  almacen           VARCHAR(255),
  precio_costo      NUMERIC(10,2) DEFAULT 0,
  fecha_ingreso     DATE,
  fecha_asignacion  DATE,
  notas             TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_tipo   ON inventory(tipo);
CREATE INDEX IF NOT EXISTS idx_inventory_estado ON inventory(estado);

-- ── GASTOS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id          VARCHAR(255) PRIMARY KEY,
  user_id     VARCHAR(255),
  amount      NUMERIC(10,2) NOT NULL,
  category    VARCHAR(100),
  description TEXT,
  date        DATE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ── AUDIT LOG ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id             VARCHAR(255) PRIMARY KEY,
  usuario_uid    VARCHAR(255),
  usuario_email  VARCHAR(255),
  accion         VARCHAR(255),
  modulo         VARCHAR(100),
  detalles       JSONB,
  ts             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_uid);
CREATE INDEX IF NOT EXISTS idx_audit_modulo  ON audit_log(modulo);
CREATE INDEX IF NOT EXISTS idx_audit_ts      ON audit_log(ts DESC);

-- ── NOTIFICACIONES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           VARCHAR(255) PRIMARY KEY,
  tipo         VARCHAR(20) CHECK (tipo IN ('info','warning','error','success')),
  titulo       VARCHAR(500),
  mensaje      TEXT,
  modulo       VARCHAR(100),
  referencia_id VARCHAR(255),
  leida        BOOLEAN DEFAULT FALSE,
  para_roles   TEXT[],
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_leida     ON notifications(leida);
CREATE INDEX IF NOT EXISTS idx_notif_created   ON notifications(created_at DESC);

-- ── ADELANTOS NÓMINA ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advances (
  id             VARCHAR(255) PRIMARY KEY,
  agente_id      VARCHAR(255),
  agente_nombre  VARCHAR(255),
  monto          NUMERIC(10,2),
  motivo         TEXT,
  estado         VARCHAR(20) DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','aprobado','rechazado','pagado')),
  fecha_pago     DATE,
  notas          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_advances_agente ON advances(agente_id);
CREATE INDEX IF NOT EXISTS idx_advances_estado ON advances(estado);

-- ── Registrar esta migración ──────────────────────────────────────────────────
INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Schema inicial completo: users, ventas, clientes_seguimiento, contratos, facturas, inventario, gastos, audit_log, notificaciones, adelantos')
ON CONFLICT (version) DO NOTHING;
