#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# HDreams CRM — Deploy a Droplet Ubuntu 24.04 (DigitalOcean)
#
# Pre-requisitos: cloud-init ya corrió (docker + ufw + usuario deploy + swap).
# Asume que estás como root o con sudo.
#
# Uso:
#   sudo bash scripts/deploy-droplet.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; CYAN=$'\033[0;36m'; NC=$'\033[0m'
ok()    { echo -e "${GREEN}✓${NC} $1"; }
info()  { echo -e "${CYAN}▶${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1" >&2; }
title() { echo ""; echo -e "${CYAN}══════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════════════${NC}"; }

if [ "$EUID" -ne 0 ]; then
  err "Corre como root: sudo bash $0"
  exit 1
fi

APP_DIR=/opt/heavenly-dreams
REPO_URL="https://github.com/edgarlovera20-hash/aplicacionhd.git"
BRANCH="${BRANCH:-chore/production-hardening}"

# ── 1. Verificación de cloud-init ────────────────────────────────────────────
title "1/6 — Verificando que cloud-init terminó"
for cmd in docker git ufw curl openssl; do
  if ! command -v "$cmd" &>/dev/null; then
    err "$cmd no encontrado. Espera 2 min más para que cloud-init termine."
    exit 1
  fi
done
ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
ok "Git $(git --version | awk '{print $3}')"
if swapon --show | grep -q '/swapfile'; then
  ok "Swap: $(swapon --show=NAME,SIZE --noheadings | grep swapfile)"
else
  warn "Swap no encontrado — configurando 4 GB ahora"
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── 2. Repo ──────────────────────────────────────────────────────────────────
title "2/6 — Repo en $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  info "Repo ya existe. Actualizando rama $BRANCH..."
  git fetch --all --quiet
  git checkout "$BRANCH" --quiet
  git pull --quiet
  ok "Repo actualizado"
else
  echo ""
  warn "Repo privado. Necesitas un GitHub Personal Access Token (PAT)."
  warn "Crea uno en: https://github.com/settings/tokens?type=beta"
  warn "Permisos: solo Contents: Read en el repo edgarlovera20-hash/aplicacionhd"
  warn "(Deja vacío si el repo es público temporalmente.)"
  echo ""
  read -p "GitHub PAT (ghp_... o github_pat_...): " GH_PAT
  if [ -n "$GH_PAT" ]; then
    git clone -b "$BRANCH" \
      "https://$GH_PAT@github.com/edgarlovera20-hash/aplicacionhd.git" \
      "$APP_DIR" --quiet
  else
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR" --quiet
  fi
  chown -R deploy:deploy "$APP_DIR"
  cd "$APP_DIR"
  ok "Repo clonado en $APP_DIR"
fi

# ── 3. .env ──────────────────────────────────────────────────────────────────
title "3/6 — Configuración de .env"
ENV_FILE="$APP_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  warn ".env ya existe. ¿Re-generar? [y/N]"
  read -r RESP
  [[ ! "$RESP" =~ ^[Yy]$ ]] && info "Conservando .env. Saltando..."
fi

if [ ! -f "$ENV_FILE" ] || [[ "${RESP:-}" =~ ^[Yy]$ ]]; then
  info "Te pediré las API keys (Enter para saltar las opcionales)"
  echo ""

  POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 24)
  PASSWORD_SALT=$(openssl rand -hex 32)

  read -p "  ANTHROPIC_API_KEY (sk-ant-...): " ANTHROPIC_API_KEY
  read -p "  GEMINI_API_KEY [opcional]: " GEMINI_API_KEY || GEMINI_API_KEY=""
  read -p "  GEMINI_API_KEY_2 [opcional]: " GEMINI_API_KEY_2 || GEMINI_API_KEY_2=""
  read -p "  OPENAI_API_KEY [opcional]: " OPENAI_API_KEY || OPENAI_API_KEY=""
  echo ""
  read -p "  ¿Configurar Twilio para SMS/WhatsApp/llamadas? [y/N]: " TWILIO_YES
  if [[ "$TWILIO_YES" =~ ^[Yy]$ ]]; then
    read -p "    TWILIO_ACCOUNT_SID: " TWILIO_ACCOUNT_SID
    read -p "    TWILIO_AUTH_TOKEN: " TWILIO_AUTH_TOKEN
    read -p "    TWILIO_FROM_NUMBER (E.164, ej +5215512345678): " TWILIO_FROM_NUMBER
    read -p "    TWILIO_WHATSAPP_FROM (whatsapp:+...): " TWILIO_WHATSAPP_FROM
  fi

  cat > "$ENV_FILE" <<EOF
# Generado por scripts/deploy-droplet.sh el $(date -Iseconds)

# === Server ===
NODE_ENV=production
PORT=3000
HOST_PORT=80

# === Database (Postgres en docker compose) ===
POSTGRES_DB=hdreams_crm
POSTGRES_USER=hdreams_user
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgres://hdreams_user:$POSTGRES_PASSWORD@db:5432/hdreams_crm

# === Auth ===
PASSWORD_SALT=$PASSWORD_SALT

# === IA: Claude (primario) → Gemini (fallback) → OpenAI (último recurso) ===
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CLAUDE_TEXT_MODEL=claude-sonnet-4-6
CLAUDE_VISION_MODEL=claude-haiku-4-5
GEMINI_API_KEY=${GEMINI_API_KEY:-}
GEMINI_API_KEY_2=${GEMINI_API_KEY_2:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}

# === Twilio ===
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID:-}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN:-}
TWILIO_FROM_NUMBER=${TWILIO_FROM_NUMBER:-}
TWILIO_WHATSAPP_FROM=${TWILIO_WHATSAPP_FROM:-}
EOF
  chmod 600 "$ENV_FILE"
  chown deploy:deploy "$ENV_FILE"
  ok ".env creado con POSTGRES_PASSWORD y PASSWORD_SALT auto-generados"
fi

# ── 4. Build + start ─────────────────────────────────────────────────────────
title "4/6 — docker compose up (build puede tomar 3-5 min la primera vez)"
cd "$APP_DIR"
docker compose pull --quiet || true   # postgres image
docker compose up -d --build
ok "Containers levantados"

# ── 5. Healthcheck ───────────────────────────────────────────────────────────
title "5/6 — Esperando healthcheck"
sleep 10
HEALTHY=0
for i in $(seq 1 24); do
  if curl -fsS "http://localhost/health" >/dev/null 2>&1; then
    HEALTHY=1
    ok "App responde en /health (intento $i)"
    break
  fi
  warn "  Esperando app... ($i/24)"
  sleep 5
done
if [ "$HEALTHY" -eq 0 ]; then
  err "La app no responde después de 2 min. Revisa logs:"
  err "  docker compose logs --tail=50 app"
  exit 1
fi

# ── 6. Importar datos SIAC ───────────────────────────────────────────────────
title "6/6 — Importar datos SIAC (si el xlsx está en el repo)"
SIAC_FILE="$APP_DIR/EDGAR DAVID LOVERA JUAREZ.xlsx"
if [ -f "$SIAC_FILE" ]; then
  info "Encontrado: $(basename "$SIAC_FILE")"
  docker compose exec -T app node scripts/import-siac.mjs || warn "Importer falló (no crítico)"
else
  warn "$(basename "$SIAC_FILE") no está en el repo (probablemente excluido por .gitignore *.xlsx)"
  warn "Subí el xlsx con scp y vuelve a correr:"
  warn "  scp 'EDGAR*.xlsx' deploy@<IP>:$APP_DIR/"
  warn "  docker compose exec app node scripts/import-siac.mjs"
fi

# ── Reporte final ────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -fsS https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

title "DEPLOY OK"
echo -e "${GREEN}🎉 Heavenly Dreams CRM está corriendo${NC}"
echo ""
echo -e "${CYAN}URL:${NC}        http://$PUBLIC_IP"
echo -e "${CYAN}Health:${NC}     http://$PUBLIC_IP/health"
echo ""
echo -e "${CYAN}Comandos útiles (como deploy):${NC}"
echo "   ssh deploy@$PUBLIC_IP"
echo "   cd /opt/heavenly-dreams"
echo "   docker compose logs -f app       # ver logs en vivo"
echo "   docker compose restart            # reiniciar"
echo "   docker compose down               # apagar todo"
echo "   git pull && docker compose up -d --build  # actualizar"
echo ""
warn "Pendientes para producción real:"
warn "  • SSL/HTTPS (Caddy + Let's Encrypt) — necesitas dominio"
warn "  • Backups automáticos de Postgres a /backups o DO Spaces"
warn "  • Configurar las 7 sesiones de WhatsApp (escanear QR)"
echo ""
