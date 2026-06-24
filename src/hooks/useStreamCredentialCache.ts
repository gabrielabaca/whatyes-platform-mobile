/**
 * Cache de credenciales WebRTC para viewer.
 * Permite pre-fetchear las credenciales de los streams adyacentes mientras el usuario
 * mira el stream actual, de modo que al hacer swipe el round-trip HTTP ya está resuelto.
 */
import { useRef, useCallback } from 'react';
import { storage } from '../utils/storage';
import { getWebRTCCredentials } from '../api/platformApi';
import type { StreamWebRTCCredentialsResponse } from '../api/platformApi';

const MIN_TTL_MS = 2 * 60_000; // no re-fetchear si quedan más de 2 min de vida
const CONSUME_GUARD_MS = 30_000; // no entregar si quedan menos de 30s

interface CacheEntry {
  creds: StreamWebRTCCredentialsResponse;
  expiresAtMs: number;
}

export function useStreamCredentialCache() {
  const cache = useRef(new Map<string, CacheEntry>());
  const inFlight = useRef(new Set<string>());

  /** Pre-fetchea credenciales para roomId en background. Idempotente. */
  const prefetch = useCallback(async (roomId: string): Promise<void> => {
    const now = Date.now();
    const hit = cache.current.get(roomId);
    if (hit && hit.expiresAtMs - now > MIN_TTL_MS) return;
    if (inFlight.current.has(roomId)) return;

    inFlight.current.add(roomId);
    try {
      const token = await storage.getAccessToken();
      if (!token) return;
      const creds = await getWebRTCCredentials(token, roomId, 'viewer');
      cache.current.set(roomId, {
        creds,
        expiresAtMs: creds.expires_at_epoch_seconds * 1000,
      });
    } catch {
      // Silencioso: StreamScreen re-fetches si no hay hit en caché
    } finally {
      inFlight.current.delete(roomId);
    }
  }, []);

  /**
   * Devuelve las credenciales cacheadas y las elimina del caché (uso único).
   * Retorna null si no hay hit o están próximas a vencer.
   */
  const consume = useCallback(
    (roomId: string): StreamWebRTCCredentialsResponse | null => {
      const entry = cache.current.get(roomId);
      if (!entry) return null;
      if (entry.expiresAtMs - Date.now() < CONSUME_GUARD_MS) {
        cache.current.delete(roomId);
        return null;
      }
      cache.current.delete(roomId);
      return entry.creds;
    },
    [],
  );

  return { prefetch, consume };
}
