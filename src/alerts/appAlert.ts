/**
 * API imperativa de alertas (drop-in de `Alert.alert` de React Native).
 *
 * El `AlertProvider` se suscribe; sin provider montado las llamadas se encolan
 * y se muestran apenas el provider conecta (evita perder el primer alert del boot).
 */
import i18n from '../i18n';
import type {
  AppAlertButton,
  AppAlertConfirmInput,
  AppAlertHelpersInput,
  AppAlertOptions,
  AppAlertRequest,
  AppAlertVariant,
} from './types';

type Listener = (request: AppAlertRequest | null) => void;

let listener: Listener | null = null;
let seq = 0;
let pending: AppAlertRequest | null = null;
/** Callbacks que esperan a que no haya ningún alert visible (ver `runWhenAppAlertClosed`). */
const closeWaiters = new Set<() => void>();

function resolveCancelable(buttons: AppAlertButton[], options?: AppAlertOptions): boolean {
  if (typeof options?.cancelable === 'boolean') return options.cancelable;
  if (buttons.some((b) => b.style === 'destructive')) return false;
  return buttons.length <= 1;
}

function normalizeButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (buttons && buttons.length > 0) return buttons;
  return [{ text: i18n.t('common.ok'), style: 'default' }];
}

function resolveVariant(title: string, options?: AppAlertOptions): AppAlertVariant {
  if (options?.variant) return options.variant;
  if (title === i18n.t('common.error')) return 'error';
  if (title === i18n.t('common.success')) return 'success';
  return 'info';
}

function publish(request: AppAlertRequest | null) {
  pending = request;
  listener?.(request);
  if (request == null && closeWaiters.size > 0) {
    const waiters = Array.from(closeWaiters);
    closeWaiters.clear();
    // Al próximo tick, igual que los onPress de los botones: el Modal del alert
    // tiene que cerrar antes de que el que esperaba desmonte el suyo.
    setTimeout(() => {
      waiters.forEach((cb) => cb());
    }, 0);
  }
}

function show(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions,
) {
  const normalized = normalizeButtons(buttons);
  const resolvedTitle = title?.trim() ? title : i18n.t('common.appName');
  publish({
    id: ++seq,
    title: resolvedTitle,
    message: message?.trim() ? message : undefined,
    buttons: normalized,
    options: {
      ...options,
      cancelable: resolveCancelable(normalized, options),
      variant: resolveVariant(resolvedTitle, options),
    },
  });
}

function showWithVariant(
  variant: AppAlertVariant,
  input: AppAlertHelpersInput,
) {
  show(input.title, input.message, input.buttons, {
    cancelable: input.cancelable,
    variant,
  });
}

/** Cierra el diálogo visible sin ejecutar onPress de ningún botón. */
export function dismissAppAlert() {
  publish(null);
}

/**
 * Ejecuta `cb` cuando no quede ningún alert visible: ya mismo si no hay ninguno,
 * o apenas se cierre el que está. Devuelve un cancelador.
 *
 * Existe para que un contenedor con `Modal` nativo NO se desmonte en el mismo tick
 * en que se abre un alert (también un `Modal`): en ese cruce queda una capa nativa
 * huérfana que se traga todos los toques de la app.
 */
export function runWhenAppAlertClosed(cb: () => void): () => void {
  if (pending == null) {
    cb();
    return () => {};
  }
  closeWaiters.add(cb);
  return () => {
    closeWaiters.delete(cb);
  };
}

/**
 * Suscripción del provider. Devuelve unsubscribe.
 * Si había un alert pendiente (antes de montar), lo emite al conectar.
 */
export function bindAppAlertListener(next: Listener): () => void {
  listener = next;
  if (pending) next(pending);
  return () => {
    if (listener === next) listener = null;
  };
}

export type AppAlertFn = {
  (
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
  ): void;
  info: (input: AppAlertHelpersInput) => void;
  success: (input: AppAlertHelpersInput) => void;
  error: (input: AppAlertHelpersInput) => void;
  warning: (input: AppAlertHelpersInput) => void;
  confirm: (input: AppAlertConfirmInput) => void;
};

export const appAlert: AppAlertFn = Object.assign(show, {
  info: (input: AppAlertHelpersInput) => showWithVariant('info', input),
  success: (input: AppAlertHelpersInput) => showWithVariant('success', input),
  error: (input: AppAlertHelpersInput) => showWithVariant('error', input),
  warning: (input: AppAlertHelpersInput) => showWithVariant('warning', input),
  confirm: (input: AppAlertConfirmInput) => {
    show(
      input.title,
      input.message,
      [
        { text: input.cancelText, style: 'cancel', onPress: input.onCancel },
        {
          text: input.confirmText,
          style: input.destructive ? 'destructive' : 'default',
          onPress: input.onConfirm,
        },
      ],
      {
        cancelable: input.cancelable,
        variant: input.destructive ? 'warning' : 'info',
      },
    );
  },
});
