/**
 * Tab Reviews del perfil — Figma 536-22214.
 */
import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text as RNText,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StarRating } from '../../molecules/profile/StarRating';
import { ProfileReviewRow } from './ProfileReviewRow';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import type { UserReviewListItem, UserReviewsListResponse } from '../../../api/profileApi';

const PRIMARY = '#685CF0';

export interface ProfileReviewsSectionProps {
  data: UserReviewsListResponse | null;
  loading: boolean;
  /** Tocar una reseña abre el detalle (Figma 698-10329). */
  onPressReview?: (review: UserReviewListItem) => void;
}

function formatCategoryScore(value: number): string {
  if (value <= 0) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const ProfileReviewsSection: React.FC<ProfileReviewsSectionProps> = ({
  data,
  loading,
  onPressReview,
}) => {
  const { t } = useTranslation();
  /** Overrides de color sólo en oscuro: en claro el StyleSheet manda sin cambios. */
  const { isDark } = useTheme();

  if (loading && !data) {
    return <ActivityIndicator color={PRIMARY} style={styles.loader} />;
  }

  if (!data || data.total === 0) {
    return (
      <RNText style={[styles.empty, isDark ? { color: themeColors.dark.textMuted } : null]}>
        {t('profile.noReviews')}
      </RNText>
    );
  }

  const { category_averages: cat } = data;

  return (
    <View style={styles.wrap}>
      <View style={styles.categoriesRow}>
        <CategoryColumn
          label={t('profile.reviewCategoryGeneral')}
          value={cat.general}
        />
        <CategoryColumn
          label={t('profile.reviewCategoryShipping')}
          value={cat.shipping}
        />
        <CategoryColumn
          label={t('profile.reviewCategoryProduct')}
          value={cat.product}
        />
      </View>

      <View style={styles.list}>
        {data.items.map((review) =>
          onPressReview ? (
            <TouchableOpacity
              key={review.uuid}
              onPress={() => onPressReview(review)}
              activeOpacity={0.75}
            >
              <ProfileReviewRow review={review} />
            </TouchableOpacity>
          ) : (
            <ProfileReviewRow key={review.uuid} review={review} />
          )
        )}
      </View>
    </View>
  );
};

const CategoryColumn: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const { isDark } = useTheme();
  const d = themeColors.dark;
  return (
    <View style={styles.categoryCol}>
      <RNText style={[styles.categoryLabel, isDark ? { color: d.textSecondary } : null]}>
        {label}
      </RNText>
      <View style={styles.categoryStars}>
        <StarRating value={value} size={10} gap={2} />
        <RNText style={[styles.categoryScore, isDark ? { color: d.text } : null]}>
          {formatCategoryScore(value)}
        </RNText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 24,
  },
  loader: {
    marginTop: 8,
  },
  empty: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 8,
  },
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  categoryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: '#71717B',
    textAlign: 'center',
    includeFontPadding: false,
  },
  categoryStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryScore: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#181818',
    includeFontPadding: false,
  },
  list: {
    width: '100%',
  },
});
