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
import { useTranslation } from 'react-i18next';
import { IconBell, IconEye } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import type { UserShowItem } from '../../../api/platformApi';

const CARD_H = 224;
const LIVE_RED = '#FB2C36';
const PRIMARY = '#685CF0';
const ENDED_GRAY = '#71717B';

function formatViewerCount(n: number, locale: string): string {
  if (n >= 1000) {
    return n.toLocaleString(locale);
  }
  return String(n);
}

/** "5 sept 14:30h" / "Sep 5 14:30h" según el idioma activo. */
function formatScheduled(epochSec: number, locale: string): string {
  const d = new Date(epochSec * 1000);
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${h}:${m}h`;
}

export interface ProfileShowCardProps {
  show: UserShowItem;
  onPress?: () => void;
  /**
   * Campana interactiva en shows agendados. Sin `onNotifyPress` queda decorativa
   * (dashboard propio). El toggle suscribe al vendedor, no al show puntual.
   */
  onNotifyPress?: () => void;
  notifySelected?: boolean;
  notifyLoading?: boolean;
}

export const ProfileShowCard: React.FC<ProfileShowCardProps> = ({
  show,
  onPress,
  onNotifyPress,
  notifySelected = false,
  notifyLoading = false,
}) => {
  const { width } = useWindowDimensions();
  /**
   * Sólo se tematizan las superficies que quedan a la vista sin miniatura (fondo de la
   * tarjeta mientras carga la imagen y placeholder sin thumbnail): en oscuro eran parches
   * claros sobre el navy. El degradado, las píldoras y los textos blancos van sobre overlay
   * oscuro y son iguales en ambos temas.
   */
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'es';
  const d = themeColors.dark;
  const cardW = (width - 16 * 2 - 12) / 2;
  const isLive = show.status === 'live';
  const isDraft = show.status === 'draft';
  const isEnded = show.status === 'ended';
  const thumb = show.thumbnail_url;
  const title = show.name ?? show.stream_name ?? 'Show';
  const subtitle = show.description ?? show.name ?? '';
  const cardStyle = [
    styles.card,
    { width: cardW, height: CARD_H },
    isDark ? { backgroundColor: d.surface } : null,
    isEnded && styles.cardEnded,
  ];

  const body = (
    <>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View
          style={[
            styles.thumb,
            styles.thumbFallback,
            isDark ? { backgroundColor: d.surfaceAlt } : null,
          ]}
        />
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
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          {isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <RNText style={styles.liveText}>LIVE</RNText>
            </View>
          ) : isDraft ? (
            <View style={styles.scheduledBadge}>
              <RNText style={styles.scheduledText}>{formatScheduled(show.created_at, locale)}</RNText>
            </View>
          ) : isEnded ? (
            <View style={styles.endedBadge}>
              <RNText style={styles.liveText}>{t('home.showEndedBadge')}</RNText>
            </View>
          ) : (
            <View />
          )}
          {isLive ? (
            <View style={styles.viewerBadge}>
              <IconEye size={14} color="#FFFFFF" strokeWidth={2} />
              <RNText style={styles.viewerText}>
                {formatViewerCount(show.viewer_count ?? 0, locale)}
              </RNText>
            </View>
          ) : isDraft ? (
            onNotifyPress ? (
              <TouchableOpacity
                style={[
                  styles.notifyBtn,
                  notifySelected && styles.notifyBtnSelected,
                  notifyLoading && styles.notifyBtnDisabled,
                ]}
                onPress={onNotifyPress}
                disabled={notifyLoading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t(
                  notifySelected
                    ? 'profile.notifySellerShowA11yOn'
                    : 'profile.notifySellerShowA11y',
                )}
                accessibilityState={{ selected: notifySelected }}
              >
                <IconBell size={16} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <View style={styles.notifyBtn}>
                <IconBell size={16} color="#FFFFFF" strokeWidth={2} />
              </View>
            )
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
    </>
  );

  if (isLive) {
    return (
      <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={cardStyle}>
        {body}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{body}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E4E4E7',
  },
  cardEnded: {
    opacity: 0.6,
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
  /** Mismo tratamiento que el badge LIVE, en gris neutro y sin el punto de "en aire". */
  endedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ENDED_GRAY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 1000,
  },
  /** Figma 698:11052 — pill translúcida clara */
  scheduledBadge: {
    backgroundColor: 'rgba(217,217,217,0.2)',
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 1000,
    justifyContent: 'center',
  },
  scheduledText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
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
  /** Figma 698:11071 — misma pill translúcida que la fecha; el estado suscripto usa PRIMARY */
  notifyBtn: {
    width: 28,
    height: 24,
    borderRadius: 1000,
    backgroundColor: 'rgba(217,217,217,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBtnSelected: {
    backgroundColor: PRIMARY,
  },
  notifyBtnDisabled: {
    opacity: 0.6,
  },
  bottomText: {
    gap: 4,
    paddingTop: 16,
  },
  /** Figma 698:11046/11047 — título SemiBold 14, subtítulo Bold 12 */
  title: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 12,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
