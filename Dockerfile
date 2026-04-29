# ─────────────────────────────────────────────────────────────────
# STAGE 1 — builder: instala TODO y compila el frontend con Vite
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar TODAS las dependencias (incl. devDeps para build)
COPY package*.json ./
RUN npm ci

# Copiar código fuente y construir el frontend
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────
# STAGE 2 — runner: imagen final, sin devDeps ni código fuente de build
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Sólo dependencias de producción (omite devDeps para imagen más pequeña)
COPY package*.json ./
RUN npm ci --omit=dev

# Traer el frontend compilado del stage anterior
COPY --from=builder /app/build ./build

# Copiar únicamente los archivos necesarios para el servidor
COPY server.ts ./
COPY tsconfig.json ./
COPY src/ ./src/

# tsx es necesario en runtime para ejecutar server.ts directamente
# Ya está en dependencies así que npm ci lo instala
# Si se prefiere precompilar: RUN npx tsc server.ts --outDir dist-server
# y cambiar CMD a ["node", "dist-server/server.js"]

# Puerto expuesto (configurar PORT en env si se quiere otro)
EXPOSE 3000

# Variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# Health check para orchestradores (Kubernetes, ECS, Railway, etc.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Arrancar el servidor
CMD ["npx", "tsx", "server.ts"]
