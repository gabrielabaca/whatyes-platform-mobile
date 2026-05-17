import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
  type LayoutChangeEvent,
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
import { SlidersHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamIconButton } from '../../atoms/stream/StreamIconButton';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { STREAM_COLORS, STREAM_RADIUS } from './streamTokens';
import { FONT_FAMILY } from '../../../theme/typography';

const TRACK_HEIGHT = 52;
const TRACK_PAD = 4;
const LOGO_AREA = 46;
const BTN_RATIO = 0.75;
const BTN_H = TRACK_HEIGHT - TRACK_PAD * 2; // 44

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

/** Octopus/pulpo del Figma */
const PulpoIcon: React.FC<{ size?: number }> = ({ size = 25 }) => (
  <Svg width={size} height={(size * 23) / 25} viewBox="0 0 25.2238 23.0002" fill="none">
    <Path
      d="M12.0911 0.0180832C12.4735 -0.0263484 13.1643 0.0194903 13.5426 0.065329C15.0052 0.239178 16.3769 0.866162 17.4655 1.85842C20.6198 4.72037 19.9529 8.35673 19.9919 12.1261C19.9954 12.4646 20.1344 12.8546 20.3472 13.1214C20.5798 13.4126 20.9181 13.6 21.2884 13.6427C21.9685 13.7165 22.6602 13.2402 22.8037 12.5736C22.8859 12.1917 22.8674 11.8654 22.8675 11.4778C22.8798 10.6654 22.8232 9.84936 22.8611 9.03781C22.9285 7.59257 24.9497 7.46988 25.1814 8.8991C25.2676 9.43078 25.1929 10.0407 25.2094 10.5824C25.2599 12.2299 25.2151 14.0342 23.7871 15.1416C22.9872 15.7576 21.9749 16.0295 20.974 15.8974C19.3758 15.6909 18.181 14.6138 17.833 13.0344C17.7054 12.4556 17.7218 11.7984 17.719 11.2017L17.7159 8.99369C17.7151 8.21139 17.7316 7.48335 17.5962 6.70682C17.4403 5.8007 17.065 4.94653 16.503 4.21883C15.7011 3.20006 14.5276 2.54121 13.2403 2.38694L13.2228 2.38462C10.6202 2.05315 8.41293 3.67514 7.7246 6.16457C7.49134 7.00814 7.53584 7.78093 7.52905 8.64339L7.51992 10.7454C7.52146 12.146 7.56013 13.5383 6.58814 14.6805C5.32745 16.1618 2.80995 16.3655 1.33751 15.091C0.52752 14.3899 0.0827345 13.4342 0.0278281 12.3664C-0.0106001 11.6679 0.011006 10.9759 0.00390823 10.2772C0.0238884 9.80305 -0.0359896 9.23595 0.0392096 8.775C0.198363 7.9115 1.28855 7.58488 1.92654 8.17612C2.32158 8.54221 2.30572 8.96623 2.30425 9.45958C2.30153 10.3543 2.27621 11.2485 2.29347 12.1439C2.31101 13.0524 2.97457 13.6967 3.88997 13.6429C4.437 13.6103 5.01605 13.1345 5.15313 12.6001C5.29584 12.02 5.20482 11.3244 5.22927 10.725C5.24118 7.76542 4.93379 5.17785 6.9445 2.69086C8.25922 1.06471 10.0098 0.197217 12.0911 0.0180832Z"
      fill={STREAM_COLORS.primary}
    />
    <Path
      d="M15.8485 14.2359C17.1286 14.1068 17.1011 15.1087 17.3991 15.9741C17.8317 17.1503 19.0072 17.8262 20.2295 17.8264C20.7381 17.8264 21.4954 17.7296 21.9349 17.935C22.21 18.0652 22.42 18.3019 22.5165 18.5906C22.6147 18.8768 22.5925 19.1907 22.4552 19.4604C22.272 19.8125 21.9539 19.9792 21.5936 20.0953C21.3207 20.1679 20.91 20.1693 20.6273 20.174C19.5731 20.1913 18.5959 20.0727 17.6451 19.5865C16.4269 18.9637 15.4514 17.7566 15.0473 16.4568C14.9018 15.9889 14.7298 15.3137 14.9874 14.8702C15.2138 14.4805 15.447 14.3581 15.8485 14.2359Z"
      fill={STREAM_COLORS.primary}
    />
    <Path
      d="M9.11072 14.27C9.82904 14.1649 10.5522 14.8819 10.4004 15.6146C9.70594 18.9658 7.19851 20.5353 3.85825 20.1287C3.58128 20.0743 3.34064 20.0314 3.09682 19.8684C2.58352 19.5252 2.40742 18.8276 2.78583 18.3169C3.28098 17.6484 3.82995 17.8801 4.50578 17.9326C4.82255 17.9575 5.14127 17.9414 5.45395 17.8848C6.55089 17.6876 7.41894 16.937 7.81383 15.8992C8.124 15.0842 8.12285 14.4312 9.11072 14.27Z"
      fill={STREAM_COLORS.primary}
    />
    <Path
      d="M12.4475 14.2652C13.8799 14.1265 13.7786 15.3266 13.7712 16.2975C13.7598 17.814 13.8026 19.3502 13.044 20.7305C12.5751 21.5839 11.6676 22.7001 10.7135 22.9943C10.4303 23.0155 10.2101 22.9802 9.95722 22.8398C9.67487 22.6846 9.46713 22.422 9.38108 22.1115C9.1183 21.1393 10.0288 20.8133 10.5524 20.2604C10.8239 19.9737 11.0336 19.5547 11.1666 19.1851C11.3202 18.7678 11.4139 18.3308 11.4448 17.8872C11.4996 17.1732 11.3442 15.3483 11.6475 14.8316C11.8267 14.5262 12.1124 14.3538 12.4475 14.2652Z"
      fill={STREAM_COLORS.primary}
    />
    <Path
      d="M9.47619 10.4533C9.8767 10.3712 10.2904 10.5108 10.5594 10.8187C10.8284 11.1266 10.911 11.5554 10.7758 11.9412C10.6406 12.3271 10.3084 12.6105 9.90609 12.6832C9.29402 12.7938 8.70684 12.3914 8.58912 11.7807C8.47136 11.1699 8.86687 10.5781 9.47619 10.4533Z"
      fill={STREAM_COLORS.primary}
    />
    <Path
      d="M15.2497 10.4459C15.6484 10.3607 16.0621 10.4967 16.3324 10.8019C16.6027 11.1072 16.6876 11.5343 16.5547 11.9197C16.4219 12.3051 16.0917 12.5892 15.6908 12.663C15.083 12.7749 14.498 12.378 14.3774 11.7718C14.2568 11.1657 14.6454 10.5751 15.2497 10.4459Z"
      fill={STREAM_COLORS.primary}
    />
  </Svg>
);

export interface StreamBidBarProps {
  bidAmount: number;
  onBid: () => void;
  disabled?: boolean;
  isAuctionActive?: boolean;
}

export const StreamBidBar: React.FC<StreamBidBarProps> = ({
  bidAmount,
  onBid,
  disabled,
  isAuctionActive = true,
}) => {
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  // widthAnim representa el ANCHO del botón (no posición) — crece hacia la derecha
  const widthAnim = useRef(new Animated.Value(0)).current;

  const isDisabledRef = useRef(!!disabled || !isAuctionActive);
  const maxGrowthRef = useRef(0);
  const initWidthRef = useRef(0);
  const onBidRef = useRef(onBid);

  const isDisabled = !!disabled || !isAuctionActive;

  useEffect(() => { isDisabledRef.current = !!disabled || !isAuctionActive; }, [disabled, isAuctionActive]);
  useEffect(() => { onBidRef.current = onBid; }, [onBid]);

  const initBtnWidth = trackWidth > 0 ? Math.floor(trackWidth * BTN_RATIO) : 0;
  const fullBtnWidth = trackWidth > 0 ? trackWidth - TRACK_PAD * 2 : 0;

  useEffect(() => {
    if (trackWidth > 0) {
      const init = Math.floor(trackWidth * BTN_RATIO);
      const full = trackWidth - TRACK_PAD * 2;
      initWidthRef.current = init;
      maxGrowthRef.current = Math.max(0, full - init);
      widthAnim.setValue(init);
    }
  }, [trackWidth, widthAnim]);

  const reset = () => {
    Animated.spring(widthAnim, {
      toValue: initWidthRef.current,
      bounciness: 8,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isDisabledRef.current,
      onMoveShouldSetPanResponder: (_, g) => !isDisabledRef.current && Math.abs(g.dx) > 3,
      onPanResponderGrant: () => {
        widthAnim.extractOffset();
      },
      onPanResponderMove: (_, g) => {
        const max = maxGrowthRef.current;
        widthAnim.setValue(Math.max(0, Math.min(g.dx, max)));
      },
      onPanResponderRelease: (_, g) => {
        widthAnim.flattenOffset();
        const max = maxGrowthRef.current;
        const grown = Math.max(0, Math.min(g.dx, max));
        if (max > 0 && grown / max >= 0.85) {
          Animated.timing(widthAnim, {
            toValue: initWidthRef.current + max,
            duration: 100,
            useNativeDriver: false,
          }).start(() => {
            onBidRef.current();
            setTimeout(() => {
              Animated.spring(widthAnim, {
                toValue: initWidthRef.current,
                bounciness: 8,
                useNativeDriver: false,
              }).start();
            }, 350);
          });
        } else {
          reset();
        }
      },
      onPanResponderTerminate: () => {
        widthAnim.flattenOffset();
        reset();
      },
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTrackWidth(w);
  };

  const handleFilter = () => Alert.alert(t('common.appName'), t('stream.comingSoon'));

  return (
    <View style={styles.bar}>
      {/* Botón de filtros */}
      <View style={[styles.filterBtn, isDisabled && styles.dimmed]}>
        <StreamIconButton onPress={handleFilter} accessibilityLabel={t('stream.filters')}>
          <SlidersHorizontal size={24} color={STREAM_COLORS.white} />
        </StreamIconButton>
      </View>

      {/* Track */}
      <View
        style={[styles.track, isDisabled && styles.dimmed]}
        onLayout={onTrackLayout}
      >
        {/* Pulpo fijo a la derecha */}
        <View style={styles.logoWrap} pointerEvents="none">
          <PulpoIcon size={24} />
        </View>

        {/* Botón que crece hacia la derecha */}
        {initBtnWidth > 0 && (
          <Animated.View
            style={[styles.btn, { width: widthAnim }]}
            {...(!isDisabled ? panResponder.panHandlers : {})}
          >
            {/* Fondo degradado — ocupa siempre el ancho máximo para que el degradado sea consistente */}
            <Svg width={fullBtnWidth || initBtnWidth} height={BTN_H} style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient id="bidGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#685CF0" stopOpacity="1" />
                  <Stop offset="1" stopColor="#FFC900" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Rect
                x={0} y={0}
                width={fullBtnWidth || initBtnWidth} height={BTN_H}
                rx={BTN_H / 2} ry={BTN_H / 2}
                fill="url(#bidGrad)"
              />
            </Svg>

            {/* Texto fijo a la izquierda del botón */}
            <View style={[styles.btnContent, { width: initBtnWidth - TRACK_PAD * 2 }]}>
              <RNText style={styles.label} numberOfLines={1}>
                {t('stream.bid')}{' '}
                <RNText style={styles.labelPrice}>{formatStreamPrice(bidAmount)}</RNText>
              </RNText>
            </View>

            {/* Flecha siempre en el borde derecho del botón (crece con él) */}
            <View style={styles.arrowWrap} pointerEvents="none">
              <DoubleArrow size={24} />
            </View>
          </Animated.View>
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
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: STREAM_RADIUS.pill,
    backgroundColor: STREAM_COLORS.filterButton,
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
  logoWrap: {
    position: 'absolute',
    right: 10,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    height: BTN_H,
    borderRadius: BTN_H / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  arrowWrap: {
    position: 'absolute',
    right: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#18181b',
    includeFontPadding: false,
    flexShrink: 1,
  },
  labelPrice: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: '#18181b',
  },
});
