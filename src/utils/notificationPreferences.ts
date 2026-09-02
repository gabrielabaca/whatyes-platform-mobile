import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNotificationPreferencesRemote,
  updateNotificationPreferencesRemote,
  type NotificationPreferencesUpdateRemote,
} from '../api/platformApi';
import { storage } from './storage';

const STORAGE_KEY = '@pulpolive/notification-preferences';

export interface NotificationPreferences {
  all: boolean;
  shippingTracking: boolean;
  purchaseNotify: boolean;
  notifyAnyLive: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  all: true,
  shippingTracking: true,
  purchaseNotify: true,
  notifyAnyLive: false,
};

function fromRemote(raw: {
  all: boolean;
  shipping_tracking: boolean;
  purchase_notify: boolean;
  notify_any_live: boolean;
}): NotificationPreferences {
  const shippingTracking = raw.shipping_tracking;
  const purchaseNotify = raw.purchase_notify;
  return {
    all: shippingTracking && purchaseNotify,
    shippingTracking,
    purchaseNotify,
    notifyAnyLive: raw.notify_any_live,
  };
}

function toRemoteUpdate(prefs: NotificationPreferences): NotificationPreferencesUpdateRemote {
  return {
    shipping_tracking: prefs.shippingTracking,
    purchase_notify: prefs.purchaseNotify,
    notify_any_live: prefs.notifyAnyLive,
  };
}

function parseCached(raw: string): NotificationPreferences {
  const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
  const shippingTracking = parsed.shippingTracking ?? true;
  const purchaseNotify = parsed.purchaseNotify ?? true;
  return {
    all: parsed.all ?? shippingTracking && purchaseNotify,
    shippingTracking,
    purchaseNotify,
    notifyAnyLive: parsed.notifyAnyLive ?? false,
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    }
    return parseCached(raw);
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export async function persistNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

/**
 * Pinta desde caché y, si hay red, pisa con el servidor (fuente de verdad).
 * Si el GET falla, queda el caché — la pantalla no depende de la red para mostrar estado.
 */
export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const cached = await getNotificationPreferences();
  try {
    const token = await storage.getAccessToken();
    if (!token) {
      return cached;
    }
    const remoteRaw = await getNotificationPreferencesRemote(token);
    const remote = fromRemote(remoteRaw);
    const cacheIsCustom =
      !cached.shippingTracking || !cached.purchaseNotify || cached.notifyAnyLive;
    if (remoteRaw.persisted === false && cacheIsCustom) {
      return saveNotificationPreferences(cached);
    }
    await persistNotificationPreferences(remote);
    return remote;
  } catch {
    return cached;
  }
}

/**
 * Escribe caché ya (la UI no espera) y manda el servidor. Si el PUT falla, la caché
 * queda como pendiente; el próximo load exitoso pisa con el servidor.
 */
export async function saveNotificationPreferences(
  prefs: NotificationPreferences
): Promise<NotificationPreferences> {
  const normalized: NotificationPreferences = {
    ...prefs,
    all: prefs.shippingTracking && prefs.purchaseNotify,
  };
  await persistNotificationPreferences(normalized);
  const token = await storage.getAccessToken();
  if (!token) {
    return normalized;
  }
  const remote = fromRemote(
    await updateNotificationPreferencesRemote(token, toRemoteUpdate(normalized))
  );
  await persistNotificationPreferences(remote);
  return remote;
}

export async function patchNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await loadNotificationPreferences();
  return saveNotificationPreferences({ ...current, ...patch });
}
