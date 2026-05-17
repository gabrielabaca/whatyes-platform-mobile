import { useCallback, useEffect, useState } from 'react';
import { getUserProfileProducts, type UserProfileProductItem } from '../api/platformApi';
import { storage } from '../utils/storage';

export function useUserProfileProducts(userId: string | null, enabled = true) {
  const [items, setItems] = useState<UserProfileProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !enabled) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setItems([]);
        return;
      }
      const list = await getUserProfileProducts(token, userId, { limit: 20 });
      setItems(list);
    } catch (e) {
      console.warn('[useUserProfileProducts]', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return { items, loading, reload: load };
}
