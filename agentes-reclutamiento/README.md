# 🤖 Agentes de Reclutamiento — Heavenly Dreams

Carpeta con los assets para configurar y alimentar al bot de reclutamiento que opera en **WhatsApp** (sesión QR de Gisselle) y **Facebook Messenger**.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| [`prompt-agente-telmex.md`](prompt-agente-telmex.md) | Prompt del sistema (instrucción principal). Pégalo en el campo "AI Instructions" / "System Prompt" de tu plataforma (ManyChat, Wati, Chatbase, Botpress, OpenAI Assistants, etc.). |
| [`base-conocimiento.json`](base-conocimiento.json) | Base de conocimiento estructurada. Úsala para cargar FAQ, objeciones, datos de la vacante en un endpoint o como archivo de referencia que la IA lee dinámicamente. |
| `README.md` | Este archivo. |

## Cómo usar

### Opción 1 — Pegado directo (más rápido)
1. Abre tu plataforma de chatbot.
2. Copia todo el contenido de `prompt-agente-telmex.md` en el campo de instrucciones del sistema.
3. Reemplaza los `«…»` con datos reales (sueldos, links, direcciones).
4. Guarda y prueba con un mensaje de candidato.

### Opción 2 — Carga dinámica (más mantenible)
1. Sube `base-conocimiento.json` a tu backend o a una hoja de Google Sheets.
2. En cada conversación, inyecta el JSON como contexto del sistema antes del mensaje del usuario.
3. Cuando cambien promociones, edita solo el JSON — no toques el prompt.

### Opción 3 — Integración con HDreams Enterprise
1. Mueve esta carpeta a `server/data/recruiting-agent/`.
2. Crea un endpoint `GET /api/recruiting/knowledge-base` que devuelva el JSON.
3. El bot consume ese endpoint y la edición se hace desde el módulo TalentCRM.

## Mejora continua

- Cada lunes, Gisselle revisa la sección **C (FAQ)** y **D (Objeciones)** del prompt y agrega nuevas preguntas que aparecieron durante la semana.
- Cada vez que la IA responda mal, agrega un ejemplo correcto en `ejemplos_few_shot` del JSON.
- Registra métricas semanales: % conversión a entrevista, % asistencia, top objeciones.

## Pendientes antes de producción

- [ ] Definir esquema de comisiones exacto
- [ ] Confirmar si la capacitación es pagada
- [ ] Subir folleto, video, link de Calendly y Maps
- [ ] Probar flujo end-to-end con 5 candidatos reales
- [ ] Configurar escalamiento automático a Gisselle cuando el candidato pida persona real
