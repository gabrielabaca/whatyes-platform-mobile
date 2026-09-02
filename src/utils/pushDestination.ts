/**
 * Destino de un tap en push / deep link, con pending si el consumidor aún no montó.
 *
 * Misma forma que `buyerKycDeepLink`: el push con la app cerrada llega ANTES de
 * que HomeScreen exista. Quien se suscribe después drena el pendiente.
 */
import type { NotificationNavTarget } from './notificationDestination';

type DestinationHandler = (target: NotificationNavTarget) => void;

let destinationHandler: DestinationHandler | null = null;
let pendingTarget: NotificationNavTarget | null = null;

export function subscribePushDestination(handler: DestinationHandler): () => void {
  destinationHandler = handler;
  if (pendingTarget) {
    const next = pendingTarget;
    pendingTarget = null;
    handler(next);
  }
  return () => {
    if (destinationHandler === handler) {
      destinationHandler = null;
    }
  };
}

export function notifyPushDestination(target: NotificationNavTarget): void {
  if (destinationHandler) {
    destinationHandler(target);
  } else {
    pendingTarget = target;
  }
}
