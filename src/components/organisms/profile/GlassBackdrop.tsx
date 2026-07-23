/**
 * Fondo vidrio — blur nativo + tint.
 * Tokens en src/theme/glassTokens.ts (editar ahí para tunear el drawer).
 */
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import {
  drawerPanelGlass,
  drawerPanelGlassKey,
  drawerPanelBlurProps,
  modalGlass,
} from '../../../theme/glassTokens';

export const DRAWER_PANEL_TINT =
  Platform.OS === 'android'
    ? drawerPanelGlass.android.overlayColor
    : drawerPanelGlass.ios.tintOverlay;
export const DRAWER_PANEL_TINT_IOS = drawerPanelGlass.ios.tintOverlay;
export const DRAWER_PANEL_FALLBACK = drawerPanelGlass.fallback;

export type GlassBackdropVariant = 'modal';

export interface GlassBackdropProps {
  variant?: GlassBackdropVariant;
}

export const GlassBackdrop: React.FC<GlassBackdropProps> = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <BlurView
      style={StyleSheet.absoluteFill}
      blurType="dark"
      blurAmount={modalGlass.blurAmount}
      overlayColor={Platform.OS === 'android' ? modalGlass.androidTint : undefined}
      reducedTransparencyFallbackColor={modalGlass.fallback}
    />
    {Platform.OS === 'ios' ? (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: modalGlass.tint }]} />
    ) : null}
  </View>
);

export interface DrawerPanelGlassProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * Blur del panel inferior.
 * Android: overlay negro en BlurView. iOS: blur + capa negra encima.
 */
export const DrawerPanelGlass: React.FC<DrawerPanelGlassProps> = ({ style }) => {
  const blurProps = drawerPanelBlurProps;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.drawerGlassClip, style]}
      pointerEvents="none"
      collapsable={false}
    >
      <BlurView
        key={`drawer-blur-${drawerPanelGlassKey}`}
        style={StyleSheet.absoluteFill}
        blurType={drawerPanelGlass.blurType}
        blurAmount={blurProps.blurAmount}
        blurRadius={blurProps.blurRadius}
        overlayColor={blurProps.overlayColor}
        reducedTransparencyFallbackColor={drawerPanelGlass.fallback}
        autoUpdate={Platform.OS === 'android'}
      />
      {blurProps.tintOverlay ? (
        <View
          key={`drawer-tint-${drawerPanelGlassKey}`}
          style={[StyleSheet.absoluteFill, { backgroundColor: blurProps.tintOverlay }]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  drawerGlassClip: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...(Platform.OS === 'ios' ? { overflow: 'hidden' as const } : null),
  },
});
