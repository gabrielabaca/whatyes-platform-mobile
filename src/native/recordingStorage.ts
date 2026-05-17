import { NativeModules, Platform } from 'react-native';
import {
  DEFAULT_RECORDING_FOLDER,
  getRecordingPreferences,
  persistRecordingPreferences,
  type RecordingPreferences,
} from '../utils/recordingPreferences';

interface RecordingStorageNative {
  getDefaultDirectory(): Promise<string>;
  getDirectoryDisplayPath(): Promise<string>;
  pickDirectory(): Promise<{ uri: string; displayPath: string }>;
  openDirectory(): Promise<void>;
  saveRecordingFile(sourcePath: string, fileName: string): Promise<string>;
  isAvailable(): boolean;
}

const Native = NativeModules.RecordingStorage as RecordingStorageNative | undefined;

export const isRecordingStorageAvailable =
  Platform.OS === 'android' && !!Native?.saveRecordingFile;

export async function getRecordingDirectoryDisplay(): Promise<string> {
  const prefs = await getRecordingPreferences();
  if (Native?.getDirectoryDisplayPath) {
    try {
      return await Native.getDirectoryDisplayPath();
    } catch {
      return prefs.displayPath;
    }
  }
  return prefs.displayPath;
}

export async function pickRecordingDirectory(): Promise<RecordingPreferences | null> {
  if (!Native?.pickDirectory) {
    return null;
  }
  const result = await Native.pickDirectory();
  const prefs: RecordingPreferences = {
    displayPath: result.displayPath,
    folderUri: result.uri,
  };
  await persistRecordingPreferences(prefs);
  return prefs;
}

export async function openRecordingDirectory(): Promise<void> {
  if (Native?.openDirectory) {
    await Native.openDirectory();
    return;
  }
  throw new Error('OPEN_FOLDER_UNAVAILABLE');
}

export async function saveRecordingToPreferredFolder(
  sourcePath: string
): Promise<string> {
  const fileName = `pulpolive_${Date.now()}.mp4`;
  const normalized = sourcePath.replace(/^file:\/\//, '');

  if (Native?.saveRecordingFile) {
    return Native.saveRecordingFile(normalized, fileName);
  }

  if (Platform.OS === 'ios') {
    return normalized;
  }

  throw new Error('SAVE_RECORDING_UNAVAILABLE');
}

export async function resetRecordingDirectoryToDefault(): Promise<RecordingPreferences> {
  const prefs: RecordingPreferences = {
    displayPath: DEFAULT_RECORDING_FOLDER,
    folderUri: null,
  };
  await persistRecordingPreferences(prefs);
  return prefs;
}
