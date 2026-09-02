import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getCategoryNotificationSubscription,
  subscribeCategoryNotifications,
  unsubscribeCategoryNotifications,
} from '../api/platformApi';
import { storage } from '../utils/storage';
import { appAlert } from '../alerts';

export interface UseCategoryFollowOptions {
  categoryUuid: string | null | undefined;
  enabled?: boolean;
}

export function useCategoryFollow({
  categoryUuid,
  enabled = true,
}: UseCategoryFollowOptions) {
  const { t } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !categoryUuid) {
      setIsFollowing(false);
      setStatusLoaded(false);
      return;
    }
    let cancelled = false;
    setStatusLoaded(false);
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const status = await getCategoryNotificationSubscription(token, categoryUuid);
        if (!cancelled) setIsFollowing(status.subscribed);
      } catch {
        // Estado desconocido: se asume sin seguir.
      } finally {
        if (!cancelled) setStatusLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, categoryUuid]);

  const toggleFollow = useCallback(async () => {
    if (!categoryUuid || followLoading) return;
    setFollowLoading(true);
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        throw new Error(t('common.error'));
      }
      if (isFollowing) {
        await unsubscribeCategoryNotifications(token, categoryUuid);
        setIsFollowing(false);
      } else {
        await subscribeCategoryNotifications(token, categoryUuid);
        setIsFollowing(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('explore.followError');
      appAlert(t('common.appName'), msg);
    } finally {
      setFollowLoading(false);
    }
  }, [categoryUuid, followLoading, isFollowing, t]);

  return {
    isFollowing,
    followLoading,
    statusLoaded,
    toggleFollow,
  };
}
