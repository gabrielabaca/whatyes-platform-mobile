import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '../atoms/Text';
import { FONT_FAMILY } from '../../theme/typography';
import { themeColors } from '../../theme/colors';
import { useBuyerLiveRoomPreviews } from '../../hooks/useBuyerLiveRoomPreviews';
import { BuyerLiveStreamsGrid } from '../organisms/home/BuyerLiveStreamsGrid';
import { LiveStreamPreviewCard } from '../organisms/home/LiveStreamPreviewCard';
import { recordInterestCategoryVisit } from '../../api/platformApi';
import type { InterestCategoryItem } from '../../api/types';
import type { LiveStreamPreviewModel } from '../organisms/home/types';
import { displayInterestCategoryIcon } from '../../utils/interestCategoryEmoji';
import { IconFilter } from '../icons';

export type CategorySortMode = 'recommended' | 'bestSellers';

export interface BuyerCategoryStreamsScreenProps {
  category: InterestCategoryItem;
  onBack: () => void;
  onStreamPress: (preview: LiveStreamPreviewModel) => void;
}

export const BuyerCategoryStreamsScreen: React.FC<BuyerCategoryStreamsScreenProps> = ({
  category,
  onBack,
  onStreamPress,
}) => {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const popularCardW = Math.floor((windowWidth - 16 * 2 - 12) / 2);
  const popularCardStyle = useMemo(() => ({ width: popularCardW }), [popularCardW]);
  const [sort, setSort] = useState<CategorySortMode>('recommended');
  const [following, setFollowing] = useState(false);
  const { previews, loading, refreshing, onRefresh } = useBuyerLiveRoomPreviews({
    interestCategoryUuid: category.uuid,
    pollIntervalMs: 15000,
  });

  useEffect(() => {
    recordInterestCategoryVisit(category.uuid).catch((e) => {
      console.warn('[BuyerCategoryStreamsScreen] visit:', e);
    });
  }, [category.uuid]);

  const sortedPreviews = useMemo(() => {
    const list = [...previews];
    if (sort === 'bestSellers') {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return list;
  }, [previews, sort]);

  const popularPreviews = useMemo(() => {
    return [...previews].sort((a, b) => b.viewerCount - a.viewerCount).slice(0, 6);
  }, [previews]);

  const filterChip = (
    mode: CategorySortMode,
    labelKey: 'explore.recommended' | 'explore.bestSellers',
    icon: string
  ) => {
    const on = sort === mode;
    return (
      <TouchableOpacity
        onPress={() => setSort(mode)}
        activeOpacity={0.8}
        style={[styles.filterChip, on ? styles.filterChipActive : styles.filterChipIdle]}
      >
        <Text
          style={{ fontFamily: FONT_FAMILY.semibold }}
          className={`text-[14px] ${on ? 'text-white' : 'text-[#18181b] dark:text-white'}`}
        >
          {icon} {t(labelKey)}
        </Text>
      </TouchableOpacity>
    );
  };

  const sectionHeader = (title: string, actionLabel?: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <ScrollView
      className="flex-1"
      nestedScrollEnabled
      contentContainerStyle={styles.scrollContent}
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
      <View style={styles.headingRow}>
        <View style={styles.headingLeft}>
          <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.categoryTitle} numberOfLines={1}>
            {displayInterestCategoryIcon(category)} {category.label}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setFollowing((v) => !v)}
          activeOpacity={0.85}
          style={styles.followButtonTouchable}
        >
          <View style={styles.followButton}>
            <Svg pointerEvents="none" style={styles.followButtonGradient} width={58} height={26}>
              <Defs>
                <LinearGradient id="follow-button-gradient" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#685CF0" />
                  <Stop offset="1" stopColor="#454087" />
                </LinearGradient>
              </Defs>
              <Rect width={58} height={26} fill="url(#follow-button-gradient)" />
            </Svg>
            <Text style={styles.followButtonText}>
              {following ? t('explore.following') : t('explore.follow')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersRow}>
        <TouchableOpacity
          onPress={() => Alert.alert(t('common.appName'), t('explore.filtersComingSoon'))}
          activeOpacity={0.85}
          style={styles.filterButton}
          accessibilityLabel={t('explore.filters')}
          accessibilityRole="button"
        >
          <IconFilter size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContent}
        >
          {filterChip('recommended', 'explore.recommended', '⚡')}
          {filterChip('bestSellers', 'explore.bestSellers', '📊')}
        </ScrollView>
      </View>

      {loading && previews.length === 0 ? (
        <Text className="text-[#4C4E55] dark:text-night-muted mb-4">{t('common.loading')}</Text>
      ) : null}

      {!loading && popularPreviews.length > 0 ? (
        <>
          {sectionHeader(t('explore.popularSection'), t('home.seeAll'))}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.popularScroll}
          >
            {popularPreviews.map((item) => (
              <View key={item.id} style={[styles.popularCardWrap, popularCardStyle]}>
                <LiveStreamPreviewCard
                  variant="grid"
                  stream={item}
                  onPress={() => onStreamPress(item)}
                />
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      <BuyerLiveStreamsGrid
        previews={sortedPreviews}
        loading={loading}
        onStreamPress={onStreamPress}
        emptyLabel={t('explore.noLivesInCategory')}
        emptySubtitle={t('explore.noLivesInCategorySubtitle')}
        sectionHeader={
          !loading && sortedPreviews.length > 0
            ? sectionHeader(t('explore.livesSection'))
            : undefined
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
    marginBottom: 16,
    width: '100%',
  },
  headingLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 28,
    height: 36,
    justifyContent: 'center',
    marginRight: 4,
  },
  backIcon: {
    fontSize: 34,
    lineHeight: 34,
    color: '#18181b',
  },
  categoryTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: '#27272a',
  },
  followButtonTouchable: {
    borderRadius: 999,
    overflow: 'hidden',
    flexShrink: 0,
    marginLeft: 12,
  },
  followButton: {
    width: 58,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  followButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  followButtonText: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#515154',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterChipsContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  filterChip: {
    height: 48,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#685CF0',
  },
  filterChipIdle: {
    backgroundColor: '#DDDAFF',
  },
  sectionHeader: {
    width: '100%',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: '#27272a',
  },
  sectionAction: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#685CF0',
  },
  popularScroll: {
    marginBottom: 18,
  },
  popularCardWrap: {
    marginRight: 12,
  },
});
