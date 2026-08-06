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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from './GlassBackdrop';
import { DismissKeyboardView } from '../../atoms/DismissKeyboardView';
import { ModalWindowBoundary } from '../../../context/OverlayPortalContext';

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
  /**
   * Capa por encima de todo el modal, DENTRO de su misma ventana nativa. Es el lugar para
   * pickers y sheets que se abren desde este modal.
   *
   * En iOS un view controller no puede presentar un segundo Modal mientras ya está
   * presentando este: un `<Modal>` hermano simplemente no aparece. Por eso el contenido
   * del picker se monta acá (inline, sin Modal propio) en vez de al lado del modal padre.
   */
  overlay?: React.ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  /** Retraso antes de permitir cerrar tocando el backdrop. */
  backdropDelayMs?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Etiqueta de accesibilidad del backdrop. */
  backdropAccessibilityLabel?: string;
  /**
   * Tocar el fondo cierra el modal. Ponerlo en false en modals con formulario:
   * un toque al costado de un campo no debe descartar lo que el usuario escribió.
   */
  dismissOnBackdropPress?: boolean;
  /**
   * Intercepta el botón atrás de Android. Sin esto el modal se cierra directo y saltea
   * cualquier confirmación de descarte que tenga el formulario.
   */
  onRequestClose?: () => void;
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
    overlay,
    scrollable = true,
    keyboardAvoiding = true,
    backdropDelayMs = 0,
    contentContainerStyle,
    scrollStyle,
    containerStyle,
    backdropAccessibilityLabel,
    dismissOnBackdropPress = true,
    onRequestClose,
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [backdropReady, setBackdropReady] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  /**
   * Con el teclado abierto, tocar fuera solo lo baja: el usuario está pasando de un
   * campo a otro, no pidiendo cerrar el modal (y perder lo que escribió).
   */
  const handleBackdropPress = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    if (dismissOnBackdropPress) {
      dismiss();
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  const scrollArea = scrollable ? (
    <ScrollView
      style={[styles.scroll, scrollStyle]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <DismissKeyboardView style={[styles.flex, contentContainerStyle]}>
      {children}
    </DismissKeyboardView>
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
      onRequestClose={onRequestClose ?? dismiss}
    >
      {/*
       * Este contenido ya vive en su propia ventana nativa: los sheets del slot `overlay`
       * tienen que renderizar acá adentro y NO irse al portal raíz (que queda por debajo).
       */}
      <ModalWindowBoundary>
        <View style={styles.host} pointerEvents="box-none">
          <GlassBackdrop />
          <TouchableOpacity
            style={styles.backdropPress}
            activeOpacity={1}
            onPress={backdropReady ? handleBackdropPress : undefined}
            disabled={!backdropReady}
            accessibilityRole="button"
            accessibilityLabel={backdropAccessibilityLabel}
          />
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
            pointerEvents="box-none"
          >
            {keyboardAvoiding ? (
              /**
               * El KeyboardAvoidingView achica todo el contenedor, así que el footer fijo
               * queda por encima del teclado. Por eso el ScrollView NO usa
               * `automaticallyAdjustKeyboardInsets`: sumaría una segunda compensación y el
               * contenido saltaría el doble en iOS.
               * Android necesita 'height' porque el Modal es una ventana aparte y no hereda
               * el `adjustResize` de la activity.
               */
              <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                pointerEvents="box-none"
              >
                {inner}
              </KeyboardAvoidingView>
            ) : (
              inner
            )}
          </Animated.View>
          {overlay ? (
            <View style={styles.overlay} pointerEvents="box-none">
              {overlay}
            </View>
          ) : null}
        </View>
      </ModalWindowBoundary>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
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
