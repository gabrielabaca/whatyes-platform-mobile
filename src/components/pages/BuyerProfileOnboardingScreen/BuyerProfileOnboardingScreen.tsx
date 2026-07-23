/**
 * Onboarding comprador: nombre y foto de perfil (opcional).
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, UserRound } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { FONT_FAMILY } from '../../../theme/typography';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';

export interface BuyerProfilePayload {
  name?: string;
  lastName?: string;
  photo?: { uri: string; type?: string; name?: string };
}

interface BuyerProfileOnboardingScreenProps {
  onBack?: () => void;
  onSkip: () => void;
  /** Salta todo el onboarding restante y entra directo a la app. */
  onSkipAll?: () => void;
  onContinue: (payload: BuyerProfilePayload) => Promise<void>;
  /** Nombre sugerido (derivado del email) para que el usuario lo corrija si quiere. */
  initialName?: string;
}

export const BuyerProfileOnboardingScreen: React.FC<BuyerProfileOnboardingScreenProps> = ({
  onBack,
  onSkip,
  onSkipAll,
  onContinue,
  initialName,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const [name, setName] = useState(initialName ?? '');
  const [lastName, setLastName] = useState('');
  const [photo, setPhoto] = useState<BuyerProfilePayload['photo'] | undefined>();
  const [previewUri, setPreviewUri] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }
      const a = response.assets?.[0];
      if (!a?.uri) return;
      setPreviewUri(a.uri);
      setPhoto({
        uri: a.uri,
        type: a.type || 'image/jpeg',
        name: a.fileName || 'photo.jpg',
      });
    });
  };

  const handleContinue = async () => {
    setBusy(true);
    try {
      await onContinue({
        name: name.trim() || undefined,
        lastName: lastName.trim() || undefined,
        photo,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-4 pb-8">
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
                {t('buyerOnboarding.profileTitle')}
              </Text>
              <View className="w-8 h-8" />
            </View>

            <Text className="text-center text-[#4C4E55] text-[14px] leading-[22px] mb-8">
              {t('buyerOnboarding.profileSubtitle')}
            </Text>

            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.9}
              disabled={busy}
              className="self-center mb-8 w-[120px] h-[120px] rounded-full border-2 border-[#D9D9D9] items-center justify-center overflow-hidden bg-[#F5F5F5] dark:bg-night-800"
            >
              {previewUri ? (
                <Image source={{ uri: previewUri }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <UserRound size={48} color="#7D7E83" />
              )}
            </TouchableOpacity>

            <View className="mb-4">
              <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                {t('register.firstName')}
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('register.firstNamePh')}
                placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                editable={!busy}
                style={{ fontFamily: FONT_FAMILY.bold }}
                className="rounded-full px-4 py-4 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border border-[#D9D9D9]"
              />
            </View>

            <View className="mb-6">
              <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                {t('register.lastName')}
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('register.lastNamePh')}
                placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                editable={!busy}
                style={{ fontFamily: FONT_FAMILY.bold }}
                className="rounded-full px-4 py-4 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border border-[#D9D9D9]"
              />
            </View>

            <Button
              title={t('common.continue')}
              variant="primary"
              size="large"
              loading={busy}
              disabled={busy}
              onPress={handleContinue}
              className="w-full min-h-[52px] rounded-full"
            />

            <Button
              title={t('buyerOnboarding.skip')}
              variant="ghost"
              size="medium"
              disabled={busy}
              onPress={onSkip}
              titleClassName="text-[14px] font-normal text-[#4C4E55] dark:text-night-muted"
              className="mt-5 self-center min-h-[44px]"
            />

            {onSkipAll ? (
              <Button
                title={t('buyerOnboarding.skipAll')}
                variant="ghost"
                size="medium"
                disabled={busy}
                onPress={onSkipAll}
                titleClassName="text-[14px] font-normal text-[#4C4E55] dark:text-night-muted"
                className="mt-1 self-center min-h-[44px]"
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
