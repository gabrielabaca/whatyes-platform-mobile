/**
 * Errores desde módulos nativos (Android/iOS) suelen ser objetos { code, message, userInfo }.
 * Sin normalizar, `e instanceof Error` falla y solo se muestra un mensaje genérico.
 */
export function formatRnError(e: unknown): string {
  if (e instanceof Error && e.message) {
    return e.message;
  }
  if (e != null && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const code = o.code;
    const userInfo = o.userInfo as Record<string, unknown> | undefined;
    const msg =
      (typeof o.message === 'string' && o.message) ||
      (userInfo && typeof userInfo.message === 'string' && userInfo.message) ||
      (typeof o.localizedDescription === 'string' && o.localizedDescription);
    if (typeof msg === 'string' && msg.length > 0) {
      const c =
        typeof code === 'string'
          ? code
          : userInfo && typeof userInfo.code === 'string'
            ? userInfo.code
            : undefined;
      return c ? `[${c}] ${msg}` : msg;
    }
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export function logRnError(tag: string, step: string, e: unknown): void {
  const formatted = formatRnError(e);
  // eslint-disable-next-line no-console
  console.error(`[${tag}] ${step} failed:`, formatted, e);
}
