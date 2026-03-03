/**
 * API de service-platform (rooms + Kinesis, URL firmada HLS).
 * Todas las llamadas requieren Authorization: Bearer <accessToken>.
 */

import { PLATFORM_HTTP_URL } from './config';

export interface PlatformRoom {
  uuid: string;
  name: string | null;
  stream_name: string | null;
  status: string;
  created_at: number;
}

export interface PlatformRoomResponse {
  uuid: string;
  name: string | null;
  stream_name: string | null;
  stream_arn: string | null;
  created_by_user_id: string;
  status: string;
  created_at: number;
  ended_at?: number | null;
}

export interface StreamUrlResponse {
  url: string;
  expires_in_seconds: number;
}

export interface StreamIngestCredentialsResponse {
  access_key_id: string;
  secret_access_key: string;
  session_token: string;
  stream_name: string;
  region: string;
  expires_at_epoch_seconds: number;
}

export interface IceServerItem {
  uris: string[];
  username?: string | null;
  password?: string | null;
}

export interface StreamWebRTCCredentialsResponse {
  channel_arn: string;
  access_key_id: string;
  secret_access_key: string;
  session_token: string;
  region: string;
  role: 'master' | 'viewer';
  expires_at_epoch_seconds: number;
  signaling_endpoint?: string | null;
  ice_servers?: IceServerItem[];
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * Lista salas en estado live (disponibles para ver).
 */
export async function getRooms(accessToken: string): Promise<PlatformRoom[]> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/rooms`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getRooms: ${res.status}`);
  const data = (await res.json()) as PlatformRoom[];
  return Array.isArray(data) ? data : [];
}

/**
 * Crea una room en estado draft (sin Kinesis stream).
 */
export async function createRoom(
  accessToken: string,
  name?: string | null
): Promise<PlatformRoomResponse> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/rooms`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(name != null ? { name } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `createRoom: ${res.status}`);
  }
  return res.json();
}

/**
 * Pasa la room de draft a live (crea el Kinesis stream).
 */
export async function goLive(
  accessToken: string,
  roomId: string
): Promise<PlatformRoomResponse> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/rooms/${roomId}/live`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `goLive: ${res.status}`);
  }
  return res.json();
}

/**
 * Finaliza el stream (room pasa a ended).
 */
export async function endStream(
  accessToken: string,
  roomId: string
): Promise<PlatformRoomResponse> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/rooms/${roomId}/end`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `endStream: ${res.status}`);
  }
  return res.json();
}

/**
 * Obtiene la URL firmada HLS para reproducir el stream de la room.
 */
export async function getStreamUrl(
  accessToken: string,
  roomId: string
): Promise<StreamUrlResponse> {
  const url = `${PLATFORM_HTTP_URL}/stream/url?room_id=${encodeURIComponent(roomId)}`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string | { code?: string; message?: string } };
    const d = err?.detail;
    const msg =
      typeof d === 'object' && d?.message
        ? d.message
        : typeof d === 'string'
          ? d
          : `getStreamUrl: ${res.status}`;
    const e = new Error(msg) as Error & { code?: string };
    if (typeof d === 'object' && d?.code) e.code = d.code;
    throw e;
  }
  return res.json();
}

/**
 * Credenciales AWS temporales para que la app envíe video a Kinesis (solo dueño de la room en LIVE).
 */
export async function getIngestCredentials(
  accessToken: string,
  roomId: string
): Promise<StreamIngestCredentialsResponse> {
  const url = `${PLATFORM_HTTP_URL}/stream/ingest-credentials?room_id=${encodeURIComponent(roomId)}`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `getIngestCredentials: ${res.status}`);
  }
  return res.json();
}

/**
 * Credenciales para Kinesis Video WebRTC. role=master (solo dueño), role=viewer (cualquier usuario).
 */
export async function getWebRTCCredentials(
  accessToken: string,
  roomId: string,
  role: 'master' | 'viewer'
): Promise<StreamWebRTCCredentialsResponse> {
  const url = `${PLATFORM_HTTP_URL}/stream/webrtc-credentials?room_id=${encodeURIComponent(roomId)}&role=${role}`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).detail || `getWebRTCCredentials: ${res.status}`);
  }
  return res.json();
}
