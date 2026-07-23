import React from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';

export interface KeyboardDismissScrollViewProps extends ScrollViewProps {}

/**
 * ScrollView con el comportamiento estándar de teclado de la app:
 * - `keyboardShouldPersistTaps="handled"`: al tocar un área vacía se oculta el
 *   teclado, pero los taps sobre botones/inputs siguen funcionando.
 * - `keyboardDismissMode`: al arrastrar/scrollear también se oculta el teclado
 *   (iOS: interactivo; Android: al iniciar el drag).
 *
 * Ambos props son overrideables pasándolos explícitamente.
 */
export const KeyboardDismissScrollView = React.forwardRef<ScrollView, KeyboardDismissScrollViewProps>(
  (props, ref) => (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      {...props}
    />
  ),
);

KeyboardDismissScrollView.displayName = 'KeyboardDismissScrollView';
