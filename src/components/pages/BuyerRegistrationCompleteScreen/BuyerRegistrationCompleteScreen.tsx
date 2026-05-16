/**
 * Paso final del registro comprador.
 * Fondo con gradientes vectoriales locales + CTA "Ver Subastas".
 */

import React, { useState } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { FONT_FAMILY } from '../../../theme/typography';

interface BuyerRegistrationCompleteScreenProps {
  onViewAuctions: () => void | Promise<void>;
}

export const BuyerRegistrationCompleteScreen: React.FC<BuyerRegistrationCompleteScreenProps> = ({
  onViewAuctions,
}) => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const gradBaseId = 'buyerRegCompleteBase';
  const gradOverlayId = 'buyerRegCompleteOverlay';

  const handleCta = async () => {
    setBusy(true);
    try {
      await onViewAuctions();
    } finally {
      setBusy(false);
    }
  };

  const bottomSection = (
    <SafeAreaView className="flex-1 justify-end" edges={['bottom']}>
      <View className="px-6 pb-8 pt-4">
        <View className="items-center gap-4 mb-6">
          <Text
            style={{ fontFamily: FONT_FAMILY.bold }}
            className="text-center text-[#02050F] dark:text-white text-[24px] leading-8 tracking-[0.12px] w-full max-w-[327px]"
          >
            {t('buyerOnboarding.completeTitle')}
          </Text>
          <Text
            style={{ fontFamily: FONT_FAMILY.regular }}
            className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px] tracking-[0.07px] max-w-[275px]"
          >
            {t('buyerOnboarding.completeSubtitle')}
          </Text>
        </View>

        <Button
          title={t('buyerOnboarding.viewAuctions')}
          variant="primary"
          size="large"
          loading={busy}
          disabled={busy}
          onPress={handleCta}
          titleClassName="tracking-[0.08px]"
          className="w-full min-h-[52px] rounded-full"
        />
      </View>
    </SafeAreaView>
  );

  return (
    <View className="flex-1 bg-[#FEFEFE] dark:bg-night-950">
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id={gradBaseId} x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset="0" stopColor="#DDD6FE" />
              <Stop offset="0.55" stopColor="#E7E7FF" />
              <Stop offset="1" stopColor="#EDE9FE" />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height} fill={`url(#${gradBaseId})`} />
        </Svg>
        <Svg width={width} height={height} style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Defs>
            <LinearGradient id={gradOverlayId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.185" stopColor="#FFFFFF" stopOpacity={0.3} />
              <Stop offset="0.36" stopColor="#FFFFFF" stopOpacity={0.8} />
              <Stop offset="0.67" stopColor="#FFFFFF" stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height} fill={`url(#${gradOverlayId})`} />
        </Svg>
      </View>
      {bottomSection}
    </View>
  );
};
