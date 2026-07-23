/**
 * Drawer glass — Figma 636-23638.
 * bottomPanel: home visible arriba; panel inferior con glass blur (Figma 636-23638).
 * fullHeight: blur glass a pantalla completa.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Animated,
  ScrollView,
  Modal,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop, DrawerPanelGlass } from '../profile/GlassBackdrop';
import { drawerPanelGlassKey } from '../../../theme/glassTokens';
import { FONT_FAMILY } from '../../../theme/typography';

const PRIMARY = '#685CF0';
const CANCEL_GOLD = '#FDC700';

function resolvePanelMaxHeightPx(
  maxHeight: ViewStyle['maxHeight'] | undefined,
  windowHeight: number,
): number {
  if (maxHeight == null) return windowHeight * 0.62;
  if (typeof maxHeight === 'number' && Number.isFinite(maxHeight)) return maxHeight;
  if (typeof maxHeight === 'string') {
    const pctMatch = maxHeight.trim().match(/^(\d+(?:\.\d+)?)%$/);
    if (pctMatch) return windowHeight * (parseFloat(pctMatch[1]) / 100);
  }
  return windowHeight * 0.62;
}

export interface StreamBottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Panel inferior (intro/bienvenida). Por defecto true. */
  bottomPanel?: boolean;
  /** Panel desde safe area superior hasta abajo (wizard). */
  fullHeight?: boolean;
  panelStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  cancelLabel?: string;
  onCancelPress?: () => void;
  /** Desactiva el scroll del sheet (p. ej. WebView con iframes de MP). */
  scrollEnabled?: boolean;
  /**
   * Modal RN separado. Por defecto false en bottomPanel: BlurView necesita la misma
   * jerarquía nativa que la pantalla de fondo (en Modal no hay nada que difuminar).
   */
  nativeModal?: boolean;
}

/** Props compartidas para drawers inferiores (fondo visible + anclado abajo). */
export const streamBottomDrawerProps = {
  bottomPanel: true as const,
} as const;

export const StreamBottomSheet: React.FC<StreamBottomSheetProps> = ({
  visible,
  title,
  onClose,
  children,
  bottomPanel = true,
  fullHeight = false,
  panelStyle,
  contentContainerStyle,
  footer,
  cancelLabel,
  onCancelPress,
  scrollEnabled = true,
  nativeModal,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(1)).current;
  const useFullPanel = fullHeight || !bottomPanel;
  const resolvedNativeModal = nativeModal ?? useFullPanel;
  /**
   * Medidas del panel inferior para ajustarlo al contenido (hug) de forma robusta.
   * En vez de trucos de flex (que colapsan el ScrollView en dispositivo), medimos
   * header + cuerpo + footer y fijamos una ALTURA concreta al panel, usando siempre
   * el layout de altura fija (flex:1) que garantiza que el contenido renderice.
   */
  const [bottomContentHeight, setBottomContentHeight] = useState<number | undefined>(undefined);
  const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);
  const [footerHeight, setFooterHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(1);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  const header = (
    <View style={styles.header}>
      <RNText style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.15}>
        {title}
      </RNText>
      <TouchableOpacity
        onPress={handleClose}
        hitSlop={12}
        style={styles.closeBtn}
        accessibilityRole="button"
      >
        <X size={22} color="#FFFFFF" strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );

  const bodyContent = (
    <View
      style={[
        styles.body,
        useFullPanel && styles.bodyFull,
        !scrollEnabled && bottomPanel && styles.bodyEmbeddedScroll,
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const footerArea = footer || cancelLabel ? (
    <View style={styles.footerArea}>
      {footer}
      {cancelLabel ? (
        <TouchableOpacity
          onPress={onCancelPress ?? handleClose}
          hitSlop={12}
          style={styles.cancelWrap}
          activeOpacity={0.8}
        >
          <RNText style={styles.cancelText}>{cancelLabel}</RNText>
        </TouchableOpacity>
      ) : null}
    </View>
  ) : null;

  const scrollableBody = scrollEnabled ? (
    <ScrollView
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      bounces={false}
      style={useFullPanel ? styles.scroll : styles.scrollBottom}
      contentContainerStyle={styles.scrollInner}
    >
      {bodyContent}
    </ScrollView>
  ) : (
    <View style={useFullPanel ? styles.scroll : styles.scrollBottom}>{bodyContent}</View>
  );

  const panelBottomPadding = Math.max(insets.bottom, 16);

  const flatBottomPanel = StyleSheet.flatten(panelStyle) as ViewStyle | undefined;
  /**
   * Si el drawer declara un maxHeight explícito (p. ej. listas al 88% con FlatList
   * flex:1) el panel se fija a esa altura para dar espacio acotado al scroll interno.
   * Si no, el panel se ajusta a su contenido (hug) con tope, para no extenderse de más.
   */
  const fillPanelHeight = flatBottomPanel?.maxHeight != null;
  const bottomPanelMaxHeightPx = resolvePanelMaxHeightPx(flatBottomPanel?.maxHeight, windowHeight);
  const {
    maxHeight: _bottomMaxH,
    borderTopLeftRadius: _bottomRtl,
    borderTopRightRadius: _bottomRtr,
    ...bottomPanelContentStyle
  } = flatBottomPanel ?? {};

  const bottomPanelContentMaxHeight = bottomPanelMaxHeightPx - panelBottomPadding;

  /**
   * Hug robusto: medimos header + cuerpo (ScrollView) + footer y fijamos una ALTURA
   * concreta al panel (capada al tope). Se usa SIEMPRE el layout de altura fija
   * (flex:1) —el mismo que las listas— que garantiza que el contenido renderice y
   * nunca colapse. Hasta tener las medidas, el panel usa el alto máximo (original).
   * Nota: sin trucos de flexShrink/flexBasis, que colapsaban el panel en dispositivo.
   */
  const PANEL_PAD_TOP = 24; // styles.panelContent paddingTop
  const PANEL_GAP = 16; // styles.panelContent gap
  const hasFooter = footerArea != null;
  const naturalPanelHeight =
    !fillPanelHeight && bottomContentHeight != null && bottomContentHeight > 0 && headerHeight != null
      ? PANEL_PAD_TOP +
        headerHeight +
        PANEL_GAP +
        bottomContentHeight +
        (hasFooter ? PANEL_GAP + (footerHeight ?? 0) : 0) +
        panelBottomPadding
      : null;
  const panelHeightPx =
    naturalPanelHeight != null
      ? Math.min(naturalPanelHeight, bottomPanelMaxHeightPx)
      : bottomPanelMaxHeightPx;
  const panelContentHeightPx = panelHeightPx - panelBottomPadding;

  const bottomPanelScroll = scrollEnabled ? (
    <ScrollView
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      bounces={false}
      style={styles.scrollBottomPanel}
      contentContainerStyle={styles.scrollBottomInner}
      onContentSizeChange={
        fillPanelHeight ? undefined : (_w, h) => setBottomContentHeight(h)
      }
    >
      {bodyContent}
    </ScrollView>
  ) : (
    <View style={styles.scrollBottomPanel}>{bodyContent}</View>
  );

  const bottomPanelBlock = (
    <View
      style={[
        styles.panelAnchor,
        { height: panelHeightPx, maxHeight: bottomPanelMaxHeightPx, paddingBottom: panelBottomPadding },
      ]}
      collapsable={false}
      {...(Platform.OS === 'ios' ? { needsOffscreenAlphaCompositing: true } : null)}
    >
      <DrawerPanelGlass key={drawerPanelGlassKey} />
      <Animated.View style={[styles.panelAnimatedShell, { transform: [{ translateY }] }]}>
        <View
          style={[
            styles.panelContent,
            styles.panelContentBottom,
            bottomPanelContentStyle,
            { height: panelContentHeightPx, maxHeight: bottomPanelContentMaxHeight },
          ]}
        >
          <View
            style={styles.panelHeaderWrap}
            onLayout={
              fillPanelHeight
                ? undefined
                : (e) => setHeaderHeight(e.nativeEvent.layout.height)
            }
          >
            {header}
          </View>
          {bottomPanelScroll}
          {footerArea ? (
            <View
              style={styles.panelFooterWrap}
              onLayout={
                fillPanelHeight
                  ? undefined
                  : (e) => setFooterHeight(e.nativeEvent.layout.height)
              }
            >
              {footerArea}
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );

  const panelInner = useFullPanel ? (
    <View
      style={[
        styles.fullPanel,
        panelStyle,
        {
          paddingTop: insets.top + 16,
          paddingBottom: panelBottomPadding,
          minHeight: windowHeight,
        },
      ]}
    >
      {header}
      {scrollableBody}
      {footerArea}
    </View>
  ) : null;

  const sheetContent = (
    <View
      style={[resolvedNativeModal ? styles.hostModal : styles.hostInline]}
      pointerEvents="box-none"
    >
      {useFullPanel ? <GlassBackdrop /> : null}
      <TouchableOpacity
        style={[
          styles.backdropPress,
          !useFullPanel ? { bottom: bottomPanelMaxHeightPx } : null,
        ]}
        activeOpacity={1}
        onPress={handleClose}
        accessibilityRole="button"
      />

      {useFullPanel ? (
        <Animated.View
          style={[styles.sheetFull, { transform: [{ translateY }] }]}
          pointerEvents="box-none"
        >
          {panelInner}
        </Animated.View>
      ) : (
        <View style={styles.sheetBottom} pointerEvents="box-none">
          {bottomPanelBlock}
        </View>
      )}
    </View>
  );

  if (!visible) {
    return null;
  }

  if (!resolvedNativeModal) {
    return sheetContent;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {sheetContent}
    </Modal>
  );
};

/** @deprecated Usar glass blur del panel; referencia de tint fallback */
export { DRAWER_PANEL_TINT as STREAM_BOTTOM_PANEL_BG } from '../profile/GlassBackdrop';

export const streamBottomPanelStyle = {
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
} as const;

export const streamSheetStyles = StyleSheet.create({
  primaryBtn: {
    width: '100%',
    height: 40,
    borderRadius: 1000,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  bodyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  sectionLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.06,
    includeFontPadding: false,
  },
});

const styles = StyleSheet.create({
  hostModal: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  hostInline: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Por encima de StreamSellerOverlay / StreamBuyerOverlay (zIndex 10) y overlays de subasta.
    zIndex: 200,
    elevation: 200,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sheetFull: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  sheetBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    width: '100%',
  },
  fullPanel: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    gap: 24,
  },
  panelAnchor: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  panelAnimatedShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  panelContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  panelContentBottom: {
    width: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeaderWrap: {
    flexShrink: 0,
    width: '100%',
  },
  panelFooterWrap: {
    flexShrink: 0,
    width: '100%',
    paddingTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollBottom: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollBottomPanel: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  scrollBottomInner: {
    flexGrow: 0,
  },
  scrollInner: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
    includeFontPadding: false,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 16,
    width: '100%',
  },
  bodyFull: {
    flexGrow: 1,
  },
  bodyEmbeddedScroll: {
    flex: 1,
    minHeight: 0,
  },
  footerArea: {
    gap: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelWrap: {
    alignItems: 'center',
    width: '100%',
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: CANCEL_GOLD,
    includeFontPadding: false,
  },
});
