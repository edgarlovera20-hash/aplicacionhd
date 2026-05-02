#!/bin/bash

# Configuración de colores para logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando despliegue de Heavenly Dreams CRM a Producción...${NC}"

# 1. Obtener los últimos cambios
echo -e "${BLUE}📦 Actualizando repositorio...${NC}"
git pull origin main || { echo -e "${RED}❌ Error al actualizar repositorio${NC}"; exit 1; }

# 2. Instalar dependencias
echo -e "${BLUE}📦 Instalando dependencias de Node.js...${NC}"
npm install --omit=dev && npm install tsx || { echo -e "${RED}❌ Error al instalar dependencias${NC}"; exit 1; }

# 3. Construir el Frontend (React/Vite)
echo -e "${BLUE}🏗️ Construyendo el build de React...${NC}"
npm run build || { echo -e "${RED}❌ Error en el build de React${NC}"; exit 1; }

# 4. Reiniciar PM2 para aplicar los cambios en el backend (server.ts)
echo -e "${BLUE}🔄 Gestionando servidor backend con PM2...${NC}"

# Verifica si PM2 ya está ejecutando el proceso
if pm2 show heavenly-dreams-crm > /dev/null 2>&1; then
    echo "Reiniciando proceso existente..."
    pm2 restart heavenly-dreams-crm --update-env
else
    echo "Iniciando proceso por primera vez..."
    # Usamos tsx para ejecutar el server.ts en producción
    NODE_ENV=production pm2 start "npx tsx server.ts" --name "heavenly-dreams-crm"
fi

# Guardar la lista de procesos de PM2 para que inicien con el sistema
pm2 save

# 5. Reiniciar Nginx
echo -e "${BLUE}🌐 Reiniciando Nginx...${NC}"
sudo systemctl restart nginx || echo -e "${RED}⚠️ No se pudo reiniciar Nginx (ignorar si no lo usas)${NC}"

echo -e "${GREEN}✅ ¡Despliegue completado con éxito!${NC}"
echo -e "${GREEN}🌍 Tu aplicación debería estar disponible en: http://206.189.187.124${NC}"

