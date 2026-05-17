import React, { useId } from 'react';
import { TouchableOpacity, Text as RNText, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { FONT_FAMILY } from '../../../theme/typography';
import { START_LIVE_COLORS } from './startLiveStyles';

export interface StartLiveCategoryTileProps {
  label: string;
  icon: string;
  selected: boolean;
  size: number;
  onPress: () => void;
}

/** Figma 536-24402 — tarjeta 107×107, borde #CBCEFF, gradiente al seleccionar. */
const SelectedTileGlow: React.FC<{ gradId: string }> = ({ gradId }) => (
  <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Defs>
      <LinearGradient id={`${gradId}-base`} x1="0.5" y1="0" x2="0.5" y2="1">
        <Stop offset="0.2" stopColor="#685CF0" stopOpacity={1} />
        <Stop offset="0.58" stopColor="#685CF0" stopOpacity={0.12} />
      </LinearGradient>
      <RadialGradient id={`${gradId}-blue`} cx="88%" cy="81%" rx="75%" ry="75%">
        <Stop offset="0" stopColor="#1F38AB" stopOpacity={0.45} />
        <Stop offset="0.55" stopColor="#8F9CD5" stopOpacity={0.22} />
        <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id={`${gradId}-gold`} cx="25%" cy="69%" rx="75%" ry="75%">
        <Stop offset="0" stopColor="#FBBF24" stopOpacity={0.55} />
        <Stop offset="0.5" stopColor="#FDDF92" stopOpacity={0.28} />
        <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Rect width="100%" height="100%" fill={`url(#${gradId}-base)`} />
    <Rect width="100%" height="100%" fill={`url(#${gradId}-blue)`} />
    <Rect width="100%" height="100%" fill={`url(#${gradId}-gold)`} />
  </Svg>
);

export const StartLiveCategoryTile: React.FC<StartLiveCategoryTileProps> = ({
  label,
  icon,
  selected,
  size,
  onPress,
}) => {
  const reactId = useId();
  const gradId = `sl-cat-${reactId.replace(/:/g, '')}`;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.tile, { width: size, height: size }]}
    >
      {selected ? <SelectedTileGlow gradId={gradId} /> : null}
      <View style={styles.inner}>
        <RNText style={styles.emoji}>{icon}</RNText>
        <RNText
          style={[styles.label, selected ? styles.labelSelected : styles.labelDefault]}
          numberOfLines={2}
        >
          {label}
        </RNText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: START_LIVE_COLORS.border,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    includeFontPadding: false,
  },
  label: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  labelDefault: {
    color: START_LIVE_COLORS.text,
  },
  labelSelected: {
    color: '#18181B',
  },
});
