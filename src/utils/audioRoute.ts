import { Platform } from 'react-native';

type InCallManagerType = {
  start: (options?: { media?: 'audio' | 'video'; auto?: boolean }) => void;
  stop: () => void;
  setSpeakerphoneOn: (enable: boolean) => void;
};

let InCallManager: InCallManagerType | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require('react-native-incall-manager');
  InCallManager = module?.default ?? module;
} catch (_) {
  InCallManager = null;
}

export const enableSpeakerphone = (): void => {
  if (!InCallManager) return;
  try {
    InCallManager.start({ media: 'audio', auto: true });
    InCallManager.setSpeakerphoneOn(true);
  } catch (_) {
    // no-op
  }
};

export const disableSpeakerphone = (): void => {
  if (!InCallManager) return;
  try {
    InCallManager.setSpeakerphoneOn(false);
    InCallManager.stop();
  } catch (_) {
    // no-op
  }
};
