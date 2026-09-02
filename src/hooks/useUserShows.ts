import { getUserShows, type UserShowItem } from '../api/platformApi';
import { usePagedProfileList } from './usePagedProfileList';

// Referencias estables a nivel módulo: si se pasaran inline, el hook paginado
// re-dispararía su efecto en cada render.
const fetchShowsPage = (
  token: string,
  userId: string,
  options: { limit: number; offset: number }
) => getUserShows(token, userId, options);

const showKey = (show: UserShowItem) => show.room_uuid;

export function useUserShows(userId: string | null, enabled = true) {
  const { items, loading, loadingMore, hasMore, loadMore, reload } =
    usePagedProfileList(userId, enabled, fetchShowsPage, showKey, '[useUserShows]');
  return { shows: items, loading, loadingMore, hasMore, loadMore, reload };
}
