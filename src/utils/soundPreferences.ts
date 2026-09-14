import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pulpolive/sound-preferences';

/**
 * Local-only preference for the app's own UI sounds (bids, wins, messages...).
 * Push notification sounds are not covered: the operating system owns those.
 */
export interface SoundPreferences {
  uiSoundsEnabled: boolean;
}

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  uiSoundsEnabled: true,
};

export async function getSoundPreferences(): Promise<SoundPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SOUND_PREFERENCES };
    }
    const parsed = JSON.parse(raw) as Partial<SoundPreferences>;
    return {
      uiSoundsEnabled: parsed.uiSoundsEnabled ?? DEFAULT_SOUND_PREFERENCES.uiSoundsEnabled,
    };
  } catch {
    return { ...DEFAULT_SOUND_PREFERENCES };
  }
}

export async function persistSoundPreferences(prefs: SoundPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
