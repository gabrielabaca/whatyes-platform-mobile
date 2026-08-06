import { NativeModules, Platform } from 'react-native';

/**
 * Grabador de pantalla nativo propio (solo iOS): ReplayKit + AVAssetWriter,
 * captura video + audio de la app (el audio del vivo, directo del render)
 * SIN micrófono. Sin mic, ReplayKit no reconfigura la sesión de audio y el
 * vivo sigue sonando por el altavoz (react-native-record-screen con mic la
 * mandaba al auricular de llamada / activaba voice processing).
 */
interface ScreenClipRecorderNative {
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>;
}

const Native = NativeModules.ScreenClipRecorder as ScreenClipRecorderNative | undefined;

export const isNativeClipRecorderAvailable =
  Platform.OS === 'ios' && !!Native?.startRecording;

/** Lanza el prompt de grabación de iOS y arranca la captura. */
export async function startNativeClipRecording(): Promise<void> {
  if (!Native) throw new Error('CLIP_RECORDER_UNAVAILABLE');
  await Native.startRecording();
}

/** Frena la captura y devuelve el path del MP4 temporal. */
export async function stopNativeClipRecording(): Promise<string> {
  if (!Native) throw new Error('CLIP_RECORDER_UNAVAILABLE');
  return Native.stopRecording();
}

/** El código de error que devuelve el nativo cuando el usuario rechaza el prompt. */
export const CLIP_RECORDER_PERMISSION_DENIED = 'PERMISSION_DENIED';
