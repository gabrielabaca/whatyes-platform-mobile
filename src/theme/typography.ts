import { Platform } from 'react-native';

/**
 * Punto unico de configuracion tipografica.
 * Si en el futuro agregamos fuentes estaticas (Regular/SemiBold/Bold),
 * solo hay que ajustar estos valores.
 */
export const FONT_FAMILY = {
  regular: Platform.select({
    ios: 'Mulish-Regular',
    android: 'Mulish-Regular',
    default: 'Mulish-Regular',
  }) as string,
  semibold: Platform.select({
    ios: 'Mulish-SemiBold',
    android: 'Mulish-SemiBold',
    default: 'Mulish-SemiBold',
  }) as string,
  bold: Platform.select({
    ios: 'Mulish-Bold',
    android: 'Mulish-Bold',
    default: 'Mulish-Bold',
  }) as string,
};

export const FONT_WEIGHT = {
  regular: '400' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
