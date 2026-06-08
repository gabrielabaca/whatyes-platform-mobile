import React from 'react';
import {
  View,
  Image,
  Text as RNText,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Star, Eye } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamGlassPill } from '../../atoms/stream/StreamGlassPill';
import { StreamGradientButton } from '../../atoms/stream/StreamGradientButton';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from './streamTokens';

export type StreamSellerHeaderVariant = 'buyer' | 'seller';

export interface StreamSellerHeaderProps {
  sellerName: string;
  avatarUrl?: string | null;
  rating?: number | null;
  viewerCount: number;
  variant?: StreamSellerHeaderVariant;
  isFollowing?: boolean;
  onFollowPress?: () => void;
  /** Tocar avatar o nombre → perfil del vendedor. */
  onSellerPress?: () => void;
}

export const StreamSellerHeader: React.FC<StreamSellerHeaderProps> = ({
  sellerName,
  avatarUrl,
  rating,
  viewerCount,
  variant = 'buyer',
  isFollowing = false,
  onFollowPress,
  onSellerPress,
}) => {
  const { t } = useTranslation();
  const displayRating = rating ?? 4.9;
  const displayName = sellerName.trim() || t('home.defaultRoomName');

  const handleFollow = () => {
    if (onFollowPress) {
      onFollowPress();
      return;
    }
    Alert.alert(t('common.appName'), t('stream.comingSoon'));
  };

  const identity = (
    <>
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <RNText style={styles.avatarInitial}>
              {displayName.charAt(0).toUpperCase() || '?'}
            </RNText>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <RNText style={styles.name} numberOfLines={1}>
          {displayName}
        </RNText>
        <View style={styles.ratingRow}>
          <Star size={12} color={STREAM_COLORS.priceGold} fill={STREAM_COLORS.priceGold} />
          <RNText style={styles.ratingText}>{displayRating.toFixed(1)}</RNText>
        </View>
      </View>
    </>
  );

  return (
    <StreamGlassPill style={styles.pill}>
      <View style={styles.row}>
        {onSellerPress ? (
          <TouchableOpacity
            style={styles.sellerIdentity}
            onPress={onSellerPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={displayName}
          >
            {identity}
          </TouchableOpacity>
        ) : (
          <View style={styles.sellerIdentity}>{identity}</View>
        )}

        <View style={styles.actions}>
          <StreamGlassPill style={styles.viewerPill}>
            <View style={styles.viewerRow}>
              <Eye size={14} color={STREAM_COLORS.white} />
              <RNText style={styles.viewerText}>
                {viewerCount.toLocaleString('es-CO')}
              </RNText>
            </View>
          </StreamGlassPill>
          {variant === 'buyer' ? (
            <View style={styles.followDivider}>
              <StreamGradientButton
                label={isFollowing ? t('stream.following') : t('stream.follow')}
                onPress={handleFollow}
                variant={isFollowing ? 'following' : 'follow'}
                minWidth={72}
              />
            </View>
          ) : null}
        </View>
      </View>
    </StreamGlassPill>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    marginRight: 4,
  },
  avatarWrap: {
    flexShrink: 0,
    borderWidth: 1.4,
    borderColor: STREAM_COLORS.primary,
    borderRadius: 9999,
    padding: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: STREAM_COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: STREAM_COLORS.white,
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  actions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewerPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    height: 27,
    justifyContent: 'center',
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  followDivider: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(221,221,221,0.87)',
    paddingLeft: 12,
  },
});
