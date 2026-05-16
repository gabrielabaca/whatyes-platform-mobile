/**
 * El WebSocket de RN suele emitir `error` como Event sintético (sin message/stack).
 * Normalizamos a un texto útil para logs y para onError.
 */
export function formatSignalingError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return o.message;
    if (typeof o.error === 'string' && o.error) return o.error;
    const ne = o.nativeEvent as Record<string, unknown> | undefined;
    if (ne && typeof ne.message === 'string' && ne.message) return ne.message;
    if (o.code != null || o.reason != null) {
      return `code=${String(o.code)} reason=${String(o.reason ?? '')}`;
    }
    if (o.type === 'error') {
      return (
        'Error de WebSocket (React Native no expone el motivo en el Event). ' +
        'Comprueba red, URL de señalización firmada, credenciales vigentes y que el master esté conectado al canal.'
      );
    }
    try {
      const keys = Object.keys(o);
      if (keys.length) {
        return keys
          .slice(0, 12)
          .map((k) => `${k}=${String(o[k])}`)
          .join(', ');
      }
    } catch {
      /* ignore */
    }
  }
  return String(err);
}
