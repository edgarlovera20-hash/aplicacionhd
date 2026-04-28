#!/bin/bash

echo "🚀 Iniciando despliegue de Heavenly Dreams CRM a Producción..."

# 1. Obtener los últimos cambios (Descomenta esto si usas Git)
# echo "📦 Obteniendo últimos cambios de Git..."
# git pull origin main

# 2. Instalar dependencias
echo "📦 Instalando dependencias de Node.js..."
npm install

# 3. Construir el Frontend (React/Vite)
echo "🏗️ Construyendo el build de React..."
npm run build

# 4. Reiniciar PM2 para aplicar los cambios en el backend (server.ts)
echo "🔄 Reiniciando servidor backend con PM2..."
# Verifica si PM2 ya está ejecutando el proceso
if pm2 show heavenly-dreams-crm > /dev/null; then
    echo "Reiniciando proceso existente..."
    pm2 restart heavenly-dreams-crm --update-env
else
    echo "Iniciando proceso por primera vez..."
    NODE_ENV=production pm2 start tsx --name "heavenly-dreams-crm" -- server.ts
fi

# Guardar la lista de procesos de PM2
pm2 save

# 5. Reiniciar Nginx (opcional, por si hubo cambios en la configuración)
echo "🌐 Reiniciando Nginx..."
sudo systemctl restart nginx

echo "✅ ¡Despliegue completado con éxito! Tu aplicación está en producción."
