/**
 * Detalle de reviews — Figma 698-10329.
 * Modal full-screen oscuro con la lista completa de reseñas y la foto grande
 * del producto de cada una.
 */
import React, { useRef } from 'react';
import { View, Image, StyleSheet, Text as RNText } from 'react-native';
import { Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from './GlassFullScreenModal';
import { GlassModalHeader } from './GlassModalHeader';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import type { UserReviewListItem } from '../../../api/profileApi';

function formatReviewDate(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export interface ProfileReviewsDetailModalProps {
  visible: boolean;
  reviews: UserReviewListItem[];
  onClose: () => void;
}

export const ProfileReviewsDetailModal: React.FC<ProfileReviewsDetailModalProps> = ({
  visible,
  reviews,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      keyboardAvoiding={false}
      backdropAccessibilityLabel={t('common.close')}
      header={
        <GlassModalHeader title={t('profile.reviewsDetailTitle')} onClose={handleClose} />
      }
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
    >
      {reviews.map((review) => (
        <View key={review.uuid} style={styles.reviewBlock}>
          <View style={styles.headerRow}>
            <View style={styles.authorBlock}>
              {review.reviewer_avatar_url ? (
                <Image source={{ uri: review.reviewer_avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]} />
              )}
              <RNText style={styles.authorName} numberOfLines={1}>
                {review.reviewer_name}
              </RNText>
              <View style={styles.ratingBadge}>
                <Star
                  size={12}
                  color={themeColors.gold}
                  fill={themeColors.gold}
                  strokeWidth={1.5}
                />
                <RNText style={styles.ratingText}>
                  {Number.isInteger(review.rating)
                    ? String(review.rating)
                    : review.rating.toFixed(1)}
                </RNText>
              </View>
            </View>
            <RNText style={styles.date}>{formatReviewDate(review.created_at)}</RNText>
          </View>

          {review.comment ? (
            <RNText style={styles.comment}>{review.comment}</RNText>
          ) : null}

          {review.product_label ? (
            <RNText style={styles.productLabel} numberOfLines={1}>
              {review.product_label}
            </RNText>
          ) : null}

          {(review.product_image_urls?.length
            ? review.product_image_urls
            : review.product_image_url
              ? [review.product_image_url]
              : []
          ).map((uri, index) => (
            <Image
              key={`${uri}-${index}`}
              source={{ uri }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ))}
        </View>
      ))}
    </GlassFullScreenModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 24,
  },
  reviewBlock: {
    width: '100%',
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#E7E7FF',
  },
  authorName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: themeColors.glass.text,
    flexShrink: 1,
    includeFontPadding: false,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  ratingText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  date: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
    flexShrink: 0,
    includeFontPadding: false,
  },
  comment: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    color: themeColors.glass.textMuted,
    includeFontPadding: false,
  },
  productLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1.1,
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
  },
});
