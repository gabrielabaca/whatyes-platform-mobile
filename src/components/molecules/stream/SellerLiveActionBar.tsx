import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import HapticFeedback from 'react-native-haptic-feedback';
import DoubleArrowIcon from '../../../../assets/icons/stream/doubleArrow.svg';
import { PulpoLogo } from '../../atoms/stream/PulpoLogo';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS, STREAM_RADIUS } from './streamTokens';

export interface SellerLiveActionBarProps {
  /** El vivo está pausado: se muestra la CTA para (re)comenzar (Figma 698-12307). */
  isStreamPaused: boolean;
  /** El vendedor ya arrancó el vivo alguna vez: cambia "Comenzar" por "Reanudar". */
  hasStartedLive: boolean;
  onStartLive: () => void;
  onEndLive: () => void;
  /**
   * Se dispara al completar el deslizamiento: pone en juego el primer producto
   * del catálogo con el modo de venta elegido (subasta / venta directa / sorteo).
   */
  onNextProduct?: () => void;
  /** Sin producto disponible o con una oferta corriendo: el slider queda inerte. */
  nextProductDisabled?: boolean;
  /** Texto del slider; refleja el modo elegido (subasta / venta directa / sorteo). */
  nextProductLabel?: string;
  startDisabled?: boolean;
}

const BAR_HEIGHT = 40;
/** Figma 890-1426: el track no se pinta; solo se ven la perilla y el pulpo. */
const TRACK_PAD_LEFT = 4;
const TRACK_PAD_RIGHT = 12;
const PULPO_W = 25;
/** Fracción del recorrido que confirma al soltar. */
const COMPLETE_THRESHOLD = 0.7;
/** Un flick rápido (px/ms) confirma aunque no llegue al umbral de distancia. */
const FLICK_VELOCITY = 0.8;
const FLICK_MIN_PROGRESS = 0.3;

const HAPTIC_OPTIONS = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

/**
 * Acciones inferiores del vendedor.
 * - Pausado / por comenzar → CTA violeta a todo el ancho (Figma 698-12307).
 * - En vivo → "Terminar vivo" + slider "Siguiente Subasta" (Figma 890-1384).
 *
 * El slider replica el gesto de ofertar del comprador (`StreamBidBar`): la
 * perilla arranca a la izquierda, el pulpo espera a la derecha y se desvanece
 * antes de que la perilla lo alcance.
 */
export const SellerLiveActionBar: React.FC<SellerLiveActionBarProps> = ({
  isStreamPaused,
  hasStartedLive,
  onStartLive,
  onEndLive,
  onNextProduct,
  nextProductDisabled,
  nextProductLabel,
  startDisabled,
}) => {
  const { t } = useTranslation();
  const sliderLabel = nextProductLabel ?? t('stream.nextAuctionCta');
  const [trackWidth, setTrackWidth] = useState(0);
  const [knobWidth, setKnobWidth] = useState(0);
  const posAnim = useRef(new Animated.Value(0)).current;

  const isSliderDisabled = Boolean(nextProductDisabled) || !onNextProduct;
  const isDisabledRef = useRef(isSliderDisabled);
  const maxTravelRef = useRef(0);
  const onConfirmRef = useRef(onNextProduct);
  /** true mientras el drag está por encima del umbral (para el tick háptico). */
  const armedRef = useRef(false);
  /** Evita doble confirmación entre release y terminate. */
  const completingRef = useRef(false);

  useEffect(() => { isDisabledRef.current = isSliderDisabled; }, [isSliderDisabled]);
  useEffect(() => { onConfirmRef.current = onNextProduct; }, [onNextProduct]);

  const maxTravel =
    trackWidth > 0 && knobWidth > 0
      ? Math.max(0, trackWidth - TRACK_PAD_LEFT - TRACK_PAD_RIGHT - knobWidth)
      : 0;

  useEffect(() => {
    maxTravelRef.current = maxTravel;
    posAnim.setValue(0);
  }, [maxTravel, posAnim]);

  const reset = () => {
    armedRef.current = false;
    Animated.spring(posAnim, { toValue: 0, bounciness: 8, useNativeDriver: false }).start();
  };

  const complete = () => {
    if (completingRef.current) return;
    completingRef.current = true;
    armedRef.current = false;
    HapticFeedback.trigger('notificationSuccess', HAPTIC_OPTIONS);
    Animated.timing(posAnim, {
      toValue: maxTravelRef.current,
      duration: 90,
      useNativeDriver: false,
    }).start(() => {
      onConfirmRef.current?.();
      setTimeout(() => {
        Animated.spring(posAnim, {
          toValue: 0,
          bounciness: 8,
          useNativeDriver: false,
        }).start(() => {
          completingRef.current = false;
        });
      }, 450);
    });
  };

  /** Decide confirmar o volver, tanto en release como si otro gesto interrumpe. */
  const settle = (_: GestureResponderEvent, g: PanResponderGestureState) => {
    const max = maxTravelRef.current;
    const traveled = Math.max(0, Math.min(g.dx, max));
    const progress = max > 0 ? traveled / max : 0;
    const byDistance = progress >= COMPLETE_THRESHOLD;
    const byFlick = g.vx >= FLICK_VELOCITY && progress >= FLICK_MIN_PROGRESS;
    if (max > 0 && (byDistance || byFlick)) {
      complete();
    } else {
      reset();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isDisabledRef.current,
      onMoveShouldSetPanResponder: (_, g) => !isDisabledRef.current && Math.abs(g.dx) > 3,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        armedRef.current = false;
        HapticFeedback.trigger('impactLight', HAPTIC_OPTIONS);
      },
      onPanResponderMove: (_, g) => {
        const max = maxTravelRef.current;
        const traveled = Math.max(0, Math.min(g.dx, max));
        posAnim.setValue(traveled);
        const overThreshold = max > 0 && traveled / max >= COMPLETE_THRESHOLD;
        if (overThreshold !== armedRef.current) {
          armedRef.current = overThreshold;
          HapticFeedback.trigger(overThreshold ? 'impactMedium' : 'impactLight', HAPTIC_OPTIONS);
        }
      },
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== trackWidth) setTrackWidth(w);
  };

  const onKnobLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== knobWidth) setKnobWidth(w);
  };

  if (isStreamPaused) {
    return (
      <TouchableOpacity
        style={[styles.startBtn, startDisabled && styles.disabled]}
        onPress={onStartLive}
        disabled={startDisabled}
        activeOpacity={0.88}
        accessibilityRole="button"
      >
        <RNText style={styles.startLabel}>
          {hasStartedLive ? t('stream.resumeLiveCta') : t('stream.startLiveCta')}
        </RNText>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.endBtn}
        onPress={onEndLive}
        activeOpacity={0.88}
        accessibilityRole="button"
      >
        <RNText style={styles.label}>{t('stream.endLiveCta')}</RNText>
      </TouchableOpacity>

      <View
        style={[styles.track, isSliderDisabled && styles.disabled]}
        onLayout={onTrackLayout}
      >
        {/* El pulpo espera a la derecha y se desvanece antes de que la perilla
            lo alcance, igual que en el slider de oferta del comprador. */}
        <Animated.View
          style={[
            styles.pulpo,
            maxTravel > 0
              ? {
                  opacity: posAnim.interpolate({
                    inputRange: [0, maxTravel * 0.72, maxTravel * 0.9],
                    outputRange: [1, 1, 0],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      scale: posAnim.interpolate({
                        inputRange: [0, maxTravel],
                        outputRange: [1, 1.35],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }
              : null,
          ]}
          pointerEvents="none"
        >
          <PulpoLogo size={PULPO_W} />
        </Animated.View>

        <Animated.View
          style={[styles.knob, { transform: [{ translateX: posAnim }] }]}
          onLayout={onKnobLayout}
          accessibilityRole="adjustable"
          accessibilityLabel={sliderLabel}
          {...(!isSliderDisabled ? panResponder.panHandlers : {})}
        >
          {knobWidth > 0 ? (
            <Svg
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              width={knobWidth}
              height={BAR_HEIGHT}
            >
              <Defs>
                <LinearGradient id="nextProductGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={STREAM_COLORS.ctaSoft} />
                  <Stop offset="1" stopColor={STREAM_COLORS.ctaSoftGradientEnd} />
                </LinearGradient>
              </Defs>
              <Rect
                width={knobWidth}
                height={BAR_HEIGHT}
                rx={BAR_HEIGHT / 2}
                fill="url(#nextProductGrad)"
              />
            </Svg>
          ) : null}
          <RNText style={styles.label} numberOfLines={1}>
            {sliderLabel}
          </RNText>
          <DoubleArrowIcon width={24} height={24} />
        </Animated.View>
      </View>
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
  startBtn: {
    height: BAR_HEIGHT,
    width: '100%',
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: STREAM_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  startLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
  endBtn: {
    height: BAR_HEIGHT,
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: STREAM_COLORS.ctaSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  track: {
    flex: 1,
    minWidth: 0,
    height: BAR_HEIGHT,
    borderRadius: STREAM_RADIUS.pill,
    justifyContent: 'center',
  },
  pulpo: {
    position: 'absolute',
    right: TRACK_PAD_RIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    left: TRACK_PAD_LEFT,
    height: BAR_HEIGHT,
    maxWidth: '82%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: STREAM_RADIUS.pill,
    overflow: 'hidden',
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
