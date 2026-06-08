/**
 * Master WebRTC para Kinesis Video Streams (solo envío).
 * Usa el SDK amazon-kinesis-video-streams-webrtc y react-native-webrtc.
 */
import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';
import type { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';
import type { StreamWebRTCCredentialsResponse } from '../api/platformApi';
import { formatSignalingError } from './signalingError';
import { SigV4RequestSigner } from './SigV4RequestSigner';

let signalingClient: SignalingClient | null = null;
let peerConnectionsByClientId: Record<string, RTCPeerConnection> = {};
let localStream: MediaStream | null = null;
let cleanupRef: (() => void) | null = null;
let currentFacingMode: 'user' | 'environment' = 'user';
let onLocalStreamCallback: ((stream: MediaStream) => void) | null = null;
let isBroadcastPaused = false;
let isMicMutedByUser = false;
const peerSendersByClientId: Record<string, { video: RTCRtpSender; audio: RTCRtpSender }> = {};

function shouldSendAudio(): boolean {
  return !isBroadcastPaused && !isMicMutedByUser;
}

function setAudioTrackSendingEnabled(track: MediaStreamTrack | null, send: boolean): void {
  if (!track) return;
  track.enabled = send;
}

function syncLocalAudioTrackEnabled(): void {
  const send = shouldSendAudio();
  localStream?.getAudioTracks().forEach((track) => {
    setAudioTrackSendingEnabled(track, send);
  });
}

function resolvePeerSenders(pc: RTCPeerConnection, clientId?: string): {
  video: RTCRtpSender | null;
  audio: RTCRtpSender | null;
} {
  if (clientId && peerSendersByClientId[clientId]) {
    return peerSendersByClientId[clientId];
  }
  const senders = pc.getSenders();
  const video =
    senders.find((s) => s.track?.kind === 'video') ?? senders[0] ?? null;
  const audio =
    senders.find((s) => s.track?.kind === 'audio') ??
    senders.find((s) => s !== video) ??
    null;
  return { video, audio };
}

async function syncAudioSender(
  audioSender: RTCRtpSender,
  audioTrack: MediaStreamTrack,
): Promise<void> {
  const sendAudio = shouldSendAudio();

  if (sendAudio) {
    if (audioSender.track !== audioTrack) {
      await audioSender.replaceTrack(audioTrack);
    }
    setAudioTrackSendingEnabled(audioTrack, true);
    setAudioTrackSendingEnabled(audioSender.track, true);
    return;
  }

  // Pausa del vivo: desenlazar audio (mismo criterio que antes).
  if (isBroadcastPaused) {
    setAudioTrackSendingEnabled(audioTrack, false);
    setAudioTrackSendingEnabled(audioSender.track, false);
    await audioSender.replaceTrack(null);
    return;
  }

  // Micrófono silenciado: mantener el track enlazado y cortar con enabled=false.
  // replaceTrack(null) en iOS/RN no siempre deja de enviar audio a viewers nuevos.
  if (audioSender.track !== audioTrack) {
    await audioSender.replaceTrack(audioTrack);
  }
  setAudioTrackSendingEnabled(audioTrack, false);
  setAudioTrackSendingEnabled(audioSender.track, false);
}

async function syncBroadcastTracksOnPeer(
  pc: RTCPeerConnection,
  clientId?: string,
): Promise<void> {
  const videoTrack = localStream?.getVideoTracks()[0] ?? null;
  const audioTrack = localStream?.getAudioTracks()[0] ?? null;
  const { video: videoSender, audio: audioSender } = resolvePeerSenders(pc, clientId);

  if (videoSender && videoTrack && videoSender.track !== videoTrack) {
    await videoSender.replaceTrack(videoTrack);
  }
  if (audioSender && audioTrack) {
    await syncAudioSender(audioSender, audioTrack);
  }
  syncLocalAudioTrackEnabled();
}

function getIceServers(creds: StreamWebRTCCredentialsResponse): RTCConfiguration['iceServers'] {
  const servers: RTCIceServer[] = [
    { urls: `stun:stun.kinesisvideo.${creds.region}.amazonaws.com:443` },
  ];
  if (creds.ice_servers?.length) {
    creds.ice_servers.forEach((s) => {
      servers.push({
        urls: s.uris,
        username: s.username ?? undefined,
        credential: s.password ?? undefined,
      });
    });
  }
  return servers;
}

export type MasterOptions = {
  onLocalStream?: (stream: MediaStream) => void;
  initialFacingMode?: 'user' | 'environment';
};

export async function startKinesisWebRTCMasterJS(
  creds: StreamWebRTCCredentialsResponse,
  options: MasterOptions = {}
): Promise<() => void> {
  const { SignalingClient, Role } = await import('amazon-kinesis-video-streams-webrtc');
  if (!creds.signaling_endpoint) {
    throw new Error('Falta signaling_endpoint en las credenciales WebRTC');
  }
  const missing: string[] = [];
  if (!creds.access_key_id) missing.push('access_key_id');
  if (!creds.secret_access_key) missing.push('secret_access_key');
  if (!creds.region) missing.push('region');
  if (!creds.channel_arn) missing.push('channel_arn');
  if (missing.length > 0) {
    throw new Error(`Credenciales WebRTC inválidas (faltan: ${missing.join(', ')})`);
  }

  if (signalingClient) {
    stopKinesisWebRTCMasterJS();
  }

  const credentials = {
    accessKeyId: creds.access_key_id,
    secretAccessKey: creds.secret_access_key,
    sessionToken: creds.session_token || undefined,
  };

  const requestSigner = new SigV4RequestSigner(creds.region, credentials);

  const client = new SignalingClient({
    role: Role.MASTER,
    channelARN: creds.channel_arn,
    region: creds.region,
    channelEndpoint: creds.signaling_endpoint,
    credentials,
    requestSigner,
  });
  signalingClient = client;
  currentFacingMode = options.initialFacingMode ?? 'user';
  onLocalStreamCallback = options.onLocalStream ?? null;
  console.log('[Seller WebRTC] SignalingClient creado, obteniendo cámara/mic...');

  localStream = await mediaDevices.getUserMedia({
    video: { width: 1280, height: 720, frameRate: 30, facingMode: currentFacingMode },
    audio: true,
  });
  console.log('[Seller WebRTC] Local stream obtenido:', localStream.getTracks().map(t => t.kind));
  syncLocalAudioTrackEnabled();
  localStream.getAudioTracks().forEach((track) => {
    console.log('[Seller WebRTC] Audio track local:', {
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    });
  });
  options.onLocalStream?.(localStream);

  const iceServers = getIceServers(creds);

  client.on('open', () => {
    console.log('[Seller WebRTC] Canal de señalización abierto. Listo para recibir viewers.');
  });

  client.on('sdpOffer', async (offer: RTCSessionDescriptionInit, senderClientId: string) => {
    try {
      console.log('[Seller WebRTC] Viewer conectando, creando peer connection:', senderClientId);
      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionsByClientId[senderClientId] = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          client.sendIceCandidate(e.candidate, senderClientId);
        }
      };

      const videoTrack = localStream?.getVideoTracks()[0];
      const audioTrack = localStream?.getAudioTracks()[0];
      if (videoTrack) {
        pc.addTrack(videoTrack, localStream!);
      }
      if (audioTrack) {
        pc.addTrack(audioTrack, localStream!);
      }
      const senders = pc.getSenders();
      const videoSender =
        senders.find((s) => s.track?.kind === 'video') ?? senders[0];
      const audioSender =
        senders.find((s) => s.track?.kind === 'audio') ??
        senders.find((s) => s !== videoSender);
      if (videoSender && audioSender) {
        peerSendersByClientId[senderClientId] = { video: videoSender, audio: audioSender };
      }
      const trackCount = (videoTrack ? 1 : 0) + (audioTrack ? 1 : 0);
      console.log('[Seller WebRTC] Enviando al viewer:', senderClientId, 'tracks:', trackCount, {
        sendAudio: shouldSendAudio(),
        micMuted: isMicMutedByUser,
        paused: isBroadcastPaused,
      });
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      // Aplicar estado de mute/pausa DESPUÉS de completar la negociación SDP,
      // para que enabled=false se aplique sobre senders ya activos en el peer.
      await syncBroadcastTracksOnPeer(pc, senderClientId);
      client.sendSdpAnswer(answer, senderClientId);
      console.log('[Seller WebRTC] SDP Answer enviada al viewer:', senderClientId);
    } catch (err) {
      console.warn('[Seller WebRTC] sdpOffer error:', err);
    }
  });

  client.on('iceCandidate', async (candidate: RTCIceCandidateInit, senderClientId: string) => {
    const pc = peerConnectionsByClientId[senderClientId];
    if (pc) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn('addIceCandidate error:', e);
      }
    }
  });

  client.on('error', (err: unknown) => {
    console.warn('Kinesis SignalingClient error:', formatSignalingError(err), err);
  });

  client.on('close', () => {
    Object.values(peerConnectionsByClientId).forEach((pc) => pc.close());
    peerConnectionsByClientId = {};
    Object.keys(peerSendersByClientId).forEach((id) => delete peerSendersByClientId[id]);
  });

  client.open();

  const cleanup = () => {
    client.close();
    signalingClient = null;
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
    currentFacingMode = 'user';
    isBroadcastPaused = false;
    isMicMutedByUser = false;
    onLocalStreamCallback = null;
    Object.values(peerConnectionsByClientId).forEach((pc) => pc.close());
    peerConnectionsByClientId = {};
    Object.keys(peerSendersByClientId).forEach((id) => delete peerSendersByClientId[id]);
    if (cleanupRef === cleanup) cleanupRef = null;
  };
  cleanupRef = cleanup;
  return cleanup;
}

export async function switchKinesisWebRTCMasterCameraJS(
  facingMode: 'user' | 'environment',
): Promise<MediaStream | null> {
  if (!localStream || facingMode === currentFacingMode) {
    return localStream;
  }

  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return localStream;

  // Usar el capturador nativo (switchCamera) sin reemplazar tracks:
  // evita que RTCView quede con el último frame congelado.
  const settings = videoTrack.getSettings() as MediaTrackSettings;
  await videoTrack.applyConstraints({
    facingMode,
    width: settings.width ?? 1280,
    height: settings.height ?? 720,
    frameRate: settings.frameRate ?? 30,
  });

  currentFacingMode = facingMode;
  return localStream;
}

/** Pausa/reanuda la transmisión a viewers sin apagar el preview local del seller. */
export async function setKinesisWebRTCMasterVideoEnabledJS(enabled: boolean): Promise<void> {
  isBroadcastPaused = !enabled;
  await Promise.all(
    Object.entries(peerConnectionsByClientId).map(([clientId, pc]) =>
      syncBroadcastTracksOnPeer(pc, clientId),
    ),
  );
  syncLocalAudioTrackEnabled();
}

/** Silencia o activa el micrófono hacia viewers (no aplica si el vivo está pausado). */
export async function setKinesisWebRTCMasterMicMutedJS(muted: boolean): Promise<void> {
  isMicMutedByUser = muted;
  await Promise.all(
    Object.entries(peerConnectionsByClientId).map(([clientId, pc]) =>
      syncBroadcastTracksOnPeer(pc, clientId),
    ),
  );
  syncLocalAudioTrackEnabled();
}

export function stopKinesisWebRTCMasterJS(): void {
  if (cleanupRef) {
    cleanupRef();
    cleanupRef = null;
  }
}

export function isKinesisWebRTCMasterJSAvailable(creds: StreamWebRTCCredentialsResponse): boolean {
  return Boolean(creds.signaling_endpoint);
}

/** ID del VideoTrack local activo (para captura de cover desde el pipeline WebRTC). */
export function getKinesisWebRTCMasterLocalVideoTrackId(): string | null {
  const track = localStream?.getVideoTracks()[0];
  return track?.id ?? null;
}
