type InCallManagerType = {
  start: (options?: { media?: 'audio' | 'video'; auto?: boolean }) => void;
  stop: () => void;
  setSpeakerphoneOn: (enable: boolean) => void;
  /** true = fuerza speaker; false = fuerza auricular en algunos OEMs; otros valores restauran comportamiento por defecto (implementación JS). */
  setForceSpeakerphoneOn: (flag: boolean | null | undefined) => void;
};

let InCallManager: InCallManagerType | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require('react-native-incall-manager');
  InCallManager = module?.default ?? module;
} catch (_) {
  InCallManager = null;
}

/** Ruta de audio para ver un live por WebRTC: siempre altavoz (no auricular interno). */
export const enableSpeakerphone = (): void => {
  if (!InCallManager) return;
  try {
    // media: 'video' → modo VideoChat; 'audio' → VoiceChat + auricular en muchos casos.
    // auto en iOS se ignora en nativo; lo dejamos coherente con la doc del paquete.
    InCallManager.start({ media: 'video', auto: false });
    InCallManager.setForceSpeakerphoneOn(true);
    InCallManager.setSpeakerphoneOn(true);
  } catch (_) {
    // no-op
  }
};

export const disableSpeakerphone = (): void => {
  if (!InCallManager) return;
  try {
    InCallManager.setForceSpeakerphoneOn(null);
    InCallManager.setSpeakerphoneOn(false);
    InCallManager.stop();
  } catch (_) {
    // no-op
  }
};
