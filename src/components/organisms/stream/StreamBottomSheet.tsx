/**
 * Drawer glass — Figma 636-23638.
 * bottomPanel: home visible arriba; panel inferior con glass blur (Figma 636-23638).
 * fullHeight: blur glass a pantalla completa.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Animated,
  Keyboard,
  Modal,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { KeyboardAccessoryAppearanceProvider } from '../../atoms/AppTextInput';
import { GlassBackdrop, DrawerPanelGlass } from '../profile/GlassBackdrop';
import { drawerPanelGlassKey } from '../../../theme/glassTokens';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { LAYERS } from '../../../theme/layers';
import { ModalWindowBoundary, OverlayPortal } from '../../../context/OverlayPortalContext';

const PRIMARY = themeColors.primary;
const CANCEL_GOLD = themeColors.gold;
/** Radio superior del panel (Figma 636-23638) cuando el caller no declara otro. */
const PANEL_RADIUS = 24;
/**
 * Scrim del bottom sheet. Suave a propósito: el panel es glass y el fondo tiene que
 * seguir leyéndose, pero lo suficiente para que la barra de navegación tapada no
 * parezca activa.
 */
const SHEET_SCRIM = 'rgba(0,0,0,0.45)';

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
  /**
   * El panel ocupa siempre su alto máximo en vez de ajustarse al contenido. Para listas
   * con scroll propio (FlatList flex:1), que necesitan una altura acotada y estable.
   * Sin esto, `panelStyle.maxHeight` es solo un tope: el panel se ajusta al contenido.
   */
  fillToMaxHeight?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  cancelLabel?: string;
  onCancelPress?: () => void;
  /** Desactiva el scroll del sheet (p. ej. WebView con iframes de MP). */
  scrollEnabled?: boolean;
  /**
   * Modal RN separado. Por defecto false en bottomPanel: BlurView necesita la misma
   * jerarquía nativa que la pantalla de fondo (en Modal no hay nada que difuminar).
   * Sin Modal el sheet no queda encerrado en la pantalla: se monta en el portal raíz
   * (`OverlayPortalProvider`), por encima de la barra de navegación.
   */
  nativeModal?: boolean;
  /**
   * Oscurece el fondo detrás del panel. Por defecto true: con el drawer abierto la barra
   * de navegación queda tapada y tiene que leerse como inactiva.
   */
  dimBackdrop?: boolean;
  /**
   * Tocar el fondo cierra el drawer. Ponerlo en false en drawers con formulario:
   * un toque al costado de un campo no debe descartar lo que el usuario escribió.
   */
  dismissOnBackdropPress?: boolean;
  /**
   * false = sin X en el header (pasos que solo avanzan con su CTA,
   * p. ej. "Todo listo para tu show"). Combinar con dismissOnBackdropPress={false}.
   */
  showCloseButton?: boolean;
}

export const StreamBottomSheet: React.FC<StreamBottomSheetProps> = ({
  visible,
  title,
  onClose,
  children,
  bottomPanel = true,
  fullHeight = false,
  panelStyle,
  fillToMaxHeight = false,
  contentContainerStyle,
  footer,
  cancelLabel,
  onCancelPress,
  scrollEnabled = true,
  nativeModal,
  dimBackdrop = true,
  dismissOnBackdropPress = true,
  showCloseButton = true,
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  /** Borde superior del teclado, en coordenadas de ventana (Android). */
  const [keyboardScreenY, setKeyboardScreenY] = useState<number | null>(null);
  /** Borde inferior REAL del host del sheet, en las mismas coordenadas (Android). */
  const [hostBottomY, setHostBottomY] = useState<number | null>(null);
  const hostRef = useRef<View>(null);

  /**
   * Medir el host es lo único que distingue los dos escenarios de Android: si la
   * ventana se achicó (`adjustResize` efectivo) su borde inferior YA coincide con el
   * techo del teclado; si no se achicó, sigue en la base de la pantalla. La medición
   * corre al abrirse el teclado y en cada relayout del host, así que el valor se
   * corrige solo si el resize llega después del evento.
   */
  const measureHost = useCallback(() => {
    if (Platform.OS === 'ios') return;
    hostRef.current?.measureInWindow((_x, y, _width, height) => {
      if (Number.isFinite(y) && Number.isFinite(height)) setHostBottomY(y + height);
    });
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
      const screenY = e?.endCoordinates?.screenY;
      setKeyboardScreenY(typeof screenY === 'number' ? screenY : null);
      measureHost();
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      setKeyboardScreenY(null);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [measureHost]);

  /**
   * El panel inferior está anclado a `bottom: 0`, así que el teclado lo tapa entero: en un
   * bottom sheet no alcanza con insets de scroll (el contenido queda igual detrás del teclado),
   * hay que levantar el panel.
   *
   * En Android NO alcanza con `windowSoftInputMode=adjustResize` de la activity: no se aplica
   * ni sobre pantallas a pantalla completa (el vivo oculta la status bar) ni dentro de un
   * `Modal` RN, que es una ventana aparte —el mismo motivo por el que `GlassFullScreenModal`
   * usa un KeyboardAvoidingView 'height'—. Por eso se compensa con el solapamiento REAL entre
   * el teclado y el borde inferior del host: donde el resize sí funcionó ese valor da 0 y no
   * se levanta nada, así que la compensación nunca se duplica.
   */
  const keyboardOverlap =
    keyboardScreenY != null && hostBottomY != null
      ? Math.max(0, hostBottomY - keyboardScreenY)
      : 0;
  const keyboardOffset = Platform.OS === 'ios' ? keyboardHeight : keyboardOverlap;

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

  /**
   * Con el teclado abierto, tocar fuera solo lo baja: el usuario está pasando de un
   * campo a otro, no pidiendo cerrar el drawer (y perder lo que escribió).
   */
  const handleBackdropPress = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    if (dismissOnBackdropPress) {
      handleClose();
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  /** El scrim entra y sale con el panel (mismo `slideAnim`, sin animación aparte). */
  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const header = (
    <View style={styles.header}>
      <RNText style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.15}>
        {title}
      </RNText>
      {showCloseButton ? (
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
        >
          <X size={22} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      ) : null}
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
    <KeyboardDismissScrollView
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      bounces={false}
      style={useFullPanel ? styles.scroll : styles.scrollBottom}
      contentContainerStyle={styles.scrollInner}
    >
      {bodyContent}
    </KeyboardDismissScrollView>
  ) : (
    <View style={useFullPanel ? styles.scroll : styles.scrollBottom}>{bodyContent}</View>
  );

  /** Con el panel levantado sobre el teclado no hay home indicator que despejar. */
  const panelBottomPadding = keyboardOffset > 0 ? 16 : Math.max(insets.bottom, 16);

  const flatBottomPanel = StyleSheet.flatten(panelStyle) as ViewStyle | undefined;
  /**
   * `panelStyle.maxHeight` es solo un TOPE: el panel se ajusta a su contenido (hug).
   * Para fijarlo a ese tope hay que pedirlo con `fillToMaxHeight` (listas con scroll propio).
   */
  const fillPanelHeight = fillToMaxHeight;
  const {
    // maxHeight se resuelve acá abajo en píxeles; no debe llegar al estilo del contenido.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    maxHeight: _bottomMaxH,
    borderTopLeftRadius: bottomRadiusLeft,
    borderTopRightRadius: bottomRadiusRight,
    ...bottomPanelContentStyle
  } = flatBottomPanel ?? {};
  /** Con el teclado abierto el panel sube: el tope no puede pasar del espacio que queda. */
  const bottomPanelMaxHeightPx = Math.min(
    resolvePanelMaxHeightPx(flatBottomPanel?.maxHeight, windowHeight),
    windowHeight - keyboardOffset - insets.top - 16,
  );

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
    <KeyboardDismissScrollView
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      bounces={false}
      style={styles.scrollBottomPanel}
      contentContainerStyle={styles.scrollBottomInner}
      onContentSizeChange={
        fillPanelHeight ? undefined : (_w, h) => setBottomContentHeight(h)
      }
    >
      {bodyContent}
    </KeyboardDismissScrollView>
  ) : (
    <View style={styles.scrollBottomPanel}>{bodyContent}</View>
  );

  const bottomPanelBlock = (
    <View
      style={[
        styles.panelAnchor,
        {
          height: panelHeightPx,
          maxHeight: bottomPanelMaxHeightPx,
          paddingBottom: panelBottomPadding,
          /**
           * El radio se aplica acá y no en el contenido: `panelAnchor` ya recorta
           * (`overflow: hidden`) en ambas plataformas, mientras que el clip de
           * DrawerPanelGlass solo recorta en iOS y dejaba esquinas rectas en Android.
           */
          borderTopLeftRadius: bottomRadiusLeft ?? PANEL_RADIUS,
          borderTopRightRadius: bottomRadiusRight ?? PANEL_RADIUS,
        },
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
          /**
           * El panel completo no se levanta (ya ocupa la pantalla): se le descuenta
           * el teclado por abajo para que el footer fijo quede por encima y el cuerpo
           * pueda scrollear. En iOS de eso se encarga `automaticallyAdjustKeyboardInsets`
           * del ScrollView, así que acá el extra es 0 y no se compensa dos veces.
           */
          paddingBottom:
            panelBottomPadding + (Platform.OS === 'ios' ? 0 : keyboardOverlap),
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
    // Drawer glass: siempre oscuro, la barra "Listo" del teclado acompaña.
    <KeyboardAccessoryAppearanceProvider appearance="dark">
    <View
      ref={hostRef}
      onLayout={measureHost}
      style={[resolvedNativeModal ? styles.hostModal : styles.hostInline]}
      pointerEvents="box-none"
    >
      {useFullPanel ? <GlassBackdrop /> : null}
      {!useFullPanel && dimBackdrop ? (
        <Animated.View
          style={[styles.scrim, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
      ) : null}
      <TouchableOpacity
        style={[
          styles.backdropPress,
          /**
           * Se corta en el alto REAL del panel (no en el tope): así todo lo que se ve
           * fuera del panel cierra al tocarlo, sin franja muerta encima del sheet.
           */
          !useFullPanel ? { bottom: keyboardOffset + panelHeightPx } : null,
        ]}
        activeOpacity={1}
        onPress={handleBackdropPress}
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
        <View style={[styles.sheetBottom, { bottom: keyboardOffset }]} pointerEvents="box-none">
          {bottomPanelBlock}
        </View>
      )}
    </View>
    </KeyboardAccessoryAppearanceProvider>
  );

  if (!visible) {
    return null;
  }

  if (!resolvedNativeModal) {
    /**
     * Al portal raíz: montado inline quedaba dentro del `View` de contenido de
     * `GeneralLayout`, que es hermano ANTERIOR a la barra de navegación, y la barra
     * seguía visible y tocable con el drawer abierto.
     */
    return <OverlayPortal>{sheetContent}</OverlayPortal>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <ModalWindowBoundary>{sheetContent}</ModalWindowBoundary>
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
    zIndex: LAYERS.sheet,
    elevation: LAYERS.sheet,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SHEET_SCRIM,
    zIndex: 0,
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
