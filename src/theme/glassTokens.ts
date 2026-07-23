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
    /**
     * Color del panel en BlurView nativo — no usar 'transparent'.
     * El blur de @react-native-community/blur es poco fiable en Android (a veces
     * casi no difumina), así que el overlay debe ser casi opaco para que el
     * contenido de atrás no se mezcle. En iOS el blur real permite bajarlo (0.65).
     */
    overlayColor: 'rgba(0, 0, 0, 0.9)',
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
  /** iOS: tint suave sobre el blur real. */
  tint: 'rgba(2, 5, 15, 0.4)',
  /** Android: blur poco fiable → overlay mucho más denso para que no se mezcle el fondo. */
  androidTint: 'rgba(2, 5, 15, 0.82)',
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
