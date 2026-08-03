/**
 * Cache de la decisión de transporte del viewer (GET /stream/watch).
 * Permite pre-fetchear el transporte + credenciales de los streams adyacentes
 * mientras el usuario mira el actual, de modo que al hacer swipe el round-trip
 * HTTP ya está resuelto. Cubre los tres transportes: ivs (token de stage),
 * webrtc (creds KVS legacy) y hls.
 */
import { useRef, useCallback } from 'react';
import { storage } from '../utils/storage';
import { getStreamWatch } from '../api/platformApi';
import type { StreamWatchResponse } from '../api/platformApi';

const MIN_TTL_MS = 2 * 60_000; // no re-fetchear si quedan más de 2 min de vida
const CONSUME_GUARD_MS = 30_000; // no entregar si quedan menos de 30s
// Los tokens IVS duran horas, pero un token fresco evita reusar uno de una sala
// que pudo reiniciarse: vida útil corta en cache.
const IVS_TTL_MS = 5 * 60_000;

interface CacheEntry {
  watch: StreamWatchResponse;
  expiresAtMs: number;
}

function entryExpiry(watch: StreamWatchResponse, now: number): number {
  if (watch.transport === 'webrtc' && watch.webrtc_credentials) {
    return watch.webrtc_credentials.expires_at_epoch_seconds * 1000;
  }
  return now + IVS_TTL_MS;
}

export function useStreamCredentialCache() {
  const cache = useRef(new Map<string, CacheEntry>());
  const inFlight = useRef(new Set<string>());

  /** Pre-fetchea la decisión de transporte para roomId en background. Idempotente. */
  const prefetch = useCallback(async (roomId: string): Promise<void> => {
    const now = Date.now();
    const hit = cache.current.get(roomId);
    if (hit && hit.expiresAtMs - now > MIN_TTL_MS) return;
    if (inFlight.current.has(roomId)) return;

    inFlight.current.add(roomId);
    try {
      const token = await storage.getAccessToken();
      if (!token) return;
      const watch = await getStreamWatch(token, roomId);
      cache.current.set(roomId, {
        watch,
        expiresAtMs: entryExpiry(watch, Date.now()),
      });
    } catch {
      // Silencioso: StreamScreen re-fetches si no hay hit en caché
    } finally {
      inFlight.current.delete(roomId);
    }
  }, []);

  /**
   * Devuelve la decisión cacheada y la elimina del caché (uso único).
   * Retorna null si no hay hit o está próxima a vencer.
   */
  const consume = useCallback((roomId: string): StreamWatchResponse | null => {
    const entry = cache.current.get(roomId);
    if (!entry) return null;
    cache.current.delete(roomId);
    if (entry.expiresAtMs - Date.now() < CONSUME_GUARD_MS) {
      return null;
    }
    return entry.watch;
  }, []);

  /**
   * Lee la decisión cacheada SIN consumirla (para precalentar el stage del
   * siguiente slide con el mismo token que luego entregará consume()).
   */
  const peek = useCallback((roomId: string): StreamWatchResponse | null => {
    const entry = cache.current.get(roomId);
    if (!entry || entry.expiresAtMs - Date.now() < CONSUME_GUARD_MS) return null;
    return entry.watch;
  }, []);

  return { prefetch, consume, peek };
}
