/**
 * Actividad (Figma 698-2823): compras del comprador o ventas del vendedor.
 */
import { useCallback, useEffect, useState } from 'react';
import { getMyPurchases, getMySales, type PurchaseItem } from '../api/platformApi';
import { storage } from '../utils/storage';

export type ActivityRole = 'purchases' | 'sales';

export function useMyActivity(role: ActivityRole, enabled = true) {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await storage.getAccessToken();
      if (!token) throw new Error('No autenticado');
      const data =
        role === 'purchases'
          ? await getMyPurchases(token, { limit: 100 })
          : await getMySales(token, { limit: 100 });
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (enabled) {
      void reload();
    }
  }, [enabled, reload]);

  return { items, loading, error, reload };
}
