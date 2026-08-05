/**
 * Corta una espera que puede no volver nunca.
 *
 * Los helpers de `src/api` hacen `fetch` sin timeout y AsyncStorage puede quedar
 * colgado si el módulo nativo no responde: una promesa que nunca resuelve deja el
 * guard de reentrada de quien la esperaba trabado para siempre, y el botón que la
 * disparó queda mudo (ni error ni pantalla). Envolver esas esperas garantiza que
 * el `finally` del llamador se ejecute.
 */

export class TimeoutError extends Error {
  constructor(public readonly label: string, public readonly ms: number) {
    super(`${label}: sin respuesta tras ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
