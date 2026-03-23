import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../atoms/Text';

interface OnboardingScreenProps {
  onPressLogin: () => void;
  onPressRegister: () => void;
}

interface SlideItem {
  id: string;
  title: string;
  description: string;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onPressLogin,
  onPressRegister,
}) => {
  const { t } = useTranslation();
  const slides: SlideItem[] = useMemo(
    () => [
      {
        id: '1',
        title: t('onboarding.slide1Title'),
        description: t('onboarding.slide1Description'),
      },
      {
        id: '2',
        title: t('onboarding.slide2Title'),
        description: t('onboarding.slide2Description'),
      },
      {
        id: '3',
        title: t('onboarding.slide3Title'),
        description: t('onboarding.slide3Description'),
      },
    ],
    [t]
  );
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<SlideItem>>(null);
  const footerHeight = 170 + insets.bottom;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  const renderItem = ({ item }: { item: SlideItem }) => (
    <View style={{ width, paddingHorizontal: 28 }} className="items-center">
      <View className="w-full h-[360px] rounded-[36px] overflow-hidden border border-gray-200 bg-[#E9E9E9] mb-12">
        <View className="h-[60%] bg-[#2F2F2F]" />
        <View className="h-[40%] bg-[#E9E9E9]" />
        <View className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] h-[96%] rounded-[34px] border border-[#D5D5D5]" />
        <View className="absolute top-8 left-8 w-4 h-4 rounded-full bg-[#4D4D4D]" />
      </View>

      <View className="px-2">
        <Text variant="h2" className="text-center text-gray-900 mb-4">
          {item.title}
        </Text>
        <Text className="text-center text-gray-500 leading-7 text-lg">
          {item.description}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-night-950" edges={['top', 'left', 'right']}>
      <View className="flex-1 pt-3">
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          contentContainerStyle={{ paddingBottom: footerHeight }}
        />

        <View className="absolute left-0 right-0 bottom-[178px]">
          <View className="flex-row justify-center">
            {slides.map((slide, index) => (
              <TouchableOpacity
                key={slide.id}
                onPress={() => {
                  listRef.current?.scrollToIndex({ index, animated: true });
                  setActiveIndex(index);
                }}
                className={`h-2 rounded-full mx-1 ${index === activeIndex ? 'w-6 bg-primary-600' : 'w-2 bg-gray-300'}`}
              />
            ))}
          </View>
        </View>
      </View>

      <View
        className="absolute left-0 right-0 px-8 bg-white dark:bg-night-950"
        style={{ bottom: 0, paddingBottom: insets.bottom + 16, paddingTop: 8 }}
      >
        <TouchableOpacity
          onPress={onPressRegister}
          activeOpacity={0.85}
          className="mb-5 h-16 rounded-full bg-primary-600 items-center justify-center"
        >
          <Text className="text-white font-semibold text-2xl">{t('onboarding.start')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPressLogin} className="items-center">
          <Text className="text-primary-600 font-semibold text-2xl">{t('onboarding.login')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
