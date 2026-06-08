import { InteractionManager, Platform } from 'react-native';

/** Espera a que modales/sheets se desmonten antes de presentar UIImagePicker en iOS. */
export function deferMediaPicker(action: () => void): void {
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      const delay = Platform.OS === 'ios' ? 520 : 120;
      setTimeout(action, delay);
    });
  });
}
