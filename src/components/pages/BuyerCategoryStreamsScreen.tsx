import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { Text } from '../atoms/Text';
import { FONT_FAMILY } from '../../theme/typography';
import { themeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBuyerLiveRoomPreviews } from '../../hooks/useBuyerLiveRoomPreviews';
import { useCategoryFollow } from '../../hooks/useCategoryFollow';
import { useInterestCategories } from '../../hooks/useInterestCategories';
import { BuyerLiveStreamsGrid } from '../organisms/home/BuyerLiveStreamsGrid';
import { LiveStreamPreviewCard } from '../organisms/home/LiveStreamPreviewCard';
import { recordInterestCategoryVisit } from '../../api/platformApi';
import type { InterestCategoryItem } from '../../api/types';
import type { LiveStreamPreviewModel } from '../organisms/home/types';
import { displayInterestCategoryIcon } from '../../utils/interestCategoryEmoji';

/** Chip activo — Figma 1225:7272. */
const CHIP_ACTIVE_BG = 'rgba(221, 218, 255, 0.2)';
const CHIP_ACTIVE_BORDER = 'rgba(183, 177, 255, 0.4)';
/** Chip activo en dark — sin spec en Figma; decisión de producto. */
const CHIP_ACTIVE_BG_DARK = 'rgba(104, 92, 240, 0.30)';
const CHIP_ACTIVE_BORDER_DARK = '#8F86F5';
/** Inactivo — Figma 1220:7234. */
const CHIP_IDLE_BG = '#DDDAFF';

export type CategorySortMode = 'all' | 'recommended' | 'bestSellers';

export interface BuyerCategoryStreamsScreenProps {
  category: InterestCategoryItem;
  onBack: () => void;
  onStreamPress: (preview: LiveStreamPreviewModel) => void;
  onSelectCategory: (category: InterestCategoryItem) => void;
}

export const BuyerCategoryStreamsScreen: React.FC<BuyerCategoryStreamsScreenProps> = ({
  category,
  onBack,
  onStreamPress,
  onSelectCategory,
}) => {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const { isDark } = useTheme();
  /** Overrides sólo para oscuro: en claro mandan los estilos estáticos. */
  const darkText = isDark ? { color: themeColors.dark.text } : null;
  const popularCardW = Math.floor((windowWidth - 16 * 2 - 12) / 2);
  const popularCardStyle = useMemo(() => ({ width: popularCardW }), [popularCardW]);
  const [sort, setSort] = useState<CategorySortMode>('all');
  const feedSort =
    sort === 'recommended' ? 'recommended' : sort === 'bestSellers' ? 'viewers' : 'recent';
  const { isFollowing: following, followLoading, toggleFollow } = useCategoryFollow({
    categoryUuid: category.uuid,
  });
  const { categories, loadOnce, isLoaded } = useInterestCategories();
  const { previews, loading, refreshing, onRefresh } = useBuyerLiveRoomPreviews({
    interestCategoryUuid: category.uuid,
    sort: feedSort,
    pollIntervalMs: 15000,
  });
  const popular = useBuyerLiveRoomPreviews({
    interestCategoryUuid: category.uuid,
    sort: 'viewers',
    pollIntervalMs: null,
    enabled: sort !== 'bestSellers',
  });

  useEffect(() => {
    loadOnce().catch(() => {});
  }, [loadOnce]);

  useEffect(() => {
    recordInterestCategoryVisit(category.uuid).catch((e) => {
      console.warn('[BuyerCategoryStreamsScreen] visit:', e);
    });
  }, [category.uuid]);

  const popularPreviews = useMemo(() => {
    const source = sort === 'bestSellers' ? previews : popular.previews;
    return source.slice(0, 6);
  }, [previews, popular.previews, sort]);

  /**
   * `hasResults` sigue siendo la fuente de verdad de la grilla (sectionHeader de Lives).
   * Los chips de orden se sostienen durante `loading` (`showSortChips`) para que la fila
   * no cambie de layout en los saltos de categoría; solo desaparecen cuando la carga
   * terminó y la categoría quedó vacía. Los de categoría no cuelgan de esto: son la vía
   * para saltar a otra categoría.
   */
  const hasResults = !loading && previews.length > 0;
  const showSortChips = loading || hasResults;
  const otherCategories = useMemo(
    () => (isLoaded ? categories.filter((c) => c.uuid !== category.uuid) : []),
    [isLoaded, categories, category.uuid]
  );
  const showCategoryChips = otherCategories.length > 0;
  const idleChipDark = isDark
    ? {
        backgroundColor: themeColors.dark.surfaceAlt,
        borderColor: themeColors.dark.surfaceAlt,
      }
    : null;

  const filterChip = (
    mode: CategorySortMode,
    labelKey: 'explore.all' | 'explore.recommended' | 'explore.bestSellers',
    icon: string
  ) => {
    const on = sort === mode;
    return (
      <TouchableOpacity
        onPress={() => setSort(mode)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${icon} ${t(labelKey)}`}
        style={[
          styles.filterChip,
          on ? styles.filterChipActive : styles.filterChipIdle,
          on && isDark
            ? {
                backgroundColor: CHIP_ACTIVE_BG_DARK,
                borderColor: CHIP_ACTIVE_BORDER_DARK,
              }
            : null,
          on ? null : idleChipDark,
        ]}
      >
        <Text
          style={{ fontFamily: FONT_FAMILY.semibold }}
          className={`text-[14px] dark:text-white ${on ? 'text-[#1E1E1E]' : 'text-[#303030]'}`}
        >
          {icon} {t(labelKey)}
        </Text>
      </TouchableOpacity>
    );
  };

  const sectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, darkText]}>{title}</Text>
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
          onRefresh={() => {
            onRefresh();
            if (sort !== 'bestSellers') {
              popular.onRefresh();
            }
          }}
          tintColor={themeColors.primary}
          colors={[themeColors.primary]}
        />
      }
    >
      <View style={styles.headingRow}>
        <View style={styles.headingLeft}>
          <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backButton}>
            <ChevronLeft
              size={22}
              color={isDark ? themeColors.dark.text : '#18181b'}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <Text style={[styles.categoryTitle, darkText]} numberOfLines={1}>
            {displayInterestCategoryIcon(category)} {category.label}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            void toggleFollow();
          }}
          activeOpacity={0.85}
          disabled={followLoading}
          accessibilityRole="button"
          accessibilityState={{ selected: following, busy: followLoading, disabled: followLoading }}
          accessibilityLabel={following ? t('explore.following') : t('explore.follow')}
          style={styles.followButtonTouchable}
        >
          <View
            style={[
              styles.followButton,
              following ? styles.followButtonFollowing : styles.followButtonIdle,
              following && isDark ? { backgroundColor: themeColors.dark.surfaceAlt } : null,
              followLoading ? { opacity: themeColors.disabledOpacity } : null,
            ]}
          >
            <Text
              style={[
                styles.followButtonText,
                following ? styles.followButtonTextFollowing : null,
                following && isDark ? { color: themeColors.dark.textSecondary } : null,
              ]}
            >
              {following ? t('explore.following') : t('explore.follow')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {showSortChips || showCategoryChips ? (
        <View style={styles.filtersRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContent}
          >
            {showSortChips ? (
              <>
                {filterChip('all', 'explore.all', '⚡️')}
                {filterChip('recommended', 'explore.recommended', '🛍️')}
                {filterChip('bestSellers', 'explore.bestSellers', '📊')}
              </>
            ) : null}
            {showSortChips && showCategoryChips ? (
              <View
                style={[
                  styles.chipGroupSeparator,
                  {
                    backgroundColor: isDark
                      ? themeColors.dark.borderSubtle
                      : themeColors.light.border,
                  },
                ]}
              />
            ) : null}
            {otherCategories.map((cat) => (
              <TouchableOpacity
                key={cat.uuid}
                onPress={() => onSelectCategory(cat)}
                activeOpacity={0.8}
                style={[styles.filterChip, styles.filterChipIdle, idleChipDark]}
              >
                <Text
                  style={{ fontFamily: FONT_FAMILY.semibold }}
                  className="text-[14px] dark:text-white text-[#18181b]"
                >
                  {displayInterestCategoryIcon(cat)} {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {loading && previews.length === 0 ? (
        <Text className="text-[#4C4E55] dark:text-night-muted mb-4">{t('common.loading')}</Text>
      ) : null}

      {!loading && popularPreviews.length > 0 ? (
        <>
          {sectionHeader(t('explore.popularSection'))}
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
        previews={previews}
        loading={loading}
        onStreamPress={onStreamPress}
        emptyLabel={t('home.noLiveStreams')}
        emptySubtitle={t('explore.noLivesInCategorySubtitle')}
        emptyActionLabel={!following ? t('explore.follow') : undefined}
        onEmptyActionPress={!following ? () => void toggleFollow() : undefined}
        sectionHeader={hasResults ? sectionHeader(t('explore.livesSection')) : undefined}
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
    minWidth: 75,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  followButtonIdle: {
    backgroundColor: '#685CF0',
    paddingHorizontal: 16,
  },
  followButtonFollowing: {
    backgroundColor: '#D9D9D9',
    paddingHorizontal: 12,
  },
  followButtonText: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    textAlign: 'center',
  },
  followButtonTextFollowing: {
    color: '#71717B',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  filterChipsContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  filterChip: {
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: CHIP_ACTIVE_BG,
    borderColor: CHIP_ACTIVE_BORDER,
    paddingHorizontal: 17,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        shadowOpacity: 0.05,
      },
      android: {},
      default: {},
    }),
  },
  filterChipIdle: {
    backgroundColor: CHIP_IDLE_BG,
    borderColor: CHIP_IDLE_BG,
    paddingHorizontal: 16,
  },
  /** Separa chips de orden (filtro) de chips de categoría (navegación). */
  chipGroupSeparator: {
    width: 1,
    height: 24,
    marginLeft: 4,
    marginRight: 12,
    borderRadius: 1,
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
  popularScroll: {
    marginBottom: 18,
  },
  popularCardWrap: {
    marginRight: 12,
  },
});
