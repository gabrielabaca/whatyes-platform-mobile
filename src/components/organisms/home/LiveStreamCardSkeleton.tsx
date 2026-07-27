/**
 * Placeholder animado (pulso) con la silueta de una LiveStreamPreviewCard
 * variant="grid", para mostrar mientras cargan los vivos.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

/** Misma altura que LiveStreamPreviewCard variant="grid" (GRID_H). */
const GRID_H = 224;

export const LiveStreamCardSkeleton: React.FC = () => {
  const { isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const base = isDark ? '#26263a' : '#E7E7EF';
  const block = isDark ? '#3a3a52' : '#D3D3DF';

  return (
    <Animated.View style={[styles.card, { backgroundColor: base, opacity: pulse }]}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: block }]} />
        <View style={[styles.badgeSmall, { backgroundColor: block }]} />
      </View>
      <View style={styles.bottomSection}>
        <View style={styles.sellerRow}>
          <View style={[styles.avatar, { backgroundColor: block }]} />
          <View style={[styles.lineShort, { backgroundColor: block }]} />
        </View>
        <View style={[styles.lineLong, { backgroundColor: block }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: GRID_H,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    width: 56,
    height: 24,
    borderRadius: 999,
  },
  badgeSmall: {
    width: 44,
    height: 24,
    borderRadius: 999,
  },
  bottomSection: {
    gap: 10,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  lineShort: {
    flex: 1,
    maxWidth: 90,
    height: 12,
    borderRadius: 6,
  },
  lineLong: {
    width: '80%',
    height: 10,
    borderRadius: 5,
  },
});
