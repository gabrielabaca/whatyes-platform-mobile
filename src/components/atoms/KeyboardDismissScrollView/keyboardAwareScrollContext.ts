import { createContext, useContext } from 'react';
import type { TextInput } from 'react-native';

/**
 * Canal entre `AppTextInput` y su `KeyboardDismissScrollView` ancestro más cercano.
 * El input avisa cuándo toma/pierde foco; el scroll usa eso para saber que el input
 * enfocado es SUYO (y no de otro scroll montado detrás, p. ej. la pantalla debajo
 * de un drawer) antes de aplicar insets o auto-scroll.
 */
export interface KeyboardAwareScrollApi {
  onInputFocused: (input: TextInput | null) => void;
  onInputBlurred: (input: TextInput | null) => void;
  /** Scroll para que el nodo (p. ej. lista de sugerencias) quede sobre el teclado. */
  ensureNodeVisible: (
    node: {
      measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    } | null,
  ) => void;
}

export const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollApi | null>(null);

export function useKeyboardAwareScroll(): KeyboardAwareScrollApi | null {
  return useContext(KeyboardAwareScrollContext);
}
