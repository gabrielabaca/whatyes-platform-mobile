/**
 * Master WebRTC para Kinesis Video Streams (solo envío).
 * Usa el SDK amazon-kinesis-video-streams-webrtc y react-native-webrtc.
 */
import { SignalingClient, Role } from 'amazon-kinesis-video-streams-webrtc';
import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';
import type { StreamWebRTCCredentialsResponse } from '../api/platformApi';

let signalingClient: SignalingClient | null = null;
let peerConnectionsByClientId: Record<string, RTCPeerConnection> = {};
let localStream: MediaStream | null = null;
let cleanupRef: (() => void) | null = null;

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

export type MasterOptions = {
  onLocalStream?: (stream: MediaStream) => void;
};

export async function startKinesisWebRTCMasterJS(
  creds: StreamWebRTCCredentialsResponse,
  options: MasterOptions = {}
): Promise<() => void> {
  if (!creds.signaling_endpoint) {
    throw new Error('Falta signaling_endpoint en las credenciales WebRTC');
  }

  if (signalingClient) {
    stopKinesisWebRTCMasterJS();
  }

  const credentials = {
    accessKeyId: creds.access_key_id,
    secretAccessKey: creds.secret_access_key,
    sessionToken: creds.session_token || undefined,
  };

  const client = new SignalingClient({
    role: Role.MASTER,
    channelARN: creds.channel_arn,
    region: creds.region,
    channelEndpoint: creds.signaling_endpoint,
    credentials,
  });
  signalingClient = client;
  console.log('[Seller WebRTC] SignalingClient creado, obteniendo cámara/mic...');

  localStream = await mediaDevices.getUserMedia({
    video: { width: 1280, height: 720, frameRate: 30, facingMode: 'user' },
    audio: true,
  });
  console.log('[Seller WebRTC] Local stream obtenido:', localStream.getTracks().map(t => t.kind));
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = true;
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

      const tracks = localStream?.getTracks() ?? [];
      tracks.forEach((track) => pc.addTrack(track, localStream!));
      console.log('[Seller WebRTC] Enviando video al viewer:', senderClientId, 'tracks:', tracks.length);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
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

  client.on('error', (err: Error) => {
    console.warn('Kinesis SignalingClient error:', err);
  });

  client.on('close', () => {
    Object.values(peerConnectionsByClientId).forEach((pc) => pc.close());
    peerConnectionsByClientId = {};
  });

  client.open();

  const cleanup = () => {
    client.close();
    signalingClient = null;
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
    Object.values(peerConnectionsByClientId).forEach((pc) => pc.close());
    peerConnectionsByClientId = {};
    if (cleanupRef === cleanup) cleanupRef = null;
  };
  cleanupRef = cleanup;
  return cleanup;
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
