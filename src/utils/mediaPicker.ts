import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { deferMediaPicker } from './deferMediaPicker';
import { appAlert } from '../alerts';

export interface PickerPhoto {
  uri: string;
  type?: string;
  name?: string;
}

export function photosFromPickerResponse(response: ImagePickerResponse): PickerPhoto[] {
  if (response.didCancel || response.errorMessage) {
    return [];
  }
  return (response.assets ?? [])
    .filter((asset) => asset.uri)
    .map((asset, index) => ({
      uri: asset.uri!,
      type: asset.type ?? 'image/jpeg',
      name: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
    }));
}

export function singlePhotoFromPicker(response: ImagePickerResponse): PickerPhoto | null {
  return photosFromPickerResponse(response)[0] ?? null;
}

export interface MediaPickerCallbacks {
  onAfter?: () => void;
  onError?: (message: string) => void;
}

function finishPicker(
  response: ImagePickerResponse,
  onResult: (response: ImagePickerResponse) => void,
  callbacks?: MediaPickerCallbacks,
) {
  try {
    if (response.errorMessage) {
      callbacks?.onError?.(response.errorMessage);
      return;
    }
    onResult(response);
  } finally {
    callbacks?.onAfter?.();
  }
}

/** Lanza el picker de galería de inmediato (usar tras cerrar modales). */
export function launchPhotoLibraryNow(
  options: ImageLibraryOptions,
  onResult: (response: ImagePickerResponse) => void,
  callbacks?: MediaPickerCallbacks,
): void {
  launchImageLibrary(options, (response) => finishPicker(response, onResult, callbacks));
}

/** Lanza la cámara del sistema de inmediato (usar tras cerrar modales). */
export function launchPhotoCameraNow(
  options: CameraOptions,
  onResult: (response: ImagePickerResponse) => void,
  callbacks?: MediaPickerCallbacks,
): void {
  launchCamera(options, (response) => finishPicker(response, onResult, callbacks));
}

/** Galería de video (no altera los pickers de foto). */
export function launchVideoLibraryNow(
  options: Omit<ImageLibraryOptions, 'mediaType'>,
  onResult: (response: ImagePickerResponse) => void,
  callbacks?: MediaPickerCallbacks,
): void {
  launchPhotoLibraryNow({ ...options, mediaType: 'video', selectionLimit: 1 }, onResult, callbacks);
}

/** Cámara de video (no altera los pickers de foto). */
export function launchVideoCameraNow(
  options: Omit<CameraOptions, 'mediaType'>,
  onResult: (response: ImagePickerResponse) => void,
  callbacks?: MediaPickerCallbacks,
): void {
  launchPhotoCameraNow({ ...options, mediaType: 'video' }, onResult, callbacks);
}

export interface PickerVideo {
  uri: string;
  type?: string;
  name?: string;
  durationSec?: number;
  fileSize?: number;
}

export function videoFromPickerResponse(response: ImagePickerResponse): PickerVideo | null {
  if (response.didCancel || response.errorMessage) {
    return null;
  }
  const asset = (response.assets ?? []).find((item) => item.uri);
  if (!asset?.uri) {
    return null;
  }
  return {
    uri: asset.uri,
    type: asset.type ?? 'video/mp4',
    name: asset.fileName ?? `intro-video-${Date.now()}.mp4`,
    durationSec: typeof asset.duration === 'number' ? asset.duration : undefined,
    fileSize: typeof asset.fileSize === 'number' ? asset.fileSize : undefined,
  };
}

export interface DeferredMediaPickerOptions extends MediaPickerCallbacks {
  onBefore?: () => void;
}

/** Cierra UI, espera el desmontaje en iOS y abre galería. */
export function runPhotoLibraryPicker(
  options: ImageLibraryOptions,
  onResult: (response: ImagePickerResponse) => void,
  opts?: DeferredMediaPickerOptions,
): void {
  opts?.onBefore?.();
  deferMediaPicker(() => {
    launchPhotoLibraryNow(options, onResult, {
      onAfter: opts?.onAfter,
      onError: opts?.onError,
    });
  });
}

/** Cierra UI, espera el desmontaje en iOS y abre cámara. */
export function runPhotoCameraPicker(
  options: CameraOptions,
  onResult: (response: ImagePickerResponse) => void,
  opts?: DeferredMediaPickerOptions,
): void {
  opts?.onBefore?.();
  deferMediaPicker(() => {
    launchPhotoCameraNow(options, onResult, {
      onAfter: opts?.onAfter,
      onError: opts?.onError,
    });
  });
}

export function showMediaPickerError(title: string, message: string): void {
  appAlert(title, message);
}
