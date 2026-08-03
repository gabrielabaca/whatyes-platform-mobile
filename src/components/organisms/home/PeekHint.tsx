/**
 * Hint de gesto para la primera card de vivos: un "dedo" que pulsa con halo,
 * indicando que se puede mantener presionada la card para espiar el vivo
 * (peek con video real vía el slot de preview de IVS).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Pointer } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../../atoms/Text';
import { FONT_FAMILY } from '../../../theme/typography';

export const PeekHint: React.FC = () => {
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(500),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // El halo se expande y desvanece; el "dedo" hace una pequeña presión.
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.55, 0],
  });
  const pointerScale = pulse.interpolate({
    inputRange: [0, 0.25, 0.55, 1],
    outputRange: [1, 0.85, 1, 1],
  });

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.pill}>
        <View style={styles.gestureBox}>
          <Animated.View
            style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]}
          />
          <Animated.View style={{ transform: [{ scale: pointerScale }] }}>
            <Pointer size={15} color="#fff" strokeWidth={2.4} />
          </Animated.View>
        </View>
        <Text style={[styles.label, { fontFamily: FONT_FAMILY.semibold }]}>
          {t('home.peekHint')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    maxWidth: '96%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  gestureBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },
  label: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
    textAlign: 'center',
  },
});
