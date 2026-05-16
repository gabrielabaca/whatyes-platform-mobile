import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '../atoms/Text';
import { FONT_FAMILY } from '../../theme/typography';
import { useInterestCategories } from '../../hooks/useInterestCategories';
import { getFrequentInterestCategories } from '../../api/platformApi';
import type { InterestCategoryItem } from '../../api/types';
import { displayInterestCategoryIcon } from '../../utils/interestCategoryEmoji';

const TILE_GAP = 12;
const H_PADDING = 16;

export interface BuyerExploreScreenProps {
  onSelectCategory: (category: InterestCategoryItem) => void;
}

export const BuyerExploreScreen: React.FC<BuyerExploreScreenProps> = ({ onSelectCategory }) => {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const tileW = Math.floor((windowWidth - H_PADDING * 2 - TILE_GAP * 2) / 3);
  const tileStyle = useMemo(() => ({ width: tileW, height: tileW + 1 }), [tileW]);
  const { categories, loadOnce, isLoaded } = useInterestCategories();
  const [frequent, setFrequent] = useState<InterestCategoryItem[]>([]);
  const [frequentLoading, setFrequentLoading] = useState(true);
  const [selectedCategoryUuid, setSelectedCategoryUuid] = useState<string | null>(null);

  const loadFrequent = useCallback(async () => {
    setFrequentLoading(true);
    try {
      const list = await getFrequentInterestCategories(9);
      setFrequent(list);
    } catch (e) {
      console.warn('[BuyerExploreScreen] frequent categories:', e);
      setFrequent([]);
    } finally {
      setFrequentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOnce().catch(() => {});
  }, [loadOnce]);

  useEffect(() => {
    loadFrequent().catch(() => {});
  }, [loadFrequent]);

  const chunkRows = (items: InterestCategoryItem[]): InterestCategoryItem[][] => {
    const rows: InterestCategoryItem[][] = [];
    for (let i = 0; i < items.length; i += 3) {
      rows.push(items.slice(i, i + 3));
    }
    return rows;
  };

  const renderCategoryTile = (item: InterestCategoryItem) => {
    const emoji = displayInterestCategoryIcon(item);
    const selected = selectedCategoryUuid === item.uuid;
    return (
      <TouchableOpacity
        key={item.uuid}
        activeOpacity={0.85}
        onPressIn={() => setSelectedCategoryUuid(item.uuid)}
        onPress={() => {
          setSelectedCategoryUuid(item.uuid);
          onSelectCategory(item);
        }}
        style={[styles.tile, tileStyle, selected ? styles.tileSelected : null]}
      >
        {selected ? <SelectedTileBackground /> : null}
        {emoji ? <Text className="text-[20px] mb-1 text-center">{emoji}</Text> : null}
        <Text
          style={{ fontFamily: FONT_FAMILY.semibold }}
          className="text-[14px] text-[#18181b] dark:text-white text-center"
          numberOfLines={2}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCategoryGrid = (items: InterestCategoryItem[], withBottomGap = false) => (
    <View style={withBottomGap ? styles.gridWithBottomGap : undefined}>
      {chunkRows(items).map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.gridRow}>
          {row.map(renderCategoryTile)}
          {row.length < 3
            ? Array.from({ length: 3 - row.length }).map((_, idx) => (
                <View key={`empty-${rowIndex}-${idx}`} style={tileStyle} />
              ))
            : null}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      className="flex-1"
      nestedScrollEnabled
      // eslint-disable-next-line react-native/no-inline-styles
      contentContainerStyle={{
        paddingHorizontal: H_PADDING,
        paddingTop: 12,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-2.5 mb-6 w-full">
        <Text className="text-[20px] leading-7">✨</Text>
        <Text
          style={{ fontFamily: FONT_FAMILY.bold }}
          className="text-[#27272a] dark:text-white text-[20px] leading-7"
        >
          {t('explore.yourCategoriesTitle')}
        </Text>
      </View>

      {frequentLoading && !isLoaded ? (
        <View className="py-6 items-center">
          <ActivityIndicator />
        </View>
      ) : frequent.length === 0 ? (
        <Text className="text-[#71717a] dark:text-night-muted mb-8">{t('explore.yourCategoriesEmpty')}</Text>
      ) : (
        renderCategoryGrid(frequent, true)
      )}

      <View className="flex-row items-center gap-2.5 mb-6 w-full">
        <Text className="text-[20px] leading-7">🔍</Text>
        <Text
          style={{ fontFamily: FONT_FAMILY.bold }}
          className="text-[#27272a] dark:text-white text-[20px] leading-7"
        >
          {t('explore.allCategoriesTitle')}
        </Text>
      </View>

      {!isLoaded ? (
        <View className="py-6 items-center">
          <ActivityIndicator />
        </View>
      ) : categories.length === 0 ? (
        <Text className="text-[#71717a] dark:text-night-muted">{t('explore.catalogEmpty')}</Text>
      ) : (
        renderCategoryGrid(categories)
      )}
    </ScrollView>
  );
};

const SelectedTileBackground: React.FC = () => (
  <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Defs>
      <LinearGradient id="category-selected-bg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#685CF0" stopOpacity={0.86} />
        <Stop offset="0.52" stopColor="#E8E7FF" stopOpacity={0.88} />
        <Stop offset="1" stopColor="#FDE7AE" stopOpacity={0.72} />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#category-selected-bg)" />
  </Svg>
);

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderColor: '#cbceff',
    borderRadius: 8,
    backgroundColor: '#FAFAFF',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileSelected: {
    backgroundColor: '#E7E7FF',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: TILE_GAP,
  },
  gridWithBottomGap: {
    marginBottom: 12,
  },
});
