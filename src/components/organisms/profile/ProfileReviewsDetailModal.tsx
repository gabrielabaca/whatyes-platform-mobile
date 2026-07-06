/**
 * Detalle de reviews — Figma 698-10329.
 * Modal full-screen oscuro con la lista completa de reseñas y la foto grande
 * del producto de cada una.
 */
import React from 'react';
import {
  Modal,
  View,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { IconChevronLeft } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import type { UserReviewListItem } from '../../../api/profileApi';

const GOLD = '#FDC700';

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
            <IconChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <RNText style={styles.headerTitle}>{t('profile.reviewsDetailTitle')}</RNText>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
            <X size={24} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {reviews.map((review) => (
            <View key={review.uuid} style={styles.reviewBlock}>
              <View style={styles.headerRow}>
                <View style={styles.authorBlock}>
                  {review.reviewer_avatar_url ? (
                    <Image
                      source={{ uri: review.reviewer_avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]} />
                  )}
                  <RNText style={styles.authorName} numberOfLines={1}>
                    {review.reviewer_name}
                  </RNText>
                  <View style={styles.ratingBadge}>
                    <Star size={12} color={GOLD} fill={GOLD} strokeWidth={1.5} />
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

              {review.product_image_url ? (
                <Image
                  source={{ uri: review.product_image_url }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 34, 0.98)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    marginLeft: 4,
    includeFontPadding: false,
  },
  scrollContent: {
    paddingHorizontal: 16,
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  date: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#C9C9D6',
    flexShrink: 0,
    includeFontPadding: false,
  },
  comment: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#E4E4EC',
    includeFontPadding: false,
  },
  productLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#C9C9D6',
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
