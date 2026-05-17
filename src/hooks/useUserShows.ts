import { useCallback, useEffect, useState } from 'react';
import { getUserShows, type UserShowItem } from '../api/platformApi';
import { storage } from '../utils/storage';

export function useUserShows(userId: string | null, enabled = true) {
  const [shows, setShows] = useState<UserShowItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !enabled) {
      setShows([]);
      return;
    }
    setLoading(true);
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setShows([]);
        return;
      }
      const list = await getUserShows(token, userId, { limit: 20 });
      setShows(list);
    } catch (e) {
      console.warn('[useUserShows]', e);
      setShows([]);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return { shows, loading, reload: load };
}
