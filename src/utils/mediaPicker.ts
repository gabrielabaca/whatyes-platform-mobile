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
