/**
 * Home Screen — comprador (categorías, ✨ Para Ti, Explorar, tab bar).
 * Navegación interna: home | explore | category (detalle categoría + lives).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { GeneralLayout } from '../../templates/GeneralLayout';
import { Text } from '../../atoms/Text';
import { StreamData } from '../../molecules/StreamCard';
import { SellerHomeScreen } from '../SellerHomeScreen';
import { BuyerExploreScreen } from '../BuyerExploreScreen';
import { BuyerCategoryStreamsScreen } from '../BuyerCategoryStreamsScreen';
import { BuyerAccountScreen } from '../BuyerAccountScreen';
import { UserProfileScreen } from '../UserProfileScreen';
import type { UserShowItem } from '../../../api/platformApi';
import { useAuth } from '../../../hooks/useAuth';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { useBuyerLiveRoomPreviews } from '../../../hooks/useBuyerLiveRoomPreviews';
import { themeColors } from '../../../theme/colors';
import type { UserMe } from '../../../api/types';
import type { InterestCategoryItem } from '../../../api/types';
import {
  HomeHeader,
  CategoryExplorerRow,
  SectionHeader,
  BuyerLiveStreamsGrid,
  HomeBottomNav,
  ALL_CATEGORIES_ID,
  type LiveStreamPreviewModel,
  type HomeBottomTab,
} from '../../organisms/home';

interface HomeScreenProps {
  onStreamPress?: (stream: StreamData | any) => void;
  onStartNewStream?: () => void;
  onEditDraft?: (draft: any) => void;
}

const GRID_GAP = 12;

type BuyerPath =
  | { name: 'home' }
  | { name: 'explore' }
  | { name: 'category'; category: InterestCategoryItem }
  | { name: 'account' }
  | { name: 'profile'; userId?: string };

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStreamPress,
  onStartNewStream,
  onEditDraft,
}) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { categories, loadOnce } = useInterestCategories();
  const { previews, loading, refreshing, onRefresh } = useBuyerLiveRoomPreviews({
    pollIntervalMs: 15000,
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES_ID);
  const [bottomTab, setBottomTab] = useState<HomeBottomTab>('home');
  const [buyerPath, setBuyerPath] = useState<BuyerPath>({ name: 'home' });

  useEffect(() => {
    if (user?.user_type === 'buyer_user') {
      loadOnce().catch(() => {});
    }
  }, [user?.user_type, loadOnce]);

  /** Filtrado por chip de categoría usando `interest_categories` de cada sala. */
  const filteredPreviews = useMemo(() => {
    if (selectedCategoryId === ALL_CATEGORIES_ID) {
      return previews;
    }
    return previews.filter((p) =>
      (p.interestCategories ?? []).some((c) => c.uuid === selectedCategoryId)
    );
  }, [previews, selectedCategoryId]);

  const profileImageUri =
    (user as UserMe | null)?.profile_picture ?? user?.profile?.picture ?? null;
  const profileInitials = useMemo(() => {
    const a = user?.name?.trim()?.[0] ?? '';
    const b = user?.last_name?.trim()?.[0] ?? '';
    const s = `${a}${b}`.toUpperCase();
    return s || '?';
  }, [user]);

  const toStreamData = (p: LiveStreamPreviewModel): StreamData => ({
    id: p.id,
    sellerName: p.sellerName,
    viewerCount: p.viewerCount,
    streamingTime: t('home.liveBadge'),
    thumbnail: p.thumbnail ?? p.sellerAvatarUrl ?? undefined,
    title: p.title,
    sellerAvatarUrl: p.sellerAvatarUrl,
    sellerRating: p.rating ?? null,
    sellerUserId: p.sellerUserId,
    productImageUrl: p.thumbnail ?? p.sellerAvatarUrl ?? undefined,
    productCount: 1,
  });

  const handleStreamPress = (p: LiveStreamPreviewModel) => {
    if (onStreamPress) {
      onStreamPress(toStreamData(p));
    }
  };

  const handleProfileShowPress = (show: UserShowItem) => {
    if (show.status !== 'live' || !onStreamPress) {
      return;
    }
    const seller = show.creator;
    onStreamPress({
      id: show.room_uuid,
      sellerName: seller ? `${seller.name} ${seller.last_name}`.trim() : t('home.defaultRoomName'),
      viewerCount: show.viewer_count ?? 0,
      streamingTime: t('home.liveBadge'),
      thumbnail: show.thumbnail_url ?? undefined,
      title: show.name ?? undefined,
      sellerAvatarUrl: seller?.profile_picture ?? null,
      sellerUserId: seller?.uuid,
      productImageUrl: show.thumbnail_url ?? undefined,
      productCount: 1,
    });
  };

  const handleBottomTab = (tab: HomeBottomTab) => {
    setBottomTab(tab);
    if (tab === 'home') {
      setBuyerPath({ name: 'home' });
      return;
    }
    if (tab === 'explore') {
      setBuyerPath({ name: 'explore' });
      return;
    }
    if (tab === 'account') {
      setBuyerPath({ name: 'account' });
      return;
    }
    if (tab === 'create') {
      onStartNewStream?.();
      return;
    }
    if (tab === 'activity') {
      Alert.alert(t('common.appName'), t('home.placeholderScreen'));
    }
  };

  if (!user) {
    return null;
  }

  if (user.user_type === 'seller_user') {
    return (
      <SellerHomeScreen
        onStreamPress={onStreamPress}
        onStartNewStream={onStartNewStream}
        onEditDraft={onEditDraft}
      />
    );
  }

  if (user.user_type !== 'buyer_user') {
    return (
      <View className="flex-1 bg-white p-6">
        <Text variant="h1" className="text-primary-600 mb-2">
          {t('home.welcome')}
        </Text>
        <Text variant="body" className="text-gray-600">
          {user.name} {user.last_name}
        </Text>
      </View>
    );
  }

  const selectedCategoryLabel =
    selectedCategoryId === ALL_CATEGORIES_ID
      ? null
      : categories.find((c) => c.uuid === selectedCategoryId)?.label ?? null;

  const previewWithCategory = (p: LiveStreamPreviewModel): LiveStreamPreviewModel => {
    if (p.interestCategories && p.interestCategories.length > 0) {
      return p;
    }
    if (!selectedCategoryLabel) {
      return { ...p, categoryLabel: p.categoryLabel };
    }
    return { ...p, categoryLabel: selectedCategoryLabel };
  };

  const bottomNavActiveTab: HomeBottomTab =
    buyerPath.name === 'category'
      ? 'explore'
      : buyerPath.name === 'profile'
        ? 'account'
        : bottomTab;

  const showHomeHeader =
    buyerPath.name === 'home' || buyerPath.name === 'explore' || buyerPath.name === 'category';

  return (
    <GeneralLayout
      hideChrome
      menuOptions={[]}
      containerClassName="flex-1"
      bottomBar={<HomeBottomNav activeTab={bottomNavActiveTab} onTabPress={handleBottomTab} />}
    >
      <View className="flex-1 bg-[transparent] dark:bg-night-950">
        {showHomeHeader ? (
          <HomeHeader
            profileImageUri={profileImageUri}
            profileInitials={profileInitials}
            onPressSearch={() => Alert.alert(t('common.appName'), t('home.searchPlaceholder'))}
            onPressNotifications={() =>
              Alert.alert(t('common.appName'), t('home.placeholderNotifications'))
            }
            showProfile={buyerPath.name === 'home'}
            onPressProfile={() => {
              setBottomTab('account');
              setBuyerPath({ name: 'account' });
            }}
          />
        ) : null}

        {buyerPath.name === 'home' ? (
          <ScrollView
            className="flex-1"
            nestedScrollEnabled
            // eslint-disable-next-line react-native/no-inline-styles -- padding alineado al diseño Home
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 24,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={themeColors.primary}
                colors={[themeColors.primary]}
              />
            }
          >
            <CategoryExplorerRow
              title={t('home.exploreCategories')}
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />

            <View className="h-8" />

            <BuyerLiveStreamsGrid
              previews={filteredPreviews}
              loading={loading}
              onStreamPress={handleStreamPress}
              loadingLabel={t('common.loading')}
              emptyLabel={t('home.noLiveStreams')}
              gap={GRID_GAP}
              previewWithCategory={previewWithCategory}
              sectionHeader={
                !loading && filteredPreviews.length > 0 ? (
                  <SectionHeader
                    title={t('home.forYou')}
                    actionLabel={t('home.seeAll')}
                    onActionPress={() => Alert.alert(t('common.appName'), t('home.placeholderSeeAll'))}
                  />
                ) : undefined
              }
            />
          </ScrollView>
        ) : null}

        {buyerPath.name === 'explore' ? (
          <BuyerExploreScreen onSelectCategory={(c) => setBuyerPath({ name: 'category', category: c })} />
        ) : null}

        {buyerPath.name === 'category' ? (
          <BuyerCategoryStreamsScreen
            category={buyerPath.category}
            onBack={() => setBuyerPath({ name: 'explore' })}
            onStreamPress={handleStreamPress}
          />
        ) : null}

        {buyerPath.name === 'account' ? (
          <BuyerAccountScreen
            profileImageUri={profileImageUri}
            displayName={`${user.name ?? ''} ${user.last_name ?? ''}`.trim() || user.username}
            subtitle={user.customer?.name ?? user.email}
            userEmail={user.email}
            onViewProfile={() => setBuyerPath({ name: 'profile' })}
            onLogout={() => {
              logout().catch(() => {});
            }}
          />
        ) : null}

        {buyerPath.name === 'profile' ? (
          <View className="flex-1 bg-white">
            <UserProfileScreen
              userId={buyerPath.userId}
              onBack={() => setBuyerPath({ name: 'account' })}
              onShowPress={handleProfileShowPress}
            />
          </View>
        ) : null}
      </View>
    </GeneralLayout>
  );
};
