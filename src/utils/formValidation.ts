/**
 * Validaciones compartidas (login, registro, recuperar contraseña).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 254) return false;
  return EMAIL_RE.test(s);
}

/**
 * Política para contraseñas NUEVAS (registro, recuperar, cambiar): mínimo 8
 * caracteres con mayúscula, minúscula y un símbolo — exactamente lo que promete
 * `register.passwordPolicyHint` (Figma 1109:2554). El backend solo exige 8, así
 * que el front es más estricto a propósito; el login no valida composición y las
 * contraseñas viejas de solo-8 siguen entrando.
 */
export function passwordMeetsPolicy(p: string): boolean {
  return (
    p.length >= 8 &&
    /\p{Lu}/u.test(p) &&
    /\p{Ll}/u.test(p) &&
    /[^\p{L}\p{N}]/u.test(p)
  );
}
