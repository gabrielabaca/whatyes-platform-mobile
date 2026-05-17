import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
  Text as RNText,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { IconBell, IconEye } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import type { UserShowItem } from '../../../api/platformApi';

const CARD_H = 224;
const LIVE_RED = '#FB2C36';
const PRIMARY = '#685CF0';

function formatViewerCount(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString('es-ES');
  }
  return String(n);
}

function formatScheduled(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const day = d.getDate();
  const month = months[d.getMonth()] ?? '';
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${h}:${m}h`;
}

export interface ProfileShowCardProps {
  show: UserShowItem;
  onPress?: () => void;
}

export const ProfileShowCard: React.FC<ProfileShowCardProps> = ({ show, onPress }) => {
  const { width } = useWindowDimensions();
  const cardW = (width - 16 * 2 - 12) / 2;
  const isLive = show.status === 'live';
  const isDraft = show.status === 'draft';
  const thumb = show.thumbnail_url;
  const title = show.name ?? show.stream_name ?? 'Show';
  const subtitle = show.description ?? show.name ?? '';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, { width: cardW, height: CARD_H }]}
    >
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
      )}
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="profile-show-overlay" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="rgba(0,0,0,0.9)" />
            <Stop offset="0.5" stopColor="rgba(0,0,0,0.2)" />
            <Stop offset="1" stopColor="rgba(0,0,0,0)" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#profile-show-overlay)" rx={16} />
      </Svg>
      <View style={styles.overlay}>
        <View style={styles.topRow}>
          {isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <RNText style={styles.liveText}>LIVE</RNText>
            </View>
          ) : isDraft ? (
            <View style={styles.scheduledBadge}>
              <RNText style={styles.scheduledText}>{formatScheduled(show.created_at)}</RNText>
            </View>
          ) : (
            <View />
          )}
          {isLive ? (
            <View style={styles.viewerBadge}>
              <IconEye size={14} color="#FFFFFF" strokeWidth={2} />
              <RNText style={styles.viewerText}>
                {formatViewerCount(show.viewer_count ?? 0)}
              </RNText>
            </View>
          ) : isDraft ? (
            <View style={styles.notifyBtn}>
              <IconBell size={18} color="#FFFFFF" strokeWidth={2} />
            </View>
          ) : null}
        </View>
        <View style={styles.bottomText}>
          <RNText style={styles.title} numberOfLines={1}>
            {title}
          </RNText>
          <RNText style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </RNText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E4E4E7',
  },
  thumb: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  thumbFallback: {
    backgroundColor: '#CBCEFF',
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIVE_RED,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 1000,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 0.94,
  },
  liveText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  scheduledBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 1000,
  },
  scheduledText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 1000,
    gap: 6,
  },
  viewerText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  notifyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomText: {
    gap: 2,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.85)',
  },
});
