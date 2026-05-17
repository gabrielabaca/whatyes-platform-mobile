/**
 * Fondo vidrio — blur nativo + tint Figma rgba(2,5,15,0.4).
 * Requiere rebuild nativo: npm run android / npm run ios (no solo reload Metro).
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';

/** Figma 536:22799 */
const TINT = 'rgba(2, 5, 15, 0.4)';
const FALLBACK = 'rgba(2, 5, 15, 0.88)';

export const GlassBackdrop: React.FC = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <BlurView
      style={StyleSheet.absoluteFill}
      blurType="dark"
      blurAmount={Platform.select({ ios: 30, android: 32, default: 30 })}
      overlayColor={Platform.OS === 'android' ? TINT : undefined}
      reducedTransparencyFallbackColor={FALLBACK}
    />
    {Platform.OS === 'ios' ? <View style={[StyleSheet.absoluteFill, styles.tint]} /> : null}
  </View>
);

const styles = StyleSheet.create({
  tint: {
    backgroundColor: TINT,
  },
});
