#!/bin/bash

# Script para solucionar el error de AsyncStorage
# Ejecuta: bash fix-async-storage.sh

echo "🔧 Solucionando error de AsyncStorage..."
echo ""

# Detectar el sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detectado: macOS/iOS"
    
    # Verificar si existe la carpeta ios
    if [ -d "ios" ]; then
        echo "📂 Navegando a carpeta iOS..."
        cd ios
        
        # Verificar si CocoaPods está instalado
        if command -v pod &> /dev/null; then
            echo "✅ CocoaPods encontrado"
            echo "📦 Instalando pods..."
            pod install
            
            if [ $? -eq 0 ]; then
                echo "✅ Pods instalados correctamente"
            else
                echo "❌ Error al instalar pods"
                exit 1
            fi
        else
            echo "⚠️  CocoaPods no está instalado"
            echo "📥 Instalando CocoaPods..."
            sudo gem install cocoapods
            echo "📦 Instalando pods..."
            pod install
        fi
        
        cd ..
    else
        echo "⚠️  Carpeta iOS no encontrada"
    fi
fi

# Limpiar caché de Metro
echo ""
echo "🧹 Limpiando caché de Metro..."
npm start -- --reset-cache &
METRO_PID=$!

echo ""
echo "✅ Proceso completado!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Detén Metro (Ctrl+C) si está corriendo"
echo "2. Para iOS: Abre ios/PlatformMobile.xcworkspace en Xcode y ejecuta"
echo "3. Para Android: Ejecuta 'npm run android'"
echo ""
echo "💡 Nota: La app ahora maneja el error sin crashear, pero los tokens"
echo "   no se guardarán hasta que AsyncStorage esté correctamente vinculado."

# Esperar un momento antes de terminar
sleep 2
