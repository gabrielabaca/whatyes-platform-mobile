# Configuración de Variables de Entorno para la API

## Problema
Cuando usas la app desde un dispositivo físico (celular), no puedes conectarte a `localhost:8000` porque `localhost` se refiere al dispositivo mismo, no a tu computadora donde corre el servidor.

## Solución
Usa la IP de red local de tu computadora en lugar de `localhost`.

## Pasos para Configurar

### 1. Obtener tu IP de Red

**Opción A: Usar el script (recomendado)**
```bash
./scripts/get-network-ip.sh
```

**Opción B: Manualmente**

En macOS/Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

En Windows:
```bash
ipconfig | findstr IPv4
```

### 2. Crear archivo .env

Usa la plantilla con todas las keys (users + livestream):
```bash
cp env/.env_main .env
```

### 3. Configurar las IP en .env

Edita el archivo `.env` y reemplaza las IP con la de tu máquina:
```env
API_BASE_URL_DEV=http://TU_IP:4000
LIVESTREAM_HTTP_URL_DEV=http://TU_IP:8080
```

Ejemplo (service-users en 4000, livestream en 8080):
```env
API_BASE_URL_DEV=http://192.168.1.51:4000
LIVESTREAM_HTTP_URL_DEV=http://192.168.1.51:8080
```

### 4. Reiniciar Metro Bundler

Después de cambiar el archivo `.env`, reinicia Metro:
```bash
npm start -- --reset-cache
```

### 5. Recompilar la app

```bash
npm run android
# o
npm run ios
```

## Notas Importantes

- El archivo `.env` está en `.gitignore` y no se sube al repositorio
- Si cambias de red (WiFi), necesitarás actualizar la IP en `.env`
- Para producción, usa `API_BASE_URL` en lugar de `API_BASE_URL_DEV`

## Verificación

Para verificar que está funcionando, revisa los logs de la app. Deberías ver requests a la IP configurada en lugar de `localhost`.
