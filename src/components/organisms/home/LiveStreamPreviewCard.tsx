import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { IconEye, IconStar } from '../../icons';
import { Text } from '../../atoms/Text';
import { FONT_FAMILY } from '../../../theme/typography';
import { displayInterestCategoryIcon } from '../../../utils/interestCategoryEmoji';
import { PeekHint } from './PeekHint';
import type { LiveStreamPreviewModel } from './types';

export type LiveStreamPreviewVariant = 'large' | 'compact' | 'grid';

interface LiveStreamPreviewCardProps {
  stream: LiveStreamPreviewModel;
  variant: LiveStreamPreviewVariant;
  onPress?: () => void;
  /** Mantener presionada la card: abre el peek del vivo (se cierra con la X). */
  onLongPress?: () => void;
  /** Muestra el hint animado del gesto (solo la primera card del listado). */
  showPeekHint?: boolean;
}

const GRID_H = 224;
const LIVE_RED = '#fb2c36';
const AVATAR_BORDER = '#3f3f47';

function formatViewerCount(n: number): string {
  // Figma 1118:6375 muestra coma (`1,247`). Dudoso: en es-AR el miles es punto.
  return n.toLocaleString('en-US');
}

export const LiveStreamPreviewCard: React.FC<LiveStreamPreviewCardProps> = ({
  stream,
  variant,
  onPress,
  onLongPress,
  showPeekHint,
}) => {
  const { width: screenW } = useWindowDimensions();
  const compactW = Math.min(160, (screenW - 16 * 2 - 12) / 2.2);
  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });

  const onThumbLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setOverlaySize({ w: width, h: height });
  };

  const viewersLabel =
    variant === 'grid'
      ? formatViewerCount(stream.viewerCount)
      : stream.viewerCount >= 1000
        ? `${(stream.viewerCount / 1000).toFixed(1).replace(/\.0$/, '')}k`
        : String(stream.viewerCount);

  const avatarInitials =
    (stream.sellerInitials && stream.sellerInitials.trim()) ||
    stream.sellerName.replace(/\s+/g, '').slice(0, 2).toUpperCase() ||
    '?';

  const categoryEmoji =
    stream.interestCategories && stream.interestCategories.length > 0
      ? displayInterestCategoryIcon(stream.interestCategories[0])
      : stream.categoryLabel
        ? '📦'
        : null;

  const gradId = `ls${String(stream.id).replace(/[^a-zA-Z0-9_-]/g, '') || 'card'}`;

  const titleLines = variant === 'grid' ? 1 : variant === 'compact' ? 2 : 3;

  const showCategoryPills =
    variant !== 'grid' && stream.interestCategories && stream.interestCategories.length > 0;
  const showCategoryLabelPill = variant !== 'grid' && stream.categoryLabel && !showCategoryPills;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[styles.card, variant === 'grid' && styles.cardGrid, variant === 'compact' ? { width: compactW } : styles.cardFull]}
    >
      <View
        style={[
          styles.thumbWrapBase,
          variant === 'large' && styles.thumbAspectLarge,
          variant === 'compact' && styles.thumbCompact,
          variant === 'grid' && styles.thumbGrid,
        ]}
        onLayout={onThumbLayout}
      >
        {stream.thumbnail ? (
          <Image source={{ uri: stream.thumbnail }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={{ fontFamily: FONT_FAMILY.bold }} className="text-white/90 text-xs">
              LIVE
            </Text>
          </View>
        )}

        {overlaySize.w > 0 && overlaySize.h > 0 ? (
          <Svg
            width={overlaySize.w}
            height={overlaySize.h}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          >
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor="#000000" stopOpacity={0.9} />
                <Stop offset="0.5" stopColor="#000000" stopOpacity={0.2} />
                <Stop offset="1" stopColor="#000000" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width={overlaySize.w} height={overlaySize.h} fill={`url(#${gradId})`} />
          </Svg>
        ) : null}

        <View style={styles.overlayRoot} pointerEvents="box-none">
          <View style={styles.overlayColumn}>
            <View style={styles.overlayTopRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={[styles.liveText, { fontFamily: FONT_FAMILY.bold }]}>LIVE</Text>
              </View>
              <View style={styles.viewerBadge}>
                <IconEye size={14} color="#fff" strokeWidth={2} />
                <Text style={[styles.viewerText, { fontFamily: FONT_FAMILY.semibold }]}>
                  {viewersLabel}
                </Text>
              </View>
            </View>

            <View style={styles.overlayBottomSection}>
              <View style={styles.sellerRow}>
                <View style={styles.sellerLeft}>
                  <View style={styles.avatarRing}>
                    {stream.sellerAvatarUrl ? (
                      <Image
                        source={{ uri: stream.sellerAvatarUrl }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[styles.avatarInitials, { fontFamily: FONT_FAMILY.bold }]}>
                        {avatarInitials}
                      </Text>
                    )}
                  </View>
                  <View style={styles.sellerTextCol}>
                    <Text
                      style={[styles.sellerName, { fontFamily: FONT_FAMILY.semibold }]}
                      numberOfLines={1}
                    >
                      {stream.sellerName}
                    </Text>
                    {stream.rating != null && stream.rating > 0 ? (
                      <View style={styles.ratingRow}>
                        <IconStar size={12} color="#fbbf24" />
                        <Text style={[styles.ratingValue, { fontFamily: FONT_FAMILY.regular }]}>
                          {stream.rating.toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {variant === 'grid' && categoryEmoji ? (
                  <View style={styles.emojiBox}>
                    <Text style={styles.emojiGlyph}>{categoryEmoji}</Text>
                  </View>
                ) : showCategoryPills ? (
                  <View style={styles.pillsWrap}>
                    {(stream.interestCategories ?? []).map((cat) => (
                      <View key={cat.uuid} style={styles.categoryPill}>
                        <Text
                          style={[styles.pillText, { fontFamily: FONT_FAMILY.semibold }]}
                          numberOfLines={1}
                        >
                          {cat.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : showCategoryLabelPill ? (
                  <View style={styles.categoryPill}>
                    <Text
                      style={[styles.pillText, { fontFamily: FONT_FAMILY.semibold }]}
                      numberOfLines={1}
                    >
                      {stream.categoryLabel}
                    </Text>
                  </View>
                ) : variant !== 'grid' && categoryEmoji ? (
                  <View style={styles.emojiBox}>
                    <Text style={styles.emojiGlyph}>{categoryEmoji}</Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={[
                  styles.streamTitle,
                  { fontFamily: FONT_FAMILY.bold },
                  variant !== 'grid' ? styles.streamTitleMultiline : null,
                ]}
                numberOfLines={titleLines}
              >
                {stream.title}
              </Text>
            </View>
          </View>
        </View>

        {showPeekHint ? <PeekHint /> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#1f2937',
  },
  cardGrid: {
    marginBottom: 0,
  },
  cardFull: {
    width: '100%',
    alignSelf: 'stretch',
  },
  thumbWrapBase: {
    width: '100%',
    backgroundColor: '#27272a',
    position: 'relative',
  },
  thumbAspectLarge: {
    aspectRatio: 16 / 10,
  },
  thumbCompact: {
    aspectRatio: 3 / 4,
  },
  thumbGrid: {
    height: GRID_H,
  },
  thumbPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3f3f46',
  },
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  overlayColumn: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 0,
  },
  overlayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIVE_RED,
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    minHeight: 24,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 5,
    borderRadius: 999,
    minHeight: 24,
  },
  viewerText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  overlayBottomSection: {
    width: '100%',
    paddingVertical: 16,
    gap: 12,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 36,
    gap: 8,
  },
  sellerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  avatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.4,
    borderColor: AVATAR_BORDER,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 11,
  },
  sellerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  sellerName: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingValue: {
    color: '#d4d4d8',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  emojiBox: {
    backgroundColor: 'rgba(253, 199, 0, 0.2)',
    borderRadius: 8,
    padding: 6,
  },
  emojiGlyph: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 4,
    maxWidth: '48%',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(253, 199, 0, 0.2)',
    maxWidth: 110,
  },
  pillText: {
    fontSize: 11,
    color: '#FDC700',
  },
  streamTitle: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 12,
  },
  streamTitleMultiline: {
    lineHeight: 18,
  },
});
