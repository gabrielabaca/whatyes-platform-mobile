import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';

export interface StreamPriceTextProps {
  amount: number;
  currency?: string | null;
}

/**
 * Moneda por defecto cuando el llamador no la conoce. Coincide con el default de
 * `Product.currency` en service-platform y con el resto de la app: antes era COP y
 * el vivo mostraba "1000 COP" para productos en pesos argentinos.
 */
export const DEFAULT_STREAM_CURRENCY = 'ARS';

/** `locale` opcional: los llamadores que no lo pasan usan el idioma activo de i18next. */
export function formatStreamPrice(
  amount: number,
  currency: string | null | undefined = DEFAULT_STREAM_CURRENCY,
  locale: string = i18n.language || 'es',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || DEFAULT_STREAM_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const StreamPriceText: React.FC<StreamPriceTextProps> = ({ amount, currency }) => {
  const { i18n: i18nInstance } = useTranslation();
  const locale = i18nInstance.language || 'es';
  return <RNText style={styles.price}>{formatStreamPrice(amount, currency, locale)}</RNText>;
};

const styles = StyleSheet.create({
  price: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: STREAM_COLORS.priceGold,
    includeFontPadding: false,
  },
});
