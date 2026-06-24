/**
 * Viewer WebRTC para Kinesis Video Streams (solo recepción).
 * Usa el SDK amazon-kinesis-video-streams-webrtc y react-native-webrtc.
 *
 * Aislamiento por sesión: el feed de swipe monta/desmonta viewers en rápida sucesión.
 * Cada `start` crea una ViewerSession con una generación incremental; los callbacks y el
 * cleanup verifican su generación antes de tocar el estado o emitir, de modo que el cierre
 * tardío de una sesión vieja nunca afecte a la sesión activa nueva.
 */
import { RTCPeerConnection, MediaStream } from 'react-native-webrtc';
import type { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';
import type { StreamWebRTCCredentialsResponse } from '../api/platformApi';
import { formatSignalingError } from './signalingError';
import { SigV4RequestSigner } from './SigV4RequestSigner';
import { enableSpeakerphone } from '../utils/audioRoute';

interface ViewerSession {
  generation: number;
  signalingClient: SignalingClient | null;
  peerConnection: RTCPeerConnection | null;
  remoteStream: MediaStream | null;
  onRemoteStream: ((stream: MediaStream) => void) | null;
  closed: boolean;
  closeTimer: ReturnType<typeof setTimeout> | null;
  speakerTimers: ReturnType<typeof setTimeout>[];
}

/** Sesión actualmente vigente. Una sesión vieja se reconoce porque `generation !== generationCounter`. */
let activeSession: ViewerSession | null = null;
let generationCounter = 0;

const VIEWER_CLIENT_ID_PREFIX = 'viewer-';

/** true si esta sesión sigue siendo la vigente (no fue reemplazada por un start posterior). */
function isCurrent(session: ViewerSession): boolean {
  return session.generation === generationCounter && !session.closed;
}

function clearSpeakerTimers(session: ViewerSession): void {
  session.speakerTimers.forEach(clearTimeout);
  session.speakerTimers = [];
}

/** WebRTC (sobre todo en iOS) vuelve a fijar la sesión de audio al negociar; repetimos el altavoz. */
function enforceSpeakerAfterWebRtcPulse(session: ViewerSession): void {
  if (!isCurrent(session)) return;
  enableSpeakerphone();
  clearSpeakerTimers(session);
  const delaysMs = [80, 250, 700, 1600, 3200];
  session.speakerTimers = delaysMs.map((ms) =>
    setTimeout(() => {
      if (isCurrent(session)) enableSpeakerphone();
    }, ms)
  );
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

function ensureRemoteAudioEnabled(session: ViewerSession, stream: MediaStream) {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    console.log('[Viewer WebRTC] Stream sin audio tracks.');
    return;
  }
  audioTracks.forEach((track) => {
    track.enabled = true;
    // API custom de react-native-webrtc para volumen de audio
    if (typeof track._setVolume === 'function') {
      track._setVolume(1.0);
    }
  });
  enforceSpeakerAfterWebRtcPulse(session);
}

/** Cierra una sesión y libera sus recursos. Si es la sesión activa, limpia la referencia global. */
function closeSession(session: ViewerSession): void {
  session.closed = true;
  clearSpeakerTimers(session);
  if (session.closeTimer) {
    clearTimeout(session.closeTimer);
    session.closeTimer = null;
  }
  try {
    session.signalingClient?.close();
  } catch {
    // ignore
  }
  session.signalingClient = null;
  try {
    session.peerConnection?.close();
  } catch {
    // ignore
  }
  session.peerConnection = null;
  session.remoteStream = null;
  session.onRemoteStream = null;
  if (activeSession === session) {
    activeSession = null;
  }
}

export type ViewerOptions = {
  creds: StreamWebRTCCredentialsResponse;
  onRemoteStream: (stream: MediaStream) => void;
  onError?: (err: Error) => void;
  onClose?: (reason: string) => void;
};

export async function startKinesisWebRTCViewerJS(
  options: ViewerOptions
): Promise<() => void> {
  const { creds, onRemoteStream: callback, onError, onClose } = options;
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

  // Cerrar cualquier sesión previa antes de abrir una nueva (solo un viewer a la vez).
  if (activeSession) {
    closeSession(activeSession);
  }

  const session: ViewerSession = {
    generation: ++generationCounter,
    signalingClient: null,
    peerConnection: null,
    remoteStream: null,
    onRemoteStream: callback,
    closed: false,
    closeTimer: null,
    speakerTimers: [],
  };
  activeSession = session;

  const notifyClose = (reason: string) => {
    if (session.closed) return;
    if (!isCurrent(session)) return; // una sesión reemplazada no notifica cierre
    console.log('[Viewer WebRTC] Cerrando viewer:', reason);
    closeSession(session);
    onClose?.(reason);
  };

  const clientId =
    VIEWER_CLIENT_ID_PREFIX + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  const credentials = {
    accessKeyId: creds.access_key_id,
    secretAccessKey: creds.secret_access_key,
    sessionToken: creds.session_token || undefined,
  };

  const requestSigner = new SigV4RequestSigner(creds.region, credentials);

  const client = new SignalingClient({
    role: Role.VIEWER,
    clientId,
    channelARN: creds.channel_arn,
    region: creds.region,
    channelEndpoint: creds.signaling_endpoint,
    credentials,
    requestSigner,
  });
  session.signalingClient = client;

  const iceServers = getIceServers(creds);

  /** Obtiene el stream remoto desde getReceivers() (ontrack a veces no se dispara en RN). */
  const tryEmitRemoteStreamFromReceivers = (pc: RTCPeerConnection) => {
    if (session.remoteStream || !isCurrent(session)) return;
    const receivers = pc.getReceivers();
    const tracks = receivers
      .map((r) => r.track)
      .filter((t): t is NonNullable<typeof t> => t != null);
    if (tracks.length > 0) {
      const stream = new MediaStream(tracks);
      session.remoteStream = stream;
      console.log('[Viewer WebRTC] Stream desde getReceivers(), tracks:', tracks.length);
      ensureRemoteAudioEnabled(session, stream);
      session.onRemoteStream?.(stream);
    }
  };

  client.on('open', async () => {
    if (!isCurrent(session)) return;
    try {
      console.log('[Viewer WebRTC] Canal abierto, creando peer connection...');
      const pc = new RTCPeerConnection({ iceServers });
      session.peerConnection = pc;

      // En algunos entornos e.streams viene vacío; usar e.track y acumular en un stream
      const tracksReceived: MediaStreamTrack[] = [];
      pc.ontrack = (e: RTCTrackEvent) => {
        if (!isCurrent(session)) return;
        const track = e.track;
        console.log('[Viewer WebRTC] ontrack:', track.kind, 'streams:', e.streams?.length ?? 0);
        if (e.streams?.[0]) {
          session.remoteStream = e.streams[0];
          ensureRemoteAudioEnabled(session, e.streams[0]);
          session.onRemoteStream?.(e.streams[0]);
        } else if (track) {
          tracksReceived.push(track);
          const stream = new MediaStream(tracksReceived);
          session.remoteStream = stream;
          ensureRemoteAudioEnabled(session, stream);
          session.onRemoteStream?.(stream);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && isCurrent(session)) {
          client.sendIceCandidate(e.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        if (!isCurrent(session)) return;
        console.log('[Viewer WebRTC] connectionState:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          enforceSpeakerAfterWebRtcPulse(session);
          if (session.closeTimer) {
            clearTimeout(session.closeTimer);
            session.closeTimer = null;
          }
        }
        if (pc.connectionState === 'disconnected') {
          if (session.closeTimer) clearTimeout(session.closeTimer);
          session.closeTimer = setTimeout(
            () => notifyClose('peer_connection_disconnected'),
            3000
          );
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          notifyClose(`peer_connection_${pc.connectionState}`);
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (!isCurrent(session)) return;
        console.log('[Viewer WebRTC] iceConnectionState:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          enforceSpeakerAfterWebRtcPulse(session);
          if (!session.remoteStream) {
            tryEmitRemoteStreamFromReceivers(pc);
          }
        }
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          notifyClose(`ice_connection_${pc.iceConnectionState}`);
        }
      };

      // Importante: declarar que el viewer quiere recibir audio/video
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      if (!isCurrent(session)) return;
      await pc.setLocalDescription(offer);
      if (!isCurrent(session)) return;
      client.sendSdpOffer(offer);
      console.log('[Viewer WebRTC] SDP Offer enviada.');
    } catch (err) {
      if (!isCurrent(session)) return;
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      console.warn('Kinesis WebRTC Viewer createOffer error:', err);
    }
  });

  client.on('sdpAnswer', async (answer: RTCSessionDescriptionInit) => {
    if (!isCurrent(session) || !session.peerConnection) return;
    try {
      await session.peerConnection.setRemoteDescription(answer);
      if (!isCurrent(session)) return;
      enforceSpeakerAfterWebRtcPulse(session);
      tryEmitRemoteStreamFromReceivers(session.peerConnection);
    } catch (e) {
      console.warn('[Viewer WebRTC] setRemoteDescription error:', e);
      if (isCurrent(session)) {
        onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    }
  });

  client.on('iceCandidate', async (candidate: RTCIceCandidateInit) => {
    if (!isCurrent(session) || !session.peerConnection) return;
    try {
      await session.peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.warn('[Viewer WebRTC] addIceCandidate error:', e);
    }
  });

  client.on('error', (err: unknown) => {
    if (!isCurrent(session)) return;
    const message = formatSignalingError(err);
    onError?.(new Error(message));
    console.warn('Kinesis SignalingClient error:', message, err);
  });

  client.on('close', () => {
    // Solo relevante si esta sesión sigue vigente; si fue reemplazada, ignorar.
    if (!isCurrent(session)) return;
    notifyClose('signaling_closed');
  });

  client.open();

  return () => {
    closeSession(session);
  };
}

/** Detiene el viewer activo (acción explícita del viewer en pantalla). */
export function stopKinesisWebRTCViewerJS(): void {
  if (activeSession) {
    closeSession(activeSession);
  }
}

export function isKinesisWebRTCViewerJSAvailable(creds: StreamWebRTCCredentialsResponse): boolean {
  return Boolean(creds.signaling_endpoint);
}
