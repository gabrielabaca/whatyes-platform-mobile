import React from 'react';
import { View, ScrollView, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../../atoms/Text';
import { FONT_FAMILY } from '../../../theme/typography';
import { useTheme } from '../../../context/ThemeContext';
import type { InterestCategoryItem } from '../../../api/types';
import { displayInterestCategoryIcon } from '../../../utils/interestCategoryEmoji';
import { ALL_CATEGORIES_ID } from './types';

/** Chip activo — Figma 1225:7254 (Home) / 1225:7272 (Explorar). */
const CHIP_ACTIVE_BG = 'rgba(221, 218, 255, 0.2)';
const CHIP_ACTIVE_BORDER = 'rgba(183, 177, 255, 0.4)';
/** Chip activo en dark — sin spec en Figma; decisión de producto. */
const CHIP_ACTIVE_BG_DARK = 'rgba(104, 92, 240, 0.30)';
const CHIP_ACTIVE_BORDER_DARK = '#8F86F5';

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
  const { isDark } = useTheme();
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
              className={`flex-row items-center h-11 rounded-full border ${
                active
                  ? ''
                  : 'px-4 bg-[#DDDAFF] border-[#DDDAFF] dark:bg-night-800 dark:border-night-800'
              }`}
              style={
                active
                  ? [styles.chipActive, styles.chipActiveShadow, isDark ? styles.chipActiveDark : null]
                  : undefined
              }
            >
              {chip.emoji ? (
                <Text className="text-[20px] mr-2">{chip.emoji}</Text>
              ) : null}
              {/* Texto claro: Figma 1225:7272 (#1E1E1E activo) / 1220:7234 (#303030 inactivo). */}
              <Text
                style={{ fontFamily: FONT_FAMILY.semibold }}
                className={`text-[14px] dark:text-white ${active ? 'text-[#1E1E1E]' : 'text-[#303030]'}`}
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

const styles = StyleSheet.create({
  chipActive: {
    backgroundColor: CHIP_ACTIVE_BG,
    borderColor: CHIP_ACTIVE_BORDER,
    paddingHorizontal: 17,
  },
  chipActiveDark: {
    backgroundColor: CHIP_ACTIVE_BG_DARK,
    borderColor: CHIP_ACTIVE_BORDER_DARK,
  },
  /** Figma 1225:7272 — box-shadow: 0px 2px 5px 0px rgba(0,0,0,0.05). */
  chipActiveShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 5,
      shadowOpacity: 0.05,
    },
    android: {},
    default: {},
  }) ?? {},
});
