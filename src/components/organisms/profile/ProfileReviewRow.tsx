/**
 * Fila de review en perfil — Figma 536-22214.
 */
import React from 'react';
import { View, Image, StyleSheet, Text as RNText } from 'react-native';
import { Star, ImageIcon } from 'lucide-react-native';
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

export interface ProfileReviewRowProps {
  review: UserReviewListItem;
}

export const ProfileReviewRow: React.FC<ProfileReviewRowProps> = ({ review }) => {
  const ratingLabel =
    Number.isInteger(review.rating) ? String(review.rating) : review.rating.toFixed(1);

  return (
    <View style={styles.row}>
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
            <Star size={12} color={GOLD} fill={GOLD} strokeWidth={1.5} />
            <RNText style={styles.ratingText}>{ratingLabel}</RNText>
          </View>
        </View>
        <RNText style={styles.date}>{formatReviewDate(review.created_at)}</RNText>
      </View>

      {review.comment ? (
        <RNText style={styles.comment} numberOfLines={4}>
          {review.comment}
        </RNText>
      ) : null}

      {review.product_label ? (
        <View style={styles.productRow}>
          {review.product_image_url ? (
            <Image source={{ uri: review.product_image_url }} style={styles.productThumb} />
          ) : (
            <View style={styles.productIconWrap}>
              <ImageIcon size={14} color="#71717B" strokeWidth={2} />
            </View>
          )}
          <RNText style={styles.productLabel} numberOfLines={1}>
            {review.product_label}
          </RNText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    width: '100%',
    gap: 4,
    marginBottom: 24,
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
    gap: 4,
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
    color: '#181818',
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
    color: '#181818',
    includeFontPadding: false,
  },
  date: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#71717B',
    flexShrink: 0,
    includeFontPadding: false,
  },
  comment: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#71717B',
    includeFontPadding: false,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  productThumb: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  productIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#71717B',
    flex: 1,
    includeFontPadding: false,
  },
});
