import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';

export type LiveToggleButtonVariant = 'live' | 'paused';

export interface StopLiveButtonProps {
  variant?: LiveToggleButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** Botón central live: rojo en vivo (636-30230) / gris en pausa (636-29882). */
export const StopLiveButton: React.FC<StopLiveButtonProps> = ({
  variant = 'live',
  onPress,
  disabled,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={styles.outer}
  >
    <View style={[styles.inner, variant === 'paused' ? styles.innerPaused : styles.innerLive]} />
  </TouchableOpacity>
);

const OUTER = 62;
const INNER = 52;
const RING = 4;

const styles = StyleSheet.create({
  outer: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    borderWidth: RING,
    borderColor: STREAM_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    borderWidth: RING,
    borderColor: STREAM_COLORS.ringMuted,
  },
  innerLive: {
    backgroundColor: STREAM_COLORS.liveStop,
  },
  innerPaused: {
    backgroundColor: 'transparent',
  },
});
