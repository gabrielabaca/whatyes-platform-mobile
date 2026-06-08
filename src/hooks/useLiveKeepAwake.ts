import { useEffect } from 'react';
import { AppState } from 'react-native';
import KeepAwake from 'react-native-keep-awake';
import { activateKeepScreen, deactivateKeepScreen } from '../utils/keepScreen';

/** Evita bloqueo / apagado automático de pantalla durante un live (seller o viewer). */
export function useLiveKeepAwake(): void {
  useEffect(() => {
    const activate = () => {
      KeepAwake.activate();
      activateKeepScreen();
    };

    activate();
    const retryTimers = [400, 1500, 4000].map((ms) => setTimeout(activate, ms));
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        activate();
      }
    });

    return () => {
      retryTimers.forEach(clearTimeout);
      appStateSub.remove();
      deactivateKeepScreen();
      KeepAwake.deactivate();
    };
  }, []);
}
