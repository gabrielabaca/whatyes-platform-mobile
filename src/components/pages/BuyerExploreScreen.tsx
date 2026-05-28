import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../atoms/Text';
import { FONT_FAMILY } from '../../theme/typography';
import { InterestCategoryGrid } from '../organisms/home/InterestCategoryGrid';
import { useInterestCategories } from '../../hooks/useInterestCategories';
import { getFrequentInterestCategories } from '../../api/platformApi';
import type { InterestCategoryItem } from '../../api/types';

const H_PADDING = 16;

export interface BuyerExploreScreenProps {
  onSelectCategory: (category: InterestCategoryItem) => void;
}

export const BuyerExploreScreen: React.FC<BuyerExploreScreenProps> = ({ onSelectCategory }) => {
  const { t } = useTranslation();
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

  const selectedUuids = new Set(selectedCategoryUuid ? [selectedCategoryUuid] : []);

  const handlePressCategory = (item: InterestCategoryItem) => {
    setSelectedCategoryUuid(item.uuid);
    onSelectCategory(item);
  };

  return (
    <ScrollView
      className="flex-1"
      nestedScrollEnabled
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
        <InterestCategoryGrid
          items={frequent}
          selectedUuids={selectedUuids}
          onPressInItem={setSelectedCategoryUuid}
          onPressItem={handlePressCategory}
          horizontalPadding={H_PADDING}
          withBottomGap
        />
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
        <InterestCategoryGrid
          items={categories}
          selectedUuids={selectedUuids}
          onPressInItem={setSelectedCategoryUuid}
          onPressItem={handlePressCategory}
          horizontalPadding={H_PADDING}
        />
      )}
    </ScrollView>
  );
};
