/**
 * Anuncios efímeros de subasta sobre el vivo (Figma 887-1180 / 881-960).
 *
 * `start`: banner superior "Nueva Subasta ⚡".
 * `interlude`: card en el hueco del panel, entre productos.
 *
 * Se autodescarta. No hay CTA: es un anuncio, no un diálogo.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Text as RNText,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from './streamTokens';

/** Figma 887-1180 / 881-960: título en ámbar `#fbbf24`, no el gold del precio. */
const TITLE_AMBER = '#FBBF24';

export type StreamAuctionBannerVariant = 'start' | 'interlude';

const VISIBLE_MS: Record<StreamAuctionBannerVariant, number> = {
  start: 3500,
  interlude: 4000,
};
const FADE_MS = 220;

export interface StreamAuctionBannerProps {
  variant: StreamAuctionBannerVariant;
  visible: boolean;
  onDismiss: () => void;
  /** Solo `start`: separación desde el borde superior (bajo el safe area). */
  topOffset?: number;
  style?: StyleProp<ViewStyle>;
}

export const StreamAuctionBanner: React.FC<StreamAuctionBannerProps> = ({
  variant,
  visible,
  onDismiss,
  topOffset = 0,
  style,
}) => {
  const { t } = useTranslation();
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismissRef.current();
      });
    }, VISIBLE_MS[variant]);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [visible, variant, anim]);

  if (!visible) return null;

  const isStart = variant === 'start';
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: isStart ? [-16, 0] : [8, 0],
  });

  const title = isStart
    ? t('stream.auctionStartTitle')
    : t('stream.auctionInterludeTitle');
  const subtitle = isStart
    ? t('stream.auctionStartSubtitle')
    : t('stream.auctionInterludeSubtitle');

  const card = (
    <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
      <Pressable
        onPress={onDismiss}
        style={[styles.card, style]}
        accessibilityRole="alert"
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityLiveRegion="polite"
      >
        <RNText style={styles.title} maxFontSizeMultiplier={1.2}>
          {title}
          {isStart ? (
            <RNText style={styles.title}>{' ⚡️'}</RNText>
          ) : (
            <RNText style={styles.eyes}>{' 👀'}</RNText>
          )}
        </RNText>
        <RNText style={styles.subtitle} maxFontSizeMultiplier={1.2}>
          {subtitle}
        </RNText>
      </Pressable>
    </Animated.View>
  );

  if (isStart) {
    return (
      <View style={[styles.startLayer, { top: topOffset }]} pointerEvents="box-none">
        {card}
      </View>
    );
  }

  return card;
};

const styles = StyleSheet.create({
  startLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    // Sobre el overlay del vivo (10) y el toast (60); bajo el festejo (400)
    // y el banner de ganador espectador (100) para no tapar un cierre con ganador.
    zIndex: 80,
    elevation: 80,
  },
  card: {
    backgroundColor: 'rgba(2, 5, 15, 0.4)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    lineHeight: 32,
    letterSpacing: 0.09,
    color: TITLE_AMBER,
    textAlign: 'center',
    includeFontPadding: false,
  },
  eyes: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    lineHeight: 32,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0.07,
    color: STREAM_COLORS.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
