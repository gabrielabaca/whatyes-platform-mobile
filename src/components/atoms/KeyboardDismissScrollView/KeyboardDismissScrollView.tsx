import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type TextInput,
} from 'react-native';
import {
  KeyboardAwareScrollContext,
  type KeyboardAwareScrollApi,
} from './keyboardAwareScrollContext';

export interface KeyboardDismissScrollViewProps extends ScrollViewProps {
  /**
   * Mantiene el input enfocado visible sobre el teclado: agrega espacio de scroll
   * solo por el solapamiento REAL medido en ventana (si un KeyboardAvoidingView o el
   * panel de un drawer ya levantó el contenido, el solapamiento es ~0 y no compensa
   * dos veces) y auto-scrollea al campo enfocado dejando `keyboardAwareBottomMargin`
   * de aire sobre el teclado. Solo reacciona a inputs `AppTextInput` descendientes.
   */
  keyboardAware?: boolean;
  /** Margen entre el input enfocado y el borde superior del teclado. */
  keyboardAwareBottomMargin?: number;
}

/** Segunda pasada de medición: teclado (~250ms) y KAV/panel ya asentados. */
const SETTLE_MS = 350;

function windowHeight(): number {
  return Dimensions.get('window').height;
}

/**
 * ScrollView con el comportamiento estándar de teclado de la app:
 * - `keyboardShouldPersistTaps="handled"`: al tocar un área vacía se oculta el
 *   teclado, pero los taps sobre botones/inputs siguen funcionando.
 * - `keyboardDismissMode`: al arrastrar/scrollear también se oculta el teclado
 *   (iOS: interactivo; Android: al iniciar el drag).
 * - `keyboardAware` (default): el input enfocado nunca queda tapado por el teclado.
 *
 * Los props son overrideables pasándolos explícitamente. Si el caller necesita
 * `onScroll` con `Animated.event` y native driver, apagar `keyboardAware`.
 */
export const KeyboardDismissScrollView = React.forwardRef<ScrollView, KeyboardDismissScrollViewProps>(
  (
    {
      keyboardAware = true,
      keyboardAwareBottomMargin = 20,
      children,
      onScroll,
      scrollEventThrottle,
      contentInset,
      scrollIndicatorInsets,
      contentContainerStyle,
      ...props
    },
    forwardedRef,
  ) => {
    const scrollRef = useRef<ScrollView | null>(null);
    const setRef = useCallback(
      (node: ScrollView | null) => {
        scrollRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const offsetYRef = useRef(0);
    const focusedInputRef = useRef<TextInput | null>(null);
    const ownsFocusRef = useRef(false);
    const kbRef = useRef({ top: 0, visible: false });
    /**
     * Borde inferior del propio scroll en ventana. Con un footer fijo (CTA al pie) el
     * scroll termina ANTES del teclado: el límite de lo visible es este borde, no el
     * del teclado, o el campo enfocado queda tapado por el footer.
     */
    const viewportBottomRef = useRef(Number.POSITIVE_INFINITY);
    const insetRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Espacio extra de scroll por teclado (iOS: contentInset; Android: padding). */
    const [kbInset, setKbInset] = useState(0);

    const applyInset = useCallback((next: number) => {
      if (insetRef.current === next) return;
      insetRef.current = next;
      setKbInset(next);
    }, []);

    /**
     * Auto-scroll al input enfocado si su borde inferior + margen pasa el límite de lo
     * visible: el teclado, o el borde del scroll si hay algo fijo por encima del teclado
     * (footer con CTA), lo que venga primero.
     */
    const ensureFocusedVisible = useCallback(() => {
      const input = focusedInputRef.current as
        | (TextInput & { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void })
        | null;
      const kb = kbRef.current;
      if (!input?.measureInWindow || !kb.visible || !ownsFocusRef.current) return;
      input.measureInWindow((_x, y, _w, h) => {
        if (h === 0 || !kbRef.current.visible) return;
        const limit = Math.min(kbRef.current.top, viewportBottomRef.current);
        const delta = y + h + keyboardAwareBottomMargin - limit;
        if (delta > 1) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, offsetYRef.current + delta),
            animated: true,
          });
        }
      });
    }, [keyboardAwareBottomMargin]);

    /**
     * Recalcula inset + visibilidad midiendo geometría REAL en ventana. Idempotente:
     * se corre dos veces por evento (inmediata y a los SETTLE_MS) porque el teclado
     * anima y los contenedores (KAV, panel del drawer) se reacomodan después del evento.
     */
    const refresh = useCallback(() => {
      const scroll = scrollRef.current as
        | (ScrollView & {
            getNativeScrollRef?: () => {
              measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
            } | null;
          })
        | null;
      if (!scroll) return;
      if (!kbRef.current.visible || !ownsFocusRef.current) {
        applyInset(0);
        return;
      }
      const node = scroll.getNativeScrollRef?.() ?? (scroll as unknown as {
        measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
      });
      if (!node?.measureInWindow) return;
      node.measureInWindow((_x, y, _w, h) => {
        viewportBottomRef.current = y + h;
        if (!kbRef.current.visible || !ownsFocusRef.current) {
          applyInset(0);
          return;
        }
        const overlap = Math.max(0, Math.round(y + h - kbRef.current.top));
        applyInset(overlap > 0 ? overlap + keyboardAwareBottomMargin : 0);
        // El scroll corre al frame siguiente para que el inset recién aplicado ya
        // permita el offset destino (sin esto, scrollTo clampearía al máximo viejo).
        requestAnimationFrame(ensureFocusedVisible);
      });
    }, [applyInset, ensureFocusedVisible, keyboardAwareBottomMargin]);

    const scheduleRefresh = useCallback(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (settleRef.current != null) clearTimeout(settleRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        refresh();
      });
      settleRef.current = setTimeout(() => {
        settleRef.current = null;
        refresh();
      }, SETTLE_MS);
    }, [refresh]);

    useEffect(() => {
      if (!keyboardAware) return;
      const onFrame = (e: KeyboardEvent) => {
        const top = e.endCoordinates?.screenY ?? windowHeight();
        kbRef.current = { top, visible: top < windowHeight() - 1 };
        scheduleRefresh();
      };
      const onHide = () => {
        kbRef.current = { top: windowHeight(), visible: false };
        scheduleRefresh();
      };
      const subs =
        Platform.OS === 'ios'
          ? [
              // ChangeFrame cubre aparición y cambios de alto (texto ↔ numérico, barra accesoria).
              Keyboard.addListener('keyboardWillChangeFrame', onFrame),
              Keyboard.addListener('keyboardWillHide', onHide),
            ]
          : [
              Keyboard.addListener('keyboardDidShow', onFrame),
              Keyboard.addListener('keyboardDidHide', onHide),
            ];
      return () => {
        subs.forEach((s) => s.remove());
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        if (settleRef.current != null) clearTimeout(settleRef.current);
      };
    }, [keyboardAware, scheduleRefresh]);

    const awareApi = useMemo<KeyboardAwareScrollApi>(
      () => ({
        onInputFocused: (input) => {
          focusedInputRef.current = input;
          ownsFocusRef.current = true;
          scheduleRefresh();
        },
        onInputBlurred: (input) => {
          if (focusedInputRef.current !== input) return;
          focusedInputRef.current = null;
          ownsFocusRef.current = false;
          scheduleRefresh();
        },
      }),
      [scheduleRefresh],
    );

    const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        offsetYRef.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      },
      [onScroll],
    );

    if (!keyboardAware) {
      return (
        <ScrollView
          ref={setRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentInset={contentInset}
          scrollIndicatorInsets={scrollIndicatorInsets}
          contentContainerStyle={contentContainerStyle}
          {...props}
        >
          {children}
        </ScrollView>
      );
    }

    // iOS compensa con contentInset (no relayoutea); Android normalmente no necesita
    // nada (adjustResize achica la ventana → solapamiento medido 0) y el padding solo
    // aparece como fallback en ventanas Modal que no se redimensionan.
    const iosInset = Platform.OS === 'ios' ? kbInset : 0;
    const androidPad = Platform.OS === 'android' ? kbInset : 0;
    const mergedContentInset =
      iosInset > 0 ? { ...contentInset, bottom: (contentInset?.bottom ?? 0) + iosInset } : contentInset;
    const mergedIndicatorInsets =
      iosInset > 0
        ? { ...scrollIndicatorInsets, bottom: (scrollIndicatorInsets?.bottom ?? 0) + iosInset }
        : scrollIndicatorInsets;
    const flatContent = StyleSheet.flatten(contentContainerStyle);
    const basePadBottom =
      typeof flatContent?.paddingBottom === 'number'
        ? flatContent.paddingBottom
        : typeof flatContent?.padding === 'number'
          ? flatContent.padding
          : 0;
    const mergedContentContainerStyle =
      androidPad > 0
        ? [contentContainerStyle, { paddingBottom: basePadBottom + androidPad }]
        : contentContainerStyle;

    return (
      <ScrollView
        ref={setRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        contentInset={mergedContentInset}
        scrollIndicatorInsets={mergedIndicatorInsets}
        contentContainerStyle={mergedContentContainerStyle}
        {...props}
      >
        <KeyboardAwareScrollContext.Provider value={awareApi}>
          {children}
        </KeyboardAwareScrollContext.Provider>
      </ScrollView>
    );
  },
);

KeyboardDismissScrollView.displayName = 'KeyboardDismissScrollView';
