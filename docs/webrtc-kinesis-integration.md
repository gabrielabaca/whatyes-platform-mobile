# Integración Kinesis Video WebRTC en la app

El backend (service-platform) crea un **canal de señalización WebRTC** al ir en vivo y expone credenciales en `GET /stream/webrtc-credentials?room_id=&role=master|viewer` (incluye `signaling_endpoint` e `ice_servers`).

## Estado actual

- **Seller (Master):** Envío **solo por WebRTC**. Implementación en JS con `amazon-kinesis-video-streams-webrtc` + `react-native-webrtc`: el backend devuelve `signaling_endpoint` y las credenciales se usan para firmar la conexión WSS y enviar video/audio desde `getUserMedia`. No hay fallback a PutMedia/ingest.
- **Viewer:** Consumo **solo por WebRTC**. Implementación en JS en `src/services/KinesisWebRTCViewer.ts`: se conecta como VIEWER con un `clientId` único, envía SDP offer, recibe SDP answer e ICE del Master y muestra el stream remoto en `RTCView` (react-native-webrtc). No hay fallback a HLS.

## Flujo

- **Streamer (Master):** `getWebRTCCredentials(token, roomId, 'master')` → con `channel_arn` y credenciales, conectar como **Master** y enviar video (cámara).
- **Viewer:** `getWebRTCCredentials(token, roomId, 'viewer')` → conectar como **Viewer** y recibir el stream; renderizar en `RTCView` (react-native-webrtc).

## Android

1. **SDK:** [amazon-kinesis-video-streams-webrtc-sdk-android](https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-android). Incluye modo Master (enviar) y Viewer (recibir).
2. **Credenciales:** Usar `StreamWebRTCCredentialsResponse` (channel_arn, access_key_id, secret_access_key, session_token, region). Construir un `AWSCredentialsProvider` con esas credenciales temporales (p. ej. `BasicSessionCredentials`).
3. **Módulo nativo:** Crear un módulo (similar a `KinesisVideoModule.kt` pero usando el SDK WebRTC):
   - **Master:** `startWebRTCMaster(creds)` → inicia captura de cámara y envía por WebRTC al canal.
   - **Viewer:** `startWebRTCViewer(creds)` → se conecta al canal y expone el stream (Surface o texture) para que React Native lo muestre en un `RTCView`.
4. **APIs AWS:** Con las credenciales temporales, el SDK llama a `GetSignalingChannelEndpoint`, `GetIceServerConfig` y luego `ConnectAsMaster` / `ConnectAsViewer`. El backend ya entrega permisos IAM correctos vía STS.

## iOS

- SDK equivalente: [amazon-kinesis-video-streams-webrtc-sdk-ios](https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-ios). Mismo flujo: credenciales desde `getWebRTCCredentials`, conectar como Master o Viewer.

## Cambios en pantallas

- **SellerStreamScreen:** En lugar de `getIngestCredentials` + `startKinesisStream` (Producer SDK), usar `getWebRTCCredentials(token, roomId, 'master')` y llamar al nuevo `startWebRTCMaster(creds)`. Al salir, `stopWebRTCMaster()`.
- **StreamScreen:** En lugar de `getStreamUrl` + `<Video source={{ uri: hlsUrl }} />`, usar `getWebRTCCredentials(token, roomId, 'viewer')` y `startWebRTCViewer(creds)` mostrando el stream en un `RTCView` (react-native-webrtc).

## API ya disponible

- `getWebRTCCredentials(accessToken, roomId, 'master' | 'viewer')` en `platformApi.ts`.
- Tipo `StreamWebRTCCredentialsResponse`: channel_arn, access_key_id, secret_access_key, session_token, region, role, expires_at_epoch_seconds.

Cuando el módulo nativo WebRTC (Master/Viewer) esté implementado, basta con cambiar SellerStreamScreen y StreamScreen para usar estas credenciales y el nuevo bridge en lugar de ingest/HLS.
