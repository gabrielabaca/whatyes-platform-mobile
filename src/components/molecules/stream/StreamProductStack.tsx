import React from 'react';
import { View, Image, Text as RNText, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS, STREAM_RADIUS } from './streamTokens';

export interface StreamProductStackProps {
  imageUrls?: string[];
  extraCount?: number;
  /** Si viene definido, reemplaza el aviso "próximamente" al tocar el stack. */
  onPress?: () => void;
}

export const StreamProductStack: React.FC<StreamProductStackProps> = ({
  imageUrls = [],
  extraCount = 0,
  onPress,
}) => {
  const { t } = useTranslation();
  const urls = imageUrls.filter(Boolean).slice(0, 3);
  const overflow = extraCount > 0 ? extraCount : Math.max(0, imageUrls.length - 3);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    Alert.alert(t('common.appName'), t('stream.comingSoon'));
  };

  if (urls.length === 0) {
    return null;
  }

  const layers = urls.length >= 3 ? urls : urls.length === 2 ? [urls[1], urls[0]] : [urls[0]];

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.stackHost}>
      {layers.map((uri, index) => {
        const isFront = index === layers.length - 1;
        const offsetStyle =
          index === 0
            ? styles.layerBack
            : index === 1 && layers.length === 3
              ? styles.layerMid
              : styles.layerFront;
        return (
          <View key={`${uri}-${index}`} style={[styles.card, offsetStyle, isFront && styles.cardFront]}>
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            {isFront && overflow > 0 ? (
              <View style={styles.badge}>
                <RNText style={styles.badgeText}>+{overflow}</RNText>
              </View>
            ) : null}
          </View>
        );
      })}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  stackHost: {
    width: 52,
    height: 52,
    position: 'relative',
  },
  card: {
    position: 'absolute',
    borderWidth: 1.4,
    borderColor: STREAM_COLORS.white,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  layerBack: {
    width: 38,
    height: 36,
    left: 4,
    top: 13,
  },
  layerMid: {
    width: 41,
    height: 38,
    left: 2,
    top: 8,
  },
  layerFront: {
    width: 46,
    height: 44,
    left: 0,
    top: 0,
  },
  cardFront: {
    zIndex: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    lineHeight: 16,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
});
