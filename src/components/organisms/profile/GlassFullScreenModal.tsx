/**
 * Shell compartido para modals glass full-screen (Figma 536-22836).
 * Usa Modal de RN para cubrir nav bar y status bar; footer fijo fuera del scroll.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from './GlassBackdrop';

export interface GlassFullScreenModalHandle {
  dismiss: () => void;
}

export interface GlassFullScreenModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** Contenido fijo entre header y scroll (p. ej. subtítulo). */
  subHeader?: React.ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  /** Retraso antes de permitir cerrar tocando el backdrop. */
  backdropDelayMs?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Etiqueta de accesibilidad del backdrop. */
  backdropAccessibilityLabel?: string;
}

export const GlassFullScreenModal = forwardRef<
  GlassFullScreenModalHandle,
  GlassFullScreenModalProps
>(function GlassFullScreenModal(
  {
    visible,
    onClose,
    children,
    header,
    footer,
    subHeader,
    scrollable = true,
    keyboardAvoiding = true,
    backdropDelayMs = 0,
    contentContainerStyle,
    scrollStyle,
    containerStyle,
    backdropAccessibilityLabel,
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [backdropReady, setBackdropReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setBackdropReady(false);
      return;
    }
    slideAnim.setValue(1);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();

    if (backdropDelayMs > 0) {
      const timer = setTimeout(() => setBackdropReady(true), backdropDelayMs);
      return () => clearTimeout(timer);
    }
    setBackdropReady(true);
  }, [visible, slideAnim, backdropDelayMs]);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  useImperativeHandle(ref, () => ({ dismiss }), [onClose]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  const scrollArea = scrollable ? (
    <ScrollView
      style={[styles.scroll, scrollStyle]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentContainerStyle]}>{children}</View>
  );

  const inner = (
    <View style={[styles.inner, containerStyle]}>
      {header}
      {subHeader}
      {scrollArea}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.host} pointerEvents="box-none">
        <GlassBackdrop />
        <TouchableOpacity
          style={styles.backdropPress}
          activeOpacity={1}
          onPress={backdropReady ? dismiss : undefined}
          disabled={!backdropReady}
          accessibilityRole="button"
          accessibilityLabel={backdropAccessibilityLabel}
        />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          pointerEvents="box-none"
        >
          {keyboardAvoiding ? (
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              pointerEvents="box-none"
            >
              {inner}
            </KeyboardAvoidingView>
          ) : (
            inner
          )}
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    gap: 24,
    alignItems: 'center',
    paddingTop: 16,
  },
});
