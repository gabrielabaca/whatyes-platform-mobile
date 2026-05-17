import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getRooms } from '../api/platformApi';
import { storage } from '../utils/storage';
import { mapPlatformRoomToPreview } from '../utils/buyerLiveRoomPreviewMap';
import type { LiveStreamPreviewModel } from '../components/organisms/home/types';

const DEFAULT_POLL_MS = 15000;

export interface UseBuyerLiveRoomPreviewsOptions {
  /** Si se define, GET /rooms filtra por categoría en service-platform. */
  interestCategoryUuid?: string | null;
  /** Intervalo de refresco automático; `null` desactiva el polling. */
  pollIntervalMs?: number | null;
  /** Desactiva carga y polling (p. ej. home vendedor). */
  enabled?: boolean;
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
  const pollMs = options?.pollIntervalMs === undefined ? DEFAULT_POLL_MS : options.pollIntervalMs;
  const enabled = options?.enabled !== false;

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
        const rooms = await getRooms(
          token,
          cat != null && cat.length > 0 ? { interestCategoryUuid: cat } : undefined
        );
        setPreviews(rooms.map((r) => mapPlatformRoomToPreview(r, t)));
      } catch (e) {
        console.warn('[useBuyerLiveRoomPreviews] getRooms failed:', e);
        setPreviews([]);
      }
    } catch {
      setPreviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, cat]);

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
