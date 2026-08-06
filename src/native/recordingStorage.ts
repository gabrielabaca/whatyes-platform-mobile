import { NativeModules, Platform, Share } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import {
  DEFAULT_RECORDING_FOLDER,
  getRecordingPreferences,
  persistRecordingPreferences,
  type RecordingPreferences,
} from '../utils/recordingPreferences';

interface SavedRecordingNative {
  uri: string;
  displayPath: string;
}

interface RecordingStorageNative {
  getDefaultDirectory(): Promise<string>;
  getDirectoryDisplayPath(): Promise<string>;
  pickDirectory(): Promise<{ uri: string; displayPath: string }>;
  openDirectory(): Promise<void>;
  saveRecordingFile(sourcePath: string, fileName: string): Promise<SavedRecordingNative>;
  saveToGallery(sourcePath: string, fileName: string): Promise<SavedRecordingNative>;
  clearDirectory(): Promise<void>;
  hasCustomDirectory(): Promise<boolean>;
  shareRecording(uri: string): Promise<void>;
  isAvailable(): boolean;
}

const Native = NativeModules.RecordingStorage as RecordingStorageNative | undefined;

/** Destino donde terminó la grabación: Fotos (iOS), galería (Android) o carpeta SAF elegida. */
export type SavedRecordingLocation = 'photos' | 'gallery' | 'folder';

export interface SavedRecording {
  location: SavedRecordingLocation;
  /** URI del destino (ph:// en iOS, content:// o file:// en Android). */
  uri: string;
  /** URI apta para compartir (file:// original en iOS, content:// en Android). */
  shareUri: string;
  displayPath: string;
}

export const isRecordingStorageAvailable =
  Platform.OS === 'ios' || !!Native?.saveToGallery || !!Native?.saveRecordingFile;

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
): Promise<SavedRecording> {
  const fileName = `pulpolive_${Date.now()}.mp4`;

  if (Platform.OS === 'ios') {
    const fileUrl = sourcePath.startsWith('file://') ? sourcePath : `file://${sourcePath}`;
    const asset = await CameraRoll.saveAsset(fileUrl, { type: 'video' });
    return {
      location: 'photos',
      uri: asset?.node?.image?.uri ?? fileUrl,
      // El original de ReplayKit sigue en tmp; es la URI compartible (ph:// no lo es).
      shareUri: fileUrl,
      displayPath: '',
    };
  }

  const normalized = sourcePath.replace(/^file:\/\//, '');
  const prefs = await getRecordingPreferences();
  if (prefs.folderUri && Native?.saveRecordingFile) {
    const saved = await Native.saveRecordingFile(normalized, fileName);
    return {
      location: 'folder',
      uri: saved.uri,
      shareUri: saved.uri,
      displayPath: saved.displayPath,
    };
  }
  if (Native?.saveToGallery) {
    const saved = await Native.saveToGallery(normalized, fileName);
    return {
      location: 'gallery',
      uri: saved.uri,
      shareUri: saved.uri,
      displayPath: saved.displayPath,
    };
  }
  throw new Error('SAVE_RECORDING_UNAVAILABLE');
}

export async function shareSavedRecording(recording: SavedRecording): Promise<void> {
  if (Platform.OS === 'ios') {
    await Share.share({ url: recording.shareUri });
    return;
  }
  if (Native?.shareRecording) {
    await Native.shareRecording(recording.shareUri);
    return;
  }
  throw new Error('SHARE_RECORDING_UNAVAILABLE');
}

export async function resetRecordingDirectoryToDefault(): Promise<RecordingPreferences> {
  // Sin esto el módulo nativo seguía usando la carpeta SAF vieja tras "restablecer".
  if (Native?.clearDirectory) {
    try {
      await Native.clearDirectory();
    } catch {
      // best-effort
    }
  }
  const prefs: RecordingPreferences = {
    displayPath: DEFAULT_RECORDING_FOLDER,
    folderUri: null,
  };
  await persistRecordingPreferences(prefs);
  return prefs;
}
