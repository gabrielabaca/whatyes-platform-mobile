/**
 * Paso de puja derivado del precio base del producto (pesos enteros).
 *
 * El WebSocket puja en pesos; `base_price_cents` llega en centavos. Quien llama
 * convierte antes (`Math.round(cents / 100)` → `floorMajor`).
 *
 * paso = redondear(5% del precio base) × multiplicador 1×/2×/3×
 */

export const BID_INCREMENT_FALLBACK = 1000;
export const DEFAULT_BID = 10000;
export const BID_MULTIPLIERS = [1, 2, 3] as const;
export type BidMultiplier = (typeof BID_MULTIPLIERS)[number];

/**
 * Cortes de redondeo sobre el 5% crudo:
 *  - < 100     → a 10   (productos ~hasta $2.000)
 *  - < 10.000  → a 100  (el caso típico de $20.000 queda en $1.000)
 *  - ≥ 10.000  → a 1.000
 * El resultado nunca es 0 ni negativo: cae al unit del bucket.
 */
export function bidStepFromFloorMajor(floorMajor: number): number {
  if (!Number.isFinite(floorMajor) || floorMajor <= 0) {
    return BID_INCREMENT_FALLBACK;
  }
  const raw = floorMajor * 0.05;
  const unit = raw < 100 ? 10 : raw < 10_000 ? 100 : 1_000;
  const rounded = Math.round(raw / unit) * unit;
  return Math.max(rounded, unit);
}

export function bidIncrementAmount(
  floorMajor: number,
  multiplier: BidMultiplier,
): number {
  return bidStepFromFloorMajor(floorMajor) * multiplier;
}

export function parseBidMultiplier(value: unknown): BidMultiplier {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n === 2 || n === 3) return n;
  return 1;
}

/**
 * Monto que ofrece el CTA. Sin puja previa usa el precio base + el paso;
 * si no hay precio base, el default histórico ($10.000).
 */
export function suggestedBidAmount(opts: {
  lastBidAmount: number | null;
  floorMajor: number;
  multiplier: BidMultiplier;
}): number {
  const increment = bidIncrementAmount(opts.floorMajor, opts.multiplier);
  if (opts.lastBidAmount != null && opts.lastBidAmount > 0) {
    return opts.lastBidAmount + increment;
  }
  if (opts.floorMajor > 0) {
    return opts.floorMajor + increment;
  }
  return DEFAULT_BID;
}
