import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { followUser, unfollowUser } from '../api/profileApi';
import { storage } from '../utils/storage';
import { appAlert } from '../alerts';

export interface UseSellerFollowOptions {
  sellerUserId: string | null | undefined;
  sellerName: string;
  initialFollowing?: boolean;
}

export function useSellerFollow({
  sellerUserId,
  sellerName,
  initialFollowing = false,
}: UseSellerFollowOptions) {
  const { t } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing, sellerUserId]);

  const dismissCelebration = useCallback(() => {
    setCelebrationVisible(false);
  }, []);

  const toggleFollow = useCallback(async () => {
    if (!sellerUserId || followLoading) return;

    setFollowLoading(true);
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        throw new Error(t('common.error'));
      }

      if (isFollowing) {
        await unfollowUser(sellerUserId, token);
        setIsFollowing(false);
      } else {
        await followUser(sellerUserId, token);
        setIsFollowing(true);
        setCelebrationVisible(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('profile.followError');
      appAlert(t('common.appName'), msg);
    } finally {
      setFollowLoading(false);
    }
  }, [sellerUserId, followLoading, isFollowing, sellerName, t]);

  return {
    isFollowing,
    followLoading,
    celebrationVisible,
    toggleFollow,
    dismissCelebration,
    setIsFollowing,
  };
}
