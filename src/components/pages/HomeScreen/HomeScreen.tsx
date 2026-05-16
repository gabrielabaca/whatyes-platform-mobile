/**
 * Home Screen — comprador (categorías, ✨ Para Ti en rejilla 2 col, tab bar).
 * Lista salas en vivo desde service-platform (GET /rooms).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { GeneralLayout } from '../../templates/GeneralLayout';
import { Text } from '../../atoms/Text';
import { StreamData } from '../../molecules/StreamCard';
import { SellerHomeScreen } from '../SellerHomeScreen';
import { useAuth } from '../../../hooks/useAuth';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { getRooms, type PlatformRoom } from '../../../api/platformApi';
import { storage } from '../../../utils/storage';
import { themeColors } from '../../../theme/colors';
import type { UserMe } from '../../../api/types';
import {
  HomeHeader,
  CategoryExplorerRow,
  SectionHeader,
  LiveStreamPreviewCard,
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

/** Espectadores simulados estables por sala hasta que la API exponga el dato */
function pseudoViewers(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = (h * 31 + uuid.charCodeAt(i)) >>> 0;
  }
  return (h % 4500) + 50;
}

/**
 * Mapea `PlatformRoom` (+ `creator` de service-users) al modelo de tarjetas de la Home.
 */
function mapPlatformRoomToPreview(r: PlatformRoom, t: TFunction): LiveStreamPreviewModel {
  const cr = r.creator;
  const creatorFullName = cr
    ? `${cr.name ?? ''} ${cr.last_name ?? ''}`.trim() || (cr.name?.trim() ?? '')
    : '';

  const sellerName =
    creatorFullName.length > 0
      ? creatorFullName
      : (r.name?.trim() || r.stream_name?.trim() || t('home.defaultRoomName'));

  const sellerInitials = cr
    ? `${(cr.name?.trim()?.[0] ?? '')}${(cr.last_name?.trim()?.[0] ?? '')}`.toUpperCase() ||
      (cr.name?.trim()?.slice(0, 2).toUpperCase() ?? '')
    : sellerName.replace(/\s+/g, '').slice(0, 2).toUpperCase();

  const title =
    (r.name && r.name.trim()) ||
    (r.stream_name && r.stream_name.trim()) ||
    t('home.defaultStreamTitle');

  const interestCategories =
    r.interest_categories && r.interest_categories.length > 0
      ? r.interest_categories.map((c) => ({
          uuid: String(c.uuid),
          slug: String(c.slug ?? ''),
          label: String(c.label ?? ''),
        }))
      : undefined;

  return {
    id: r.uuid,
    sellerName,
    title,
    viewerCount: pseudoViewers(r.uuid),
    thumbnail: undefined,
    rating: 4.2 + (pseudoViewers(r.uuid) % 8) / 10,
    categoryLabel: interestCategories?.[0]?.label ?? null,
    interestCategories,
    sellerAvatarUrl: cr?.profile_picture ?? null,
    sellerInitials: sellerInitials.length > 0 ? sellerInitials : sellerName.slice(0, 2).toUpperCase(),
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStreamPress,
  onStartNewStream,
  onEditDraft,
}) => {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const { user, logout } = useAuth();
  const { categories, loadOnce } = useInterestCategories();
  const [previews, setPreviews] = useState<LiveStreamPreviewModel[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES_ID);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bottomTab, setBottomTab] = useState<HomeBottomTab>('home');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setPreviews([]);
        return;
      }
      try {
        const rooms = await getRooms(token);
        const mapped: LiveStreamPreviewModel[] = rooms.map((r) =>
          mapPlatformRoomToPreview(r, t)
        );
        setPreviews(mapped);
      } catch (e) {
        console.warn('[HomeScreen] getRooms failed:', e);
        setPreviews([]);
      }
    } catch {
      setPreviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (user?.user_type === 'buyer_user') {
      void loadOnce();
    }
  }, [user?.user_type, loadOnce]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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
  });

  const handleStreamPress = (p: LiveStreamPreviewModel) => {
    if (onStreamPress) {
      onStreamPress(toStreamData(p));
    }
  };

  const handleBottomTab = (tab: HomeBottomTab) => {
    setBottomTab(tab);
    if (tab === 'home') {
      return;
    }
    if (tab === 'purchases') {
      Alert.alert(t('common.appName'), t('home.placeholderScreen'));
      return;
    }
    if (tab === 'create') {
      onStartNewStream?.();
      return;
    }
    Alert.alert(t('common.appName'), t('home.placeholderScreen'));
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

  /** Si la API ya trae categorías, no sobrescribir; si no, al filtrar mostrar la etiqueta del chip. */
  const gridColW = (windowWidth - 32 - GRID_GAP) / 2;

  const previewWithCategory = (p: LiveStreamPreviewModel): LiveStreamPreviewModel => {
    if (p.interestCategories && p.interestCategories.length > 0) {
      return p;
    }
    if (!selectedCategoryLabel) {
      return { ...p, categoryLabel: p.categoryLabel };
    }
    return { ...p, categoryLabel: selectedCategoryLabel };
  };

  return (
    <GeneralLayout
      hideChrome
      menuOptions={[]}
      containerClassName="flex-1"
      bottomBar={<HomeBottomNav activeTab={bottomTab} onTabPress={handleBottomTab} />}
    >
      <View className="flex-1 bg-[transparent] dark:bg-night-950">
        <HomeHeader
          profileImageUri={profileImageUri}
          profileInitials={profileInitials}
          onPressSearch={() => Alert.alert(t('common.appName'), t('home.searchPlaceholder'))}
          onPressNotifications={() => Alert.alert(t('common.appName'), t('home.placeholderNotifications'))}
          accountMenuVisible={accountMenuOpen}
          onAccountMenuVisibleChange={setAccountMenuOpen}
          onLogout={() => void logout()}
        />

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

          {loading ? (
            <Text className="text-[#4C4E55] mb-4">{t('common.loading')}</Text>
          ) : filteredPreviews.length === 0 ? (
            <Text className="text-[#4C4E55] mb-6">{t('home.noLiveStreams')}</Text>
          ) : (
            <>
              <SectionHeader
                title={t('home.forYou')}
                actionLabel={t('home.seeAll')}
                onActionPress={() => Alert.alert(t('common.appName'), t('home.placeholderSeeAll'))}
              />
              <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
                {filteredPreviews.map((item) => (
                  <View key={item.id} style={{ width: gridColW }}>
                    <LiveStreamPreviewCard
                      variant="grid"
                      stream={previewWithCategory(item)}
                      onPress={() => handleStreamPress(item)}
                    />
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </GeneralLayout>
  );
};
