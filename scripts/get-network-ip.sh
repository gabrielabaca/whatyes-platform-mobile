#!/bin/bash

# Script para obtener la IP de red local
# Útil para configurar API_BASE_URL_DEV en desarrollo

echo "Obteniendo IP de red local..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(hostname -I | awk '{print $1}')
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    IP=$(ipconfig | grep "IPv4" | awk '{print $14}' | head -1)
else
    echo "Sistema operativo no soportado"
    exit 1
fi

if [ -z "$IP" ]; then
    echo "No se pudo detectar la IP de red"
    exit 1
fi

echo "IP de red detectada: $IP"
echo ""
echo "Para usar esta IP en desarrollo, agrega al archivo .env:"
echo "API_BASE_URL_DEV=http://$IP:8000"
echo ""
echo "O ejecuta:"
echo "echo 'API_BASE_URL_DEV=http://$IP:8000' >> .env"
