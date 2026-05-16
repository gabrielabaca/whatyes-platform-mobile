/** Emoji aproximado por slug de categoría de interés (chips y tarjetas home). */
export function interestCategoryEmojiFromSlug(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes('sneaker') || s.includes('zapat')) return '👟';
  if (s.includes('card')) return '🃏';
  if (s.includes('tech')) return '📱';
  if (s.includes('shirt') || s.includes('ropa')) return '👕';
  return '📦';
}
