import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../../atoms/Text';
import { FONT_FAMILY } from '../../../theme/typography';
import type { InterestCategoryItem } from '../../../api/types';
import { displayInterestCategoryIcon } from '../../../utils/interestCategoryEmoji';
import { ALL_CATEGORIES_ID } from './types';

/** Icono del chip "Todas" (rayo) */
const ALL_ICON = '⚡️';

interface CategoryExplorerRowProps {
  title: string;
  categories: InterestCategoryItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const CategoryExplorerRow: React.FC<CategoryExplorerRowProps> = ({
  title,
  categories,
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation();
  const chips: { id: string; label: string; emoji?: string }[] = [
    { id: ALL_CATEGORIES_ID, label: t('home.categoriesAll'), emoji: ALL_ICON },
    ...categories.map((c) => ({
      id: c.uuid,
      label: c.label,
      emoji: displayInterestCategoryIcon(c),
    })),
  ];

  return (
    <View className="w-full">
      <Text
        style={{ fontFamily: FONT_FAMILY.bold }}
        className="text-[#27272a] dark:text-white text-[20px] leading-7 mb-4"
      >
        {title}
      </Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        // eslint-disable-next-line react-native/no-inline-styles
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingRight: 16,
        }}
      >
        {chips.map((chip) => {
          const active = selectedId === chip.id;
          return (
            <TouchableOpacity
              key={chip.id}
              onPress={() => onSelect(chip.id)}
              activeOpacity={0.85}
              className={`flex-row items-center px-4 h-12 rounded-full ${
                active ? 'bg-[#454087]' : 'bg-[#dddaff] dark:bg-night-800'
              }`}
            >
              {chip.emoji ? (
                <Text className="text-[20px] mr-2">{chip.emoji}</Text>
              ) : null}
              <Text
                style={{ fontFamily: FONT_FAMILY.semibold }}
                className={`text-[14px] ${active ? 'text-white' : 'text-[#18181b] dark:text-white'}`}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
