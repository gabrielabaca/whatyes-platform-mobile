/**
 * Livestream API
 * Listado de salas activas y URL de WebSocket para signaling
 */

import { LIVESTREAM_HTTP_URL, LIVESTREAM_WS_URL } from './config';

export interface LivestreamRoom {
  room_id: string;
  seller_name: string;
  viewer_count: number;
  snapshot_url?: string;
}

const ROOMS_PATH = '/rooms';
const WS_PATH = '/ws';

/**
 * Obtiene la lista de salas (canales) activas en el servidor de livestream.
 */
export async function getRooms(): Promise<LivestreamRoom[]> {
  const url = `${LIVESTREAM_HTTP_URL}${ROOMS_PATH}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`getRooms: ${res.status}`);
  }
  const data = (await res.json()) as LivestreamRoom[];
  return Array.isArray(data) ? data : [];
}

/**
 * Sube una captura del stream para una sala.
 */
export async function uploadRoomSnapshot(roomId: string, formData: FormData): Promise<void> {
  const url = `${LIVESTREAM_HTTP_URL}${ROOMS_PATH}/${roomId}/snapshot`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`uploadRoomSnapshot: ${res.status}`);
  }
}

/**
 * Construye la URL de WebSocket para signaling con token y parámetros.
 */
export function getLivestreamWsUrl(params: {
  token: string;
  role: 'publisher' | 'subscriber';
  roomId?: string;
  sellerName?: string;
}): string {
  const { token, role, roomId, sellerName } = params;
  const search = new URLSearchParams();
  search.set('token', token);
  search.set('role', role);
  if (roomId) search.set('room_id', roomId);
  if (sellerName && role === 'publisher') search.set('seller_name', sellerName);
  return `${LIVESTREAM_WS_URL}${WS_PATH}?${search.toString()}`;
}
