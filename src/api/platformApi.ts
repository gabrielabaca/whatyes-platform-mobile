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
  scheduled_at?: number | null;
  recurrence?: string;
  moderator_user_ids?: string[];
  sale_format?: string;
  explicit_content?: boolean;
  blocked_words_enabled?: boolean;
  blocked_words?: string[];
  privacy?: string;
  cover_url?: string | null;
  intro_video_url?: string | null;
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
  scheduled_at?: number | null;
  recurrence?: string;
  moderator_user_ids?: string[];
  sale_format?: string;
  explicit_content?: boolean;
  blocked_words_enabled?: boolean;
  blocked_words?: string[];
  privacy?: string;
}

export interface CreateRoomOptions {
  scheduled_at?: number | null;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  moderator_user_ids?: string[];
  sale_format?: 'individual' | 'auction_breaks' | 'surprise_boxes';
  explicit_content?: boolean;
  blocked_words_enabled?: boolean;
  blocked_words?: string[];
  privacy?: 'public' | 'private';
  cover_url?: string | null;
  intro_video_url?: string | null;
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
 * Sube una portada para el vivo; devuelve la URL pública en S3 (campo `cover_url` del POST /rooms).
 */
export async function uploadRoomCover(photo: {
  uri: string;
  type?: string;
  name?: string;
}): Promise<string> {
  const token = await storage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'No access token');
  }
  const form = new FormData();
  form.append('cover', {
    uri: photo.uri,
    type: photo.type || 'image/jpeg',
    name: photo.name || 'live-cover.jpg',
  } as unknown as Blob);

  const res = await fetch(`${PLATFORM_HTTP_URL}/me/rooms/cover`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: unknown; cover_url?: string };
  if (!res.ok) {
    const d = data.detail;
    const msg = typeof d === 'string' ? d : `uploadRoomCover: ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  if (!data.cover_url?.trim()) {
    throw new ApiError(res.status, 'Sin URL de imagen');
  }
  return data.cover_url.trim();
}

/**
 * Sube snapshot del stream y actualiza `rooms.cover_url` (solo room en vivo, owner).
 */
export async function uploadLiveRoomCover(
  roomId: string,
  photo: {
    uri: string;
    type?: string;
    name?: string;
  },
): Promise<string> {
  const token = await storage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'No access token');
  }
  const form = new FormData();
  form.append('cover', {
    uri: photo.uri,
    type: photo.type || 'image/jpeg',
    name: photo.name || 'live-snapshot.jpg',
  } as unknown as Blob);

  const res = await fetch(`${PLATFORM_HTTP_URL}/me/rooms/${roomId}/live-cover`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as { detail?: unknown; cover_url?: string };
  if (!res.ok) {
    const d = data.detail;
    const msg = typeof d === 'string' ? d : `uploadLiveRoomCover: ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  if (!data.cover_url?.trim()) {
    throw new ApiError(res.status, 'Sin URL de imagen');
  }
  return data.cover_url.trim();
}

/**
 * Lista salas en estado live (disponibles para ver).
 * @param interestCategoryUuid Si se indica, solo salas que incluyen esa categoría (service-platform).
 */
export async function getRooms(
  accessToken: string,
  options?: { interestCategoryUuid?: string }
): Promise<PlatformRoom[]> {
  const q =
    options?.interestCategoryUuid != null && options.interestCategoryUuid.length > 0
      ? `?interest_category_uuid=${encodeURIComponent(options.interestCategoryUuid)}`
      : '';
  const res = await fetch(`${PLATFORM_HTTP_URL}/rooms${q}`, {
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
      icon: String(o.icon ?? ''),
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
 * Categorías más visitadas por el usuario (Explorar — "Tus categorías").
 */
export async function getFrequentInterestCategories(limit = 9): Promise<InterestCategoryItem[]> {
  const token = await storage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'No access token');
  }
  const q = limit !== 9 ? `?limit=${encodeURIComponent(String(limit))}` : '';
  const response = await fetch(`${PLATFORM_HTTP_URL}/interest-categories/me/frequent${q}`, {
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
      parsed && typeof parsed === 'object' && parsed !== null && 'detail' in parsed
        ? (parsed as { detail: unknown }).detail
        : undefined;
    const msg = typeof d === 'string' ? d : 'Error en la petición';
    throw new ApiError(response.status, msg, parsed);
  }
  return normalizeInterestCategoriesResponse(parsed);
}

/**
 * Registra una visita a una categoría (ranking frecuentes).
 */
export async function recordInterestCategoryVisit(categoryUuid: string): Promise<void> {
  const token = await storage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'No access token');
  }
  const response = await fetch(
    `${PLATFORM_HTTP_URL}/interest-categories/${encodeURIComponent(categoryUuid)}/visit`,
    {
      method: 'POST',
      headers: authHeaders(token),
    }
  );
  if (!response.ok) {
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = undefined;
    }
    const d =
      parsed && typeof parsed === 'object' && parsed !== null && 'detail' in parsed
        ? (parsed as { detail: unknown }).detail
        : undefined;
    const msg = typeof d === 'string' ? d : `recordInterestCategoryVisit: ${response.status}`;
    throw new ApiError(response.status, msg, parsed);
  }
}

/**
 * Crea una room en estado draft (sin Kinesis stream).
 * `interestCategoryUuids` es opcional (UUIDs de categorías de interés).
 */
export async function createRoom(
  accessToken: string,
  name?: string | null,
  interestCategoryUuids?: string[] | null,
  options?: CreateRoomOptions
): Promise<PlatformRoomResponse> {
  const payload: Record<string, unknown> = { ...(options ?? {}) };
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

export interface LiveCommerceSellerPayload {
  user_id: string;
}

export interface LiveCommerceActiveProductPayload {
  uuid: string;
  title: string;
  currency: string;
  base_price_cents: number;
  image_urls: string[];
  quantity_on_hand: number;
  scope: string;
}

export interface LiveCommerceActiveAuctionPayload {
  uuid: string;
  room_id: string;
  product_id: string | null;
  duration_seconds: number;
  status: string;
  started_at: number;
  ends_at: number;
}

export interface LiveCommerceCatalogPreview {
  total_products_in_room: number;
}

export interface LiveCommerceResponse {
  seller: LiveCommerceSellerPayload;
  active_product: LiveCommerceActiveProductPayload | null;
  active_auction: LiveCommerceActiveAuctionPayload | null;
  catalog_preview: LiveCommerceCatalogPreview | null;
}

/**
 * Producto activo + subasta + catálogo para el viewer (service-platform).
 */
export async function getRoomLiveCommerce(
  accessToken: string,
  roomId: string
): Promise<LiveCommerceResponse> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/rooms/${encodeURIComponent(roomId)}/live-commerce`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `getRoomLiveCommerce: ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<LiveCommerceResponse>;
}

export interface RoomCatalogProductItem {
  uuid: string;
  title: string;
  currency: string;
  base_price_cents: number;
  image_url: string | null;
  quantity_on_hand: number;
}

export interface RoomCatalogResponse {
  items: RoomCatalogProductItem[];
}

/**
 * Catálogo de productos publicados en el vivo.
 */
export async function getRoomCatalog(
  accessToken: string,
  roomId: string
): Promise<RoomCatalogResponse> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/rooms/${encodeURIComponent(roomId)}/catalog`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `getRoomCatalog: ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<RoomCatalogResponse>;
}

export interface UserShowItem {
  room_uuid: string;
  name: string | null;
  stream_name?: string | null;
  status: 'draft' | 'live' | 'ended' | string;
  created_at: number;
  ended_at?: number | null;
  viewer_count?: number;
  thumbnail_url?: string | null;
  description?: string | null;
  last_joined_at?: number | null;
  interest_categories?: InterestCategoryItem[];
  creator?: PlatformRoomCreator | null;
}

export interface UserProfileProductItem {
  room_uuid: string;
  status: 'draft' | 'live' | 'ended' | string;
  title: string;
  thumbnail_url?: string | null;
  article_count: number;
  price_cents: number;
  currency: string;
  scheduled_at?: number | null;
  starts_soon?: boolean;
  auction_seconds_remaining?: number | null;
}

export async function getUserProfileProducts(
  accessToken: string,
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<UserProfileProductItem[]> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/users/${encodeURIComponent(userId)}/profile-products${q}`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`getUserProfileProducts: ${res.status}`);
  const data = (await res.json()) as UserProfileProductItem[];
  return Array.isArray(data) ? data : [];
}

export async function getUserShows(
  accessToken: string,
  userId: string,
  options?: { limit?: number; offset?: number; status?: string }
): Promise<UserShowItem[]> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  if (options?.status) params.set('status', options.status);
  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/users/${encodeURIComponent(userId)}/shows${q}`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`getUserShows: ${res.status}`);
  const data = (await res.json()) as UserShowItem[];
  return Array.isArray(data) ? data : [];
}
