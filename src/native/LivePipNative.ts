/**
 * Picture-in-Picture del vivo del vendedor (solo Android).
 *
 * La ventanita es un RECORDATORIO de "tenés un vivo abierto, volvé": el vivo
 * queda PAUSADO ahí (cámara y mic no salen al aire) y tocarla devuelve a la app.
 * Se habilita únicamente mientras hay un vivo activo (SellerStreamScreen) y se
 * apaga al salir; en el resto de la app la activity nunca entra a PiP.
 *
 * iOS no tiene equivalente: Apple no permite capturar cámara en background y su
 * PiP es de reproducción, no de captura.
 */
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

const { LivePip } = NativeModules;

export const isLivePipSupported = Platform.OS === 'android' && !!LivePip?.setEnabled;

/** Permite (o no) que la activity entre a PiP al irse a background. */
export async function setLivePipEnabled(enabled: boolean): Promise<void> {
  if (!isLivePipSupported) return;
  try {
    await LivePip.setEnabled(enabled);
  } catch {
    // Sin PiP el vivo igual se pausa por AppState; el recordatorio es un extra.
  }
}

/** Avisa cuando la activity entra/sale de PiP. Devuelve el unsubscribe. */
export function addLivePipListener(onChange: (inPip: boolean) => void): () => void {
  if (!isLivePipSupported) return () => {};
  const sub = DeviceEventEmitter.addListener(
    'LivePip:modeChanged',
    (payload: { inPip?: boolean }) => onChange(!!payload?.inPip)
  );
  return () => sub.remove();
}
