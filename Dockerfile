# ─────────────────────────────────────────────────────────────────
# STAGE 1 — builder: instala TODO, compila frontend (Vite) y backend (esbuild)
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar TODAS las dependencias (incl. devDeps para build)
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar frontend con Vite
RUN npm run build

# Compilar backend con esbuild (mucho más rápido que tsc, bundle único)
# --bundle: empaqueta todas las importaciones en un solo archivo
# --platform=node: target Node.js (no browser)
# --external:pg-native: excluir binarios nativos que no se pueden bundlear
# --sourcemap: mapas de fuente para debugging en producción
# --format=cjs + .cjs extension: evita conflicto con "type":"module" en package.json
# Node.js trata .cjs siempre como CommonJS, independientemente del campo type
RUN npx esbuild server.ts \
      --bundle \
      --platform=node \
      --target=node20 \
      --format=cjs \
      --outfile=dist/server.cjs \
      --external:pg-native \
      --external:fsevents \
      --external:@aws-sdk/client-s3 \
      --external:whatsapp-web.js \
      --external:puppeteer \
      --external:puppeteer-core \
      --sourcemap

# ─────────────────────────────────────────────────────────────────
# STAGE 2 — runner: imagen final, solo lo necesario para correr
# ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Solo dependencias de producción (imagen más pequeña, sin devDeps)
COPY package*.json ./
RUN npm ci --omit=dev

# Frontend compilado
COPY --from=builder /app/build ./build

# Backend compilado (bundle único, no necesita tsx ni tsc en runtime)
COPY --from=builder /app/dist ./dist
# Copiar únicamente los archivos necesarios para el servidor
COPY server.ts ./
COPY tsconfig.json ./
COPY src/ ./src/

# Migraciones SQL (leídas en runtime por migrate.ts vía process.cwd())
COPY --from=builder /app/migrations ./migrations

# Puerto expuesto
EXPOSE 3000

# Variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# Health check para orchestradores
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Arrancar con node puro — sin tsx, sin compilación en runtime
CMD ["node", "dist/server.cjs"]
