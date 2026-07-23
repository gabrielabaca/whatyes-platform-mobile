/**
 * Validaciones compartidas (login, registro, recuperar contraseña).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 254) return false;
  return EMAIL_RE.test(s);
}

/** Misma política que el backend: mínimo 8 caracteres (sin requisitos de composición). */
export function passwordMeetsPolicy(p: string): boolean {
  return p.length >= 8;
}
