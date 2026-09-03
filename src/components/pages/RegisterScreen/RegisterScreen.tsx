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
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDatePickerSheet } from '../../molecules/AppDatePickerSheet';
import { AuthHeader } from '../../molecules/auth';
import { CalendarDays, Check, Eye, EyeOff } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { VerificationCodeScreen } from '../VerificationCodeScreen';
import { BuyerProfileOnboardingScreen } from '../BuyerProfileOnboardingScreen';
import { BuyerInterestsOnboardingScreen } from '../BuyerInterestsOnboardingScreen';
import { BuyerKycOnboardingScreen } from '../BuyerKycOnboardingScreen';
import { EnableNotificationsScreen } from '../EnableNotificationsScreen';
import {
  createBuyerUser,
  uploadBuyerProfile,
  saveBuyerInterests,
  getCurrentUser,
  ApiError,
} from '../../../api';
import type { CreateBuyerUserRequest, VerifyUserResponse } from '../../../api/types';
import { useAuth } from '../../../context/AuthContext';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { storage } from '../../../utils/storage';
import { isValidEmail, passwordMeetsPolicy } from '../../../utils/formValidation';
import { appAlert } from '../../../alerts';

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

/** Formato DD/MM/AAAA (criterio local: el público de la app es de Argentina). */
function formatBirthdayDisplay(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

/**
 * Valor inicial del picker (no del campo): el campo arranca vacío con placeholder
 * DD/MM/AAAA (Figma 1109:2802). Esta fecha solo evita que el picker abra en hoy —
 * el registro exige 18+, así que casi cualquier cumpleaños real queda a décadas
 * de scroll. La validación de edad sigue en `isAdult`, no acá.
 */
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
  /** Orden del Figma: perfil → intereses → notificaciones (1115:3279) → KYC. */
  const [postVerifyStep, setPostVerifyStep] = useState<
    'profile' | 'interests' | 'notifications' | 'kyc' | null
  >(null);
  /** Nombre/apellido ya conocidos para precargar el paso de perfil y no pedirlos de nuevo. */
  const [profilePrefill, setProfilePrefill] = useState<{
    name?: string;
    lastName?: string;
  } | null>(null);

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

  /**
   * Al entrar al paso de perfil, reutilizar el nombre/apellido que ya tiene el
   * backend (/auth/me); si no responde, derivarlos del email igual que en el alta.
   */
  useEffect(() => {
    if (postVerifyStep !== 'profile' || profilePrefill) {
      return;
    }
    let cancelled = false;
    (async () => {
      let name: string | undefined;
      let lastName: string | undefined;
      try {
        const me = await getCurrentUser();
        name = me.data?.name?.trim() || undefined;
        lastName = me.data?.last_name?.trim() || undefined;
      } catch {
        // sin sesión o sin red: caer al nombre derivado del email
      }
      if (!name) {
        const derived = email.trim() ? nameFromEmail(email.trim()) : '';
        const words = derived.split(' ').filter(Boolean);
        if (words.length > 1) {
          name = words.slice(0, -1).join(' ');
          lastName = words[words.length - 1];
        } else {
          name = derived || undefined;
        }
      }
      if (!cancelled) {
        setProfilePrefill({ name, lastName });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postVerifyStep, profilePrefill, email]);

  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const [birthdayDate, setBirthdayDate] = useState<Date | null>(null);
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

    if (!birthdayDate) {
      setBuyerBirthdayError(t('register.fillRequired'));
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
    // `!birthdayDate` repite lo que validateBuyerForm ya garantizó, solo para narrowing.
    if (!validateBuyerForm() || !birthdayDate) return;

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
        appAlert(t('common.success'), t('register.createdBuyer'), [
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
      appAlert(t('common.error'), registerApiErrorMessage(error));
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
      appAlert(t('common.error'), t('buyerOnboarding.sessionError'));
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
        appAlert(t('common.error'), error.message);
      } else {
        appAlert(t('common.error'), t('buyerOnboarding.interestsSaveError'));
      }
      return;
    }
    setPostVerifyStep('notifications');
  };

  if (postVerifyStep === 'profile') {
    if (!profilePrefill) {
      return (
        <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950 items-center justify-center">
          <ActivityIndicator size="large" color="#685CF0" />
        </SafeAreaView>
      );
    }
    return (
      <BuyerProfileOnboardingScreen
        initialName={profilePrefill.name}
        initialLastName={profilePrefill.lastName}
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
                appAlert(t('common.error'), error.message);
              } else {
                appAlert(t('common.error'), t('buyerOnboarding.profileSaveError'));
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

  if (postVerifyStep === 'notifications') {
    return (
      <EnableNotificationsScreen
        onBack={() => setPostVerifyStep('interests')}
        onSkip={() => setPostVerifyStep('kyc')}
        onSkipAll={() => void finishBuyerOnboarding()}
        onContinue={() => setPostVerifyStep('kyc')}
      />
    );
  }

  if (postVerifyStep === 'kyc') {
    return (
      <BuyerKycOnboardingScreen
        onBack={() => setPostVerifyStep('notifications')}
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
          setBirthdayDate(null);
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
        <KeyboardDismissScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-8 pb-6">
            <AuthHeader title={t('register.createAccount')} onBack={onBackToLogin} className="mb-4" />

            <Text className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px] mb-6">
              {t('register.subtitle')}
            </Text>

            <View className="mb-6 gap-3">
              <View>
                <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                  {t('register.email')}
                </Text>
                <AppTextInput
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
                  accessibilityRole="button"
                  accessibilityLabel={t('register.buyerBirthday')}
                  accessibilityValue={{
                    text: birthdayDate
                      ? formatBirthdayDisplay(birthdayDate)
                      : t('register.birthdayPlaceholder'),
                  }}
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
                    style={{
                      fontFamily: birthdayDate ? FONT_FAMILY.bold : FONT_FAMILY.regular,
                      color: birthdayDate
                        ? c.text
                        : isDark
                          ? themeColors.dark.textMuted
                          : '#7D7E83',
                    }}
                    className="text-[12px]"
                  >
                    {birthdayDate
                      ? formatBirthdayDisplay(birthdayDate)
                      : t('register.birthdayPlaceholder')}
                  </Text>
                  {/* El Figma (1109:2802) no dibuja este icono, pero el campo abre un
                      picker y sin él parece un input de texto: se queda por affordance. */}
                  <CalendarDays size={18} color={c.text} />
                </TouchableOpacity>

                <AppDatePickerSheet
                  visible={showBirthdayPicker}
                  title={t('register.buyerBirthday')}
                  mode="date"
                  value={birthdayDate ?? new Date(DEFAULT_BIRTHDAY)}
                  onChange={(d) => {
                    setBirthdayDate(d);
                    if (buyerBirthdayError) setBuyerBirthdayError(null);
                  }}
                  onClose={() => setShowBirthdayPicker(false)}
                  maximumDate={maxBirthday}
                  minimumDate={minBirthday}
                />
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
                  <AppTextInput
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
                    accessibilityRole="button"
                    accessibilityLabel={showBuyerPw ? t('common.hidePassword') : t('common.showPassword')}
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
                  <AppTextInput
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
                    accessibilityRole="button"
                    accessibilityLabel={showBuyerPw2 ? t('common.hidePassword') : t('common.showPassword')}
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

              {/* El Figma (1109:2554) no dibuja este aviso y rotula el botón "Continuar".
                  El aviso es legal (Términos y Privacidad) y el botón dice "Aceptar y
                  Continuar" porque es lo que ejecuta esa aceptación: van juntos y el
                  Figma no manda sobre eso. No quitar uno sin el otro. */}
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

              <View className="items-center mt-6">
                <Text className="text-[12px] text-[#4C4E55] dark:text-night-muted">
                  {t('register.hasAccount')}{' '}
                  <Text
                    className="text-primary-600 text-[12px] font-bold"
                    accessibilityRole="link"
                    onPress={onBackToLogin}
                  >
                    {t('register.signIn')}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </KeyboardDismissScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
