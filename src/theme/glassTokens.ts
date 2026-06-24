import { Platform } from 'react-native';

/**
 * Tokens del panel inferior (Figma 636-23638).
 * iOS: blur sutil + capa negra encima.
 * Android: overlay negro en BlurView (transparent usa default blanco #AAFFFFFF → gris).
 */
export const drawerPanelGlass = {
  blurType: 'dark' as const,
  fallback: 'rgba(0, 0, 0, 0.92)',

  ios: {
    blurAmount: 4,
    tintOverlay: 'rgba(0, 0, 0, 0.65)',
  },

  android: {
    blurAmount: 12,
    blurRadius: 14,
    /** Color del panel en BlurView nativo — no usar 'transparent'. */
    overlayColor: 'rgba(0, 0, 0, 0.58)',
  },
} as const;

/** @deprecated Usar drawerPanelGlass.ios.tintOverlay / android.overlayColor */
export const drawerPanelGlassTint = drawerPanelGlass.ios.tintOverlay;

export const drawerPanelGlassKey = [
  drawerPanelGlass.ios.blurAmount,
  drawerPanelGlass.ios.tintOverlay,
  drawerPanelGlass.android.blurAmount,
  drawerPanelGlass.android.overlayColor,
].join('-');

export const modalGlass = {
  tint: 'rgba(2, 5, 15, 0.4)',
  fallback: 'rgba(2, 5, 15, 0.88)',
  blurAmount: 30,
} as const;

/** Helpers para DrawerPanelGlass */
export const drawerPanelBlurProps = Platform.select({
  ios: {
    blurAmount: drawerPanelGlass.ios.blurAmount,
    blurRadius: drawerPanelGlass.ios.blurAmount,
    overlayColor: undefined as string | undefined,
    tintOverlay: drawerPanelGlass.ios.tintOverlay,
  },
  android: {
    blurAmount: drawerPanelGlass.android.blurAmount,
    blurRadius: drawerPanelGlass.android.blurRadius,
    overlayColor: drawerPanelGlass.android.overlayColor,
    tintOverlay: undefined as string | undefined,
  },
  default: {
    blurAmount: drawerPanelGlass.android.blurAmount,
    blurRadius: drawerPanelGlass.android.blurRadius,
    overlayColor: drawerPanelGlass.android.overlayColor,
    tintOverlay: undefined as string | undefined,
  },
})!;
