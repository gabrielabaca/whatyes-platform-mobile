/**
 * Bridge para Kinesis Video WebRTC (Master = broadcaster, Viewer = quien ve).
 * Prioridad: implementación en JS (SDK + react-native-webrtc) si hay signaling_endpoint;
 * si no, intenta módulo nativo Android.
 */
import { NativeModules, Platform } from 'react-native';
import type { StreamWebRTCCredentialsResponse } from '../api/platformApi';

const { KinesisWebRTC } = NativeModules;

export type KinesisWebRTCCreds = StreamWebRTCCredentialsResponse;

/** Inicia el envío de video como Master (broadcaster). Usa JS si hay signaling_endpoint, si no el módulo nativo. */
export type StartMasterOptions = {
  onLocalStream?: (stream: MediaStream) => void;
  initialFacingMode?: 'user' | 'environment';
};

export async function startKinesisWebRTCMaster(
  creds: KinesisWebRTCCreds,
  options: StartMasterOptions = {}
): Promise<void> {
  const {
    startKinesisWebRTCMasterJS,
    isKinesisWebRTCMasterJSAvailable,
  } = await import('../services/KinesisWebRTCMaster');
  if (isKinesisWebRTCMasterJSAvailable(creds)) {
    await startKinesisWebRTCMasterJS(creds, options);
    return;
  }
  if (Platform.OS === 'android' && KinesisWebRTC?.startMaster) {
    return KinesisWebRTC.startMaster(
      creds.channel_arn,
      creds.region,
      creds.access_key_id,
      creds.secret_access_key,
      creds.session_token || ''
    );
  }
  throw new Error('WebRTC Master no disponible: falta signaling_endpoint o módulo nativo');
}

/** Pausa/reanuda video y audio hacia viewers; el preview local del seller sigue activo. */
export async function setKinesisWebRTCMasterVideoEnabled(enabled: boolean): Promise<void> {
  const { setKinesisWebRTCMasterVideoEnabledJS } = await import('../services/KinesisWebRTCMaster');
  await setKinesisWebRTCMasterVideoEnabledJS(enabled);
}

/** Silencia o activa el micrófono del seller hacia viewers. */
export async function setKinesisWebRTCMasterMicMuted(muted: boolean): Promise<void> {
  const { setKinesisWebRTCMasterMicMutedJS } = await import('../services/KinesisWebRTCMaster');
  await setKinesisWebRTCMasterMicMutedJS(muted);
}

/** Alterna la cámara del stream local WebRTC (frontal / trasera). */
export async function switchKinesisWebRTCMasterCamera(
  facingMode: 'user' | 'environment',
): Promise<void> {
  const { switchKinesisWebRTCMasterCameraJS } = await import('../services/KinesisWebRTCMaster');
  await switchKinesisWebRTCMasterCameraJS(facingMode);
}

/** ID del VideoTrack local del master (si el stream está activo). */
export async function getKinesisWebRTCMasterVideoTrackId(): Promise<string | null> {
  const { getKinesisWebRTCMasterLocalVideoTrackId } = await import('../services/KinesisWebRTCMaster');
  return getKinesisWebRTCMasterLocalVideoTrackId();
}

/** Detiene el Master. */
export async function stopKinesisWebRTCMaster(): Promise<void> {
  const { stopKinesisWebRTCMasterJS } = await import('../services/KinesisWebRTCMaster');
  stopKinesisWebRTCMasterJS();
  if (Platform.OS === 'android' && KinesisWebRTC?.stopMaster) {
    return KinesisWebRTC.stopMaster();
  }
}

/** Inicia la recepción como Viewer. Usa JS si hay signaling_endpoint; si no, módulo nativo Android. */
export async function startKinesisWebRTCViewer(
  creds: KinesisWebRTCCreds,
  onRemoteStream: (stream: MediaStream) => void,
  onError?: (err: Error) => void,
  onClose?: (reason: string) => void
): Promise<() => void> {
  const {
    startKinesisWebRTCViewerJS,
    isKinesisWebRTCViewerJSAvailable,
  } = await import('../services/KinesisWebRTCViewer');
  if (isKinesisWebRTCViewerJSAvailable(creds)) {
    return startKinesisWebRTCViewerJS({ creds, onRemoteStream, onError, onClose });
  }
  if (Platform.OS === 'android' && KinesisWebRTC?.startViewer) {
    await KinesisWebRTC.startViewer(
      creds.channel_arn,
      creds.region,
      creds.access_key_id,
      creds.secret_access_key,
      creds.session_token || ''
    );
    return () => stopKinesisWebRTCViewer();
  }
  throw new Error('WebRTC Viewer no disponible: falta signaling_endpoint o módulo nativo');
}

/** Detiene el Viewer. */
export async function stopKinesisWebRTCViewer(): Promise<void> {
  const { stopKinesisWebRTCViewerJS } = await import('../services/KinesisWebRTCViewer');
  stopKinesisWebRTCViewerJS();
  if (Platform.OS === 'android' && KinesisWebRTC?.stopViewer) {
    return KinesisWebRTC.stopViewer();
  }
}

export const isKinesisWebRTCSupported =
  Platform.OS === 'android' && !!KinesisWebRTC?.startMaster && !!KinesisWebRTC?.startViewer;
