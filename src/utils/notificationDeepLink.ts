/**
 * Deep links de notificaciones nativas (`pulpolive://...`).
 *
 * El handler de App.tsx solo contemplaba KYC y wallet; el resto se ignoraba
 * en silencio. Estos helpers cubren los destinos del push.
 */
import {
  destinationFromNotification,
  type NotificationNavTarget,
} from './notificationDestination';

const SCHEME = 'pulpolive://';

function parseQuery(url: string): Record<string, string> {
  const qIndex = url.indexOf('?');
  if (qIndex < 0) return {};
  const out: Record<string, string> = {};
  const params = new URLSearchParams(url.slice(qIndex + 1));
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function pathAfterHost(url: string): { host: string; path: string } | null {
  if (!url.startsWith(SCHEME)) return null;
  const rest = url.slice(SCHEME.length);
  const noQuery = rest.split('?')[0] ?? '';
  const parts = noQuery.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  return { host: parts[0], path: parts.slice(1).join('/') };
}

/**
 * True si la URL es un destino de notificación (no KYC / wallet).
 * `pulpolive://rooms/{id}`, `users/{id}`, `purchases/{id}`, `chat/{id}`, `notifications`.
 */
export function isNotificationDeepLink(url: string | null | undefined): boolean {
  if (!url) return false;
  const parsed = pathAfterHost(url);
  if (!parsed) return false;
  return (
    parsed.host === 'rooms' ||
    parsed.host === 'users' ||
    parsed.host === 'purchases' ||
    parsed.host === 'chat' ||
    parsed.host === 'notifications' ||
    parsed.host === 'activity'
  );
}

export function destinationFromDeepLink(url: string): NotificationNavTarget | null {
  const parsed = pathAfterHost(url);
  if (!parsed) return null;
  const query = parseQuery(url);
  if (parsed.host === 'rooms' && parsed.path) {
    return { kind: 'stream', roomId: parsed.path, sellerName: query.seller_name || null };
  }
  if (parsed.host === 'users' && parsed.path) {
    return { kind: 'profile', userId: parsed.path };
  }
  if (parsed.host === 'purchases' && parsed.path) {
    return { kind: 'purchase', saleId: parsed.path };
  }
  if (parsed.host === 'chat') {
    return { kind: 'chat', conversationId: parsed.path || undefined };
  }
  if (parsed.host === 'activity') {
    return { kind: 'activity' };
  }
  if (parsed.host === 'notifications') {
    return destinationFromNotification({
      type: query.type,
      actor_user_id: query.actor_user_id,
      resource_type: query.resource_type,
      resource_id: query.resource_id,
      room_id: query.room_id,
    });
  }
  return null;
}
