# Memory

## Me
Edgar Lovera, Developer / Tech Lead en Heavenly Dreams (promotor autorizado Telmex/Infinitum, CDMX).

## People
| Who | Role |
|-----|------|
| **Edgar** | Edgar David Lovera Juárez — owner/dev, administra toda la app |
| **Gisselle Arenas** | Agente de reclutamiento — usa el bot de WA para captar candidatos |
| **Agentes / Asesores** | Vendedores de campo que capturan solicitudes Telmex |
| **Supervisores** | Líderes de equipo, ven seguimiento de su equipo vía supervisor_id |

## Projects
| Name | What |
|------|------|
| **HDreams Enterprise** | CRM multirrol: ventas, reclutamiento, soporte, cobranza, nómina |
| **Seguimiento** | Módulo independiente (rol SEGUIMIENTO) — WA + morosos + tickets |
| **OCR** | Extracción de datos INE/CURP/comprobante con Gemini Vision |
| **PISA / Posteada** | Nomenclatura interna: venta "posteada" = confirmada en sistema Telmex (PISA) |

## Terms
| Term | Meaning |
|------|---------|
| **VT / folio VT** | Número de folio de venta (ej. VT-1234567890) |
| **Posteada** | Venta confirmada/validada en el sistema PISA de Telmex |
| **PISA** | Sistema interno de Telmex para validar ventas |
| **Moroso** | Cliente con pago vencido +30 días |
| **Domiciliada** | Pago domiciliado (débito automático) — da 6 meses extra streaming |
| **INE / CURP** | Documentos de identidad requeridos en captura de venta |
| **Comprobante** | Comprobante de domicilio (agua, luz, etc.) |
| **Beneficio activado** | Cliente activó cuenta Telmex + plataforma streaming |
| **SSE** | Server-Sent Events — canal de notificaciones en tiempo real |
| **MockDB** | Base de datos en memoria + JSON (.mockdb.json) — fallback cuando no hay PostgreSQL |
| **RBAC** | Role-Based Access Control — sistema de permisos por rol |
| **supervisor_id** | Campo en clientesSeguimiento que vincula cliente con su supervisor |

## Stack
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + Framer Motion
- **Backend:** Express.js (Node) — mismo proceso que sirve el SPA
- **DB:** PostgreSQL (prod) / MockDB JSON (dev/fallback)
- **IA:** Gemini 1.5 Flash (primario) → OpenAI GPT-4o-mini (fallback)
- **Build output:** `build/` (Vite) servido como static en prod

## Roles del sistema
| Rol | Acceso |
|-----|--------|
| GERENTE | Todo — dashboard ejecutivo, audit log, nómina, ajustes |
| ADMINISTRACION | Gestión + reportes (sin ajustes avanzados) |
| SUPERVISOR | Captura, validación, seguimiento de su equipo |
| VENDEDOR | Captura y validación propia |
| RECLUTADORA | Módulo TalentCRM + anuncios |
| SEGUIMIENTO | Vista independiente — Gestión de Clientes WA |

## Preferences
- Español mexicano en UI y mensajes de usuario
- Tailwind dark theme: zinc-900/950 base, glass-card con backdrop-blur
- Notificaciones: SSE primario, polling 30s como fallback
- Sin librerías externas pesadas si se puede hacer en vanilla/inline
- Build siempre debe pasar `npx tsc --noEmit` antes de considerar listo
