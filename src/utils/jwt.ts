/**
 * Helpers mínimos para leer claims de un JWT sin dependencias nativas.
 * Solo se usa para conocer la expiración (`exp`) del access token.
 */
/* eslint-disable no-bitwise, no-div-regex */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodifica base64/base64url a string (suficiente para el payload ASCII de un JWT). */
function base64Decode(input: string): string {
  const str = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let output = '';
  let bc = 0;
  let bs = 0;
  for (let i = 0; i < str.length; i++) {
    const buffer = B64_CHARS.indexOf(str.charAt(i));
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

/** Devuelve el `exp` del JWT en milisegundos, o null si no se puede leer. */
export function getJwtExpMs(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = base64Decode(payload);
    const obj = JSON.parse(json) as { exp?: number };
    return typeof obj.exp === 'number' ? obj.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** true si el token está vencido o vence dentro de `skewMs`. */
export function isJwtExpired(token: string | null | undefined, skewMs = 0): boolean {
  const expMs = getJwtExpMs(token);
  if (expMs == null) return false; // si no se puede leer, no asumir vencido
  return expMs - Date.now() <= skewMs;
}
