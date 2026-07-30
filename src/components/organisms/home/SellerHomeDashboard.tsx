import React, { useId } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowRight, AudioLines, ShoppingCart } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { ProfileShowCard } from '../profile/ProfileShowCard';
import type { UserShowItem } from '../../../api/platformApi';

const BORDER = '#CBCEFF';
const PRIMARY = '#685CF0';
const TEXT = '#18181B';
const TITLE = '#27272A';
const MUTED = '#6B7280';
const DARK = '#111928';

/** Borde de tarjeta en oscuro: el lavanda de marca atenuado sobre `night.800`. */
const BORDER_DARK = 'rgba(104, 92, 240, 0.35)';
/** Relleno de los círculos de ícono: primario translúcido, más presente en oscuro. */
const ICON_TINT_LIGHT = 'rgba(104, 92, 240, 0.1)';
const ICON_TINT_DARK = 'rgba(104, 92, 240, 0.22)';
/** Degradados de tarjeta por tema (claro = Figma 566-3736; oscuro = equivalente `night`). */
const CARD_GRADIENTS = {
  light: {
    gray: ['#FFFFFF', '#F2F2F8', '#E0E0EC'],
    verify: ['#F0EEFF', '#F7F6FF', '#FFF6E0'],
  },
  dark: {
    gray: ['#152042', '#101A38', '#0C142D'],
    verify: ['#1B1A4D', '#141B3B', '#2B2413'],
  },
} as const;

/** Sombra Figma: 0 2px 4px -2px rgba(0,0,0,0.05) */
const cardShadowSoft: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  android: {},
  default: {},
}) ?? {};

/** Sombra Figma tarjetas grandes: 5px 5px 5px -2px — en RN sin spread, sombra más baja */
const cardShadowTile: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  android: {},
  default: {},
}) ?? {};

export interface SellerHomeDashboardProps {
  paymentsAmount: string;
  soldCount: number;
  showVerifyBanner: boolean;
  showFirstLiveCta: boolean;
  onPressVerify?: () => void;
  onPressPayments?: () => void;
  onPressSold?: () => void;
  onPressGoLive: () => void;
  onPressAddProduct?: () => void;
  onPressFirstLiveCta: () => void;
  /** Lives pasados del vendedor (status ended); vacío oculta la sección. */
  pastLives?: UserShowItem[];
  onPressPastLive?: (show: UserShowItem) => void;
}

type CardBackgroundKind = 'gray' | 'verify' | 'none';

const CardBackground: React.FC<{ kind: Exclude<CardBackgroundKind, 'none'> }> = ({ kind }) => {
  const rawId = useId().replace(/:/g, '');
  const { isDark } = useTheme();
  const gradientId = `seller-home-${kind}-${rawId}`;
  const stops = CARD_GRADIENTS[isDark ? 'dark' : 'light'][kind];

  if (kind === 'verify') {
    return (
      <View pointerEvents="none" style={styles.cardFill}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0.5" x2="1" y2="0.5">
              <Stop offset="0" stopColor={stops[0]} />
              <Stop offset="0.72" stopColor={stops[1]} />
              <Stop offset="1" stopColor={stops[2]} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.cardFill}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="0.48" stopColor={stops[1]} />
            <Stop offset="1" stopColor={stops[2]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
};

const BorderedCard: React.FC<{
  style?: StyleProp<ViewStyle>;
  shadow?: ViewStyle;
  background?: CardBackgroundKind;
  onPress?: () => void;
  children: React.ReactNode;
}> = ({ style, shadow, background = 'gray', onPress, children }) => {
  const { isDark } = useTheme();
  const shell = [
    styles.card,
    isDark
      ? { backgroundColor: themeColors.dark.surface, borderColor: BORDER_DARK }
      : null,
    shadow,
    style,
  ];
  const content = (
    <>
      {background === 'none' ? null : <CardBackground kind={background} />}
      {children}
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={shell} onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={shell}>{content}</View>;
};

/** Figma 566-3736 — Home vendedor */
export const SellerHomeDashboard: React.FC<SellerHomeDashboardProps> = ({
  paymentsAmount,
  soldCount,
  showVerifyBanner,
  showFirstLiveCta,
  onPressVerify,
  onPressPayments,
  onPressSold,
  onPressGoLive,
  onPressAddProduct,
  onPressFirstLiveCta,
  pastLives = [],
  onPressPastLive,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  /** Overrides sólo para oscuro: en claro mandan los estilos estáticos. */
  const darkText = isDark ? { color: themeColors.dark.text } : null;
  const darkMuted = isDark ? { color: themeColors.dark.textSecondary } : null;
  const darkIconWrap = isDark
    ? { backgroundColor: ICON_TINT_DARK, borderColor: BORDER_DARK }
    : null;
  const arrowMuted = isDark ? themeColors.dark.textSecondary : MUTED;

  const pastLiveRows: UserShowItem[][] = [];
  for (let i = 0; i < pastLives.length; i += 2) {
    pastLiveRows.push(pastLives.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBlock}>
        {showVerifyBanner ? (
          <BorderedCard
            style={styles.verifyBanner}
            shadow={cardShadowSoft}
            background="verify"
            onPress={onPressVerify}
          >
            <View style={styles.verifyTextCol}>
              <RNText style={[styles.verifyTitle, darkText]}>{t('sellerHome.verifyTitle')}</RNText>
              <RNText style={[styles.verifyBody, darkText]}>{t('sellerHome.verifyBody')}</RNText>
            </View>
            <View style={[styles.verifyArrowWrap, darkIconWrap]}>
              <ArrowRight size={22} color={PRIMARY} strokeWidth={2.2} />
            </View>
          </BorderedCard>
        ) : null}

        <View style={styles.statsRow}>
          <BorderedCard
            style={styles.statCard}
            shadow={cardShadowSoft}
            onPress={onPressPayments}
          >
            <View style={styles.statTop}>
              <RNText style={[styles.statLabel, darkMuted]}>{t('sellerHome.payments')}</RNText>
              <ArrowRight size={20} color={arrowMuted} strokeWidth={2} />
            </View>
            <RNText style={[styles.statValue, darkText]}>{paymentsAmount}</RNText>
          </BorderedCard>
          <BorderedCard
            style={styles.statCard}
            shadow={cardShadowSoft}
            onPress={onPressSold}
          >
            <View style={styles.statTop}>
              <RNText style={[styles.statLabel, darkMuted]}>{t('sellerHome.sold')}</RNText>
              <ArrowRight size={20} color={arrowMuted} strokeWidth={2} />
            </View>
            <RNText style={[styles.statValue, darkText]}>{String(soldCount)}</RNText>
          </BorderedCard>
        </View>
      </View>

      <RNText style={[styles.sectionTitle, darkText]}>{t('sellerHome.whatToDoToday')}</RNText>

      <View style={styles.actionsBlock}>
        <BorderedCard
          style={styles.actionTile}
          shadow={cardShadowTile}
          onPress={onPressGoLive}
        >
          <View style={[styles.actionIconWrap, darkIconWrap]}>
            <AudioLines size={24} color={PRIMARY} strokeWidth={2.2} />
          </View>
          <RNText style={[styles.actionLabel, darkText]}>{t('sellerHome.goLive')}</RNText>
        </BorderedCard>

        <BorderedCard
          style={[styles.actionTile, styles.actionTileTall]}
          shadow={cardShadowTile}
          onPress={onPressAddProduct ?? onPressGoLive}
        >
          <View style={[styles.actionIconWrap, darkIconWrap]}>
            <ShoppingCart size={24} color={PRIMARY} strokeWidth={2.2} />
          </View>
          <RNText style={[styles.actionLabel, darkText]}>{t('sellerHome.addProduct')}</RNText>
        </BorderedCard>

        {showFirstLiveCta && pastLives.length === 0 ? (
          <BorderedCard style={styles.firstLiveCard} shadow={cardShadowTile}>
            <RNText style={[styles.firstLiveTitle, darkText]}>{t('sellerHome.firstLiveTitle')}</RNText>
            <RNText style={[styles.firstLiveBody, darkText]}>{t('sellerHome.firstLiveBody')}</RNText>
            <TouchableOpacity style={styles.firstLiveBtn} onPress={onPressFirstLiveCta} activeOpacity={0.85}>
              <RNText style={styles.firstLiveBtnText}>{t('sellerHome.firstLiveCta')}</RNText>
            </TouchableOpacity>
          </BorderedCard>
        ) : null}
      </View>

      {pastLives.length > 0 ? (
        <>
          <RNText style={[styles.sectionTitle, darkText]}>{t('sellerHome.pastLives')}</RNText>
          <View style={styles.pastLivesGrid}>
            {pastLiveRows.map((row, idx) => (
              <View key={`past-live-row-${idx}`} style={styles.pastLivesRow}>
                {row.map((show) => (
                  <ProfileShowCard
                    key={show.room_uuid}
                    show={show}
                    onPress={() => onPressPastLive?.(show)}
                  />
                ))}
                {row.length === 1 ? <View style={styles.pastLivesFiller} /> : null}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 24,
  },
  topBlock: {
    gap: 16,
    width: '100%',
  },
  card: {
    position: 'relative',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    backgroundColor: '#F2F2F8',
    overflow: 'hidden',
  },
  cardFill: {
    ...StyleSheet.absoluteFillObject,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  verifyTextCol: {
    flex: 1,
    gap: 4,
  },
  verifyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  verifyBody: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  verifyArrowWrap: {
    width: 40,
    height: 32,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: ICON_TINT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  statCard: {
    flex: 1,
    height: 76,
    padding: 12,
    justifyContent: 'center',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 12,
    color: MUTED,
    includeFontPadding: false,
  },
  statValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 20,
    color: DARK,
    includeFontPadding: false,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: TITLE,
    includeFontPadding: false,
  },
  actionsBlock: {
    gap: 16,
    width: '100%',
  },
  actionTile: {
    minHeight: 142,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileTall: {
    minHeight: 146,
  },
  actionIconWrap: {
    padding: 12,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: ICON_TINT_LIGHT,
    marginBottom: 12,
  },
  actionLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: PRIMARY,
    textAlign: 'center',
    includeFontPadding: false,
  },
  firstLiveCard: {
    minHeight: 166,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  firstLiveTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: TEXT,
    textAlign: 'center',
    includeFontPadding: false,
  },
  firstLiveBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
    textAlign: 'center',
    includeFontPadding: false,
  },
  firstLiveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 1000,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstLiveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  pastLivesGrid: {
    gap: 12,
    width: '100%',
  },
  pastLivesRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  pastLivesFiller: {
    flex: 1,
  },
});
