import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getRooms, getRoomsFeed } from '../api/platformApi';
import { storage } from '../utils/storage';
import { mapPlatformRoomToPreview } from '../utils/buyerLiveRoomPreviewMap';
import type { LiveStreamPreviewModel } from '../components/organisms/home/types';

const DEFAULT_POLL_MS = 15000;

export interface UseBuyerLiveRoomPreviewsOptions {
  /** Si se define, filtra por categoría en service-platform. */
  interestCategoryUuid?: string | null;
  /** Orden del servidor. Default `recent` (created_at desc), igual que omitir el param. */
  sort?: 'recent' | 'recommended' | 'viewers';
  /** Intervalo de refresco automático; `null` desactiva el polling. */
  pollIntervalMs?: number | null;
  /** Desactiva carga y polling (p. ej. home vendedor). */
  enabled?: boolean;
  /**
   * Usa el feed liviano (GET /rooms/feed, sin creador resuelto) en vez de GET /rooms.
   * Ideal para el swipe: responde más rápido y refresca con frecuencia.
   */
  lightweight?: boolean;
}

export function useBuyerLiveRoomPreviews(
  options?: UseBuyerLiveRoomPreviewsOptions
): {
  previews: LiveStreamPreviewModel[];
  loading: boolean;
  refreshing: boolean;
  load: () => Promise<void>;
  onRefresh: () => void;
} {
  const { t } = useTranslation();
  const cat = options?.interestCategoryUuid ?? undefined;
  const sort = options?.sort ?? 'recent';
  const pollMs = options?.pollIntervalMs === undefined ? DEFAULT_POLL_MS : options.pollIntervalMs;
  const enabled = options?.enabled !== false;
  const lightweight = options?.lightweight === true;

  const [previews, setPreviews] = useState<LiveStreamPreviewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setPreviews([]);
        return;
      }
      try {
        const opts =
          (cat != null && cat.length > 0) || sort !== 'recent'
            ? {
                ...(cat != null && cat.length > 0 ? { interestCategoryUuid: cat } : {}),
                ...(sort !== 'recent' ? { sort } : {}),
              }
            : undefined;
        const rooms = lightweight
          ? await getRoomsFeed(token, opts)
          : await getRooms(token, opts);
        setPreviews(rooms.map((r) => mapPlatformRoomToPreview(r, t)));
      } catch (e) {
        console.warn('[useBuyerLiveRoomPreviews] load failed:', e);
        setPreviews([]);
      }
    } catch {
      setPreviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, cat, sort, lightweight]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setPreviews([]);
      return;
    }
    setLoading(true);
    load().catch(() => {});
  }, [load, enabled]);

  useEffect(() => {
    if (!enabled || pollMs == null || pollMs <= 0) {
      return undefined;
    }
    const interval = setInterval(() => {
      load().catch(() => {});
    }, pollMs);
    return () => clearInterval(interval);
  }, [load, pollMs, enabled]);

  const onRefresh = () => {
    setRefreshing(true);
    load().catch(() => {});
  };

  return { previews, loading, refreshing, load, onRefresh };
}
