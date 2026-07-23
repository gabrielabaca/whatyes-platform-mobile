/**
 * Register Screen
 * Registro de cuenta comprador (buyer). El upgrade a vendedor es un flujo aparte.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, CalendarDays, Check, Eye, EyeOff } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { VerificationCodeScreen } from '../VerificationCodeScreen';
import { BuyerProfileOnboardingScreen } from '../BuyerProfileOnboardingScreen';
import { BuyerInterestsOnboardingScreen } from '../BuyerInterestsOnboardingScreen';
import { BuyerKycOnboardingScreen } from '../BuyerKycOnboardingScreen';
import {
  createBuyerUser,
  uploadBuyerProfile,
  saveBuyerInterests,
  ApiError,
} from '../../../api';
import type { CreateBuyerUserRequest, VerifyUserResponse } from '../../../api/types';
import { useAuth } from '../../../context/AuthContext';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { storage } from '../../../utils/storage';
import { isValidEmail, passwordMeetsPolicy } from '../../../utils/formValidation';

/** Nombre para API cuando el registro comprador solo pide email. */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? '';
  if (!local) return 'Usuario';
  const words = local.replace(/[._+-]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Usuario';
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Formato MM/DD/AAAA (mismo criterio que el diseño). */
function formatBirthdayDisplay(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Formato ISO YYYY-MM-DD que espera el backend. */
function formatBirthdayIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const MIN_AGE_YEARS = 18;

function isAdult(birthDate: Date): boolean {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE_YEARS);
  return birthDate <= cutoff;
}

const DEFAULT_BIRTHDAY = new Date(1999, 2, 16);

interface RegisterScreenProps {
  onBackToLogin: () => void;
  onRegisterSuccess?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onBackToLogin,
  onRegisterSuccess,
}) => {
  const { t } = useTranslation();
  const { activateSessionFromTokens } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredUserUuid, setRegisteredUserUuid] = useState('');
  const [postVerifyStep, setPostVerifyStep] = useState<
    'profile' | 'interests' | 'kyc' | null
  >(null);

  /** Tras reinicio de app: restaurar paso del onboarding comprador si el JWT ya existe */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await storage.getAccessToken();
      const pending = await storage.getPendingBuyerOnboarding();
      const saved = await storage.getBuyerOnboardingUiStep();
      if (cancelled || !token || !pending || !saved) {
        return;
      }
      // 'complete' quedó de versiones previas: el onboarding ya terminó, activar sesión.
      if (saved === 'complete') {
        await finishBuyerOnboarding();
        return;
      }
      setShowVerification(false);
      setPostVerifyStep(saved);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (postVerifyStep) {
      void storage.setBuyerOnboardingUiStep(postVerifyStep);
    }
  }, [postVerifyStep]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const insets = useSafeAreaInsets();
  const [birthdayDate, setBirthdayDate] = useState(() => new Date(DEFAULT_BIRTHDAY));
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [buyerFocus, setBuyerFocus] = useState<'email' | 'birthday' | 'password' | 'confirm' | null>(null);
  const [showBuyerPw, setShowBuyerPw] = useState(false);
  const [showBuyerPw2, setShowBuyerPw2] = useState(false);
  const [buyerEmailError, setBuyerEmailError] = useState<string | null>(null);
  const [buyerBirthdayError, setBuyerBirthdayError] = useState<string | null>(null);
  const [buyerPasswordError, setBuyerPasswordError] = useState<string | null>(null);
  const [buyerConfirmError, setBuyerConfirmError] = useState<string | null>(null);

  const maxBirthday = new Date();
  const minBirthday = new Date(1900, 0, 1);

  const validateBuyerForm = (): boolean => {
    setBuyerEmailError(null);
    setBuyerBirthdayError(null);
    setBuyerPasswordError(null);
    setBuyerConfirmError(null);

    if (!email.trim()) {
      setBuyerEmailError(t('register.fillRequired'));
      return false;
    }
    if (!isValidEmail(email)) {
      setBuyerEmailError(t('common.invalidEmail'));
      return false;
    }

    if (!isAdult(birthdayDate)) {
      setBuyerBirthdayError(t('register.underageError'));
      return false;
    }

    if (!password || !repeatPassword) {
      if (!password) setBuyerPasswordError(t('register.fillRequired'));
      if (!repeatPassword) setBuyerConfirmError(t('register.fillRequired'));
      return false;
    }

    if (password !== repeatPassword) {
      setBuyerConfirmError(t('register.passwordsMismatch'));
      return false;
    }

    if (!passwordMeetsPolicy(password)) {
      setBuyerPasswordError(t('register.passwordPolicyError'));
      return false;
    }

    return true;
  };

  /** 409 del backend = email ya registrado; mensaje fijo en i18n */
  const registerApiErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError && error.status === 409) {
      return t('register.emailAlreadyInUse');
    }
    if (error instanceof ApiError) {
      return error.message;
    }
    return t('register.createFailed');
  };

  const handleRegister = async () => {
    if (!validateBuyerForm()) return;

    setIsLoading(true);
    try {
      const buyerData: CreateBuyerUserRequest = {
        email: email.trim(),
        name: nameFromEmail(email.trim()),
        last_name: undefined,
        birth_date: formatBirthdayIso(birthdayDate),
        password,
        repeat_password: repeatPassword,
      };

      const response = await createBuyerUser(buyerData);

      if (response.data?.uuid) {
        setRegisteredEmail(email);
        setRegisteredUserUuid(response.data.uuid);
        setShowVerification(true);
      } else {
        Alert.alert(t('common.success'), t('register.createdBuyer'), [
          {
            text: t('common.ok'),
            onPress: () => {
              onRegisterSuccess?.();
              onBackToLogin();
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert(t('common.error'), registerApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const finishBuyerOnboarding = async () => {
    try {
      await storage.setPendingBuyerOnboarding(false);
      await storage.setBuyerOnboardingUiStep(null);
      await activateSessionFromTokens();
    } catch {
      Alert.alert(t('common.error'), t('buyerOnboarding.sessionError'));
      return;
    }
    setPostVerifyStep(null);
  };

  const handleBuyerVerified = async (data: VerifyUserResponse) => {
    if (data.access_token && data.refresh_token) {
      await storage.setPendingBuyerOnboarding(true);
      await storage.setBuyerOnboardingUiStep('profile');
      setShowVerification(false);
      setPostVerifyStep('profile');
      return;
    }
    setShowVerification(false);
    onRegisterSuccess?.();
    onBackToLogin();
  };

  const completeInterestsStep = async (categoryUuids: string[]) => {
    try {
      await saveBuyerInterests(categoryUuids);
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.error'), t('buyerOnboarding.interestsSaveError'));
      }
      return;
    }
    setPostVerifyStep('kyc');
  };

  if (postVerifyStep === 'profile') {
    return (
      <BuyerProfileOnboardingScreen
        initialName={email.trim() ? nameFromEmail(email.trim()) : undefined}
        onSkip={() => setPostVerifyStep('interests')}
        onSkipAll={() => void finishBuyerOnboarding()}
        onContinue={async (payload) => {
          const hasAny =
            (payload.name && payload.name.length > 0) ||
            (payload.lastName && payload.lastName.length > 0) ||
            payload.photo;
          if (hasAny) {
            try {
              await uploadBuyerProfile({
                name: payload.name,
                lastName: payload.lastName,
                photo: payload.photo,
              });
            } catch (error) {
              if (error instanceof ApiError) {
                Alert.alert(t('common.error'), error.message);
              } else {
                Alert.alert(t('common.error'), t('buyerOnboarding.profileSaveError'));
              }
              return;
            }
          }
          setPostVerifyStep('interests');
        }}
      />
    );
  }

  if (postVerifyStep === 'interests') {
    return (
      <BuyerInterestsOnboardingScreen
        onSkip={async () => {
          await completeInterestsStep([]);
        }}
        onSkipAll={() => void finishBuyerOnboarding()}
        onContinue={(uuids) => completeInterestsStep(uuids)}
      />
    );
  }

  if (postVerifyStep === 'kyc') {
    return (
      <BuyerKycOnboardingScreen
        onBack={() => setPostVerifyStep('interests')}
        onProceedToComplete={() => void finishBuyerOnboarding()}
      />
    );
  }

  if (showVerification) {
    return (
      <VerificationCodeScreen
        email={registeredEmail}
        userUuid={registeredUserUuid}
        origin="register"
        registrationProfile="buyer"
        onVerifiedRaw={handleBuyerVerified}
        onVerificationSuccess={() => {
          setShowVerification(false);
          onRegisterSuccess?.();
          onBackToLogin();
        }}
        onBack={() => {
          setShowVerification(false);
          setEmail('');
          setPassword('');
          setRepeatPassword('');
          setBirthdayDate(new Date(DEFAULT_BIRTHDAY));
        }}
      />
    );
  }

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
          <View className="flex-1 px-6 pt-8 pb-6">
            <View className="flex-row items-center justify-between mb-8">
              <TouchableOpacity
                onPress={onBackToLogin}
                className="w-8 h-8 items-start justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={22} color={c.text} />
              </TouchableOpacity>

              <Text className="text-center text-[#02050F] dark:text-white text-[20px] font-bold">
                {t('login.title')}
              </Text>

              <View className="w-8 h-8" />
            </View>

            <View className="mb-6 gap-3">
              <View>
                <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                  {t('register.email')}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (buyerEmailError) setBuyerEmailError(null);
                  }}
                  onFocus={() => setBuyerFocus('email')}
                  onBlur={() => setBuyerFocus(null)}
                  placeholder={t('common.emailPlaceholder')}
                  placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                  style={{ fontFamily: FONT_FAMILY.bold }}
                  className={`rounded-full px-4 py-4 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border ${
                    buyerEmailError
                      ? 'border-[#E53935]'
                      : buyerFocus === 'email'
                        ? 'border-[#49A9E1]'
                        : 'border-[#D9D9D9]'
                  }`}
                />
                {buyerEmailError ? (
                  <Text className="mt-1 text-[10px] leading-[18px]" style={{ color: '#E53935' }}>
                    {buyerEmailError}
                  </Text>
                ) : null}
              </View>

              <View>
                <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                  {t('register.buyerBirthday')}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={isLoading}
                  onPress={() => {
                    setBuyerFocus('birthday');
                    setShowBirthdayPicker(true);
                  }}
                  className={`rounded-full px-4 py-4 flex-row items-center justify-between min-h-[52px] border bg-white dark:bg-night-800 ${
                    buyerBirthdayError
                      ? 'border-[#E53935]'
                      : buyerFocus === 'birthday'
                        ? 'border-[#49A9E1]'
                        : 'border-[#D9D9D9]'
                  }`}
                >
                  <Text
                    style={{ fontFamily: FONT_FAMILY.bold }}
                    className="text-[12px] text-[#02050F] dark:text-white"
                  >
                    {formatBirthdayDisplay(birthdayDate)}
                  </Text>
                  <CalendarDays size={18} color={c.text} />
                </TouchableOpacity>

                <Modal
                  visible={showBirthdayPicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowBirthdayPicker(false)}
                >
                  <View className="flex-1 justify-end">
                    <Pressable
                      className="flex-1 bg-black/40"
                      onPress={() => setShowBirthdayPicker(false)}
                    />
                    <View
                      className="rounded-t-3xl bg-[#FEFEFE] dark:bg-night-900"
                      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
                    >
                      <View className="flex-row items-center justify-between border-b border-gray-200 px-2 py-1 dark:border-night-700">
                        <Button
                          title={t('common.cancel')}
                          variant="ghost"
                          size="medium"
                          onPress={() => setShowBirthdayPicker(false)}
                          className="min-h-[44px] px-3"
                        />
                        <Button
                          title={t('common.done')}
                          variant="ghost"
                          size="medium"
                          onPress={() => setShowBirthdayPicker(false)}
                          className="min-h-[44px] px-3"
                        />
                      </View>
                      <View className="items-center py-2">
                        <DateTimePicker
                          value={birthdayDate}
                          mode="date"
                          display="spinner"
                          themeVariant={isDark ? 'dark' : 'light'}
                          onChange={(_e, d) => {
                            if (d) {
                              setBirthdayDate(d);
                              if (buyerBirthdayError) setBuyerBirthdayError(null);
                            }
                          }}
                          maximumDate={maxBirthday}
                          minimumDate={minBirthday}
                        />
                      </View>
                    </View>
                  </View>
                </Modal>
                {buyerBirthdayError ? (
                  <Text className="mt-1 text-[10px] leading-[18px]" style={{ color: '#E53935' }}>
                    {buyerBirthdayError}
                  </Text>
                ) : null}
              </View>

              <View>
                <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                  {t('register.password')}
                </Text>
                <View className="relative">
                  <TextInput
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (buyerPasswordError) setBuyerPasswordError(null);
                    }}
                    onFocus={() => setBuyerFocus('password')}
                    onBlur={() => setBuyerFocus(null)}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                    secureTextEntry={!showBuyerPw}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!isLoading}
                    style={{ fontFamily: FONT_FAMILY.regular }}
                    className={`rounded-full px-4 py-4 pr-12 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border ${
                      buyerPasswordError
                        ? 'border-[#E53935]'
                        : buyerFocus === 'password'
                          ? 'border-[#49A9E1]'
                          : 'border-[#D9D9D9]'
                    }`}
                  />
                  <TouchableOpacity
                    onPress={() => setShowBuyerPw(!showBuyerPw)}
                    className="absolute right-4 top-0 bottom-0 justify-center"
                    disabled={isLoading}
                  >
                    {showBuyerPw ? (
                      <EyeOff size={18} color={c.text} />
                    ) : (
                      <Eye size={18} color={c.text} />
                    )}
                  </TouchableOpacity>
                </View>
                {buyerPasswordError ? (
                  <Text className="mt-1 text-[10px] leading-[18px]" style={{ color: '#E53935' }}>
                    {buyerPasswordError}
                  </Text>
                ) : null}
              </View>

              <View>
                <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                  {t('register.confirmPassword')}
                </Text>
                <View className="relative">
                  <TextInput
                    value={repeatPassword}
                    onChangeText={(v) => {
                      setRepeatPassword(v);
                      if (buyerConfirmError) setBuyerConfirmError(null);
                    }}
                    onFocus={() => setBuyerFocus('confirm')}
                    onBlur={() => setBuyerFocus(null)}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                    secureTextEntry={!showBuyerPw2}
                    autoCapitalize="none"
                    editable={!isLoading}
                    style={{ fontFamily: FONT_FAMILY.regular }}
                    className={`rounded-full px-4 py-4 pr-12 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border ${
                      buyerConfirmError
                        ? 'border-[#E53935]'
                        : buyerFocus === 'confirm'
                          ? 'border-[#49A9E1]'
                          : 'border-[#D9D9D9]'
                    }`}
                  />
                  <TouchableOpacity
                    onPress={() => setShowBuyerPw2(!showBuyerPw2)}
                    className="absolute right-4 top-0 bottom-0 justify-center"
                    disabled={isLoading}
                  >
                    {showBuyerPw2 ? (
                      <EyeOff size={18} color={c.text} />
                    ) : (
                      <Eye size={18} color={c.text} />
                    )}
                  </TouchableOpacity>
                </View>
                {buyerConfirmError ? (
                  <Text className="mt-1 text-[10px] leading-[18px]" style={{ color: '#E53935' }}>
                    {buyerConfirmError}
                  </Text>
                ) : null}
              </View>

              <View className="flex-row gap-2 mt-1">
                <View className="mt-0.5">
                  <Check size={14} color="#00C566" strokeWidth={3} />
                </View>
                <Text className="flex-1 text-[10px] leading-[18px] text-[#4C4E55] dark:text-night-muted tracking-[0.05px]">
                  {t('register.passwordPolicyHint')}
                </Text>
              </View>

              <Text className="text-[12px] leading-5 text-[#4C4E55] dark:text-night-muted tracking-[0.06px] mt-4">
                {t('register.termsNotice')}
              </Text>

              <Button
                title={t('register.acceptContinue')}
                variant="primary"
                size="large"
                loading={isLoading}
                disabled={isLoading}
                onPress={handleRegister}
                className="mt-2 w-full min-h-[52px] rounded-full"
              />

              <View className="items-center mt-6 gap-1">
                <Text className="text-[12px] text-[#4C4E55] dark:text-night-muted">
                  {t('register.hasAccount')}
                </Text>
                <Button
                  title={t('register.signIn')}
                  variant="ghost"
                  size="small"
                  onPress={onBackToLogin}
                  titleClassName="text-[12px] font-semibold"
                  className="min-h-[36px] px-2"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
