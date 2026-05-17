import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pulpolive/recording-preferences';

export const DEFAULT_RECORDING_FOLDER = 'PulpoLive/Grabaciones';

export interface RecordingPreferences {
  /** Ruta legible mostrada al usuario */
  displayPath: string;
  /** URI de carpeta (Android SAF) o ruta relativa en documentos */
  folderUri: string | null;
}

export const DEFAULT_RECORDING_PREFERENCES: RecordingPreferences = {
  displayPath: DEFAULT_RECORDING_FOLDER,
  folderUri: null,
};

export async function getRecordingPreferences(): Promise<RecordingPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_RECORDING_PREFERENCES };
    }
    const parsed = JSON.parse(raw) as Partial<RecordingPreferences>;
    return {
      displayPath: parsed.displayPath ?? DEFAULT_RECORDING_FOLDER,
      folderUri: parsed.folderUri ?? null,
    };
  } catch {
    return { ...DEFAULT_RECORDING_PREFERENCES };
  }
}

export async function persistRecordingPreferences(
  prefs: RecordingPreferences
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
