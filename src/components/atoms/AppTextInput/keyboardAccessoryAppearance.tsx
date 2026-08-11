import React, { createContext, useContext } from 'react';

/**
 * Apariencia de la barra "Listo" sobre el teclado (iOS). `auto` sigue el tema
 * claro/oscuro; los shells glass (drawers y modales, siempre oscuros por diseño)
 * proveen `dark` acá para que TODOS los inputs de adentro hereden sin tocarlos
 * uno por uno.
 */
export type KeyboardAccessoryAppearance = 'auto' | 'light' | 'dark';

const KeyboardAccessoryAppearanceContext = createContext<KeyboardAccessoryAppearance>('auto');

export const KeyboardAccessoryAppearanceProvider: React.FC<{
  appearance: KeyboardAccessoryAppearance;
  children: React.ReactNode;
}> = ({ appearance, children }) => (
  <KeyboardAccessoryAppearanceContext.Provider value={appearance}>
    {children}
  </KeyboardAccessoryAppearanceContext.Provider>
);

export function useKeyboardAccessoryAppearance(): KeyboardAccessoryAppearance {
  return useContext(KeyboardAccessoryAppearanceContext);
}
