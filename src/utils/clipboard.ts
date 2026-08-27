/**
 * Lectura y escritura del portapapeles ("Pegar notas" del drawer de la nota del vivo,
 * copiar N° de compra y de guía en el detalle de compra).
 *
 * Usa el `Clipboard` que React Native todavía exporta desde el core. Está marcado
 * como deprecado (avisa por consola) y el reemplazo es `@react-native-clipboard/clipboard`,
 * que es un módulo nativo: migrar implica pod install + rebuild. Todo el acceso pasa
 * por acá para que ese cambio sea de un solo archivo.
 */
import { Clipboard } from 'react-native';

/** Texto del portapapeles, o '' si está vacío o el sistema lo niega. */
export async function readClipboardText(): Promise<string> {
  try {
    const value = await Clipboard.getString();
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

/** Copia texto al portapapeles. Devuelve false si el sistema lo niega. */
export function writeClipboardText(value: string): boolean {
  try {
    Clipboard.setString(value);
    return true;
  } catch {
    return false;
  }
}
