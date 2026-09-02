import {
  getUserProfileProducts,
  type UserProfileProductItem,
} from '../api/platformApi';
import { usePagedProfileList } from './usePagedProfileList';

// Referencias estables a nivel módulo: si se pasaran inline, el hook paginado
// re-dispararía su efecto en cada render.
const fetchProductsPage = (
  token: string,
  userId: string,
  options: { limit: number; offset: number }
) => getUserProfileProducts(token, userId, options);

const productKey = (item: UserProfileProductItem) => item.room_uuid;

export function useUserProfileProducts(userId: string | null, enabled = true) {
  const { items, loading, loadingMore, hasMore, loadMore, reload } =
    usePagedProfileList(
      userId,
      enabled,
      fetchProductsPage,
      productKey,
      '[useUserProfileProducts]'
    );
  return { items, loading, loadingMore, hasMore, loadMore, reload };
}
