/**
 * Campana de notificaciones del vendedor — Figma 698-8930.
 * Suscribe/desuscribe al usuario a los avisos del vendedor (hoy: inicio de vivo)
 * contra service-platform, con celebración al activar.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  getSellerNotificationSubscription,
  subscribeSellerNotifications,
  unsubscribeSellerNotifications,
} from '../api/platformApi';
import { storage } from '../utils/storage';

export interface UseSellerNotificationsOptions {
  sellerUserId: string | null | undefined;
  /** Solo consulta el estado cuando está habilitado (perfil de vendedor ajeno). */
  enabled?: boolean;
}

export function useSellerNotifications({
  sellerUserId,
  enabled = true,
}: UseSellerNotificationsOptions) {
  const { t } = useTranslation();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  useEffect(() => {
    if (!enabled || !sellerUserId) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const status = await getSellerNotificationSubscription(token, sellerUserId);
        if (!cancelled) setIsSubscribed(status.subscribed);
      } catch {
        // Estado desconocido: se asume campana apagada.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, sellerUserId]);

  const dismissCelebration = useCallback(() => {
    setCelebrationVisible(false);
  }, []);

  const toggleSubscription = useCallback(async () => {
    if (!sellerUserId || subscriptionLoading) return;
    setSubscriptionLoading(true);
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        throw new Error(t('common.error'));
      }
      if (isSubscribed) {
        await unsubscribeSellerNotifications(token, sellerUserId);
        setIsSubscribed(false);
      } else {
        await subscribeSellerNotifications(token, sellerUserId);
        setIsSubscribed(true);
        setCelebrationVisible(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.appName'), msg);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [sellerUserId, subscriptionLoading, isSubscribed, t]);

  return {
    isSubscribed,
    subscriptionLoading,
    celebrationVisible,
    toggleSubscription,
    dismissCelebration,
  };
}
