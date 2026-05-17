import { useCallback, useEffect, useState } from 'react';
import { getUserReviews, type UserReviewsListResponse } from '../api/profileApi';
import { storage } from '../utils/storage';

export function useUserReviews(userId: string | null, enabled = true) {
  const [data, setData] = useState<UserReviewsListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !enabled) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setData(null);
        return;
      }
      const result = await getUserReviews(userId, token, { limit: 30 });
      setData(result);
    } catch (e) {
      console.warn('[useUserReviews]', e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return { data, loading, reload: load };
}
