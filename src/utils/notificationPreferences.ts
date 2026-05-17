import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pulpolive/notification-preferences';

export interface NotificationPreferences {
  all: boolean;
  shippingTracking: boolean;
  purchaseNotify: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  all: true,
  shippingTracking: true,
  purchaseNotify: true,
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    }
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      all: parsed.all ?? true,
      shippingTracking: parsed.shippingTracking ?? true,
      purchaseNotify: parsed.purchaseNotify ?? true,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export async function persistNotificationPreferences(
  prefs: NotificationPreferences
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
