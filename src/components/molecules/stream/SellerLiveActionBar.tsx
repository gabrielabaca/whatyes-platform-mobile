import React, { useEffect, useRef } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS, STREAM_RADIUS } from './streamTokens';

export interface SellerLiveActionBarProps {
  /** El vivo está pausado: se muestra la CTA para (re)comenzar (Figma 698-12307). */
  isStreamPaused: boolean;
  /** El vendedor ya arrancó el vivo alguna vez: cambia "Comenzar" por "Reanudar". */
  hasStartedLive: boolean;
  onStartLive: () => void;
  startDisabled?: boolean;
  /** Flechas < > (Figma 890-1384): cambian el producto en juego dentro del catálogo. */
  onPrevProduct?: () => void;
  onNextProduct?: () => void;
  /** Con una oferta corriendo o con un solo producto, las flechas quedan inertes. */
  navDisabled?: boolean;
  /** CTA central: "Iniciar subasta/venta/sorteo", o "Cancelar" con la oferta corriendo. */
  primaryLabel: string;
  onPrimaryPress?: () => void;
  primaryDisabled?: boolean;
  /** `cancel` pinta la CTA en rojo (corta la oferta en curso); `start` en violeta. */
  primaryVariant?: 'start' | 'cancel';
}

const BAR_HEIGHT = 40;

/**
 * Acciones inferiores del vendedor.
 * - Pausado / por comenzar → CTA violeta a todo el ancho (Figma 698-12307).
 * - En vivo → [<] [Iniciar subasta | Cancelar] [>] (Figma 890-1384): las flechas
 *   navegan el catálogo para cambiar rápido el producto en juego y la CTA
 *   central abre la oferta del producto visible o cancela la que está corriendo.
 *   Terminar el vivo queda en la X del header (drawer de confirmación).
 */
export const SellerLiveActionBar: React.FC<SellerLiveActionBarProps> = ({
  isStreamPaused,
  hasStartedLive,
  onStartLive,
  startDisabled,
  onPrevProduct,
  onNextProduct,
  navDisabled,
  primaryLabel,
  onPrimaryPress,
  primaryDisabled,
  primaryVariant = 'start',
}) => {
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(0)).current;

  // Pulso suave para que el CTA de (re)comenzar se note sin ser agresivo.
  useEffect(() => {
    if (!isStreamPaused || startDisabled) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [isStreamPaused, startDisabled, pulse]);

  if (isStreamPaused) {
    const scale = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.035],
    });
    const glowOpacity = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.18, 0.55],
    });

    return (
      <View style={styles.startWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.startGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.startBtn, startDisabled && styles.disabled]}
            onPress={onStartLive}
            disabled={startDisabled}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityHint={
              hasStartedLive
                ? t('stream.sellerPausedHint')
                : t('stream.sellerReadyToStartHint')
            }
          >
            <RNText style={styles.label}>
              {hasStartedLive ? t('stream.resumeLiveCta') : t('stream.startLiveCta')}
            </RNText>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const isNavDisabled = Boolean(navDisabled) || (!onPrevProduct && !onNextProduct);
  const isPrimaryDisabled = Boolean(primaryDisabled) || !onPrimaryPress;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.navBtn, isNavDisabled && styles.disabled]}
        onPress={onPrevProduct}
        disabled={isNavDisabled}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={t('stream.prevProductA11y')}
      >
        <ChevronLeft size={24} color={STREAM_COLORS.white} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          primaryVariant === 'cancel' && styles.primaryBtnCancel,
          isPrimaryDisabled && styles.disabled,
        ]}
        onPress={onPrimaryPress}
        disabled={isPrimaryDisabled}
        activeOpacity={0.88}
        accessibilityRole="button"
      >
        <RNText style={styles.label} numberOfLines={1}>
          {primaryLabel}
        </RNText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navBtn, isNavDisabled && styles.disabled]}
        onPress={onNextProduct}
        disabled={isNavDisabled}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={t('stream.nextProductA11y')}
      >
        <ChevronRight size={24} color={STREAM_COLORS.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  startWrap: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  startGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: STREAM_COLORS.primary,
  },
  startBtn: {
    height: BAR_HEIGHT,
    width: '100%',
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: STREAM_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  /** Figma 890-1380 / 1094-747: pill violeta al 20% con el chevron blanco. */
  navBtn: {
    height: BAR_HEIGHT,
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: STREAM_COLORS.ctaSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  /** Figma 1094-749: la CTA central estira entre las flechas. */
  primaryBtn: {
    flex: 1,
    minWidth: 0,
    height: BAR_HEIGHT,
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: STREAM_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnCancel: {
    backgroundColor: STREAM_COLORS.liveStop,
  },
  label: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
  disabled: {
    opacity: 0.5,
  },
});
