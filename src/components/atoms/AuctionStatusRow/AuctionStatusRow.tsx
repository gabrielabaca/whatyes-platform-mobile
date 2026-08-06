import React, { useEffect, useRef } from 'react';
import { View, Text as RNText, StyleSheet, Animated } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';

export interface AuctionStatusRowProps {
  label: string;
  /** Identidad del que va ganando; al cambiar dispara la animación de relevo. */
  winningKey?: string | null;
  /** Emoji de la izquierda. Compra directa usa ⚡ en lugar del trofeo. */
  icon?: string;
}

/** Fila 🏆 + estado de la oferta (ganando / sin ofertas / venta directa). Anima el cambio de líder. */
export const AuctionStatusRow: React.FC<AuctionStatusRowProps> = ({
  label,
  winningKey,
  icon = '🏆',
}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const prevKeyRef = useRef<string | null | undefined>(winningKey);

  useEffect(() => {
    if (prevKeyRef.current === winningKey) return;
    const hadLeader = prevKeyRef.current != null && prevKeyRef.current !== '';
    prevKeyRef.current = winningKey;
    if (!winningKey || !hadLeader) {
      // Primer líder (o sin líder): no animar el relevo, solo dejar visible.
      pulse.setValue(0);
      return;
    }
    pulse.setValue(0);
    Animated.sequence([
      Animated.spring(pulse, { toValue: 1, useNativeDriver: true, friction: 4, tension: 160 }),
      Animated.timing(pulse, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [winningKey, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const highlight = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [STREAM_COLORS.white, '#FDC700'],
  });

  return (
    <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
      <RNText style={styles.trophy}>{icon}</RNText>
      <Animated.Text style={[styles.label, { color: highlight }]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
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
