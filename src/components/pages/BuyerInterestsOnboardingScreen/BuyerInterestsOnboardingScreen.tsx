/**
 * Onboarding comprador: categorías de interés (mismo grid que Explorar).
 */

import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { InterestCategoryGrid } from '../../organisms/home/InterestCategoryGrid';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';

const H_PADDING = 16;

interface BuyerInterestsOnboardingScreenProps {
  onBack?: () => void;
  onSkip: () => void | Promise<void>;
  onContinue: (categoryUuids: string[]) => Promise<void>;
}

export const BuyerInterestsOnboardingScreen: React.FC<BuyerInterestsOnboardingScreenProps> = ({
  onBack,
  onSkip,
  onContinue,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const { categories: items, loadOnce, isLoading, isLoaded, loadError } = useInterestCategories();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadOnce();
  }, [loadOnce]);

  const loading = isLoading && !isLoaded;

  const toggle = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const handleContinue = async () => {
    setBusy(true);
    try {
      await onContinue(Array.from(selected));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-4 pt-4 pb-8">
          <View className="flex-row items-center justify-between mb-8">
            {onBack ? (
              <TouchableOpacity
                onPress={onBack}
                className="w-8 h-8 items-start justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={22} color={c.text} />
              </TouchableOpacity>
            ) : (
              <View className="w-8 h-8" />
            )}
            <Text className="text-[20px] font-bold text-[#02050F] dark:text-white">
              {t('buyerOnboarding.interestsTitle')}
            </Text>
            <View className="w-8 h-8" />
          </View>

          <Text className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px] mb-6">
            {t('buyerOnboarding.interestsSubtitle')}
          </Text>

          {loading && (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#685CF0" />
            </View>
          )}

          {loadError && !loading && (
            <Text className="text-center text-red-500 mb-4">{loadError}</Text>
          )}

          {!loading && !loadError && items.length > 0 && (
            <InterestCategoryGrid
              items={items}
              selectedUuids={selected}
              onPressItem={(cat) => toggle(cat.uuid)}
              disabled={busy}
              horizontalPadding={H_PADDING}
            />
          )}

          {!loading && !loadError && items.length === 0 && (
            <Text className="text-center text-[#71717a] dark:text-night-muted mb-8">
              {t('explore.catalogEmpty')}
            </Text>
          )}

          <Button
            title={t('common.continue')}
            variant="primary"
            size="large"
            loading={busy}
            disabled={busy || loading}
            onPress={handleContinue}
            className="w-full min-h-[52px] rounded-full mt-8"
          />

          <Button
            title={t('buyerOnboarding.skip')}
            variant="ghost"
            size="medium"
            disabled={busy}
            onPress={() => void onSkip()}
            titleClassName="text-[14px] font-normal text-[#4C4E55] dark:text-night-muted"
            className="mt-5 self-center min-h-[44px]"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
