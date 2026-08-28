/**
 * El camino real en Hermes 0.14 es `sliceByCodePointsSafe` (sin Segmenter).
 * Estos tests lo invocan directo: un `sliceGraphemes` en Node usaría Segmenter
 * y dejaría el fallback sin cubrir.
 */
import {
  BIO_EDIT_MAX_CODE_POINTS,
  BIO_EDIT_MAX_GRAPHEMES,
  clampToGraphemes,
  sliceByCodePointsSafe,
} from '../src/utils/grapheme';

const FAMILY = '👨‍👩‍👧';
const FLAG_AR = '🇦🇷';
const WAVE_LIGHT = '👋🏻';
const HEART = '❤️';

describe('sliceByCodePointsSafe (camino Hermes, sin Segmenter)', () => {
  it('texto ASCII puro: corta exactamente en max', () => {
    const text = 'a'.repeat(350);
    const sliced = sliceByCodePointsSafe(text, 300);
    expect(sliced).toBe('a'.repeat(300));
    expect([...sliced].length).toBe(300);
  });

  it('familia ZWJ en el borde: no deja solo 👨', () => {
    const text = 'a'.repeat(299) + FAMILY;
    const sliced = sliceByCodePointsSafe(text, 300);
    expect(sliced).toBe('a'.repeat(299));
    expect(sliced.includes('👨')).toBe(false);
    expect(sliced.includes(FAMILY)).toBe(false);
  });

  it('familia ZWJ completa cabe si max la cubre', () => {
    const text = 'a'.repeat(10) + FAMILY;
    const sliced = sliceByCodePointsSafe(text, 100);
    expect(sliced).toBe(text);
    expect(sliced.includes(FAMILY)).toBe(true);
  });

  it('bandera (indicadores regionales) en el borde: no deja un RI suelto', () => {
    const text = 'a'.repeat(299) + FLAG_AR;
    const sliced = sliceByCodePointsSafe(text, 300);
    expect(sliced).toBe('a'.repeat(299));
    expect(sliced).not.toContain('\u{1F1E6}');
  });

  it('tono de piel en el borde: no deja el emoji sin modificador', () => {
    const text = 'a'.repeat(299) + WAVE_LIGHT;
    const sliced = sliceByCodePointsSafe(text, 300);
    expect(sliced).toBe('a'.repeat(299));
    expect(sliced.includes('👋')).toBe(false);
  });

  it('selector de variación en el borde: no deja ❤ sin VS-16', () => {
    const text = 'a'.repeat(299) + HEART;
    const sliced = sliceByCodePointsSafe(text, 300);
    expect(sliced).toBe('a'.repeat(299));
  });

  it('max <= 0 devuelve vacío', () => {
    expect(sliceByCodePointsSafe('abc', 0)).toBe('');
    expect(sliceByCodePointsSafe('abc', -1)).toBe('');
  });
});

describe('clampToGraphemes (tope defensivo de code points)', () => {
  it('no supera BIO_EDIT_MAX_CODE_POINTS aunque max en grafemas sea 2000', () => {
    const huge = FAMILY.repeat(2000);
    const clamped = clampToGraphemes(huge, BIO_EDIT_MAX_GRAPHEMES);
    expect([...clamped].length).toBeLessThanOrEqual(BIO_EDIT_MAX_CODE_POINTS);
  });

  it('ASCII de 2000 code points se conserva', () => {
    const text = 'a'.repeat(BIO_EDIT_MAX_CODE_POINTS);
    expect(clampToGraphemes(text, BIO_EDIT_MAX_GRAPHEMES)).toBe(text);
  });
});
