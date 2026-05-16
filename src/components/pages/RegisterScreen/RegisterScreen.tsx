/**
 * Register Screen
 * Registro en dos pasos:
 * 1) Elegir perfil
 * 2) Completar formulario por perfil
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
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ArrowLeft, CalendarDays, Check, Eye, EyeOff } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { Input } from '../../atoms/Input';
import { Text } from '../../atoms/Text';
import { CountrySelect } from '../../molecules/CountrySelect';
import { VerificationCodeScreen } from '../VerificationCodeScreen';
import { BuyerProfileOnboardingScreen } from '../BuyerProfileOnboardingScreen';
import { BuyerInterestsOnboardingScreen } from '../BuyerInterestsOnboardingScreen';
import { BuyerRegistrationCompleteScreen } from '../BuyerRegistrationCompleteScreen';
import { BuyerKycOnboardingScreen } from '../BuyerKycOnboardingScreen';
import {
  createBuyerUser,
  createSellerUser,
  uploadBuyerProfile,
  saveBuyerInterests,
  ApiError,
} from '../../../api';
import type {
  CreateBuyerUserRequest,
  CreateSellerUserRequest,
  VerifyUserResponse,
} from '../../../api/types';
import { useAuth } from '../../../context/AuthContext';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { storage } from '../../../utils/storage';

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

function passwordMeetsPolicy(p: string): boolean {
  if (p.length < 8) return false;
  if (!/[a-z]/.test(p)) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[^A-Za-z0-9]/.test(p)) return false;
  return true;
}

/** Formato MM/DD/AAAA (mismo criterio que el diseño). */
function formatBirthdayDisplay(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

const DEFAULT_BIRTHDAY = new Date(1999, 2, 16);

type UserType = 'buyer' | 'seller';

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
  const [step, setStep] = useState<1 | 2>(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredUserUuid, setRegisteredUserUuid] = useState('');
  const [postVerifyStep, setPostVerifyStep] = useState<
    'profile' | 'interests' | 'kyc' | 'complete' | null
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
      setShowVerification(false);
      setPostVerifyStep(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (postVerifyStep) {
      void storage.setBuyerOnboardingUiStep(postVerifyStep);
    }
  }, [postVerifyStep]);

  // Formulario común
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  // Formulario específico para seller
  const [customerName, setCustomerName] = useState('');
  const [customerDomain, setCustomerDomain] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerCountry, setCustomerCountry] = useState('');
  const [customerPostalCode, setCustomerPostalCode] = useState('');
  const [customerAddressLine1, setCustomerAddressLine1] = useState('');
  const [customerContactPhone, setCustomerContactPhone] = useState('');

  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const insets = useSafeAreaInsets();
  /** Registro comprador: cumpleaños + contraseñas con estilo login */
  const [birthdayDate, setBirthdayDate] = useState(() => new Date(DEFAULT_BIRTHDAY));
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [buyerFocus, setBuyerFocus] = useState<'email' | 'birthday' | 'password' | 'confirm' | null>(null);
  const [showBuyerPw, setShowBuyerPw] = useState(false);
  const [showBuyerPw2, setShowBuyerPw2] = useState(false);

  const goToStep2 = () => {
    if (!userType) {
      Alert.alert(t('common.error'), t('register.selectProfile'));
      return;
    }
    setStep(2);
  };

  const maxBirthday = new Date();
  const minBirthday = new Date(1900, 0, 1);

  const onBirthdayChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowBirthdayPicker(false);
    }
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setBirthdayDate(selectedDate);
    }
  };

  const renderProfileLabel = (
    label: string,
    selected: boolean,
    gradientId: string
  ) => {
    if (!selected) {
      return (
        <Text className="text-center text-base leading-[20px] font-bold text-[#7D7E83]">
          {label}
        </Text>
      );
    }

    return (
      <Svg width="100%" height={20}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="37.52%" stopColor="#49A9E1" />
            <Stop offset="63.38%" stopColor="#2056FC" />
          </LinearGradient>
        </Defs>
        <SvgText
          x="50%"
          y="16"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fontFamily={FONT_FAMILY.bold}
          fill={`url(#${gradientId})`}
        >
          {label}
        </SvgText>
      </Svg>
    );
  };

  const validateBuyerForm = (): boolean => {
    if (!email.trim() || !password || !repeatPassword) {
      Alert.alert(t('common.error'), t('register.fillRequired'));
      return false;
    }

    if (password !== repeatPassword) {
      Alert.alert(t('common.error'), t('register.passwordsMismatch'));
      return false;
    }

    if (!passwordMeetsPolicy(password)) {
      Alert.alert(t('common.error'), t('register.passwordPolicyError'));
      return false;
    }

    return true;
  };

  const validateSellerForm = (): boolean => {
    if (!email || !name || !password || !repeatPassword) {
      Alert.alert(t('common.error'), t('register.fillRequired'));
      return false;
    }

    if (password !== repeatPassword) {
      Alert.alert(t('common.error'), t('register.passwordsMismatch'));
      return false;
    }

    if (password.length < 6) {
      Alert.alert(t('common.error'), t('register.passwordMin'));
      return false;
    }

    if (!customerName) {
      Alert.alert(t('common.error'), t('register.customerNameRequired'));
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
    if (!userType) {
      Alert.alert(t('common.error'), t('register.selectProfile'));
      return;
    }

    if (userType === 'buyer') {
      if (!validateBuyerForm()) return;

      setIsLoading(true);
      try {
        const buyerData: CreateBuyerUserRequest = {
          email: email.trim(),
          name: nameFromEmail(email.trim()),
          last_name: undefined,
          password,
          repeat_password: repeatPassword,
        };

        const response = await createBuyerUser(buyerData);
        
        if (response.data?.uuid) {
          setRegisteredEmail(email);
          setRegisteredUserUuid(response.data.uuid);
          setShowVerification(true);
        } else {
          Alert.alert(
            t('common.success'),
            t('register.createdBuyer'),
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  onRegisterSuccess?.();
                  onBackToLogin();
                },
              },
            ]
          );
        }
      } catch (error) {
        Alert.alert(t('common.error'), registerApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Seller registration
      if (!validateSellerForm()) return;

      setIsLoading(true);
      try {
        const sellerData: CreateSellerUserRequest = {
          email,
          name,
          last_name: lastName || undefined,
          password,
          repeat_password: repeatPassword,
          customer_name: customerName,
          customer_domain: customerDomain || undefined,
          customer_city: customerCity || undefined,
          customer_state: customerState || undefined,
          customer_country: customerCountry || undefined,
          customer_postal_code: customerPostalCode || undefined,
          customer_address_line1: customerAddressLine1 || undefined,
          customer_contact_phone: customerContactPhone || undefined,
        };

        const response = await createSellerUser(sellerData);
        
        if (response.data?.uuid) {
          setRegisteredEmail(email);
          setRegisteredUserUuid(response.data.uuid);
          setShowVerification(true);
        } else {
          Alert.alert(
            t('common.success'),
            t('register.createdSeller'),
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  onRegisterSuccess?.();
                  onBackToLogin();
                },
              },
            ]
          );
        }
      } catch (error) {
        Alert.alert(t('common.error'), registerApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
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
        onSkip={() => setPostVerifyStep('interests')}
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
        onContinue={(uuids) => completeInterestsStep(uuids)}
      />
    );
  }

  if (postVerifyStep === 'kyc') {
    return (
      <BuyerKycOnboardingScreen
        onBack={() => setPostVerifyStep('interests')}
        onProceedToComplete={() => setPostVerifyStep('complete')}
      />
    );
  }

  if (postVerifyStep === 'complete') {
    return <BuyerRegistrationCompleteScreen onViewAuctions={finishBuyerOnboarding} />;
  }

  // Mostrar pantalla de verificación si el registro fue exitoso
  if (showVerification) {
    return (
      <VerificationCodeScreen
        email={registeredEmail}
        userUuid={registeredUserUuid}
        origin="register"
        registrationProfile={userType === 'buyer' ? 'buyer' : 'seller'}
        onVerifiedRaw={userType === 'buyer' ? handleBuyerVerified : undefined}
        onVerificationSuccess={() => {
          setShowVerification(false);
          onRegisterSuccess?.();
          onBackToLogin();
        }}
        onBack={() => {
          setShowVerification(false);
          // Limpiar formulario
          setEmail('');
          setName('');
          setLastName('');
          setPassword('');
          setRepeatPassword('');
          setCustomerName('');
          setCustomerDomain('');
          setCustomerCity('');
          setCustomerState('');
          setCustomerCountry('');
          setCustomerPostalCode('');
          setCustomerAddressLine1('');
          setCustomerContactPhone('');
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
                onPress={() => {
                  if (step === 1) {
                    onBackToLogin();
                  } else {
                    setStep(1);
                  }
                }}
                className="w-8 h-8 items-start justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={22} color={c.text} />
              </TouchableOpacity>

              <Text className="text-center text-[#02050F] dark:text-white text-[20px] font-bold">
                {step === 1
                  ? t('register.chooseProfile')
                  : userType === 'buyer'
                    ? t('login.title')
                    : t('register.createAccount')}
              </Text>

              <View className="w-8 h-8" />
            </View>

            {step === 1 && (
              <View className="mt-12">
                <TouchableOpacity
                  onPress={() => setUserType('seller')}
                  activeOpacity={0.9}
                  className={`rounded-full border min-h-[52px] items-center justify-center px-4 mb-3 ${userType === 'seller' ? 'border-[#49A9E1]' : 'border-[#8C8C8C]'}`}
                >
                  {renderProfileLabel(t('register.profileSeller'), userType === 'seller', 'sellerGradient')}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setUserType('buyer')}
                  activeOpacity={0.9}
                  className={`rounded-full border min-h-[52px] items-center justify-center px-4 mb-7 ${userType === 'buyer' ? 'border-[#49A9E1]' : 'border-[#8C8C8C]'}`}
                >
                  {renderProfileLabel(t('register.profileBuyer'), userType === 'buyer', 'buyerGradient')}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goToStep2}
                  activeOpacity={0.9}
                  className="bg-primary-600 rounded-full min-h-[52px] items-center justify-center px-8"
                >
                  <Text className="text-white text-base leading-6 font-semibold">{t('common.continue')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && userType === 'buyer' && (
              <View className="mb-6 gap-3">
                <View>
                  <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                    {t('register.email')}
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
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
                      buyerFocus === 'email' ? 'border-[#49A9E1]' : 'border-[#D9D9D9]'
                    }`}
                  />
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
                      buyerFocus === 'birthday' ? 'border-[#49A9E1]' : 'border-[#D9D9D9]'
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

                  {Platform.OS === 'android' && showBirthdayPicker && (
                    <DateTimePicker
                      value={birthdayDate}
                      mode="date"
                      display="default"
                      onChange={onBirthdayChange}
                      maximumDate={maxBirthday}
                      minimumDate={minBirthday}
                    />
                  )}

                  {Platform.OS === 'ios' && (
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
                          <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-night-700">
                            <TouchableOpacity onPress={() => setShowBirthdayPicker(false)}>
                              <Text className="text-[16px] font-semibold text-primary-600">
                                {t('common.cancel')}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowBirthdayPicker(false)}>
                              <Text className="text-[16px] font-semibold text-primary-600">
                                {t('common.done')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={birthdayDate}
                            mode="date"
                            display="inline"
                            themeVariant={isDark ? 'dark' : 'light'}
                            onChange={(_e, d) => {
                              if (d) setBirthdayDate(d);
                            }}
                            maximumDate={maxBirthday}
                            minimumDate={minBirthday}
                          />
                        </View>
                      </View>
                    </Modal>
                  )}
                </View>

                <View>
                  <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                    {t('register.password')}
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
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
                        buyerFocus === 'password' ? 'border-[#49A9E1]' : 'border-[#D9D9D9]'
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
                </View>

                <View>
                  <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 tracking-[0.05px]">
                    {t('register.confirmPassword')}
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={repeatPassword}
                      onChangeText={setRepeatPassword}
                      onFocus={() => setBuyerFocus('confirm')}
                      onBlur={() => setBuyerFocus(null)}
                      placeholder={t('login.passwordPlaceholder')}
                      placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                      secureTextEntry={!showBuyerPw2}
                      autoCapitalize="none"
                      editable={!isLoading}
                      style={{ fontFamily: FONT_FAMILY.regular }}
                      className={`rounded-full px-4 py-4 pr-12 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border ${
                        buyerFocus === 'confirm' ? 'border-[#49A9E1]' : 'border-[#D9D9D9]'
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

                <TouchableOpacity
                  onPress={handleRegister}
                  activeOpacity={0.9}
                  disabled={isLoading}
                  className={`mt-2 rounded-full min-h-[52px] items-center justify-center px-8 ${isLoading ? 'opacity-60' : 'opacity-100'} bg-primary-600`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-[#FEFEFE] text-base leading-6 font-semibold">
                      {t('register.acceptContinue')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={onBackToLogin} className="items-center mt-6">
                  <Text className="text-[12px] text-[#4C4E55] dark:text-night-muted">
                    {t('register.hasAccount')}{' '}
                    <Text className="text-primary-600 text-[12px] font-semibold">{t('register.signIn')}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && userType === 'seller' && (
              <View className="mb-6">
                <Text variant="h3" className="mb-4 text-gray-800 dark:text-white">
                  {t('register.personalInfo')}
                </Text>

                <Input
                  label={t('register.email')}
                  placeholder={t('register.emailPh')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  containerClassName="mb-4"
                />

                <Input
                  label={t('register.firstName')}
                  placeholder={t('register.firstNamePh')}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  containerClassName="mb-4"
                />

                <Input
                  label={t('register.lastName')}
                  placeholder={t('register.lastNamePh')}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  containerClassName="mb-4"
                />

                <Input
                  label={t('register.password')}
                  placeholder={t('register.passwordDots')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  containerClassName="mb-4"
                />

                <Input
                  label={t('register.confirmPassword')}
                  placeholder={t('register.passwordDots')}
                  value={repeatPassword}
                  onChangeText={setRepeatPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  containerClassName="mb-6"
                />

                <Text variant="h3" className="mb-4 text-gray-800 dark:text-white mt-2">
                  {t('register.clientInfo')}
                </Text>

                <Input
                  label={t('register.customerName')}
                  placeholder={t('register.customerNamePh')}
                  value={customerName}
                  onChangeText={setCustomerName}
                  autoCapitalize="words"
                  containerClassName="mb-4"
                />

                <Input
                  label={t('register.domain')}
                  placeholder={t('register.domainPh')}
                  value={customerDomain}
                  onChangeText={setCustomerDomain}
                  autoCapitalize="none"
                  keyboardType="url"
                  containerClassName="mb-4"
                />

                <Input
                  label={t('register.address')}
                  placeholder={t('register.addressPh')}
                  value={customerAddressLine1}
                  onChangeText={setCustomerAddressLine1}
                  containerClassName="mb-4"
                />

                <Input
                  label={t('register.city')}
                  placeholder={t('register.cityPh')}
                  value={customerCity}
                  onChangeText={setCustomerCity}
                  autoCapitalize="words"
                  containerClassName="mb-4"
                />

                <View className="flex-row mb-4">
                  <View className="flex-1 mr-2">
                    <Input
                      label={t('register.state')}
                      placeholder={t('register.statePh')}
                      value={customerState}
                      onChangeText={setCustomerState}
                      autoCapitalize="words"
                    />
                  </View>
                  <View className="flex-1 ml-2">
                    <Input
                      label={t('register.postalCode')}
                      placeholder={t('register.postalCodePh')}
                      value={customerPostalCode}
                      onChangeText={setCustomerPostalCode}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <CountrySelect
                  label={t('register.country')}
                  value={customerCountry}
                  onValueChange={setCustomerCountry}
                  placeholder={t('register.selectCountry')}
                  containerClassName="mb-4"
                />

                <Input
                  label={t('register.phone')}
                  placeholder={t('register.phonePh')}
                  value={customerContactPhone}
                  onChangeText={setCustomerContactPhone}
                  keyboardType="phone-pad"
                  containerClassName="mb-6"
                />

                <TouchableOpacity
                  onPress={handleRegister}
                  activeOpacity={0.9}
                  disabled={isLoading}
                  className={`mb-4 rounded-full min-h-[52px] items-center justify-center px-8 ${isLoading ? 'opacity-60' : 'opacity-100'} bg-primary-600`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-base leading-6 font-bold">{t('register.submitSeller')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={onBackToLogin} className="items-center mt-4">
                  <Text variant="caption" className="text-gray-500 dark:text-night-muted">
                    {t('register.hasAccount')}{' '}
                    <Text variant="caption" className="text-primary-600 font-semibold">
                      {t('register.signIn')}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
