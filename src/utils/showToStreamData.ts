import type { UserShowItem } from '../api/platformApi';
import type { StreamData } from '../components/molecules/StreamCard';

/**
 * Mapea un show del perfil público (`UserShowItem`) al `StreamData` que consume
 * StreamScreen. Centralizado para que la Home y el perfil del vendedor abierto
 * sobre un vivo produzcan exactamente la misma forma de dato.
 */
export function showToStreamData(
  show: UserShowItem,
  liveBadge: string,
  defaultSellerName: string
): StreamData {
  const seller = show.creator;
  return {
    id: show.room_uuid,
    sellerName: seller ? `${seller.name} ${seller.last_name}`.trim() : defaultSellerName,
    viewerCount: show.viewer_count ?? 0,
    streamingTime: liveBadge,
    thumbnail: show.thumbnail_url ?? undefined,
    title: show.name ?? undefined,
    sellerAvatarUrl: seller?.profile_picture ?? null,
    sellerUserId: seller?.uuid,
    productImageUrl: show.thumbnail_url ?? undefined,
    productCount: 1,
  };
}
