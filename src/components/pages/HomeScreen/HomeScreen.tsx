/**
 * Home Screen — feed de lives en Inicio (comprador y vendedor); hub vendedor en FAB.
 * Navegación interna: home | explore | category | sellerHub | account | profile.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, RefreshControl, Alert, StyleSheet } from 'react-native';
import { GeneralLayout } from '../../templates/GeneralLayout';
import { Text } from '../../atoms/Text';
import { StreamData } from '../../molecules/StreamCard';
import { BuyerExploreScreen } from '../BuyerExploreScreen';
import { BuyerCategoryStreamsScreen } from '../BuyerCategoryStreamsScreen';
import { BuyerAccountScreen } from '../BuyerAccountScreen';
import { BuyerPurchasesScreen } from '../BuyerPurchasesScreen';
import { UserProfileScreen } from '../UserProfileScreen';
import { BuyerKycModal } from '../../organisms/account/BuyerKycModal';
import {
  getMySalesSummary,
  getUserShows,
  type PurchaseItem,
  type UserShowItem,
} from '../../../api/platformApi';
import { ActivityScreen } from '../ActivityScreen/ActivityScreen';
import { PurchaseDetailScreen } from '../PurchaseDetailScreen/PurchaseDetailScreen';
import { getUserPublicProfile } from '../../../api/profileApi';
import { getSellerOnboardingStatus } from '../../../api/sellerOnboardingApi';
import { storage } from '../../../utils/storage';
import { useAuth } from '../../../hooks/useAuth';
import { useBottomNavController } from '../../../context/BottomNavContext';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { useBuyerLiveRoomPreviews } from '../../../hooks/useBuyerLiveRoomPreviews';
import { previewToStreamData } from '../../../utils/streamPreviewToStreamData';
import { themeColors } from '../../../theme/colors';
import type { UserMe } from '../../../api/types';
import type { InterestCategoryItem } from '../../../api/types';
import {
  HomeHeader,
  CategoryExplorerRow,
  SectionHeader,
  BuyerLiveStreamsGrid,
  SellerHomeDashboard,
  ALL_CATEGORIES_ID,
  type LiveStreamPreviewModel,
  type HomeBottomTab,
} from '../../organisms/home';
import { AddProductScreen } from '../AddProductScreen';

interface HomeScreenProps {
  onStreamPress?: (stream: StreamData | any) => void;
  /**
   * Llamado cuando el usuario toca un stream del grid; recibe la lista completa,
   * el índice tocado y la categoría activa (para que el feed de swipe siga el mismo filtro).
   */
  onStreamsSwipePress?: (
    streams: StreamData[],
    index: number,
    categoryUuid?: string
  ) => void;
  onStartNewStream?: () => void;
  onEditDraft?: (draft: any) => void;
}

const GRID_GAP = 12;

type HomePath =
  | { name: 'home' }
  | { name: 'explore' }
  | { name: 'category'; category: InterestCategoryItem }
  | { name: 'sellerHub' }
  | { name: 'account' }
  | { name: 'purchases' }
  | { name: 'activity' }
  | { name: 'purchaseDetail'; purchase: PurchaseItem }
  | { name: 'profile'; userId?: string; returnTo?: 'account' | 'activity' }
  | { name: 'addProduct'; returnTo?: 'home' | 'sellerHub' };

/** Debe renderizarse dentro de GeneralLayout (BottomNavProvider). */
const HomeNavBridge: React.FC<{
  activeTab: HomeBottomTab;
  onTabPress: (tab: HomeBottomTab) => void;
  children: React.ReactNode;
}> = ({ activeTab, onTabPress, children }) => {
  useBottomNavController(activeTab, onTabPress);
  return <>{children}</>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStreamPress,
  onStreamsSwipePress,
  onStartNewStream,
}) => {
  const { t } = useTranslation();
  const { user, logout, reloadUser } = useAuth();
  const isSeller = user?.user_type === 'seller_user';
  const isBuyer = user?.user_type === 'buyer_user';

  const { categories, loadOnce } = useInterestCategories();
  const hasHomeTabs = isBuyer || isSeller;
  const { previews, loading, refreshing, onRefresh } = useBuyerLiveRoomPreviews({
    pollIntervalMs: 15000,
    enabled: hasHomeTabs,
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES_ID);
  const [bottomTab, setBottomTab] = useState<HomeBottomTab>('home');
  const [homePath, setHomePath] = useState<HomePath>({ name: 'home' });
  const [soldCount, setSoldCount] = useState(0);
  const [salesTotalCents, setSalesTotalCents] = useState(0);
  const [pastLives, setPastLives] = useState<UserShowItem[]>([]);
  const [showFirstLiveCta, setShowFirstLiveCta] = useState(true);
  const [kycVisible, setKycVisible] = useState(false);

  useEffect(() => {
    if (isBuyer || isSeller) {
      loadOnce().catch(() => {});
    }
  }, [isBuyer, isSeller, loadOnce]);

  // Datos del hub del vendedor (Figma 636-30524): total de ventas para la card
  // de pagos, cantidad de vendidos y lives pasados. Se recarga al entrar al hub
  // (homePath) para reflejar ventas de un vivo recién terminado.
  const isSellerHubOpen = isSeller && homePath.name === 'sellerHub';
  useEffect(() => {
    if (!isSeller || !user?.uuid) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [profile, onboarding] = await Promise.all([
          getUserPublicProfile(user.uuid),
          getSellerOnboardingStatus(),
        ]);
        if (cancelled) {
          return;
        }
        setSoldCount(profile.sold_count ?? 0);
        setShowFirstLiveCta(onboarding.is_first_live_auction !== false);
      } catch {
        if (!cancelled) {
          setSoldCount(0);
          setShowFirstLiveCta(true);
        }
      }
      try {
        const token = await storage.getAccessToken();
        if (!token || cancelled) return;
        const [summary, endedShows] = await Promise.all([
          getMySalesSummary(token).catch(() => null),
          getUserShows(token, user.uuid, { status: 'ended', limit: 20 }).catch(
            () => [] as UserShowItem[]
          ),
        ]);
        if (cancelled) return;
        if (summary) {
          // La tabla de ventas es la fuente real: pisa el sold_count estático del perfil.
          setSoldCount(summary.sold_count);
          setSalesTotalCents(summary.total_amount_cents);
        }
        setPastLives(endedShows);
      } catch {
        // Sin red: se mantienen los valores previos.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSeller, user?.uuid, isSellerHubOpen]);

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

  const toStreamData = (p: LiveStreamPreviewModel): StreamData =>
    previewToStreamData(p, t('home.liveBadge'));

  const handleStreamPress = (p: LiveStreamPreviewModel) => {
    if (onStreamsSwipePress) {
      const allStreams = filteredPreviews.map(toStreamData);
      const index = filteredPreviews.indexOf(p);
      const categoryUuid =
        selectedCategoryId === ALL_CATEGORIES_ID ? undefined : selectedCategoryId;
      onStreamsSwipePress(allStreams, Math.max(0, index), categoryUuid);
      return;
    }
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

  const handleBottomTab = useCallback(
    (tab: HomeBottomTab) => {
      setBottomTab(tab);
      if (tab === 'home') {
        setHomePath({ name: 'home' });
        return;
      }
      if (tab === 'explore') {
        setHomePath({ name: 'explore' });
        return;
      }
      if (tab === 'account') {
        // Tab "Cuenta": directo al perfil del usuario; el menú de configuración
        // queda accesible desde el back del perfil.
        setHomePath({ name: 'profile' });
        return;
      }
      if (tab === 'create') {
        setHomePath({ name: 'sellerHub' });
        return;
      }
      if (tab === 'activity') {
        setHomePath({ name: 'activity' });
      }
    },
    [t]
  );

  if (!user) {
    return null;
  }

  if (!isBuyer && !isSeller) {
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
    homePath.name === 'sellerHub' || homePath.name === 'addProduct'
      ? 'create'
      : homePath.name === 'category'
        ? 'explore'
        : homePath.name === 'activity' || homePath.name === 'purchaseDetail'
          ? 'activity'
          : homePath.name === 'purchases' || homePath.name === 'account' || homePath.name === 'profile'
            ? 'account'
            : bottomTab;

  const isSellerDashboard = isSeller && homePath.name === 'sellerHub';

  const showHomeHeader =
    homePath.name === 'home' ||
    homePath.name === 'explore' ||
    homePath.name === 'category' ||
    homePath.name === 'sellerHub' ||
    homePath.name === 'activity' ||
    homePath.name === 'account' ||
    homePath.name === 'addProduct';

  const paymentsAmount = t('sellerHome.paymentsAmount', {
    amount: new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(
      Math.round(salesTotalCents / 100)
    ),
  });

  return (
    <GeneralLayout hideChrome menuOptions={[]} containerStyle={styles.homeRoot}>
      <HomeNavBridge activeTab={bottomNavActiveTab} onTabPress={handleBottomTab}>
        <View style={styles.homeRoot}>
          {showHomeHeader ? (
            <HomeHeader
              profileImageUri={profileImageUri}
              profileInitials={profileInitials}
              onPressSearch={() => Alert.alert(t('common.appName'), t('home.searchPlaceholder'))}
              onPressNotifications={() =>
                Alert.alert(t('common.appName'), t('home.placeholderNotifications'))
              }
              showProfile={homePath.name === 'home'}
              onPressProfile={() => {
                setBottomTab('account');
                setHomePath({ name: 'account' });
              }}
            />
          ) : null}

          {isSellerDashboard ? (
            <SellerHomeDashboard
              paymentsAmount={paymentsAmount}
              soldCount={soldCount}
              showVerifyBanner={!(user as UserMe).identity_kyc_verified}
              showFirstLiveCta={showFirstLiveCta}
              onPressVerify={() => setKycVisible(true)}
              onPressPayments={() =>
                Alert.alert(t('common.appName'), t('home.placeholderScreen'))
              }
              onPressSold={() =>
                Alert.alert(t('common.appName'), t('home.placeholderScreen'))
              }
              onPressGoLive={() => onStartNewStream?.()}
              onPressAddProduct={() => setHomePath({ name: 'addProduct', returnTo: 'sellerHub' })}
              onPressFirstLiveCta={() => onStartNewStream?.()}
              pastLives={pastLives}
              onPressPastLive={handleProfileShowPress}
            />
          ) : null}

          {isSeller && homePath.name === 'addProduct' ? (
            <AddProductScreen
              onCancel={() => {
                if (homePath.returnTo === 'sellerHub') {
                  setHomePath({ name: 'sellerHub' });
                } else {
                  setHomePath({ name: 'home' });
                }
              }}
              onSaved={() => {
                if (homePath.returnTo === 'sellerHub') {
                  setHomePath({ name: 'sellerHub' });
                } else {
                  setHomePath({ name: 'home' });
                }
              }}
            />
          ) : null}

          {homePath.name === 'home' ? (
            <ScrollView
              className="flex-1"
              nestedScrollEnabled
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
                emptyLabel={t('home.noLiveStreams')}
                emptySubtitle={t('home.noLiveStreamsSubtitle')}
                gap={GRID_GAP}
                previewWithCategory={previewWithCategory}
                sectionHeader={
                  !loading && filteredPreviews.length > 0 ? (
                    <SectionHeader
                      title={t('home.forYou')}
                      actionLabel={t('home.seeAll')}
                      onActionPress={() =>
                        Alert.alert(t('common.appName'), t('home.placeholderSeeAll'))
                      }
                    />
                  ) : undefined
                }
              />
            </ScrollView>
          ) : null}

          {homePath.name === 'explore' ? (
            <BuyerExploreScreen
              onSelectCategory={(c) => setHomePath({ name: 'category', category: c })}
            />
          ) : null}

          {homePath.name === 'category' ? (
            <BuyerCategoryStreamsScreen
              category={homePath.category}
              onBack={() => setHomePath({ name: 'explore' })}
              onStreamPress={handleStreamPress}
            />
          ) : null}

          {homePath.name === 'purchases' ? (
            <BuyerPurchasesScreen onOpenAccount={() => setHomePath({ name: 'account' })} />
          ) : null}

          {homePath.name === 'activity' ? (
            <ActivityScreen
              isSeller={isSeller}
              onOpenPurchase={(purchase) =>
                setHomePath({ name: 'purchaseDetail', purchase })
              }
            />
          ) : null}

          {homePath.name === 'purchaseDetail' ? (
            <PurchaseDetailScreen
              purchase={homePath.purchase}
              onBack={() => setHomePath({ name: 'activity' })}
              onOpenSellerProfile={(sellerUserId) =>
                setHomePath({ name: 'profile', userId: sellerUserId, returnTo: 'activity' })
              }
            />
          ) : null}

          {homePath.name === 'account' ? (
            <BuyerAccountScreen
              profileImageUri={profileImageUri}
              displayName={`${user.name ?? ''} ${user.last_name ?? ''}`.trim() || user.username}
              subtitle={user.customer?.name ?? user.email}
              userEmail={user.email}
              onViewProfile={() => setHomePath({ name: 'profile' })}
              onLogout={() => {
                logout().catch(() => {});
              }}
            />
          ) : null}

          {homePath.name === 'profile' ? (
            <View className="flex-1 bg-white">
              <UserProfileScreen
                userId={homePath.userId}
                onBack={() =>
                  setHomePath(
                    homePath.returnTo === 'activity' ? { name: 'activity' } : { name: 'account' }
                  )
                }
                onShowPress={handleProfileShowPress}
              />
            </View>
          ) : null}

          <BuyerKycModal
            visible={kycVisible}
            onClose={() => setKycVisible(false)}
            onVerified={() => {
              setKycVisible(false);
              void reloadUser();
            }}
          />
        </View>
      </HomeNavBridge>
    </GeneralLayout>
  );
};

const styles = StyleSheet.create({
  homeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
