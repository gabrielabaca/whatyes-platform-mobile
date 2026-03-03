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

Usa la plantilla con todas las keys (users + platform):
```bash
cp env/.env_main .env
```

### 3. Configurar las IP en .env

Edita el archivo `.env` y reemplaza las IP con la de tu máquina:
```env
API_BASE_URL_DEV=http://TU_IP:4000
PLATFORM_HTTP_URL_DEV=http://TU_IP:8001
```

Ejemplo (service-users en 4000, service-platform en 8001):
```env
API_BASE_URL_DEV=http://192.168.1.51:4000
PLATFORM_HTTP_URL_DEV=http://192.168.1.51:8001
```

### 4. Recargar variables de entorno en Android

Con `react-native-config` las variables se incluyen en el build nativo. Si cambiaste el `.env`, **hay que hacer un build limpio** para que se usen las nuevas:

```bash
npm run android:clean
```

(O manualmente: `cd android && ./gradlew clean && cd ..` y luego `npm run android`.)

### 5. Reiniciar Metro (opcional)

Si además cambiaste código JS, reinicia Metro con caché limpia:
```bash
npm start -- --reset-cache
```

Luego en otra terminal:
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
