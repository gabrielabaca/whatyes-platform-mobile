import type { LiveStreamPreviewModel } from '../components/organisms/home/types';
import type { StreamData } from '../components/molecules/StreamCard';

/**
 * Mapea un preview de la Home (`LiveStreamPreviewModel`) al `StreamData` que consumen
 * StreamScreen / StreamSwipeScreen. Centralizado para que Home y el feed de swipe
 * produzcan exactamente la misma forma de dato.
 */
export function previewToStreamData(
  p: LiveStreamPreviewModel,
  liveBadge: string
): StreamData {
  return {
    id: p.id,
    sellerName: p.sellerName,
    viewerCount: p.viewerCount,
    streamingTime: liveBadge,
    thumbnail: p.thumbnail ?? p.sellerAvatarUrl ?? undefined,
    coverUrl: p.coverUrl ?? null,
    title: p.title,
    sellerAvatarUrl: p.sellerAvatarUrl,
    sellerRating: p.rating ?? null,
    sellerUserId: p.sellerUserId,
    productImageUrl: p.thumbnail ?? p.sellerAvatarUrl ?? undefined,
    productCount: 1,
  };
}
