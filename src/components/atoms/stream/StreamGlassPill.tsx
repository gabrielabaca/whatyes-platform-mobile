import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { STREAM_COLORS, STREAM_RADIUS } from '../../molecules/stream/streamTokens';

export interface StreamGlassPillProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const StreamGlassPill: React.FC<StreamGlassPillProps> = ({ children, style }) => (
  <View style={[styles.pill, style]}>{children}</View>
);

const styles = StyleSheet.create({
  pill: {
    backgroundColor: STREAM_COLORS.pillOverlay,
    borderRadius: STREAM_RADIUS.pill,
  },
});
