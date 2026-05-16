/**
 * API de service-platform (rooms + Kinesis WebRTC, catálogo de categorías).
 * Las llamadas requieren Authorization: Bearer <accessToken>.
 */

import { PLATFORM_HTTP_URL } from './config';
import type { InterestCategoryItem } from './types';
import { ApiError } from './authApi';
import { storage } from '../utils/storage';

/** Creador de la sala (enriquecido por service-platform vía service-users). */
export interface PlatformRoomCreator {
  uuid: string;
  name: string;
  last_name: string;
  email?: string | null;
  profile_picture?: string | null;
  user_type?: string | null;
}

export interface PlatformRoom {
  uuid: string;
  name: string | null;
  stream_name: string | null;
  status: string;
  created_at: number;
  created_by_user_id: string;
  /** UUIDs de categorías de interés asignadas a la sala */
  interest_category_uuids?: string[];
  /** Categorías resueltas (uuid, slug, label); viene en GET /rooms */
  interest_categories?: InterestCategoryItem[];
  creator?: PlatformRoomCreator | null;
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
  interest_category_uuids?: string[];
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

function normalizeInterestCategoriesResponse(raw: unknown): InterestCategoryItem[] {
  if (raw == null) {
    return [];
  }
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' &&
        raw !== null &&
        'data' in raw &&
        Array.isArray((raw as { data: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : [];
  const out: InterestCategoryItem[] = [];
  for (const item of list) {
    if (item == null || typeof item !== 'object') {
      continue;
    }
    const o = item as Record<string, unknown>;
    const uuidVal = o.uuid ?? o.id ?? o.category_uuid;
    const slugVal = o.slug ?? '';
    const labelVal = o.label ?? o.name ?? '';
    if (uuidVal == null || String(uuidVal).length === 0) {
      continue;
    }
    out.push({
      uuid: String(uuidVal),
      slug: String(slugVal),
      label: String(labelVal),
    });
  }
  return out;
}

/**
 * Catálogo de categorías (service-platform GET /interest-categories con Bearer).
 */
export async function getInterestCategories(): Promise<InterestCategoryItem[]> {
  const token = await storage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'No access token');
  }
  const url = `${PLATFORM_HTTP_URL}/interest-categories`;
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(token),
  });
  const text = await response.text();

  let parsed: unknown;
  try {
    parsed = text.length ? JSON.parse(text) : [];
  } catch {
    if (!response.ok) {
      throw new ApiError(response.status, text.slice(0, 200) || 'Error en la petición');
    }
    throw new ApiError(500, 'Respuesta no es JSON válido');
  }

  if (!response.ok) {
    const d =
      parsed &&
      typeof parsed === 'object' &&
      parsed !== null &&
      'detail' in parsed
        ? (parsed as { detail: unknown }).detail
        : undefined;
    const msg = typeof d === 'string' ? d : 'Error en la petición';
    throw new ApiError(response.status, msg, parsed);
  }

  return normalizeInterestCategoriesResponse(parsed);
}

/**
 * Crea una room en estado draft (sin Kinesis stream).
 * `interestCategoryUuids` es opcional (UUIDs de categorías de interés).
 */
export async function createRoom(
  accessToken: string,
  name?: string | null,
  interestCategoryUuids?: string[] | null
): Promise<PlatformRoomResponse> {
  const payload: Record<string, unknown> = {};
  if (name != null) {
    payload.name = name;
  }
  if (interestCategoryUuids != null && interestCategoryUuids.length > 0) {
    payload.interest_category_uuids = interestCategoryUuids;
  }
  const res = await fetch(`${PLATFORM_HTTP_URL}/rooms`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
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
 * Credenciales para Kinesis Video WebRTC. role=master (solo dueño), role=viewer (cualquier usuario).
 */
function formatPlatformErrorDetail(detail: unknown): string {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    const m = (detail as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

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
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `getWebRTCCredentials: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}
