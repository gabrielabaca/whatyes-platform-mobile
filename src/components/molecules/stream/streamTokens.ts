/** Tokens UI live stream buyer — Figma 536-18831 */
export const STREAM_COLORS = {
  primary: '#685CF0',
  primaryDark: '#454087',
  bidGradientEnd: '#FFC900',
  priceGold: '#FDC700',
  pillOverlay: 'rgba(0,0,0,0.4)',
  chatInputBg: 'rgba(24,24,27,0.9)',
  chatInputBorder: '#27272a',
  placeholder: '#71717b',
  hint: '#D8D8D8',
  white: '#FFFFFF',
  liveStop: '#FB2C36',
  /** Figma 890-1380: acciones secundarias del vendedor sobre el video (violeta al 20%). */
  ctaSoft: 'rgba(104,92,240,0.2)',
  /** Figma 890-1427: fin del degradado de "Siguiente Subasta" (ámbar al 20%). */
  ctaSoftGradientEnd: 'rgba(255,201,0,0.2)',
  /** "+3s" que suma una puja al reloj de la subasta (verde `success` del tema). */
  timeExtension: '#00C566',
} as const;

export const STREAM_RADIUS = {
  pill: 9999,
  card: 12,
  bubble: 16,
} as const;
