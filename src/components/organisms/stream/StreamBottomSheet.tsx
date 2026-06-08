/**
 * Drawer glass sobre live stream — mismo patrón que ShippingAddressModal (Figma 536-22836).
 * Blur + panel rgba(0,0,0,0.4) anclado abajo.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Animated,
  ScrollView,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../profile/GlassBackdrop';
import { FONT_FAMILY } from '../../../theme/typography';

const PRIMARY = '#685CF0';
const CANCEL_GOLD = '#FDC700';

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
}

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
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(1)).current;
  const useFullPanel = fullHeight || !bottomPanel;

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

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  const panelBody = (
    <>
      <View style={styles.header}>
        <RNText style={styles.title} numberOfLines={2}>
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

      <View style={[styles.body, useFullPanel && styles.bodyFull, contentContainerStyle]}>
        {children}
      </View>

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

      <View style={styles.homeIndicator}>
        <View style={styles.homeIndicatorBar} />
      </View>
    </>
  );

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GlassBackdrop />
      <TouchableOpacity
        style={styles.backdropPress}
        activeOpacity={1}
        onPress={handleClose}
        accessibilityRole="button"
      />

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        pointerEvents="box-none"
      >
        <ScrollView
          scrollEnabled={scrollEnabled}
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            useFullPanel ? styles.scrollContentFull : styles.scrollContentBottom,
            { paddingBottom: insets.bottom, minHeight: useFullPanel ? windowHeight : undefined },
          ]}
        >
          {useFullPanel ? (
            <View
              style={[
                styles.fullPanel,
                panelStyle,
                { paddingTop: insets.top + 16, minHeight: windowHeight - insets.bottom },
              ]}
            >
              {panelBody}
            </View>
          ) : (
            <View style={[styles.panel, panelStyle]}>{panelBody}</View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

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
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentBottom: {
    justifyContent: 'flex-end',
  },
  scrollContentFull: {
    justifyContent: 'flex-start',
  },
  fullPanel: {
    flexGrow: 1,
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 24,
  },
  panel: {
    backgroundColor: 'rgba(2, 5, 15, 0.4)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 24,
    width: '100%',
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
    fontWeight: '800',
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
    flex: 1,
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
  homeIndicator: {
    height: 31,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    width: '100%',
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#C7C8CA',
  },
});
