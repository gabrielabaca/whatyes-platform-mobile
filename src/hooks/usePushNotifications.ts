/**
 * Permiso, registro FCM y tap-to-navigate de push nativo.
 *
 * La pantalla "Activar Notificaciones" del Figma la construye otro agente
 * sobre este hook: pedir permiso, registrar el token y abrir Settings si está
 * denegado. Acá el disparador es mínimo (arranque autenticado).
 */
import { useCallback, useEffect, useRef } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { upsertPushDevice } from '../api/platformApi';
import i18n from '../i18n';
import { storage } from '../utils/storage';
import {
  destinationFromPushData,
  type NotificationNavTarget,
} from '../utils/notificationDestination';
import { notifyPushDestination } from '../utils/pushDestination';

type MessagingModule = {
  (): {
    requestPermission: () => Promise<number>;
    hasPermission: () => Promise<number>;
    getToken: () => Promise<string>;
    deleteToken: () => Promise<void>;
    onTokenRefresh: (cb: (token: string) => void) => () => void;
    onNotificationOpenedApp: (cb: (msg: RemoteMessage) => void) => () => void;
    getInitialNotification: () => Promise<RemoteMessage | null>;
    setBackgroundMessageHandler?: (cb: (msg: RemoteMessage) => Promise<void>) => void;
  };
  AuthorizationStatus?: { AUTHORIZED: number; PROVISIONAL: number; DENIED: number };
};

type RemoteMessage = {
  data?: Record<string, string>;
};

let lastRegisteredToken: string | null = null;

function loadMessaging(): MessagingModule | null {
  try {
    // El nativo no está hasta `pod install` / gradle + google-services.json.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/messaging').default as MessagingModule;
  } catch {
    return null;
  }
}

function isAuthorized(status: number, messaging: MessagingModule): boolean {
  const auth = messaging.AuthorizationStatus;
  if (!auth) return status === 1 || status === 2;
  return status === auth.AUTHORIZED || status === auth.PROVISIONAL;
}

async function requestNativePermission(messaging: MessagingModule): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  try {
    const status = await messaging().requestPermission();
    return isAuthorized(status, messaging);
  } catch {
    return false;
  }
}

async function registerToken(token: string): Promise<void> {
  const access = await storage.getAccessToken();
  if (!access || !token) return;
  lastRegisteredToken = token;
  await upsertPushDevice(access, {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    locale: (i18n.language || 'es').slice(0, 8),
  });
}

function openFromRemoteMessage(msg: RemoteMessage | null | undefined): void {
  if (!msg?.data) return;
  notifyPushDestination(destinationFromPushData(msg.data));
}

/**
 * Da de baja el token en el backend y lo invalida en FCM. Llamar en logout
 * ANTES de `clearAll`, mientras el access token todavía sirve.
 *
 * Si el DELETE falla (red, token vencido), igual se llama `deleteToken()`:
 * el próximo login pide un token nuevo y el anterior deja de recibir, así el
 * usuario siguiente en ese teléfono no hereda avisos del anterior.
 */
export async function unregisterCurrentPushToken(): Promise<void> {
  const token = lastRegisteredToken;
  lastRegisteredToken = null;
  try {
    const access = await storage.getAccessToken();
    if (access && token) {
      const { deletePushDevice } = await import('../api/platformApi');
      await deletePushDevice(access, token);
    }
  } catch {
    // Best-effort: el logout local sigue.
  }
  try {
    const messaging = loadMessaging();
    await messaging?.().deleteToken();
  } catch {
    // Sin nativo o Firebase no linkeado: no bloquea el logout.
  }
}

export async function openSystemNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export function usePushNotifications(enabled: boolean): {
  requestPermissionAndRegister: () => Promise<boolean>;
  openSettings: () => Promise<void>;
} {
  const askedRef = useRef(false);

  const requestPermissionAndRegister = useCallback(async (): Promise<boolean> => {
    const messaging = loadMessaging();
    if (!messaging) return false;
    const granted = await requestNativePermission(messaging);
    if (!granted) return false;
    try {
      const token = await messaging().getToken();
      if (token) await registerToken(token);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const messaging = loadMessaging();
    if (!messaging) return;

    if (!askedRef.current) {
      askedRef.current = true;
      void requestPermissionAndRegister();
    }

    let unsubRefresh: (() => void) | undefined;
    let unsubOpened: (() => void) | undefined;
    try {
      unsubRefresh = messaging().onTokenRefresh((token) => {
        void registerToken(token).catch(() => {});
      });
      unsubOpened = messaging().onNotificationOpenedApp((msg) => {
        openFromRemoteMessage(msg);
      });
      void messaging()
        .getInitialNotification()
        .then((msg) => openFromRemoteMessage(msg))
        .catch(() => {});
    } catch {
      // Nativo no configurado todavía.
    }

    return () => {
      unsubRefresh?.();
      unsubOpened?.();
    };
  }, [enabled, requestPermissionAndRegister]);

  return {
    requestPermissionAndRegister,
    openSettings: openSystemNotificationSettings,
  };
}

export type { NotificationNavTarget };
