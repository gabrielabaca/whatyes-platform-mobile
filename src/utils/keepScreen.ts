type InCallKeepScreen = {
  setKeepScreenOn: (enable: boolean) => void;
};

let InCallManager: InCallKeepScreen | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require('react-native-incall-manager');
  InCallManager = module?.default ?? module;
} catch (_) {
  InCallManager = null;
}

export function activateKeepScreen(): void {
  if (!InCallManager) return;
  try {
    InCallManager.setKeepScreenOn(true);
  } catch (_) {
    // no-op
  }
}

export function deactivateKeepScreen(): void {
  if (!InCallManager) return;
  try {
    InCallManager.setKeepScreenOn(false);
  } catch (_) {
    // no-op
  }
}
