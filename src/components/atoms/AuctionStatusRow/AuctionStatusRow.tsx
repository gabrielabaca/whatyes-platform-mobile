import React from 'react';
import { View, Text as RNText, StyleSheet } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';

export interface AuctionStatusRowProps {
  label: string;
}

/** Fila 🏆 + estado de subasta (ganando / sin ofertas). Reutilizable en paneles buyer y seller. */
export const AuctionStatusRow: React.FC<AuctionStatusRowProps> = ({ label }) => (
  <View style={styles.row}>
    <RNText style={styles.trophy}>🏆</RNText>
    <RNText style={styles.label} numberOfLines={1}>
      {label}
    </RNText>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trophy: {
    fontSize: 14,
  },
  label: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    flex: 1,
    includeFontPadding: false,
  },
});
