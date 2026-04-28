-- ARCHIVO DE INICIALIZACIÓN DE BASE DE DATOS (PostgreSQL)
-- HEAVENLY DREAMS CRM - PRODUCTION READY

-- 1. EXTENSIONES (Para mejores búsquedas y seguridad)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE USUARIOS (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    usuario VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'asesor', -- 'gerente', 'administradora', 'reclutadora', 'supervisor', 'asesor', 'capacitacion'
    nombres VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255),
    telefono_celular VARCHAR(20),
    fecha_nacimiento DATE,
    supervisor_asignado VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE VENTAS / EXPEDIENTES
CREATE TABLE IF NOT EXISTS ventas (
    folio VARCHAR(255) PRIMARY KEY, -- Formato FOL-XXXXXX
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'en_validacion', 'aprobada', 'instalada', 'cancelada'
    tipo_cliente VARCHAR(50), -- 'linea_nueva', 'portado'
    tipo_servicio VARCHAR(50), -- 'residencial', 'negocio'
    paquete_nombre VARCHAR(255) NOT NULL,
    renta_mensual NUMERIC(10, 2) NOT NULL,
    
    -- Datos del Titular
    nombres VARCHAR(255) NOT NULL,
    apellido_paterno VARCHAR(255) NOT NULL,
    apellido_materno VARCHAR(255),
    curp VARCHAR(18) UNIQUE,
    telefono_titular VARCHAR(20) NOT NULL,
    correo VARCHAR(255),
    
    -- Datos del Expediente Digital (JSON para flexibilidad)
    data JSONB NOT NULL, 
    
    -- Auditoría
    asesor_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE RECLUTAMIENTO
CREATE TABLE IF NOT EXISTS candidatos (
    id SERIAL PRIMARY KEY,
    nombres VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    etapa VARCHAR(50) DEFAULT 'contacto_inicial', -- 'contacto_inicial', 'entrevista', 'capacitacion', 'contratado', 'descartado'
    fuente VARCHAR(100), -- 'facebook', 'volanteo', 'recomendacion', etc.
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. USUARIO MAESTRO INICIAL (GERENTE)
-- Contraseña por defecto: Admin123! (Debes cambiarla al ingresar)
-- Nota: El hash es ilustrativo, el sistema usará el hash real al registrar
INSERT INTO users (uid, email, usuario, password_hash, role, nombres, apellidos)
VALUES (
    'USR-MASTER-001', 
    'admin@hdreams.com', 
    'admin.master', 
    'Admin123!_hashed', 
    'gerente', 
    'Administrador', 
    'General'
) ON CONFLICT (email) DO NOTHING;

-- Índices para optimizar velocidad de búsqueda
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_ventas_curp ON ventas(curp);
