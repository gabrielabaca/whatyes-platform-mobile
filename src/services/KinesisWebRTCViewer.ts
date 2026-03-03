/**
 * Viewer WebRTC para Kinesis Video Streams (solo recepción).
 * Usa el SDK amazon-kinesis-video-streams-webrtc y react-native-webrtc.
 */
import { RTCPeerConnection, MediaStream } from 'react-native-webrtc';
import type { StreamWebRTCCredentialsResponse } from '../api/platformApi';
import { SigV4RequestSigner } from './SigV4RequestSigner';

let signalingClient: SignalingClient | null = null;
let peerConnection: RTCPeerConnection | null = null;
let remoteStream: MediaStream | null = null;
let onRemoteStream: ((stream: MediaStream) => void) | null = null;
let cleanupRef: (() => void) | null = null;

const VIEWER_CLIENT_ID_PREFIX = 'viewer-';

function getIceServers(creds: StreamWebRTCCredentialsResponse): RTCConfiguration['iceServers'] {
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.kinesisvideo.us-east-1.amazonaws.com:443' }];
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

function ensureRemoteAudioEnabled(stream: MediaStream) {
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
    console.log('[Viewer WebRTC] Audio track remoto:', {
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    });
  });
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

  if (signalingClient) {
    stopKinesisWebRTCViewerJS();
  }

  onRemoteStream = callback;
  let closed = false;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const clearCloseTimer = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const notifyClose = (reason: string) => {
    if (closed) return;
    closed = true;
    clearCloseTimer();
    console.log('[Viewer WebRTC] Cerrando viewer:', reason);
    onClose?.(reason);
  };

  const clientId = VIEWER_CLIENT_ID_PREFIX + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  const credentials = {
    accessKeyId: creds.access_key_id,
    secretAccessKey: creds.secret_access_key,
    sessionToken: creds.session_token || undefined,
  };

  const requestSigner = new SigV4RequestSigner(creds.region, {
    accessKeyId: creds.access_key_id,
    secretAccessKey: creds.secret_access_key,
    sessionToken: creds.session_token || undefined,
  });

  const client = new SignalingClient({
    role: Role.VIEWER,
    clientId,
    channelARN: creds.channel_arn,
    region: creds.region,
    channelEndpoint: creds.signaling_endpoint,
    credentials,
    requestSigner,
  });
  signalingClient = client;

  const iceServers = getIceServers(creds);

  client.on('open', async () => {
    try {
      console.log('[Viewer WebRTC] Canal abierto, creando peer connection...');
      const pc = new RTCPeerConnection({ iceServers });
      peerConnection = pc;

      // En algunos entornos e.streams viene vacío; usar e.track y acumular en un stream
      const tracksReceived: MediaStreamTrack[] = [];
      pc.ontrack = (e: RTCTrackEvent) => {
        const track = e.track;
        console.log('[Viewer WebRTC] ontrack:', track.kind, 'streams:', e.streams?.length ?? 0);
        if (e.streams?.[0]) {
          remoteStream = e.streams[0];
          console.log('[Viewer WebRTC] Stream recibido (e.streams[0]), tracks:', remoteStream.getTracks().length);
          ensureRemoteAudioEnabled(e.streams[0]);
          onRemoteStream?.(e.streams[0]);
        } else if (track) {
          tracksReceived.push(track);
          const stream = new MediaStream(tracksReceived);
          remoteStream = stream;
          console.log('[Viewer WebRTC] Stream construido desde tracks:', tracksReceived.length);
          ensureRemoteAudioEnabled(stream);
          onRemoteStream?.(stream);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          console.log('[Viewer WebRTC] Enviando ICE candidate.');
          client.sendIceCandidate(e.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[Viewer WebRTC] connectionState:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          clearCloseTimer();
        }
        if (pc.connectionState === 'disconnected') {
          clearCloseTimer();
          closeTimer = setTimeout(() => notifyClose('peer_connection_disconnected'), 3000);
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          notifyClose(`peer_connection_${pc.connectionState}`);
        }
      };
      pc.oniceconnectionstatechange = () => {
        console.log('[Viewer WebRTC] iceConnectionState:', pc.iceConnectionState);
        if ((pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') && !remoteStream) {
          tryEmitRemoteStreamFromReceivers(pc);
        }
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          notifyClose(`ice_connection_${pc.iceConnectionState}`);
        }
      };

      // Importante: declarar que el viewer quiere recibir audio/video
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      console.log('[Viewer WebRTC] Transceivers recvonly añadidos.');

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      client.sendSdpOffer(offer);
      console.log('[Viewer WebRTC] SDP Offer enviada.');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      console.warn('Kinesis WebRTC Viewer createOffer error:', err);
    }
  });

  /** Obtiene el stream remoto desde getReceivers() (ontrack a veces no se dispara en RN). */
  function tryEmitRemoteStreamFromReceivers(pc: RTCPeerConnection) {
    if (remoteStream) return;
    const receivers = pc.getReceivers();
    const tracks = receivers
      .map((r) => r.track)
      .filter((t): t is NonNullable<typeof t> => t != null);
    if (tracks.length > 0) {
      const stream = new MediaStream(tracks);
      remoteStream = stream;
      console.log('[Viewer WebRTC] Stream desde getReceivers(), tracks:', tracks.length);
      ensureRemoteAudioEnabled(stream);
      onRemoteStream?.(stream);
    }
  }

  client.on('sdpAnswer', async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection) return;
    try {
      console.log('[Viewer WebRTC] SDP Answer recibida, setRemoteDescription...');
      await peerConnection.setRemoteDescription(answer);
      console.log('[Viewer WebRTC] setRemoteDescription OK.');
      tryEmitRemoteStreamFromReceivers(peerConnection);
    } catch (e) {
      console.warn('[Viewer WebRTC] setRemoteDescription error:', e);
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  });

  client.on('iceCandidate', async (candidate: RTCIceCandidateInit) => {
    if (peerConnection) {
      try {
        console.log('[Viewer WebRTC] ICE candidate recibido.');
        await peerConnection.addIceCandidate(candidate);
      } catch (e) {
        console.warn('[Viewer WebRTC] addIceCandidate error:', e);
      }
    }
  });

  client.on('error', (err: Error) => {
    onError?.(err);
    console.warn('Kinesis SignalingClient error:', err);
    // Log extra debug to locate "slice of undefined"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any;
    console.warn('Kinesis SignalingClient error details:', {
      message: anyErr?.message,
      stack: anyErr?.stack,
      name: anyErr?.name,
      type: typeof anyErr,
    });
  });

  client.on('close', () => {
    peerConnection?.close();
    peerConnection = null;
    remoteStream = null;
    onRemoteStream = null;
    notifyClose('signaling_closed');
  });

  client.open();

  const cleanup = () => {
    closed = true;
    clearCloseTimer();
    client.close();
    signalingClient = null;
    peerConnection?.close();
    peerConnection = null;
    remoteStream = null;
    onRemoteStream = null;
    if (cleanupRef === cleanup) cleanupRef = null;
  };
  cleanupRef = cleanup;
  return cleanup;
}

export function stopKinesisWebRTCViewerJS(): void {
  if (cleanupRef) {
    cleanupRef();
    cleanupRef = null;
  }
}

export function isKinesisWebRTCViewerJSAvailable(creds: StreamWebRTCCredentialsResponse): boolean {
  return Boolean(creds.signaling_endpoint);
}
