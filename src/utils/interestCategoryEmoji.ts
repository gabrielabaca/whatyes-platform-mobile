import type { InterestCategoryItem } from '../api/types';

/** Emoji por slug cuando la API no envía `icon` (retrocompatibilidad). */
export function interestCategoryEmojiFromSlug(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes('sneaker') || s.includes('zapat')) return '👟';
  if (s.includes('card')) return '🃏';
  if (s.includes('tech') || s.includes('tecnolog')) return '📱';
  if (s.includes('shirt') || s.includes('ropa') || s.includes('moda')) return '👕';
  if (s.includes('bellez')) return '💄';
  if (s.includes('hogar')) return '🏠';
  if (s.includes('deport')) return '⚽';
  if (s.includes('aliment')) return '🍕';
  if (s.includes('music')) return '🎵';
  if (s.includes('arte')) return '🎨';
  if (s.includes('entreten')) return '🎬';
  if (s.includes('otros')) return '📦';
  return '📦';
}

/** Icono mostrable: prioriza `icon` de service-platform, si no hay usa heurística por slug. */
export function displayInterestCategoryIcon(cat: Pick<InterestCategoryItem, 'slug' | 'icon'>): string {
  const fromApi = cat.icon?.trim();
  if (fromApi) return fromApi;
  return interestCategoryEmojiFromSlug(cat.slug);
}
