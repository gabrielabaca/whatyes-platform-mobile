/**
 * Fachada del bridge nativo de Amazon IVS Real-Time (Stages).
 *
 * Espejo del contrato de KinesisWebRTCNative: el seller publica una sola vez al
 * stage (AWS hace el fan-out) y los viewers se suscriben con su token. El video
 * se renderiza con las views nativas IvsLocalPreview / IvsRemoteVideo, que son
 * render puro: se attachan al device vigente del coordinator aunque se monten
 * después de que el stream haya llegado (la conexión vive en StreamScreen /
 * SellerStreamScreen, no en las views).
 */
import {
  DeviceEventEmitter,
  NativeEventEmitter,
  NativeModules,
  Platform,
  requireNativeComponent,
  type ViewProps,
} from 'react-native';

const { IvsStage } = NativeModules;

export type IvsConnectionState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export type IvsStageEvents = {
  onConnectionState?: (state: IvsConnectionState, error?: string) => void;
  onRemoteVideo?: (hasVideo: boolean, participantId?: string | null) => void;
  onError?: (error: string) => void;
};

export const isIvsStageSupported = !!IvsStage?.joinAsPublisher;

function assertAvailable(): void {
  if (!isIvsStageSupported) {
    throw new Error('IvsStage nativo no disponible (¿falta rebuild tras agregar el SDK?)');
  }
}

// iOS emite por RCTEventEmitter (NativeEventEmitter); Android por RCTDeviceEventEmitter.
const emitter =
  Platform.OS === 'ios' && IvsStage ? new NativeEventEmitter(IvsStage) : DeviceEventEmitter;

/** Suscribe listeners de estado del stage. Devuelve el unsubscribe. */
export function addIvsStageListeners(events: IvsStageEvents): () => void {
  const subs = [
    emitter.addListener(
      'IvsStage:connectionState',
      (payload: { state?: string; error?: string }) => {
        events.onConnectionState?.(
          (payload?.state as IvsConnectionState) || 'DISCONNECTED',
          payload?.error
        );
      }
    ),
    emitter.addListener(
      'IvsStage:remoteVideo',
      (payload: { hasVideo?: boolean; participantId?: string | null }) => {
        events.onRemoteVideo?.(!!payload?.hasVideo, payload?.participantId ?? null);
      }
    ),
    emitter.addListener('IvsStage:error', (payload: { error?: string }) => {
      if (payload?.error) events.onError?.(payload.error);
    }),
  ];
  return () => subs.forEach((s) => s.remove());
}

/** Publica cámara + micrófono del seller al stage (una sola subida; AWS distribuye). */
export async function joinIvsStageAsPublisher(
  token: string,
  options: { initialFacingMode?: 'user' | 'environment' } = {}
): Promise<void> {
  assertAvailable();
  await IvsStage.joinAsPublisher(token, options.initialFacingMode || 'user');
}

/** Se suscribe al stage como viewer (renderizar con <IvsRemoteVideoView/>).
 * Si el token corresponde al stage precalentado (startIvsStagePreview), el
 * nativo lo PROMUEVE sin reconectar: video instantáneo al swipear. */
export async function joinIvsStageAsViewer(token: string): Promise<void> {
  assertAvailable();
  await IvsStage.joinAsViewer(token);
}

/** Precalienta el stage del siguiente slide del feed (audio en gain 0). */
export async function startIvsStagePreview(token: string): Promise<void> {
  if (!isIvsStageSupported) return;
  await IvsStage.startPreview(token);
}

/** Suelta el stage precalentado (salir del feed / cambió el siguiente). */
export async function stopIvsStagePreview(): Promise<void> {
  if (!isIvsStageSupported) return;
  await IvsStage.stopPreview();
}

/** Audio del stage precalentado: el peek del home lo enciende mientras se
 * mantiene presionada la card; el warmup del swipe lo deja muteado. */
export async function setIvsPreviewAudioMuted(muted: boolean): Promise<void> {
  if (!isIvsStageSupported || !IvsStage.setPreviewAudioMuted) return;
  await IvsStage.setPreviewAudioMuted(muted);
}

/** Sale del stage (publisher o viewer) y libera devices. */
export async function leaveIvsStage(): Promise<void> {
  if (!isIvsStageSupported) return;
  await IvsStage.leave();
}

/** Pausa/reanuda el video hacia viewers (el preview local del seller sigue activo). */
export async function setIvsStageVideoEnabled(enabled: boolean): Promise<void> {
  assertAvailable();
  await IvsStage.setVideoMuted(!enabled);
}

/** Silencia o activa el micrófono del seller. */
export async function setIvsStageMicMuted(muted: boolean): Promise<void> {
  assertAvailable();
  await IvsStage.setMicMuted(muted);
}

/** Alterna la cámara del publisher (frontal / trasera). */
export async function switchIvsStageCamera(
  facingMode: 'user' | 'environment'
): Promise<void> {
  assertAvailable();
  await IvsStage.switchCamera(facingMode);
}

/** Silencia localmente el audio del publisher remoto (botón de mute del viewer). */
export async function setIvsRemoteAudioMuted(muted: boolean): Promise<void> {
  if (!isIvsStageSupported) return;
  await IvsStage.setRemoteAudioMuted(muted);
}

/** Preview local de la cámara del seller mientras publica al stage. */
export const IvsLocalPreviewView = requireNativeComponent<ViewProps>('IvsLocalPreview');

/** Video del publisher remoto (viewer suscripto al stage). */
export const IvsRemoteVideoView = requireNativeComponent<ViewProps>('IvsRemoteVideo');

/** Video del stage precalentado (slide siguiente del feed, sin audio). */
export const IvsPreviewVideoView = requireNativeComponent<ViewProps>('IvsPreviewVideo');
