import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '../../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PRIMARY = '#685CF0';
const CONFETTI_COLORS = ['#685CF0', '#FB2C36', '#FDC700', '#22C55E', '#FF7A1A', '#CBCEFF'];

export interface AddProductSuccessCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
  durationMs?: number;
}

export const AddProductSuccessCelebration: React.FC<AddProductSuccessCelebrationProps> = ({
  visible,
  onDismiss,
  durationMs = 2800,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(-16);
      return undefined;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -12,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, durationMs);

    return () => clearTimeout(timer);
  }, [visible, durationMs, onDismiss, opacity, translateY]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.host} pointerEvents="none">
        <ConfettiCannon
          count={110}
          origin={{ x: SCREEN_WIDTH * 0.2, y: -24 }}
          explosionSpeed={420}
          fallSpeed={3200}
          fadeOut
          autoStart
          colors={CONFETTI_COLORS}
        />
        <ConfettiCannon
          count={110}
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
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.toast}>
            <View style={styles.iconWrap}>
              <CheckCircle2 size={24} color={PRIMARY} strokeWidth={2.4} />
            </View>
            <View style={styles.textCol}>
              <RNText style={styles.title}>{t('addProduct.saveSuccess')}</RNText>
              <RNText style={styles.body}>{t('addProduct.saveSuccessBody')}</RNText>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 300,
    elevation: 300,
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBCEFF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E7E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 18,
    color: '#18181B',
  },
  body: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 17,
    color: '#535353',
  },
});
