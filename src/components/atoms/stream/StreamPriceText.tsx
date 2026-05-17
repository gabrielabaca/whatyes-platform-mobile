import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';

export interface StreamPriceTextProps {
  amount: number;
  currency?: string;
}

export function formatStreamPrice(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const StreamPriceText: React.FC<StreamPriceTextProps> = ({ amount, currency }) => (
  <RNText style={styles.price}>{formatStreamPrice(amount, currency)}</RNText>
);

const styles = StyleSheet.create({
  price: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: STREAM_COLORS.priceGold,
    includeFontPadding: false,
  },
});
