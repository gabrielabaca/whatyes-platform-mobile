import React from 'react';
import {
  Keyboard,
  TouchableWithoutFeedback,
  View,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface DismissKeyboardViewProps extends ViewProps {
  /** Estilo del contenedor. Normalmente `{ flex: 1 }` para ocupar la pantalla. */
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Si es true, no cierra el teclado al tocar (se comporta como un View normal). */
  disabled?: boolean;
}

/**
 * Envuelve contenido para que, al tocar fuera de un input, se oculte el teclado
 * (Android e iOS). Los taps sobre inputs/botones NO cierran el teclado porque esos
 * hijos consumen el toque; solo los taps sobre áreas "vacías" lo hacen.
 *
 * Usar en contenedores SIN ScrollView. Para contenido scrolleable, el ScrollView
 * debe usar `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode`
 * (ver KeyboardDismissScrollView).
 */
export const DismissKeyboardView: React.FC<DismissKeyboardViewProps> = ({
  children,
  disabled = false,
  ...props
}) => {
  if (disabled) {
    return <View {...props}>{children}</View>;
  }

  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      <View {...props}>{children}</View>
    </TouchableWithoutFeedback>
  );
};
