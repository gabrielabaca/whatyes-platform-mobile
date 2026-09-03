import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  type PanResponderGestureState,
  Text as RNText,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Path,
  G,
  Mask,
} from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import HapticFeedback from 'react-native-haptic-feedback';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { PulpoLogo } from '../../atoms/stream/PulpoLogo';
import { STREAM_COLORS, STREAM_RADIUS } from './streamTokens';
import { FONT_FAMILY } from '../../../theme/typography';
import DiscoverTuneIcon from '../../../../assets/icons/stream/discoverTune.svg';

/**
 * Slide-to-bid clásico: la perilla arranca en el extremo izquierdo y recorre
 * TODO el track; el relleno degradado la sigue y el texto se desvanece con el
 * arrastre. El pulpo espera a la derecha y crece al acercarse la perilla.
 *
 * La oferta sale en el mismo instante en que se confirma y la perilla vuelve a
 * su lugar sin animación de celebración: el festejo son los pulpitos flotantes
 * (FloatingBids), que llegan por WS y ven todos — vendedor incluido. Así el
 * comprador puede volver a ofertar sin esperar a que termine ninguna animación.
 */
const TRACK_HEIGHT = 52;
const TRACK_PAD = 4;
const KNOB_W = 64;
const BTN_H = TRACK_HEIGHT - TRACK_PAD * 2; // 44
/** Fracción del recorrido que confirma la oferta al soltar. */
const COMPLETE_THRESHOLD = 0.7;
/** Un flick rápido (px/ms) confirma aunque no llegue al umbral de distancia. */
const FLICK_VELOCITY = 0.8;
const FLICK_MIN_PROGRESS = 0.3;

const HAPTIC_OPTIONS = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

/** Doble flecha (double_arrow) del Figma */
const DoubleArrow: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Mask id="dam" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
      <Rect width="24" height="24" fill="#D9D9D9" />
    </Mask>
    <G mask="url(#dam)">
      <Path
        d="M6.05 19L11.05 12L6.05 5H8.5L13.5 12L8.5 19H6.05ZM12 19L17 12L12 5H14.45L19.45 12L14.45 19H12Z"
        fill="#1C1B1F"
      />
    </G>
  </Svg>
);

export interface StreamBidBarProps {
  bidAmount: number;
  /** Moneda del producto en oferta (ISO 4217). Sin dato cae a la moneda por defecto. */
  currency?: string | null;
  onBid: () => void;
  disabled?: boolean;
  /**
   * Si es false la barra queda inerte (sin oferta / pausa / oferta ya cerrada).
   * El overlay del comprador la monta con false + `mode="idle"` mientras espera
   * la próxima venta, para que el hueco no salte.
   */
  isAuctionActive?: boolean;
  /**
   * `bid` (default): "Ofertar $X" y el monto es la puja sugerida.
   * `buy_now`: "Comprar ahora $X" y el monto es el precio fijo del producto.
   * El gesto y la animación son los mismos en ambos modos.
   * `idle`: no hay oferta en curso — la barra se muestra igual, inerte y con
   * "Esperando subasta..." (no se oculta, para que el comprador sepa dónde va
   * a aparecer la acción). Ignora `bidAmount` y `onBid`.
   */
  mode?: 'bid' | 'buy_now' | 'idle';
  /**
   * Figma 698:8442 — sliders a la izquierda de la barra: abre el drawer del
   * multiplicador. El overlay del comprador lo pasa en TODOS los modos (idle
   * y buy_now incluidos): la preferencia 1×/2×/3× es de la sala y aplica a la
   * próxima subasta, así que ajustarla mientras no se puede pujar es válido.
   * Montarlo siempre además mantiene estable el ancho del track (flex:1),
   * que antes saltaba en cada arranque de subasta. Si falta, el botón no se
   * monta (overlay del vendedor, que no puja).
   */
  onTunePress?: () => void;
  tuneAccessibilityLabel?: string;
}

export const StreamBidBar: React.FC<StreamBidBarProps> = ({
  bidAmount,
  onBid,
  disabled,
  isAuctionActive = true,
  mode = 'bid',
  onTunePress,
  tuneAccessibilityLabel,
  currency,
}) => {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  /** Posición X de la perilla dentro del track (0 → maxTravel). */
  const posAnim = useRef(new Animated.Value(0)).current;

  const isIdle = mode === 'idle';
  const isDisabledRef = useRef(isIdle || !!disabled || !isAuctionActive);
  const maxTravelRef = useRef(0);
  const onBidRef = useRef(onBid);
  /** true mientras el drag está por encima del umbral (para el tick háptico). */
  const armedRef = useRef(false);
  /** Una sola confirmación por gesto (se limpia en el siguiente `grant`). */
  const completingRef = useRef(false);

  const isDisabled = isIdle || !!disabled || !isAuctionActive;

  useEffect(() => {
    isDisabledRef.current = isIdle || !!disabled || !isAuctionActive;
  }, [isIdle, disabled, isAuctionActive]);
  useEffect(() => { onBidRef.current = onBid; }, [onBid]);

  const maxTravel = trackWidth > 0 ? trackWidth - TRACK_PAD * 2 - KNOB_W : 0;
  const fullFillWidth = trackWidth > 0 ? trackWidth - TRACK_PAD * 2 : 0;

  useEffect(() => {
    if (trackWidth > 0) {
      maxTravelRef.current = Math.max(0, trackWidth - TRACK_PAD * 2 - KNOB_W);
      posAnim.setValue(0);
    }
  }, [trackWidth, posAnim]);

  const reset = () => {
    armedRef.current = false;
    Animated.spring(posAnim, {
      toValue: 0,
      bounciness: 8,
      useNativeDriver: false,
    }).start();
  };

  /**
   * Confirma la oferta al instante: primero se emite (el feedback visible es el
   * pulpito flotante que devuelve el WS a todos) y la perilla vuelve enseguida,
   * sin encadenar animaciones. La barra queda lista para el siguiente deslizar.
   */
  const completeBid = () => {
    if (completingRef.current) return;
    completingRef.current = true;
    armedRef.current = false;
    HapticFeedback.trigger('notificationSuccess', HAPTIC_OPTIONS);
    onBidRef.current();
    reset();
  };

  /** Decide confirmar o volver, tanto en release como si otro gesto interrumpe. */
  const settle = (_: GestureResponderEvent, g: PanResponderGestureState) => {
    posAnim.flattenOffset();
    const max = maxTravelRef.current;
    const traveled = Math.max(0, Math.min(g.dx, max));
    const progress = max > 0 ? traveled / max : 0;
    const byDistance = progress >= COMPLETE_THRESHOLD;
    const byFlick = g.vx >= FLICK_VELOCITY && progress >= FLICK_MIN_PROGRESS;
    if (max > 0 && (byDistance || byFlick)) {
      completeBid();
    } else {
      reset();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isDisabledRef.current,
      onMoveShouldSetPanResponder: (_, g) => !isDisabledRef.current && Math.abs(g.dx) > 3,
      // El swipe vertical del feed no debe robarnos el gesto a mitad de camino:
      // era la causa de que un deslizamiento rápido "perdiera" la oferta.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        // Nuevo gesto = nueva oferta posible, aunque la anterior recién salga.
        // Si el usuario agarra la perilla mientras vuelve, se arranca de cero:
        // cada oferta exige el recorrido completo (evita dobles sin querer).
        completingRef.current = false;
        armedRef.current = false;
        posAnim.stopAnimation();
        posAnim.setOffset(0);
        posAnim.setValue(0);
        HapticFeedback.trigger('impactLight', HAPTIC_OPTIONS);
      },
      onPanResponderMove: (_, g) => {
        const max = maxTravelRef.current;
        const traveled = Math.max(0, Math.min(g.dx, max));
        posAnim.setValue(traveled);
        // Tick háptico al cruzar el umbral (en ambos sentidos): el usuario
        // "siente" el punto en el que soltar confirma la oferta.
        const overThreshold = max > 0 && traveled / max >= COMPLETE_THRESHOLD;
        if (overThreshold !== armedRef.current) {
          armedRef.current = overThreshold;
          HapticFeedback.trigger(overThreshold ? 'impactMedium' : 'impactLight', HAPTIC_OPTIONS);
        }
      },
      onPanResponderRelease: settle,
      // Si igualmente nos interrumpen (gesto nativo iOS), aplicar la misma
      // decisión que en release en lugar de descartar el progreso.
      onPanResponderTerminate: settle,
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTrackWidth(w);
  };

  const hasLayout = trackWidth > 0 && maxTravel > 0;

  return (
    <View style={styles.bar}>
      {/* Fuera del track a propósito: no hereda styles.dimmed. Con la barra
          apagada (idle / pausa) elegir el incremento sigue siendo una acción
          válida — configura la próxima puja — así que el botón queda a
          contraste pleno y operativo. */}
      {onTunePress ? (
        <TouchableOpacity
          style={styles.tuneBtn}
          onPress={onTunePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={tuneAccessibilityLabel}
        >
          <DiscoverTuneIcon width={24} height={24} />
        </TouchableOpacity>
      ) : null}
      {/* Track */}
      <View style={[styles.track, isDisabled && styles.dimmed]} onLayout={onTrackLayout}>
        {hasLayout && (
          <>
            {/* Relleno degradado que sigue a la perilla (debajo de todo) */}
            <Animated.View
              style={[
                styles.fill,
                { width: Animated.add(posAnim, KNOB_W + TRACK_PAD) },
              ]}
              pointerEvents="none"
            >
              <Svg width={fullFillWidth} height={BTN_H}>
                <Defs>
                  <SvgLinearGradient id="bidGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#685CF0" stopOpacity="1" />
                    <Stop offset="1" stopColor="#FFC900" stopOpacity="1" />
                  </SvgLinearGradient>
                </Defs>
                <Rect
                  x={0} y={0}
                  width={fullFillWidth} height={BTN_H}
                  rx={BTN_H / 2} ry={BTN_H / 2}
                  fill="url(#bidGrad)"
                />
              </Svg>
            </Animated.View>

            {/* Texto centrado: se desvanece a medida que avanza la perilla */}
            <Animated.View
              style={[
                styles.labelWrap,
                {
                  opacity: posAnim.interpolate({
                    inputRange: [0, maxTravel * 0.5],
                    outputRange: [1, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
              pointerEvents="none"
            >
              <RNText style={styles.label} numberOfLines={1}>
                {isIdle ? (
                  t('stream.waitingAuction')
                ) : (
                  <>
                    {mode === 'buy_now' ? t('stream.buyNow') : t('stream.bid')}{' '}
                    <RNText style={styles.labelPrice}>{formatStreamPrice(bidAmount, currency)}</RNText>
                  </>
                )}
              </RNText>
            </Animated.View>

            {/* Pulpo que espera a la derecha: crece al acercarse la perilla y se
                desvanece justo antes de que lo alcance (evita la superposición). */}
            <View style={styles.logoWrap} pointerEvents="none">
              <Animated.View
                style={{
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
                }}
              >
                <PulpoLogo size={24} />
              </Animated.View>
            </View>

            {/* Perilla: arranca a la izquierda y recorre todo el track. Al final,
                la flecha se desvanece y el pulpo aparece centrado en la perilla
                ("capturado"); al soltar sale la oferta y la perilla vuelve. */}
            <Animated.View
              style={[styles.knob, { transform: [{ translateX: posAnim }] }]}
              {...(!isDisabled ? panResponder.panHandlers : {})}
            >
              <Animated.View
                style={[
                  styles.knobIcon,
                  {
                    opacity: posAnim.interpolate({
                      inputRange: [maxTravel * 0.72, maxTravel * 0.95],
                      outputRange: [1, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              >
                <DoubleArrow size={24} />
              </Animated.View>
              <Animated.View
                style={[
                  styles.knobIcon,
                  {
                    opacity: posAnim.interpolate({
                      inputRange: [maxTravel * 0.8, maxTravel],
                      outputRange: [0, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              >
                <PulpoLogo size={26} />
              </Animated.View>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: TRACK_HEIGHT,
    width: '100%',
  },
  /** Figma 698:8442: círculo #515154, icono 24, padding 12. Alto = TRACK_HEIGHT para alinear. */
  tuneBtn: {
    width: TRACK_HEIGHT,
    height: TRACK_HEIGHT,
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: STREAM_COLORS.controlBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.45,
  },
  track: {
    flex: 1,
    height: TRACK_HEIGHT,
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: 'rgba(30,28,50,0.80)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TRACK_PAD,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: TRACK_PAD,
    height: BTN_H,
    overflow: 'hidden',
    borderTopRightRadius: BTN_H / 2,
    borderBottomRightRadius: BTN_H / 2,
    zIndex: 1,
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  knob: {
    width: KNOB_W,
    height: BTN_H,
    borderRadius: BTN_H / 2,
    backgroundColor: '#FFC900',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  knobIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    position: 'absolute',
    right: 10,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  label: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFFFFF',
    includeFontPadding: false,
    flexShrink: 1,
  },
  labelPrice: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#FFC900',
  },
});
