/**
 * Validaciones compartidas (login, registro, recuperar contraseña).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 254) return false;
  return EMAIL_RE.test(s);
}

/** Misma política que el backend / copy de registro: 8+, mayúscula, minúscula, carácter especial */
export function passwordMeetsPolicy(p: string): boolean {
  if (p.length < 8) return false;
  if (!/[a-z]/.test(p)) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[^A-Za-z0-9]/.test(p)) return false;
  return true;
}
