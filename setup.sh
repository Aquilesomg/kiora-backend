#!/bin/bash

# =============================================================================
# Kiora Backend - Script de Configuración Inicial 🚀
# =============================================================================

set -e

echo "  _  _______  _____           "
echo " | |/ /_   _|/ ___ \  ____   "
echo " | ' /  | | | |   | ||  _ \  "
echo " | . \  | | | |___| || |_| | "
echo " |_|\_\_|___|\_____/ |_| |_| "
echo ""
echo "Configurando entorno de desarrollo..."

# 1. Verificar herramientas necesarias
command -v docker >/dev/null 2>&1 || { echo >&2 "❌ Docker no está instalado. Por favor instálalo para continuar."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo >&2 "❌ Docker Compose no está instalado."; exit 1; }

# 2. Buscar y copiar archivos .env.example
echo "📂 Buscando servicios y configurando archivos .env..."

SERVICES_DIR="./services"

if [ ! -d "$SERVICES_DIR" ]; then
    echo "❌ No se encontró el directorio /services. Asegúrate de ejecutar este script desde la raíz del proyecto."
    exit 1
fi

for service in "$SERVICES_DIR"/*/; do
    if [ -f "${service}.env.example" ]; then
        service_name=$(basename "$service")
        echo "  - Configurando $service_name..."
        
        # Crear .env.docker si no existe
        if [ ! -f "${service}.env.docker" ]; then
            cp "${service}.env.example" "${service}.env.docker"
            echo "    ✅ Creado .env.docker"
        else
            echo "    ⚠️  .env.docker ya existe, saltando."
        fi
        
        # Crear .env.local si no existe
        if [ ! -f "${service}.env.local" ]; then
            cp "${service}.env.example" "${service}.env.local"
            echo "    ✅ Creado .env.local"
        else
            echo "    ⚠️  .env.local ya existe, saltando."
        fi
    fi
done

echo ""
echo "🚀 ¡Configuración de archivos completada!"
echo "----------------------------------------------------------------------"
echo "⚠️  IMPORTANTE: Algunos servicios (como users-service) requieren que"
echo "   configures secretos manualmente en sus archivos .env (JWT_SECRET, SMTP, etc.)."
echo "----------------------------------------------------------------------"
echo ""
echo "Siguientes pasos:"
echo "1. Revisa y edita los archivos .env si es necesario."
echo "2. Ejecuta: docker compose up -d"
echo "3. Ejecuta las migraciones si es la primera vez (ver README.md)."
echo ""
echo "¡Listo para programar! 💻"
