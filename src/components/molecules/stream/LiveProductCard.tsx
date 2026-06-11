import React from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  Image,
  TouchableOpacity,
} from 'react-native';
import { AlarmClock, ChevronRight, Pin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FONT_FAMILY } from '../../../theme/typography';

export interface LiveProductCardVM {
  uuid: string;
  title: string;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  articleCount: number;
  startsSoon?: boolean;
  auctionSecondsRemaining?: number | null;
  status?: string;
}

export function formatCatalogPrice(cents: number, currency: string): string {
  const major = cents / 100;
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major}`;
  }
}

export function formatCountdown(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface LiveProductCardProps {
  item: LiveProductCardVM;
  interactive?: boolean;
  onStart?: () => void;
  onPin?: () => void;
}

export const LiveProductCard: React.FC<LiveProductCardProps> = ({
  item,
  interactive = false,
  onStart,
  onPin,
}) => {
  const { t } = useTranslation();
  const startsSoon = Boolean(item.startsSoon);
  const hasCountdown = item.auctionSecondsRemaining != null;
  const countdownLabel = formatCountdown(item.auctionSecondsRemaining);

  return (
    <View style={styles.card}>
      <View style={styles.thumbWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
      </View>

      <View style={styles.body}>
        {startsSoon ? (
          <View style={styles.startsSoonRow}>
            <AlarmClock size={20} color="#FFFFFF" strokeWidth={2} />
            <RNText style={styles.startsSoonText}>{t('stream.startsSoon')}</RNText>
          </View>
        ) : null}

        <RNText style={styles.title} numberOfLines={1}>
          {item.title}
        </RNText>

        <View style={styles.itemsRow}>
          <RNText style={styles.itemsCount}>
            {t('stream.itemsCount', { count: item.articleCount })}
          </RNText>
          {startsSoon ? <ChevronRight size={16} color="#FFFFFF" strokeWidth={2} /> : null}
        </View>

        <View style={styles.priceRow}>
          <RNText style={styles.price}>
            {formatCatalogPrice(item.priceCents, item.currency)}
          </RNText>
          {interactive || startsSoon || hasCountdown ? (
            <RNText
              style={[
                styles.timer,
                startsSoon || hasCountdown ? styles.timerVisible : styles.timerHidden,
              ]}
            >
              {countdownLabel}
            </RNText>
          ) : null}
        </View>

        {interactive && !startsSoon ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={onStart}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <RNText style={styles.startBtnText}>{t('stream.productStart')}</RNText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pinBtn}
              onPress={onPin}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Pin size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  thumbWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: {
    width: 132,
    height: 132,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  thumbPlaceholder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  startsSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startsSoonText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 22,
    color: '#D9D9D9',
    letterSpacing: 0.07,
    includeFontPadding: false,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemsCount: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '800',
    color: '#FDC700',
    includeFontPadding: false,
  },
  timer: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '800',
    includeFontPadding: false,
  },
  timerVisible: {
    color: '#FFFFFF',
  },
  timerHidden: {
    color: 'transparent',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1000,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  pinBtn: {
    width: 36,
    height: 36,
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
