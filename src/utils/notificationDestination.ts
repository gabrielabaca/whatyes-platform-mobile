/**
 * Destino de navegación a partir de una notificación (feed, heads-up o push).
 *
 * Un solo mapeo para las tres vías: si quedan dos, se van a separar. Extraído
 * de NotificationsScreen (new_follower → perfil, sale → compra, product_sold /
 * sale_paid → actividad) y extendido para vivo y chat.
 */

export type NotificationNavTarget =
  | { kind: 'profile'; userId: string }
  | { kind: 'activity' }
  | { kind: 'purchase'; saleId: string }
  | { kind: 'stream'; roomId: string; sellerName?: string | null }
  | { kind: 'chat'; conversationId?: string }
  | { kind: 'notifications' };

export type NotificationLike = {
  type?: string | null;
  actor_user_id?: string | null;
  seller_user_id?: string | null;
  room_id?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  data?: Record<string, unknown> | null;
};

function str(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value).trim();
}

/**
 * Acepta tanto el item del feed/WS como el `data` plano del push FCM
 * (todos los valores son string).
 */
export function destinationFromNotification(item: NotificationLike): NotificationNavTarget {
  const type = str(item.type);
  const resourceType = str(item.resource_type);
  const resourceId = str(item.resource_id);
  const actorId = str(item.actor_user_id);
  const roomId = str(item.room_id) || (resourceType === 'room' ? resourceId : '');
  const data = item.data ?? {};
  const sellerName = str(data.seller_name) || str(data.sellerName) || null;

  if (type === 'new_follower' && actorId) {
    return { kind: 'profile', userId: actorId };
  }
  if (type === 'product_sold' || type === 'sale_paid') {
    return { kind: 'activity' };
  }
  if (resourceType === 'sale' && resourceId) {
    return { kind: 'purchase', saleId: resourceId };
  }
  if (type === 'seller_live_start' || resourceType === 'room') {
    if (roomId) {
      return { kind: 'stream', roomId, sellerName };
    }
  }
  if (type === 'new_message' || resourceType === 'conversation') {
    return { kind: 'chat', conversationId: resourceId || undefined };
  }
  return { kind: 'notifications' };
}

/** FCM `data` payload: todos los valores son string. */
export function destinationFromPushData(
  data: Record<string, string> | undefined | null
): NotificationNavTarget {
  if (!data) return { kind: 'notifications' };
  return destinationFromNotification({
    type: data.type,
    actor_user_id: data.actor_user_id,
    seller_user_id: data.seller_user_id,
    room_id: data.room_id,
    resource_type: data.resource_type,
    resource_id: data.resource_id,
    data,
  });
}
