/**
 * Celebración al seguir a un vendedor — Figma 536-21071 (confeti + aviso de notificaciones).
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  Text as RNText,
  Platform,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { IconBell } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#685CF0';
const CONFETTI_COLORS = ['#685CF0', '#FB2C36', '#FDC700', '#22C55E', '#FFFFFF', '#CBCEFF'];

export interface FollowSuccessCelebrationProps {
  visible: boolean;
  sellerName: string;
  onDismiss?: () => void;
  /** Duración visible antes de auto-ocultar (ms). */
  durationMs?: number;
}

export const FollowSuccessCelebration: React.FC<FollowSuccessCelebrationProps> = ({
  visible,
  sellerName,
  onDismiss,
  durationMs = 3600,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    if (!visible) {
      toastOpacity.setValue(0);
      toastTranslateY.setValue(-16);
      return;
    }

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(toastTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
    ]).start();

    const hideTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -12,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss?.();
      });
    }, durationMs);

    return () => clearTimeout(hideTimer);
  }, [visible, durationMs, onDismiss, toastOpacity, toastTranslateY]);

  if (!visible) return null;

  const displayName = sellerName.trim() || t('home.defaultRoomName');

  return (
    <View style={styles.host} pointerEvents="none">
      <ConfettiCannon
        count={90}
        origin={{ x: SCREEN_WIDTH * 0.2, y: -24 }}
        explosionSpeed={420}
        fallSpeed={3200}
        fadeOut
        autoStart
        colors={CONFETTI_COLORS}
      />
      <ConfettiCannon
        count={90}
        origin={{ x: SCREEN_WIDTH * 0.8, y: -24 }}
        explosionSpeed={420}
        fallSpeed={3200}
        fadeOut
        autoStart
        colors={CONFETTI_COLORS}
      />
      <Animated.View
        style={[
          styles.toastWrap,
          {
            top: insets.top + (Platform.OS === 'android' ? 12 : 8),
            opacity: toastOpacity,
            transform: [{ translateY: toastTranslateY }],
          },
        ]}
      >
        <View style={styles.toast}>
          <View style={styles.bellCircle}>
            <IconBell size={22} color={PRIMARY} strokeWidth={2} />
          </View>
          <View style={styles.toastTextCol}>
            <RNText style={styles.toastTitle}>{t('profile.followSuccessTitle')}</RNText>
            <RNText style={styles.toastBody} numberOfLines={2}>
              {t('profile.followSuccessBody', { name: displayName })}
            </RNText>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 250,
    elevation: 250,
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBCEFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  bellCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toastTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  toastTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 18,
    color: '#18181B',
    includeFontPadding: false,
  },
  toastBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 17,
    color: '#535353',
    includeFontPadding: false,
  },
});
