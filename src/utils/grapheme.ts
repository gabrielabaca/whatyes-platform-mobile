/**
 * Conteo y corte por clusters de grafemas.
 *
 * `String.length` / `.slice()` operan en unidades UTF-16: un emoji simple vale 2 y
 * `.slice()` puede partir un par sustituto. `[...string]` itera por code points y
 * resuelve esos pares, pero no las secuencias ZWJ (👨‍👩‍👧 son 5).
 *
 * Hermes 0.14 (RN 0.83) no implementa `Intl.Segmenter` en ninguna plataforma: ICU
 * habilita Collator / DateTimeFormat / NumberFormat, no Segmenter. El camino real
 * hoy es el fallback por code points. La detección de Segmenter queda como
 * future-proofing por si un Hermes futuro lo agrega.
 */

const ZWJ = 0x200d;
const VARIATION_SELECTOR_16 = 0xfe0f;
const SKIN_TONE_START = 0x1f3fb;
const SKIN_TONE_END = 0x1f3ff;
const REGIONAL_INDICATOR_START = 0x1f1e6;
const REGIONAL_INDICATOR_END = 0x1f1ff;

type GraphemeSegmenter = {
  segment: (input: string) => Iterable<{ segment: string }>;
};

function tryCreateSegmenter(): GraphemeSegmenter | null {
  const IntlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (
      locales?: string | string[],
      options?: { granularity?: 'grapheme' | 'word' | 'sentence' }
    ) => GraphemeSegmenter;
  };
  if (typeof IntlWithSegmenter.Segmenter !== 'function') {
    return null;
  }
  try {
    return new IntlWithSegmenter.Segmenter(undefined, { granularity: 'grapheme' });
  } catch {
    return null;
  }
}

const segmenter = tryCreateSegmenter();

export function usesIntlSegmenter(): boolean {
  return segmenter != null;
}

function codePointOf(cp: string): number {
  return cp.codePointAt(0) ?? 0;
}

function isZwj(cp: number): boolean {
  return cp === ZWJ;
}

function isVariationSelector(cp: number): boolean {
  return cp === VARIATION_SELECTOR_16;
}

function isSkinToneModifier(cp: number): boolean {
  return cp >= SKIN_TONE_START && cp <= SKIN_TONE_END;
}

function isRegionalIndicator(cp: number): boolean {
  return cp >= REGIONAL_INDICATOR_START && cp <= REGIONAL_INDICATOR_END;
}

function cutSplitsSequence(cps: string[], end: number): boolean {
  if (end <= 0 || end >= cps.length) {
    return false;
  }
  const lastKept = codePointOf(cps[end - 1]);
  const firstDiscarded = codePointOf(cps[end]);

  if (isZwj(lastKept)) {
    return true;
  }
  if (isZwj(firstDiscarded) || isVariationSelector(firstDiscarded) || isSkinToneModifier(firstDiscarded)) {
    return true;
  }

  let regionalRun = 0;
  for (let i = end - 1; i >= 0; i -= 1) {
    if (!isRegionalIndicator(codePointOf(cps[i]))) {
      break;
    }
    regionalRun += 1;
  }
  return regionalRun % 2 === 1;
}

/**
 * Corta por code points sin partir secuencias ZWJ, VS-16, tono de piel ni banderas.
 * El resultado puede quedar por debajo de `max`. Camino de producción en Hermes 0.14.
 */
export function sliceByCodePointsSafe(text: string, max: number): string {
  if (max <= 0) {
    return '';
  }
  const cps = [...text];
  if (cps.length <= max) {
    return text;
  }
  let end = max;
  while (cutSplitsSequence(cps, end)) {
    end -= 1;
  }
  return cps.slice(0, end).join('');
}

function capToMaxCodePoints(text: string, maxCodePoints: number): string {
  const cps = [...text];
  if (cps.length <= maxCodePoints) {
    return text;
  }
  const parts = graphemesOf(text);
  let total = 0;
  let keep = 0;
  for (const part of parts) {
    const n = [...part].length;
    if (total + n > maxCodePoints) {
      break;
    }
    total += n;
    keep += 1;
  }
  return parts.slice(0, keep).join('');
}

export function graphemesOf(text: string): string[] {
  if (!text) {
    return [];
  }
  if (segmenter) {
    const out: string[] = [];
    for (const part of segmenter.segment(text)) {
      out.push(part.segment);
    }
    return out;
  }
  return [...text];
}

export function graphemeCount(text: string): number {
  return graphemesOf(text).length;
}

export function sliceGraphemes(text: string, max: number): string {
  if (max <= 0) {
    return '';
  }
  if (segmenter) {
    const parts = graphemesOf(text);
    if (parts.length <= max) {
      return text;
    }
    return parts.slice(0, max).join('');
  }
  return sliceByCodePointsSafe(text, max);
}

/**
 * Recorte para edición: grafemas (`max`) y, después, code points del backend
 * (`BIO_EDIT_MAX_CODE_POINTS`). Si un Hermes futuro trae Segmenter, 2000 grafemas
 * con ZWJ superarían el `max_length=2000` de Pydantic; el segundo tope lo evita.
 */
export function clampToGraphemes(text: string, max: number): string {
  return capToMaxCodePoints(sliceGraphemes(text, max), BIO_EDIT_MAX_CODE_POINTS);
}

/** Tope de preview en el perfil (decisión de producto, no del backend). */
export const BIO_PREVIEW_MAX_GRAPHEMES = 300;

/** `UpdateOwnProfileRequest.bio` max_length=2000 en service-users (code points). */
export const BIO_EDIT_MAX_CODE_POINTS = 2000;

/** Tope de edición en grafemas; el clamp también respeta `BIO_EDIT_MAX_CODE_POINTS`. */
export const BIO_EDIT_MAX_GRAPHEMES = 2000;
