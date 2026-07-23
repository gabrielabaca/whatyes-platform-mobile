/**
 * Panel de artículos comprados en el live — Figma 698-11283.
 * Overlay oscuro sobre el visor del clip: header "Compras", card de cada
 * producto comprado en ese vivo y sección Review del vendedor (desglose por
 * categoría + reseñas), reutilizando la API de reviews del perfil.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star, ImageIcon, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft } from '../../icons';
import { StarRating } from '../../molecules/profile/StarRating';
import type { PurchaseItem } from '../../../api/platformApi';
import {
  getUserReviews,
  type UserReviewsListResponse,
} from '../../../api/profileApi';
import { storage } from '../../../utils/storage';
import { FONT_FAMILY } from '../../../theme/typography';

const PRIMARY = '#685CF0';
const GOLD = '#FDC700';
const MUTED_LIGHT = '#C8C8CD';

function formatReviewDate(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function formatCategoryScore(value: number): string {
  if (value <= 0) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export interface PurchaseLiveItemsSheetProps {
  visible: boolean;
  /** Compras reales del vivo (las carga el visor con getMyPurchases por room_id). */
  items: PurchaseItem[];
  sellerId: string;
  onClose: () => void;
}

export const PurchaseLiveItemsSheet: React.FC<PurchaseLiveItemsSheetProps> = ({
  visible,
  items,
  sellerId,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<UserReviewsListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const reviewsData = await getUserReviews(sellerId, token, { limit: 20 }).catch(
          () => null
        );
        if (cancelled) return;
        if (reviewsData) setReviews(reviewsData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, sellerId]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.backdrop} />
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Header: back + título + cerrar */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
          >
            <IconChevronLeft size={24} color="#FFFFFF" />
            <RNText style={styles.headerTitle}>{t('activity.tabPurchases')}</RNText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
          >
            <X size={24} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Artículos comprados en este vivo */}
          {items.map((item) => (
            <View key={item.sale_uuid} style={styles.itemBlock}>
              {item.product_image_url ? (
                <Image source={{ uri: item.product_image_url }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImageFallback]}>
                  <ImageIcon size={32} color={MUTED_LIGHT} strokeWidth={1.5} />
                </View>
              )}
              <RNText style={styles.itemTitle}>{item.product_title}</RNText>
            </View>
          ))}

          {/* Review del vendedor */}
          <View style={styles.reviewSection}>
            <RNText style={styles.reviewTitle}>{t('profile.tabReviews')}</RNText>
            {loading && !reviews ? (
              <ActivityIndicator color={PRIMARY} style={{ marginTop: 8 }} />
            ) : reviews && reviews.total > 0 ? (
              <>
                <View style={styles.categoriesRow}>
                  <CategoryColumn
                    label={t('profile.reviewCategoryGeneral')}
                    value={reviews.category_averages.general}
                  />
                  <CategoryColumn
                    label={t('profile.reviewCategoryShipping')}
                    value={reviews.category_averages.shipping}
                  />
                  <CategoryColumn
                    label={t('profile.reviewCategoryProduct')}
                    value={reviews.category_averages.product}
                  />
                </View>
                <View style={styles.reviewList}>
                  {reviews.items.map((review) => (
                    <View key={review.uuid} style={styles.reviewRow}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewAuthor}>
                          {review.reviewer_avatar_url ? (
                            <Image
                              source={{ uri: review.reviewer_avatar_url }}
                              style={styles.reviewAvatar}
                            />
                          ) : (
                            <View style={[styles.reviewAvatar, styles.reviewAvatarFallback]} />
                          )}
                          <RNText style={styles.reviewName} numberOfLines={1}>
                            {review.reviewer_name}
                          </RNText>
                          <View style={styles.reviewRating}>
                            <Star size={12} color={GOLD} fill={GOLD} strokeWidth={1.5} />
                            <RNText style={styles.reviewRatingText}>
                              {Number.isInteger(review.rating)
                                ? String(review.rating)
                                : review.rating.toFixed(1)}
                            </RNText>
                          </View>
                        </View>
                        <RNText style={styles.reviewDate}>
                          {formatReviewDate(review.created_at)}
                        </RNText>
                      </View>
                      {review.comment ? (
                        <RNText style={styles.reviewComment} numberOfLines={3}>
                          {review.comment}
                        </RNText>
                      ) : null}
                      {review.product_label ? (
                        <View style={styles.reviewProductRow}>
                          {review.product_image_url ? (
                            <Image
                              source={{ uri: review.product_image_url }}
                              style={styles.reviewProductThumb}
                            />
                          ) : (
                            <ImageIcon size={16} color={MUTED_LIGHT} strokeWidth={1.75} />
                          )}
                          <RNText style={styles.reviewProductLabel} numberOfLines={1}>
                            {review.product_label}
                          </RNText>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <RNText style={styles.reviewEmpty}>{t('profile.noReviews')}</RNText>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const CategoryColumn: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.categoryCol}>
    <RNText style={styles.categoryLabel}>{label}</RNText>
    <View style={styles.categoryStars}>
      <StarRating value={value} size={10} gap={2} />
      <RNText style={styles.categoryScore}>{formatCategoryScore(value)}</RNText>
    </View>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  content: { flex: 1, paddingHorizontal: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  scroll: { flex: 1 },
  itemBlock: { gap: 12, marginBottom: 4 },
  itemImage: {
    width: '100%',
    height: 223,
    borderRadius: 12,
    backgroundColor: '#27272A',
  },
  itemImageFallback: { alignItems: 'center', justifyContent: 'center' },
  itemTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.08,
    color: '#D9D9D9',
  },
  reviewSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
    paddingTop: 12,
    gap: 12,
  },
  reviewTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryCol: { flex: 1, alignItems: 'center', gap: 8 },
  categoryLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: MUTED_LIGHT,
    textAlign: 'center',
    includeFontPadding: false,
  },
  categoryStars: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryScore: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  reviewList: { gap: 24 },
  reviewRow: { gap: 4 },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 1 },
  reviewAvatar: { width: 20, height: 20, borderRadius: 10 },
  reviewAvatarFallback: { backgroundColor: '#52525B' },
  reviewName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewRatingText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  reviewDate: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED_LIGHT,
  },
  reviewComment: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED_LIGHT,
  },
  reviewProductRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewProductThumb: { width: 20, height: 20, borderRadius: 4 },
  reviewProductLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED_LIGHT,
    flexShrink: 1,
  },
  reviewEmpty: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: MUTED_LIGHT,
  },
});
