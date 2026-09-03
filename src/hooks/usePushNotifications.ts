/**
 * Permiso, registro FCM y tap-to-navigate de push nativo.
 *
 * Dos caminos que NO se mezclan:
 * - `usePushNotifications(enabled)`: al arrancar autenticado registra el token en
 *   silencio si el permiso YA está concedido y cuelga los listeners. Nunca muestra
 *   el diálogo del SO.
 * - `requestPermissionAndRegister` / `openSettings`: los usa la pantalla "Activar
 *   Notificaciones" (Figma 1115:3279), que sí pide el permiso con contexto.
 */
import { useCallback, useEffect } from 'react';
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
  AuthorizationStatus?: {
    NOT_DETERMINED?: number;
    AUTHORIZED: number;
    PROVISIONAL: number;
    DENIED: number;
  };
};

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

type RemoteMessage = {
  data?: Record<string, string>;
};

let lastRegisteredToken: string | null = null;
/**
 * Android 13+: `never_ask_again` = el usuario ya lo negó dos veces y el diálogo no
 * vuelve a salir; solo Ajustes lo revierte. `PermissionsAndroid.check` no distingue
 * ese caso de "nunca se preguntó", así que se recuerda acá.
 */
let androidPermanentlyDenied = false;

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
    androidPermanentlyDenied = granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
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

/**
 * Estado del permiso del SO SIN pedirlo. `undetermined` = todavía se puede mostrar
 * el diálogo; `denied` = solo Ajustes lo revierte; `unavailable` = Firebase no está
 * linkeado en este build.
 */
export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  const messaging = loadMessaging();
  if (!messaging) return 'unavailable';
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version < 33) return 'granted';
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted) return 'granted';
      return androidPermanentlyDenied ? 'denied' : 'undetermined';
    }
    const status = await messaging().hasPermission();
    if (isAuthorized(status, messaging)) return 'granted';
    const notDetermined = messaging.AuthorizationStatus?.NOT_DETERMINED ?? -1;
    return status === notDetermined ? 'undetermined' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/**
 * Registro silencioso: si el permiso YA está concedido, obtiene el token y lo
 * registra. Nunca muestra el diálogo del SO. Best-effort: si el backend responde
 * 503 (tablas de push sin aplicar) o no hay red, se reintenta en el próximo
 * arranque autenticado.
 */
export async function registerPushTokenIfGranted(): Promise<void> {
  const messaging = loadMessaging();
  if (!messaging) return;
  try {
    if ((await getPushPermissionStatus()) !== 'granted') return;
    const token = await messaging().getToken();
    if (token) await registerToken(token);
  } catch {
    // Best-effort: no puede romper el arranque.
  }
}

export function usePushNotifications(enabled: boolean): {
  requestPermissionAndRegister: () => Promise<boolean>;
  openSettings: () => Promise<void>;
} {
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

    // Solo registra si el permiso ya está concedido (usuario que aceptó antes o
    // cuenta vieja que nunca vio la pantalla). Pedirlo es de la pantalla.
    void registerPushTokenIfGranted();

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
  }, [enabled]);

  return {
    requestPermissionAndRegister,
    openSettings: openSystemNotificationSettings,
  };
}

export type { NotificationNavTarget };
