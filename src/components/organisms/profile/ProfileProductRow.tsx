/**
 * Fila de producto/show en perfil — Figma 536-20876.
 */
import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text as RNText,
} from 'react-native';
import { AudioLines, Clock, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import type { UserProfileProductItem } from '../../../api/platformApi';

const THUMB = 132;
const GOLD = '#FDC700';
const GRAY_500 = '#71717B';

/** "5 sept 14:30h" / "Sep 5 14:30h" según el idioma activo. */
function formatScheduled(epochSec: number, locale: string): string {
  const d = new Date(epochSec * 1000);
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${h}:${m}h`;
}

function formatPrice(cents: number, currency: string, locale: string): string {
  const major = cents / 100;
  if (currency === 'ARS' || currency === 'USD') {
    const sym = currency === 'USD' ? 'US$' : '$';
    const n = Number.isInteger(major) ? String(major) : major.toFixed(0);
    return `${sym}${n}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'ARS',
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `$${major}`;
  }
}

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export interface ProfileProductRowProps {
  item: UserProfileProductItem;
  onPress?: () => void;
}

export const ProfileProductRow: React.FC<ProfileProductRowProps> = ({ item, onPress }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'es';
  /** Overrides de color sólo en oscuro: en claro el StyleSheet manda sin cambios. */
  const { isDark } = useTheme();
  const d = themeColors.dark;
  const darkText = isDark ? { color: d.text } : null;
  const darkMuted = isDark ? { color: d.textMuted } : null;
  const inkColor = isDark ? d.text : '#18181B';
  const mutedColor = isDark ? d.textMuted : GRAY_500;
  const isLive = item.status === 'live';
  const isDraft = item.status === 'draft';

  const statusLabel = item.is_permanent
    ? t('profile.permanentProduct')
    : isLive
      ? t('profile.productLive')
      : isDraft && item.starts_soon
        ? t('profile.startsSoon')
        : item.scheduled_at
          ? formatScheduled(item.scheduled_at, locale)
          : t('profile.startsSoon');

  const showTimer =
    isLive && item.auction_seconds_remaining != null && item.auction_seconds_remaining >= 0;

  return (
    <TouchableOpacity
      style={[styles.row, isDark ? { borderBottomColor: d.borderSubtle } : null]}
      activeOpacity={onPress ? 0.88 : 1}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${statusLabel}. ${item.title}`}
      accessibilityState={{ disabled: !onPress }}
    >
      <View style={styles.thumbWrap}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.thumb,
              styles.thumbPlaceholder,
              isDark ? { backgroundColor: d.surfaceAlt } : null,
            ]}
          />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.statusRow}>
          {isLive ? (
            <AudioLines size={20} color={inkColor} strokeWidth={2.5} />
          ) : (
            <Clock size={20} color={inkColor} strokeWidth={2.5} />
          )}
          <RNText style={[styles.statusText, darkText]}>{statusLabel}</RNText>
        </View>

        <View style={styles.titleBlock}>
          <RNText style={[styles.title, darkText]} numberOfLines={1}>
            {item.title}
          </RNText>
          <View style={styles.articlesRow}>
            <RNText style={[styles.articlesText, darkMuted]}>
              {t('profile.productArticles', { count: item.article_count })}
            </RNText>
            {/* La flecha solo cuando la fila navega (hoy: en vivo → abre el stream). */}
            {onPress ? <ChevronRight size={16} color={mutedColor} strokeWidth={2.5} /> : null}
          </View>
        </View>

        <View style={styles.footerRow}>
          <RNText style={styles.price}>{formatPrice(item.price_cents, item.currency, locale)}</RNText>
          {showTimer ? (
            <RNText style={[styles.timer, darkText]}>
              {formatTimer(item.auction_seconds_remaining!)}
            </RNText>
          ) : (
            <RNText style={[styles.timerMuted, darkText]}>00:00</RNText>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    width: '100%',
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    flexShrink: 0,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
  },
  thumbPlaceholder: {
    backgroundColor: '#E7E7FF',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#18181B',
    includeFontPadding: false,
  },
  titleBlock: {
    gap: 4,
    width: '100%',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.07,
    color: '#18181B',
    includeFontPadding: false,
  },
  articlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  articlesText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: GRAY_500,
    includeFontPadding: false,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  price: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 28,
    color: GOLD,
    includeFontPadding: false,
  },
  timer: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 28,
    color: '#18181B',
    includeFontPadding: false,
  },
  timerMuted: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 28,
    color: '#18181B',
    includeFontPadding: false,
  },
});
