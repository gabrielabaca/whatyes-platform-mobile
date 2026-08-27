/**
 * Estado del envío (`SaleFulfillmentStatus` de service-platform): orden de la
 * máquina de estados y los derivados que comparten la card de Actividad y el
 * timeline del detalle de compra, para que no se contradigan entre pantallas.
 */
import type { FulfillmentStatus, PurchaseItem } from '../api/platformApi';

/** Estados de avance, en orden. Los de fallo quedan fuera: no son un "paso más". */
const PROGRESS_ORDER: FulfillmentStatus[] = [
  'none',
  'shipment_created',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

const FAILURE_STATUSES: FulfillmentStatus[] = [
  'failed_delivery',
  'returned',
  'shipment_failed',
];

/** Ventas viejas (o backend sin el campo todavía) se tratan como sin envío. */
export function normalizeFulfillmentStatus(
  raw: string | null | undefined
): FulfillmentStatus {
  const value = (raw ?? '').trim() as FulfillmentStatus;
  return PROGRESS_ORDER.includes(value) || FAILURE_STATUSES.includes(value)
    ? value
    : 'none';
}

/** El envío se cortó: la app no puede mostrarlo como un timeline en progreso. */
export function isFulfillmentFailure(status: FulfillmentStatus): boolean {
  return FAILURE_STATUSES.includes(status);
}

/** Posición en la línea de avance; -1 para los estados de fallo. */
export function fulfillmentProgress(status: FulfillmentStatus): number {
  return PROGRESS_ORDER.indexOf(status);
}

/** Claves i18n posibles del estado; literales para que `t()` las acepte tipadas. */
export type FulfillmentStatusKey =
  | 'activity.statusCancelled'
  | 'activity.statusPendingPayment'
  | 'activity.statusPreparing'
  | 'activity.statusInTransit'
  | 'activity.statusOutForDelivery'
  | 'activity.statusDelivered'
  | 'activity.statusFailedDelivery'
  | 'activity.statusReturned'
  | 'activity.statusShipmentFailed';

/**
 * Clave i18n del estado que se muestra en la card de Actividad.
 * El pago manda mientras no haya envío: una compra sin pagar no está "en camino".
 */
export function fulfillmentStatusKey(item: PurchaseItem): FulfillmentStatusKey {
  if (item.payment_status === 'cancelled') return 'activity.statusCancelled';
  const status = normalizeFulfillmentStatus(item.fulfillment_status);
  switch (status) {
    case 'failed_delivery':
      return 'activity.statusFailedDelivery';
    case 'returned':
      return 'activity.statusReturned';
    case 'shipment_failed':
      return 'activity.statusShipmentFailed';
    case 'delivered':
      return 'activity.statusDelivered';
    case 'out_for_delivery':
      return 'activity.statusOutForDelivery';
    case 'in_transit':
      return 'activity.statusInTransit';
    case 'shipment_created':
      return 'activity.statusPreparing';
    default:
      return item.payment_status === 'paid'
        ? 'activity.statusPreparing'
        : 'activity.statusPendingPayment';
  }
}
