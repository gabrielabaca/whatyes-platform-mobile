import type { TFunction } from 'i18next';
import type { PlatformRoom } from '../api/platformApi';
import type { LiveStreamPreviewModel } from '../components/organisms/home/types';

/**
 * Mapea `PlatformRoom` (+ `creator` de service-users) al modelo de tarjetas de la Home.
 */
export function mapPlatformRoomToPreview(r: PlatformRoom, t: TFunction): LiveStreamPreviewModel {
  const cr = r.creator;
  const creatorFullName = cr
    ? `${cr.name ?? ''} ${cr.last_name ?? ''}`.trim() || (cr.name?.trim() ?? '')
    : '';

  const sellerName =
    creatorFullName.length > 0
      ? creatorFullName
      : (r.name?.trim() || r.stream_name?.trim() || t('home.defaultRoomName'));

  const sellerInitials = cr
    ? `${(cr.name?.trim()?.[0] ?? '')}${(cr.last_name?.trim()?.[0] ?? '')}`.toUpperCase() ||
      (cr.name?.trim()?.slice(0, 2).toUpperCase() ?? '')
    : sellerName.replace(/\s+/g, '').slice(0, 2).toUpperCase();

  const title =
    (r.name && r.name.trim()) ||
    (r.stream_name && r.stream_name.trim()) ||
    t('home.defaultStreamTitle');

  const interestCategories =
    r.interest_categories && r.interest_categories.length > 0
      ? r.interest_categories.map((c) => ({
          uuid: String(c.uuid),
          slug: String(c.slug ?? ''),
          label: String(c.label ?? ''),
          icon: String(c.icon ?? ''),
        }))
      : undefined;

  const coverThumb = r.cover_url?.trim() || undefined;
  // Miniatura viva (thumbnail IVS del último frame): pisa al cover en las cards.
  // coverUrl conserva el cover elegido por el seller (splash del StreamScreen).
  const liveThumb = r.live_thumbnail_url?.trim() || undefined;

  return {
    id: r.uuid,
    sellerName,
    title,
    viewerCount: r.viewer_count ?? 0,
    thumbnail: liveThumb ?? coverThumb,
    coverUrl: coverThumb ?? null,
    rating: 4.2 + ((r.viewer_count ?? 0) % 8) / 10,
    categoryLabel: interestCategories?.[0]?.label ?? null,
    interestCategories,
    sellerAvatarUrl: cr?.profile_picture ?? null,
    sellerUserId: cr?.uuid ?? r.created_by_user_id,
    sellerInitials: sellerInitials.length > 0 ? sellerInitials : sellerName.slice(0, 2).toUpperCase(),
    createdAt: r.created_at,
  };
}
