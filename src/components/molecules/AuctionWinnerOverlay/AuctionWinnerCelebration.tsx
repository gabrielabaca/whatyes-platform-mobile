/**
 * Festejo a pantalla completa para el GANADOR de la subasta.
 * Los espectadores ven el banner compacto (AuctionWinnerOverlay); este takeover
 * es exclusivo de quien ganó, para que el momento no pase desapercibido.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Text as RNText,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useTranslation } from 'react-i18next';
import HapticFeedback from 'react-native-haptic-feedback';
import { PulpoLogo } from '../../atoms/stream/PulpoLogo';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { FONT_FAMILY } from '../../../theme/typography';
import type { AuctionWinner } from '../../../hooks/useStreamChat';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const GOLD = '#FFC900';
const PRIMARY = '#685CF0';
const CONFETTI_COLORS = [GOLD, PRIMARY, '#FFFFFF', '#FB2C36', '#00C566'];

const HAPTIC_OPTIONS = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

export interface AuctionWinnerCelebrationProps {
  winner: AuctionWinner | null;
  /** Producto subastado, para que el usuario sepa qué se llevó. */
  productTitle?: string | null;
  /** Moneda del producto vendido: el evento de cierre trae el monto sin moneda. */
  currency?: string | null;
  onDismiss: () => void;
}

export const AuctionWinnerCelebration: React.FC<AuctionWinnerCelebrationProps> = ({
  winner,
  productTitle,
  currency,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const enter = useRef(new Animated.Value(0)).current;
  const pulpoPop = useRef(new Animated.Value(1)).current;
  const pulpoWiggle = useRef(new Animated.Value(0)).current;

  const visible = !!winner;

  useEffect(() => {
    if (!visible) return;

    HapticFeedback.trigger('notificationSuccess', HAPTIC_OPTIONS);

    enter.setValue(0);
    Animated.spring(enter, {
      toValue: 1,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // Pulpo: entra con pop y se menea festejando.
    pulpoPop.setValue(0.4);
    pulpoWiggle.setValue(0);
    Animated.sequence([
      Animated.spring(pulpoPop, {
        toValue: 1.15,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(pulpoPop, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    const wiggle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulpoWiggle, {
          toValue: 1,
          duration: 220,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulpoWiggle, {
          toValue: -1,
          duration: 320,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulpoWiggle, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    );
    wiggle.start();

    return () => wiggle.stop();
  }, [visible, enter, pulpoPop, pulpoWiggle]);

  if (!winner) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop: tocar fuera también cierra */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={t('stream.winCta')}
      />

      {/* Doble cañón de confeti desde las esquinas inferiores */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <ConfettiCannon
          count={120}
          origin={{ x: 0, y: SCREEN_H }}
          explosionSpeed={520}
          fallSpeed={3200}
          fadeOut
          colors={CONFETTI_COLORS}
          autoStart
        />
        <ConfettiCannon
          count={120}
          origin={{ x: SCREEN_W, y: SCREEN_H }}
          explosionSpeed={520}
          fallSpeed={3200}
          fadeOut
          colors={CONFETTI_COLORS}
          autoStart
        />
      </View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: enter,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              { scale: pulpoPop },
              {
                rotate: pulpoWiggle.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-14deg', '14deg'],
                }),
              },
            ],
          }}
        >
          <PulpoLogo size={116} color={GOLD} />
        </Animated.View>

        <RNText style={styles.title}>
          {t(winner.saleMode === 'buy_now' ? 'stream.buyNowWinTitle' : 'stream.winTitle')}
        </RNText>

        {productTitle ? (
          <RNText style={styles.product} numberOfLines={2}>
            {productTitle}
          </RNText>
        ) : null}

        <RNText style={styles.amount}>{formatStreamPrice(winner.amount, currency)}</RNText>

        <RNText style={styles.note}>{t('stream.winAutoPayment')}</RNText>

        <TouchableOpacity style={styles.cta} onPress={onDismiss} activeOpacity={0.88}>
          <RNText style={styles.ctaText}>{t('stream.winCta')}</RNText>
        </TouchableOpacity>

        <RNText style={styles.findIt}>{t('stream.winFindIt')}</RNText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,4,20,0.82)',
    zIndex: 400,
    elevation: 400,
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 10,
    maxWidth: 360,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: 1,
    color: GOLD,
    textAlign: 'center',
    marginTop: 8,
    includeFontPadding: false,
  },
  product: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  amount: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 30,
    lineHeight: 36,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  note: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    marginTop: 6,
    includeFontPadding: false,
  },
  cta: {
    marginTop: 14,
    minWidth: 200,
    height: 48,
    borderRadius: 1000,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ctaText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  findIt: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 4,
    includeFontPadding: false,
  },
});
