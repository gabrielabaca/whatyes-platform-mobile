import React, { useId, useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text as RNText,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS, STREAM_RADIUS } from '../../molecules/stream/streamTokens';

export type StreamGradientVariant = 'follow' | 'following' | 'bid';

const GRADIENTS: Record<Exclude<StreamGradientVariant, 'following'>, { start: string; end: string }> = {
  follow: { start: STREAM_COLORS.primary, end: STREAM_COLORS.primaryDark },
  bid: { start: STREAM_COLORS.primary, end: STREAM_COLORS.bidGradientEnd },
};

/** Figma 536-21428 — estado “Siguiendo”. */
const FOLLOWING_STYLE = {
  background: '#D7D7D9',
  label: '#71717B',
} as const;

export interface StreamGradientButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: StreamGradientVariant;
  suffixIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  minWidth?: number;
}

export const StreamGradientButton: React.FC<StreamGradientButtonProps> = ({
  label,
  onPress,
  disabled,
  loading,
  variant = 'follow',
  suffixIcon,
  style,
  minWidth,
}) => {
  const gradId = useId().replace(/:/g, '');
  const isFollowingVariant = variant === 'following';
  const colors = isFollowingVariant ? null : GRADIENTS[variant];
  const [layoutW, setLayoutW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== layoutW) {
      setLayoutW(w);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.88}
      style={[styles.touch, minWidth != null && { minWidth }, style, disabled && styles.disabled]}
    >
      <View style={styles.inner} onLayout={onLayout}>
        {layoutW > 0 ? (
          isFollowingVariant ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.followingBg,
                { width: layoutW },
              ]}
            />
          ) : (
            <Svg
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              width={layoutW}
              height={40}
            >
              <Defs>
                <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={colors!.start} />
                  <Stop offset="1" stopColor={colors!.end} />
                </LinearGradient>
              </Defs>
              <Rect width={layoutW} height={40} rx={20} fill={`url(#${gradId})`} />
            </Svg>
          )
        ) : null}
        {loading ? (
          <ActivityIndicator
            color={
              variant === 'bid'
                ? '#18181b'
                : isFollowingVariant
                  ? FOLLOWING_STYLE.label
                  : '#FFFFFF'
            }
            size="small"
          />
        ) : (
          <>
            <RNText
              style={[
                styles.label,
                variant === 'bid' && styles.labelBid,
                isFollowingVariant && styles.labelFollowing,
              ]}
              numberOfLines={1}
            >
              {label}
            </RNText>
            {suffixIcon}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touch: {
    height: 40,
    borderRadius: STREAM_RADIUS.pill,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 4,
    minHeight: 40,
  },
  label: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  labelBid: {
    fontSize: 14,
    lineHeight: 20,
    color: '#18181b',
  },
  labelFollowing: {
    color: FOLLOWING_STYLE.label,
  },
  followingBg: {
    backgroundColor: FOLLOWING_STYLE.background,
    borderRadius: STREAM_RADIUS.pill,
  },
  disabled: {
    opacity: 0.5,
  },
});
