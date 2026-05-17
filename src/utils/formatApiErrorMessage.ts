/**
 * Normaliza `detail` de FastAPI (string | array de validación | objeto) a string
 * para Alert.alert y mensajes de error en RN (Android requiere string).
 */
export function formatApiErrorMessage(
  detail: unknown,
  fallback = 'Error en la petición'
): string {
  if (detail == null || detail === '') {
    return fallback;
  }
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object') {
        const obj = item as { msg?: unknown; message?: unknown };
        if (typeof obj.msg === 'string') {
          return obj.msg;
        }
        if (typeof obj.message === 'string') {
          return obj.message;
        }
      }
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    });
    const joined = parts.filter(Boolean).join('\n');
    return joined || fallback;
  }
  if (typeof detail === 'object') {
    const obj = detail as { message?: unknown; msg?: unknown };
    if (typeof obj.message === 'string' && obj.message) {
      return obj.message;
    }
    if (typeof obj.msg === 'string' && obj.msg) {
      return obj.msg;
    }
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}
