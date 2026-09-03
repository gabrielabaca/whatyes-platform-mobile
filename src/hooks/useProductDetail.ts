import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicProduct, type PublicProductDetail } from '../api/productsApi';
import { getUserReviews, type ReviewCategoryAverages } from '../api/profileApi';
import { storage } from '../utils/storage';

export interface ProductDetailState {
  product: PublicProductDetail | null;
  ratings: ReviewCategoryAverages | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useProductDetail(productId: string, sellerUserId?: string): ProductDetailState {
  const [product, setProduct] = useState<PublicProductDetail | null>(null);
  const [ratings, setRatings] = useState<ReviewCategoryAverages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reloadCount = useRef(0);

  const load = useCallback(() => {
    reloadCount.current += 1;
    const current = reloadCount.current;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const detail = await getPublicProduct(productId);
        if (current !== reloadCount.current) return;
        setProduct(detail);

        // Ratings del vendedor: los carga profileApi (ya los tiene en caché
        // o los trae con un GET separado a service-users).
        const sellerId = sellerUserId ?? detail.seller_user_id;
        try {
          const token = await storage.getAccessToken();
          const reviewsData = await getUserReviews(sellerId, token ?? undefined, { limit: 1 });
          if (current !== reloadCount.current) return;
          setRatings(reviewsData.category_averages);
        } catch {
          // Ratings son opcionales: la pantalla degrada mostrando nada.
        }
      } catch (e: unknown) {
        if (current !== reloadCount.current) return;
        const msg = e instanceof Error ? e.message : 'Error al cargar el producto';
        setError(msg);
      } finally {
        if (current === reloadCount.current) setLoading(false);
      }
    })();
  }, [productId, sellerUserId]);

  useEffect(() => {
    load();
  }, [load]);

  return { product, ratings, loading, error, reload: load };
}
