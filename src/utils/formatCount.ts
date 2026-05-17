/** Formato compacto estilo Figma: 545.9K, 13.2K, 61.8K */
export function formatCompactCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    return '0';
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(Math.round(n));
}
