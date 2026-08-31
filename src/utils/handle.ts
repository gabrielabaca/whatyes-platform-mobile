/**
 * Guarda de formato para el @handle público.
 * El valor nunca lleva '@'; eso es solo presentación.
 */
const HANDLE_RE = /^[a-z0-9_.]{3,30}$/;

export function isHandle(v?: string | null): v is string {
  if (!v) return false;
  return HANDLE_RE.test(v);
}
