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
  /** Último frame del vivo (thumbnail IVS, URL firmada). Preferir sobre cover_url en cards. */
  live_thumbnail_url?: string | null;
  /** Espectadores conectados al WS de la sala (GET /rooms, GET /rooms/feed). */
  viewer_count?: number;
}

/** Credenciales de publicación IVS del seller (solo en la respuesta de go_live). */
export interface RoomIvsPublish {
  stage_arn: string;
  token: string;
  participant_id?: string;
  region?: string;
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
  /** Transporte de video de la sala: 'ivs' (IVS Real-Time) | 'kvs' (legacy P2P). */
  video_transport?: string;
  stage_arn?: string | null;
  ivs_publish?: RoomIvsPublish | null;
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

export interface CreateSupportTicketResult {
  uuid: string;
  status: string;
  created_at: number;
}

/**
 * Abre un ticket de soporte (mensaje + hasta 4 evidencias).
 * Multipart: no mandar Content-Type, el boundary lo pone fetch.
 */
export async function createSupportTicket(input: {
  message: string;
  subject?: string;
  evidence?: { uri: string; type?: string; name?: string }[];
}): Promise<CreateSupportTicketResult> {
  const token = await storage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'No access token');
  }
  const form = new FormData();
  form.append('message', input.message);
  if (input.subject?.trim()) {
    form.append('subject', input.subject.trim());
  }
  (input.evidence ?? []).forEach((photo, index) => {
    form.append('evidence', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || `evidence-${index}.jpg`,
    } as unknown as Blob);
  });

  const res = await fetch(`${PLATFORM_HTTP_URL}/me/support-tickets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    detail?: unknown;
    uuid?: string;
    status?: string;
    created_at?: number;
  };
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail ?? `createSupportTicket: ${res.status}`,
      data,
    );
  }
  if (!data.uuid) {
    throw new ApiError(res.status, 'Sin identificador de ticket');
  }
  return {
    uuid: data.uuid,
    status: data.status ?? 'open',
    created_at: data.created_at ?? 0,
  };
}

/**
 * Sube el video de intro del vivo; devuelve la URL pública en S3 (campo `intro_video_url` del POST /rooms).
 */
export async function uploadRoomIntroVideo(video: {
  uri: string;
  type?: string;
  name?: string;
}): Promise<string> {
  const token = await storage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'No access token');
  }
  const form = new FormData();
  form.append('video', {
    uri: video.uri,
    type: video.type || 'video/mp4',
    name: video.name || 'live-intro.mp4',
  } as unknown as Blob);

  const res = await fetch(`${PLATFORM_HTTP_URL}/me/rooms/intro-video`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    detail?: unknown;
    intro_video_url?: string;
  };
  if (!res.ok) {
    const d = data.detail;
    const msg = typeof d === 'string' ? d : `uploadRoomIntroVideo: ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  if (!data.intro_video_url?.trim()) {
    throw new ApiError(res.status, 'Sin URL de video');
  }
  return data.intro_video_url.trim();
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

/**
 * Feed liviano de salas en vivo (GET /rooms/feed): mismos campos que getRooms salvo
 * `creator`, que NO viene resuelto (el backend omite la llamada cruzada a service-users
 * para responder más rápido). Pensado para el swipe vertical, que refresca con frecuencia.
 * El perfil del vendedor se resuelve al abrir el live.
 */
export async function getRoomsFeed(
  accessToken: string,
  options?: { interestCategoryUuid?: string }
): Promise<PlatformRoom[]> {
  const q =
    options?.interestCategoryUuid != null && options.interestCategoryUuid.length > 0
      ? `?interest_category_uuid=${encodeURIComponent(options.interestCategoryUuid)}`
      : '';
  const res = await fetch(`${PLATFORM_HTTP_URL}/rooms/feed${q}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getRoomsFeed: ${res.status}`);
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

export class SeatsFullError extends Error {
  constructor(message = 'SEATS_FULL') {
    super(message);
    this.name = 'SeatsFullError';
  }
}

function platformErrorCode(raw: unknown): string | undefined {
  if (raw && typeof raw === 'object' && 'code' in raw) {
    const code = (raw as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
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
    if (res.status === 409 && platformErrorCode(raw) === 'SEATS_FULL') {
      throw new SeatsFullError();
    }
    const msg = formatPlatformErrorDetail(raw) || `getWebRTCCredentials: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export type ViewerTransportDecision = 'ivs' | 'webrtc' | 'hls';

/** Token de participante para un IVS Real-Time Stage (transporte 'ivs'). */
export interface IvsStageCredentials {
  stage_arn: string;
  token: string;
  participant_id?: string;
  region: string;
}

export interface StreamWatchResponse {
  transport: ViewerTransportDecision;
  ivs?: IvsStageCredentials | null;
  webrtc_credentials?: StreamWebRTCCredentialsResponse | null;
  webrtc_seats?: number | null;
}

/**
 * Decisión de transporte del viewer (híbrido): el backend asigna un asiento WebRTC
 * si hay cupo (devuelve credenciales) o deriva a HLS si la sala está llena.
 */
export async function getStreamWatch(
  accessToken: string,
  roomId: string
): Promise<StreamWatchResponse> {
  const url = `${PLATFORM_HTTP_URL}/stream/watch?room_id=${encodeURIComponent(roomId)}`;
  const res = await fetch(url, { headers: authHeaders(accessToken) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `getStreamWatch: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Inicia la grabación de la sala en vivo (ingestión WebRTC → KVS stream).
 * Llamar después de arrancar el master. Solo el dueño de la sala en estado LIVE.
 */
export async function startRecording(accessToken: string, roomId: string): Promise<void> {
  const url = `${PLATFORM_HTTP_URL}/stream/start-recording?room_id=${encodeURIComponent(roomId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `startRecording: ${res.status}`;
    throw new Error(msg);
  }
}

export interface StreamUrlResponse {
  url: string;
  expires_in_seconds: number;
}

export class NoFragmentsError extends Error {
  constructor(message = 'NO_FRAGMENTS') {
    super(message);
    this.name = 'NoFragmentsError';
  }
}

/**
 * URL firmada HLS para reproducir el stream grabado de una sala en vivo.
 * Lanza NoFragmentsError si el broadcaster aún no envió video (503 NO_FRAGMENTS).
 */
export async function getStreamUrl(accessToken: string, roomId: string): Promise<StreamUrlResponse> {
  const url = `${PLATFORM_HTTP_URL}/stream/url?room_id=${encodeURIComponent(roomId)}`;
  const res = await fetch(url, { headers: authHeaders(accessToken) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const code =
      raw && typeof raw === 'object' && 'code' in raw
        ? (raw as { code?: unknown }).code
        : undefined;
    if (res.status === 503 && code === 'NO_FRAGMENTS') {
      throw new NoFragmentsError();
    }
    const msg = formatPlatformErrorDetail(raw) || `getStreamUrl: ${res.status}`;
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

/** Cómo se resuelve la oferta en pantalla: puja más alta o primero que compra. */
export type LiveOfferSaleMode = 'auction' | 'buy_now';

export interface LiveCommerceActiveAuctionPayload {
  uuid: string;
  room_id: string;
  product_id: string | null;
  duration_seconds: number;
  status: string;
  started_at: number;
  ends_at: number;
  /** Ausente en backends previos a "Comprar ahora": se asume subasta. */
  sale_mode?: LiveOfferSaleMode;
  /** Precio fijo de la compra directa (centavos). null en subastas. */
  price_cents?: number | null;
}

export interface LiveCommerceCatalogPreview {
  total_products_in_room: number;
}

export interface LiveCommerceResponse {
  seller: LiveCommerceSellerPayload;
  active_product: LiveCommerceActiveProductPayload | null;
  active_auction: LiveCommerceActiveAuctionPayload | null;
  catalog_preview: LiveCommerceCatalogPreview | null;
  /** Nota del vivo publicada por el vendedor. `null` = el vivo no tiene nota. */
  note?: string | null;
  note_updated_at?: number | null;
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

/** Nota del vivo (botón comment_bank). `note` en null = el vivo no tiene nota. */
export interface RoomNoteResponse {
  room_id: string;
  note: string | null;
  note_updated_at: number | null;
}

/** Tope del backend (`NOTE_MAX_LENGTH` en room_schema.py). */
export const ROOM_NOTE_MAX_LENGTH = 4000;

/**
 * Nota publicada del vivo. Cualquier usuario autenticado puede leerla; normalmente
 * no hace falta porque `getRoomLiveCommerce` ya la trae.
 */
export async function getRoomNote(
  accessToken: string,
  roomId: string
): Promise<RoomNoteResponse> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/rooms/${encodeURIComponent(roomId)}/note`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `getRoomNote: ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<RoomNoteResponse>;
}

/**
 * Publica la nota del vivo. Solo el vendedor (creador de la sala): el backend
 * responde 403 a cualquier otro. Publicar vacío borra la nota.
 */
export async function publishRoomNote(
  accessToken: string,
  roomId: string,
  note: string
): Promise<RoomNoteResponse> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/rooms/${encodeURIComponent(roomId)}/note`,
    {
      method: 'PUT',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `publishRoomNote: ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<RoomNoteResponse>;
}

export type ProductShippingQuoteStatus =
  | 'quoted'
  | 'free'
  | 'address_required'
  | 'unavailable';

export interface ProductShippingQuoteResponse {
  status: ProductShippingQuoteStatus;
  /** Costo en centavos (status=quoted; 0 si free). */
  price_cents: number | null;
  currency: string;
  service_code?: string | null;
  service_name?: string | null;
  estimated_days?: number | null;
  free_reason?: 'combined_with_previous_purchase' | null;
  /** Dirección del vendedor para retiro en persona (una línea), si la tiene cargada. */
  seller_pickup_address?: string | null;
}

/**
 * Costo de envío del producto del vivo hacia el domicilio del comprador.
 * `cpDestino` es el código postal del domicilio guardado; si se omite y no hay
 * envío combinado, el backend responde status=address_required.
 */
export async function getProductShippingQuote(
  accessToken: string,
  roomId: string,
  productId: string,
  cpDestino?: string | null
): Promise<ProductShippingQuoteResponse> {
  const query = cpDestino?.trim()
    ? `?cp_destino=${encodeURIComponent(cpDestino.trim())}`
    : '';
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/rooms/${encodeURIComponent(roomId)}/products/${encodeURIComponent(productId)}/shipping-quote${query}`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `getProductShippingQuote: ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<ProductShippingQuoteResponse>;
}

export type AddressLookupStatus = 'ok' | 'unavailable' | 'not_found';

export interface AddressSuggestion {
  formatted: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  country_code: string;
}

export interface AddressLookupAttribution {
  geoapify: string;
  geoapify_url: string;
  osm: string;
  osm_url: string;
}

export interface AddressAutocompleteResponse {
  status: 'ok' | 'unavailable';
  suggestions: AddressSuggestion[];
  attribution: AddressLookupAttribution;
}

export interface ReverseGeocodeLookupResponse {
  status: AddressLookupStatus;
  address: AddressSuggestion | null;
  attribution: AddressLookupAttribution;
}

const GEOAPIFY_ATTRIBUTION: AddressLookupAttribution = {
  geoapify: 'Powered by Geoapify',
  geoapify_url: 'https://www.geoapify.com/',
  osm: '© OpenStreetMap contributors',
  osm_url: 'https://www.openstreetmap.org/copyright',
};

function unavailableAutocomplete(): AddressAutocompleteResponse {
  return { status: 'unavailable', suggestions: [], attribution: GEOAPIFY_ATTRIBUTION };
}

const AUTOCOMPLETE_TIMEOUT_MS = 6000;
const REVERSE_TIMEOUT_MS = 8000;

function withTimeout(
  ms: number,
  external?: AbortSignal
): { signal: AbortSignal; cleanup: () => void } {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  const onExternal = () => ac.abort();
  if (external) {
    if (external.aborted) {
      ac.abort();
    } else {
      external.addEventListener('abort', onExternal);
    }
  }
  return {
    signal: ac.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternal);
    },
  };
}

export interface AutocompleteAddressOptions {
  countryCode?: string | null;
  signal?: AbortSignal;
  lang?: string;
}

/**
 * Sugerencias de dirección (Geoapify vía service-platform → service_delivery).
 * Nunca lanza por falla del proveedor: status=unavailable y lista vacía, para que
 * el formulario de alta se pueda completar a mano. AbortError del caller sí se propaga.
 */
export async function autocompleteAddress(
  accessToken: string,
  query: string,
  options?: AutocompleteAddressOptions
): Promise<AddressAutocompleteResponse> {
  const params = new URLSearchParams();
  params.set('q', query);
  const country = options?.countryCode?.trim();
  if (country) params.set('country', country);
  if (options?.lang?.trim()) {
    params.set('lang', options.lang.trim().slice(0, 2).toLowerCase());
  }
  const { signal, cleanup } = withTimeout(AUTOCOMPLETE_TIMEOUT_MS, options?.signal);
  try {
    const res = await fetch(
      `${PLATFORM_HTTP_URL}/me/address-lookup/autocomplete?${params.toString()}`,
      { headers: authHeaders(accessToken), signal }
    );
    if (!res.ok) {
      return unavailableAutocomplete();
    }
    const data = (await res.json()) as AddressAutocompleteResponse;
    if (data?.status !== 'ok' || !Array.isArray(data.suggestions)) {
      return unavailableAutocomplete();
    }
    return data;
  } catch (err) {
    if (options?.signal?.aborted) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return unavailableAutocomplete();
    }
    return unavailableAutocomplete();
  } finally {
    cleanup();
  }
}

/**
 * Geocodificación inversa (GPS → campos de dirección) por el mismo proxy.
 * Lanza si el proveedor no responde: el botón de ubicación ya tiene fallback
 * a "completala manualmente".
 */
export async function reverseGeocodeAddress(
  accessToken: string,
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeLookupResponse> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });
  const { signal, cleanup } = withTimeout(REVERSE_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${PLATFORM_HTTP_URL}/me/address-lookup/reverse?${params.toString()}`,
      { headers: authHeaders(accessToken), signal }
    );
    if (!res.ok) {
      throw new Error(`Reverse geocode failed: ${res.status}`);
    }
    return res.json() as Promise<ReverseGeocodeLookupResponse>;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Reverse geocode failed: timeout');
    }
    throw err;
  } finally {
    cleanup();
  }
}

export interface RoomCatalogProductItem {
  uuid: string;
  title: string;
  currency: string;
  base_price_cents: number;
  image_url: string | null;
  quantity_on_hand: number;
  article_count?: number;
  scheduled_at?: number | null;
  starts_soon?: boolean;
  auction_seconds_remaining?: number | null;
  is_pinned?: boolean;
  is_active?: boolean;
  live_sale_mode?: 'buy_now' | 'auction' | 'raffle' | string | null;
  /** Modo de participación elegido al cargar el producto (sorteo). */
  raffle_participation_mode?: 'followers_only' | 'everyone' | 'buyers' | null;
}

export interface RoomCatalogActionResponse {
  room_id: string;
  product_id: string;
  action: string;
  live_sale_mode?: string | null;
  is_active?: boolean;
  is_pinned?: boolean;
  scheduled_at?: number | null;
  auction_id?: string | null;
  auction_seconds_remaining?: number | null;
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

async function postRoomCatalogAction(
  accessToken: string,
  roomId: string,
  productId: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<RoomCatalogActionResponse> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/me/rooms/${encodeURIComponent(roomId)}/catalog/products/${encodeURIComponent(productId)}/${action}`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `catalog action ${action}: ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<RoomCatalogActionResponse>;
}

export function setActiveCatalogProduct(
  accessToken: string,
  roomId: string,
  productId: string,
): Promise<RoomCatalogActionResponse> {
  return postRoomCatalogAction(accessToken, roomId, productId, 'set-active');
}

export function pinCatalogProduct(
  accessToken: string,
  roomId: string,
  productId: string,
): Promise<RoomCatalogActionResponse> {
  return postRoomCatalogAction(accessToken, roomId, productId, 'pin');
}

export function startCatalogProductAuction(
  accessToken: string,
  roomId: string,
  productId: string,
  body: { durationSeconds?: number } = {},
): Promise<RoomCatalogActionResponse> {
  return postRoomCatalogAction(accessToken, roomId, productId, 'start-auction', {
    ...(body.durationSeconds != null ? { duration_seconds: body.durationSeconds } : {}),
  });
}

export function startCatalogProductBuyNow(
  accessToken: string,
  roomId: string,
  productId: string,
  body: { durationSeconds?: number; priceCents?: number } = {},
): Promise<RoomCatalogActionResponse> {
  return postRoomCatalogAction(accessToken, roomId, productId, 'start-buy-now', {
    ...(body.durationSeconds != null ? { duration_seconds: body.durationSeconds } : {}),
    ...(body.priceCents != null ? { price_cents: body.priceCents } : {}),
  });
}

/**
 * Abre el sorteo de un producto. `participationMode` es opcional: omitirlo deja
 * que el backend use el `raffle_participation_mode` guardado al cargar el
 * producto, igual que `start-auction` hace con la duración.
 */
export function startCatalogProductRaffle(
  accessToken: string,
  roomId: string,
  productId: string,
  body: { participationMode?: 'followers_only' | 'everyone' | 'buyers' } = {},
): Promise<RoomCatalogActionResponse> {
  return postRoomCatalogAction(accessToken, roomId, productId, 'start-raffle', {
    ...(body.participationMode != null
      ? { participation_mode: body.participationMode }
      : {}),
  });
}

export function scheduleCatalogProduct(
  accessToken: string,
  roomId: string,
  productId: string,
  scheduledAt: number,
): Promise<RoomCatalogActionResponse> {
  return postRoomCatalogAction(accessToken, roomId, productId, 'schedule', {
    scheduled_at: scheduledAt,
  });
}

/** Motivos de cancelación de la oferta en vivo (tarea 18). El viewer solo ve el
 * mensaje genérico asociado al código; `details` es interno del vendedor. */
export type AuctionCancelReasonCode =
  | 'product_issue'
  | 'listing_error'
  | 'technical_issue';

/** Tope del backend (`CancelAuctionRequest.details` en seller_room_catalog_schema.py). */
export const AUCTION_CANCEL_DETAILS_MAX_LENGTH = 500;

export interface AuctionLifecycleResponse {
  auction_id: string;
  status: string;
  /** Restante congelado en pausa; null tras cancelar. */
  seconds_remaining: number | null;
  /** Cierre vigente (recalculado al reanudar); null tras cancelar. */
  ends_at: number | null;
  server_time: number;
}

async function postRoomAuctionAction(
  accessToken: string,
  roomId: string,
  action: 'pause' | 'resume' | 'cancel',
  body?: Record<string, unknown>,
): Promise<AuctionLifecycleResponse> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/me/rooms/${encodeURIComponent(roomId)}/auction/${action}`,
    {
      method: 'POST',
      headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `auction ${action}: ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<AuctionLifecycleResponse>;
}

/** Congela la oferta en vivo (timer detenido, sin pujas) mientras el vendedor decide. */
export function pauseRoomAuction(
  accessToken: string,
  roomId: string,
): Promise<AuctionLifecycleResponse> {
  return postRoomAuctionAction(accessToken, roomId, 'pause');
}

/** Reanuda la oferta pausada desde el tiempo restante en que quedó. */
export function resumeRoomAuction(
  accessToken: string,
  roomId: string,
): Promise<AuctionLifecycleResponse> {
  return postRoomAuctionAction(accessToken, roomId, 'resume');
}

/** Cancela la oferta con motivo. `details` queda en backend; nunca lo ven los viewers. */
export function cancelRoomAuction(
  accessToken: string,
  roomId: string,
  body: { reasonCode: AuctionCancelReasonCode; details: string },
): Promise<AuctionLifecycleResponse> {
  return postRoomAuctionAction(accessToken, roomId, 'cancel', {
    reason_code: body.reasonCode,
    details: body.details,
  });
}

/** Alias del plan de flujo seller */
export const setActiveRoomProduct = setActiveCatalogProduct;
export const pinRoomProduct = pinCatalogProduct;
export const scheduleRoomProduct = scheduleCatalogProduct;
export const startRoomProductAuction = startCatalogProductAuction;
export const startRoomProductBuyNow = startCatalogProductBuyNow;
export const startRoomProductRaffle = startCatalogProductRaffle;

/** Error de compra directa: `tooLate` distingue "llegó segundo" de un fallo real. */
export class BuyNowUnavailableError extends Error {
  readonly tooLate = true;
}

export interface BuyNowResponse {
  sale_uuid: string;
  auction_id: string;
  product_id: string | null;
  amount_cents: number;
  currency: string;
  sold_at: number;
}

/**
 * Compra directa del producto en pantalla. El backend resuelve de forma atómica:
 * solo el primero recibe 200, el resto 409 (`BuyNowUnavailableError`).
 */
export async function buyNowActiveOffer(
  accessToken: string,
  roomId: string,
  auctionId?: string | null,
): Promise<BuyNowResponse> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/rooms/${encodeURIComponent(roomId)}/buy-now`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(auctionId ? { auction_id: auctionId } : {}),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = (err as { detail?: unknown }).detail;
    const msg = formatPlatformErrorDetail(raw) || `buy-now: ${res.status}`;
    if (res.status === 409) throw new BuyNowUnavailableError(msg);
    throw new Error(msg);
  }
  return res.json() as Promise<BuyNowResponse>;
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
  is_permanent?: boolean;
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

export interface SellerSalesSummary {
  sold_count: number;
  total_amount_cents: number;
  pending_amount_cents: number;
  currency: string;
}

/** Resumen de ventas del vendedor autenticado (hub del vendedor). */
export async function getMySalesSummary(accessToken: string): Promise<SellerSalesSummary> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/me/sales/summary`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getMySalesSummary: ${res.status}`);
  return res.json() as Promise<SellerSalesSummary>;
}

export interface PurchaseCounterpart {
  user_id: string;
  name?: string | null;
  profile_picture?: string | null;
}

/** Máquina de estados del envío en service-platform (SaleFulfillmentStatus). */
export type FulfillmentStatus =
  | 'none'
  | 'shipment_created'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'returned'
  | 'shipment_failed';

export interface PurchaseItem {
  sale_uuid: string;
  order_number: string;
  room_id: string;
  auction_id?: string | null;
  product_id: string;
  product_title: string;
  product_image_url?: string | null;
  sku?: string | null;
  condition?: 'new' | 'lightly_used' | 'used' | string | null;
  category_name?: string | null;
  quantity: number;
  amount_cents: number;
  /** Envío cobrado junto al producto; null = venta aún sin cotizar. */
  shipping_cost_cents?: number | null;
  /** amount_cents + envío: lo que efectivamente paga el comprador. */
  total_cents?: number;
  currency: string;
  payment_status: 'pending' | 'paid' | 'cancelled' | string;
  /** Estado del envío espejado desde service_delivery. */
  fulfillment_status?: FulfillmentStatus | string | null;
  /** N° de seguimiento del transportista (guía); null hasta que se crea el envío. */
  delivery_guide_id?: string | null;
  /** Fecha pactada de entrega (epoch s) informada por el transportista. */
  estimated_delivery_at?: number | null;
  /** Fecha de entrega efectiva (epoch s). */
  delivered_at?: number | null;
  /** Vendedor (en compras) o comprador (en ventas). */
  counterpart: PurchaseCounterpart;
  won_at_ms?: number | null;
  /** Clip de la subasta (MP4 en S3, generado por platform_livestream). */
  recording_asset_url?: string | null;
  created_at: number;
}

export interface PurchasesListResponse {
  items: PurchaseItem[];
  total: number;
}

function pagingQuery(options?: { limit?: number; offset?: number }): string {
  const parts: string[] = [];
  if (options?.limit != null) parts.push(`limit=${options.limit}`);
  if (options?.offset != null) parts.push(`offset=${options.offset}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Compras del usuario autenticado (subastas ganadas). */
export async function getMyPurchases(
  accessToken: string,
  options?: { limit?: number; offset?: number }
): Promise<PurchasesListResponse> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/me/purchases${pagingQuery(options)}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getMyPurchases: ${res.status}`);
  return res.json() as Promise<PurchasesListResponse>;
}

/** Detalle de una compra propia. */
export async function getMyPurchase(
  accessToken: string,
  saleUuid: string
): Promise<PurchaseItem> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/me/purchases/${encodeURIComponent(saleUuid)}`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`getMyPurchase: ${res.status}`);
  return res.json() as Promise<PurchaseItem>;
}

/** Un paso del historial del envío, tal como lo informa el transportista. */
export interface PurchaseTrackingEvent {
  /** Estado legible del proveedor ("En Transito A Destino"). */
  label: string;
  /** Estado normalizado (CREATED, IN_TRANSIT, DELIVERED, …). */
  state_code?: string | null;
  /** Fecha cruda del proveedor (dd/mm/YYYY). */
  date?: string | null;
  /** Hora cruda del proveedor (HH:MM:SS). */
  hour?: string | null;
  /** date + hour parseados a epoch s por el backend; null si no se pudo. */
  occurred_at?: number | null;
}

export interface PurchaseTracking {
  sale_uuid: string;
  /** false = la venta todavía no tiene envío (o no genera uno): sin eventos. */
  has_shipment: boolean;
  fulfillment_status: FulfillmentStatus | string;
  guide_id?: string | null;
  /** Estado normalizado del envío en service_delivery. */
  status?: string | null;
  estimated_delivery_at?: number | null;
  delivered_at?: number | null;
  events: PurchaseTrackingEvent[];
}

/**
 * Historial del envío de una compra propia (o de una venta propia).
 * Sin envío responde 200 con `has_shipment: false`, no un error.
 */
export async function getMyPurchaseTracking(
  accessToken: string,
  saleUuid: string
): Promise<PurchaseTracking> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/me/purchases/${encodeURIComponent(saleUuid)}/tracking`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`getMyPurchaseTracking: ${res.status}`);
  return res.json() as Promise<PurchaseTracking>;
}

/** Ventas del vendedor autenticado (tab Ventas de Actividad). */
export async function getMySales(
  accessToken: string,
  options?: { limit?: number; offset?: number }
): Promise<PurchasesListResponse> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/me/sales${pagingQuery(options)}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getMySales: ${res.status}`);
  return res.json() as Promise<PurchasesListResponse>;
}

/** Tipos de evento del feed (NotificationType del backend; puede crecer). */
export type UserNotificationType =
  | 'seller_live_start'
  | 'new_follower'
  | 'new_message'
  | 'auction_won'
  | 'auction_second_chance'
  | 'buy_now_won'
  | 'raffle_won'
  | 'purchase_paid'
  | 'purchase_payment_action_required'
  | 'purchase_cancelled'
  | 'purchase_shipment_created'
  | 'purchase_delivered'
  | 'product_sold'
  | 'sale_paid'
  | string;

export interface UserNotificationItem {
  uuid: string;
  type: UserNotificationType;
  actor_user_id?: string | null;
  seller_user_id?: string | null;
  room_id?: string | null;
  resource_type?: 'sale' | 'auction' | 'raffle' | 'room' | 'conversation' | 'user' | 'product' | string | null;
  resource_id?: string | null;
  /** Título y cuerpo ya redactados por el backend. */
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: number | null;
  created_at: number;
}

export interface NotificationsListResponse {
  items: UserNotificationItem[];
  total: number;
  /** No leídas del usuario (ignora el filtro de la consulta). */
  unread_count: number;
}

/** Feed de notificaciones del usuario autenticado (más recientes primero). */
export async function getMyNotifications(
  accessToken: string,
  options?: { limit?: number; offset?: number }
): Promise<NotificationsListResponse> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/me/notifications${pagingQuery(options)}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getMyNotifications: ${res.status}`);
  return res.json() as Promise<NotificationsListResponse>;
}

/** Contador del punto rojo de la campana. */
export async function getNotificationsUnreadCount(
  accessToken: string
): Promise<{ unread_count: number }> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/me/notifications/unread-count`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getNotificationsUnreadCount: ${res.status}`);
  return res.json() as Promise<{ unread_count: number }>;
}

/** Marca una notificación como leída. */
export async function markNotificationRead(
  accessToken: string,
  notificationId: string
): Promise<{ uuid: string; is_read: boolean }> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/me/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'POST', headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`markNotificationRead: ${res.status}`);
  return res.json() as Promise<{ uuid: string; is_read: boolean }>;
}

/** Marca todas las notificaciones como leídas. */
export async function markAllNotificationsRead(
  accessToken: string
): Promise<{ updated: number; unread_count: number }> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/me/notifications/read-all`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`markAllNotificationsRead: ${res.status}`);
  return res.json() as Promise<{ updated: number; unread_count: number }>;
}

export interface ConversationPeer {
  user_id: string;
  name?: string | null;
  profile_picture?: string | null;
}

export interface ConversationItem {
  uuid: string;
  peer?: ConversationPeer | null;
  /** Preview del último mensaje ("📷 Foto" si fue solo imagen). */
  last_message?: string | null;
  last_message_at?: number | null;
  last_message_sender_user_id?: string | null;
  unread_count: number;
  created_at: number;
}

export interface ConversationsListResponse {
  items: ConversationItem[];
  total: number;
  unread_total: number;
}

export interface ConversationMessage {
  uuid: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  image_urls: string[];
  is_mine: boolean;
  is_read: boolean;
  created_at: number;
}

export interface MessagesListResponse {
  items: ConversationMessage[];
  total: number;
}

/** Abre (o recupera) la conversación con otro usuario. Idempotente por par. */
export async function createConversation(
  accessToken: string,
  peerUserId: string
): Promise<ConversationItem> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/conversations`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ peer_user_id: peerUserId }),
  });
  if (!res.ok) throw new Error(`createConversation: ${res.status}`);
  return res.json() as Promise<ConversationItem>;
}

/** Conversaciones del usuario; `q` filtra por contenido de mensajes en el server. */
export async function getConversations(
  accessToken: string,
  options?: { limit?: number; offset?: number; q?: string }
): Promise<ConversationsListResponse> {
  const parts: string[] = [];
  if (options?.limit != null) parts.push(`limit=${options.limit}`);
  if (options?.offset != null) parts.push(`offset=${options.offset}`);
  if (options?.q) parts.push(`q=${encodeURIComponent(options.q)}`);
  const query = parts.length ? `?${parts.join('&')}` : '';
  const res = await fetch(`${PLATFORM_HTTP_URL}/conversations${query}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getConversations: ${res.status}`);
  return res.json() as Promise<ConversationsListResponse>;
}

/** Mensajes de una conversación, más recientes primero. */
export async function getConversationMessages(
  accessToken: string,
  conversationId: string,
  options?: { limit?: number; offset?: number }
): Promise<MessagesListResponse> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/conversations/${encodeURIComponent(conversationId)}/messages${pagingQuery(options)}`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`getConversationMessages: ${res.status}`);
  return res.json() as Promise<MessagesListResponse>;
}

/** Envía texto y/o fotos (URLs de uploadConversationImages). */
export async function sendConversationMessage(
  accessToken: string,
  conversationId: string,
  body: string,
  imageUrls?: string[]
): Promise<ConversationMessage> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ body, image_urls: imageUrls ?? [] }),
    }
  );
  if (!res.ok) throw new Error(`sendConversationMessage: ${res.status}`);
  return res.json() as Promise<ConversationMessage>;
}

/** Marca la conversación como leída hasta ahora. */
export async function markConversationRead(
  accessToken: string,
  conversationId: string
): Promise<{ conversation_id: string; unread_count: number }> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'POST', headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`markConversationRead: ${res.status}`);
  return res.json() as Promise<{ conversation_id: string; unread_count: number }>;
}

/** Sube fotos del chat (máx 6 × 5MB) y devuelve las URLs para el mensaje. */
export async function uploadConversationImages(
  accessToken: string,
  photos: { uri: string; type?: string; name?: string }[]
): Promise<string[]> {
  const form = new FormData();
  photos.forEach((photo, index) => {
    form.append('images', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || `chat-${index}.jpg`,
    } as unknown as Blob);
  });
  // Solo Authorization: con FormData el boundary del multipart lo pone fetch.
  const res = await fetch(`${PLATFORM_HTTP_URL}/conversations/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) throw new Error(`uploadConversationImages: ${res.status}`);
  const data = (await res.json()) as { image_urls: string[] };
  return data.image_urls ?? [];
}

export interface ConversationsUnreadCount {
  /** Conversaciones con al menos un mensaje sin leer: el número del badge. */
  conversations_with_unread: number;
  /** Mensajes sin leer sumando todas las conversaciones. */
  unread_total: number;
}

/** Contador del badge del ícono de mensajes (chat entre usuarios). */
export async function getConversationsUnreadCount(
  accessToken: string
): Promise<ConversationsUnreadCount> {
  const res = await fetch(`${PLATFORM_HTTP_URL}/conversations/unread-count`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`getConversationsUnreadCount: ${res.status}`);
  return res.json() as Promise<ConversationsUnreadCount>;
}

export interface SellerNotificationSubscription {
  seller_user_id: string;
  subscribed: boolean;
  notify_live_start: boolean;
}

/** Estado de la campana del vendedor para el usuario autenticado. */
export async function getSellerNotificationSubscription(
  accessToken: string,
  sellerUserId: string
): Promise<SellerNotificationSubscription> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/users/${encodeURIComponent(sellerUserId)}/notifications/subscription`,
    { headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`getSellerNotificationSubscription: ${res.status}`);
  return res.json() as Promise<SellerNotificationSubscription>;
}

/** Activa la campana: avisos cuando el vendedor inicia un vivo (idempotente). */
export async function subscribeSellerNotifications(
  accessToken: string,
  sellerUserId: string
): Promise<SellerNotificationSubscription> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/users/${encodeURIComponent(sellerUserId)}/notifications/subscription`,
    { method: 'PUT', headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`subscribeSellerNotifications: ${res.status}`);
  return res.json() as Promise<SellerNotificationSubscription>;
}

/** Desactiva la campana del vendedor (idempotente). */
export async function unsubscribeSellerNotifications(
  accessToken: string,
  sellerUserId: string
): Promise<SellerNotificationSubscription> {
  const res = await fetch(
    `${PLATFORM_HTTP_URL}/users/${encodeURIComponent(sellerUserId)}/notifications/subscription`,
    { method: 'DELETE', headers: authHeaders(accessToken) }
  );
  if (!res.ok) throw new Error(`unsubscribeSellerNotifications: ${res.status}`);
  return res.json() as Promise<SellerNotificationSubscription>;
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
