/**
 * Register Screen
 * Registro en dos pasos:
 * 1) Elegir perfil
 * 2) Completar formulario por perfil
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Text } from '../../atoms/Text';
import { CountrySelect } from '../../molecules/CountrySelect';
import { VerificationCodeScreen } from '../VerificationCodeScreen';
import { createBuyerUser, createSellerUser, ApiError } from '../../../api';
import type { CreateBuyerUserRequest, CreateSellerUserRequest } from '../../../api/types';
import { FONT_FAMILY } from '../../../theme/typography';

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
  const [step, setStep] = useState<1 | 2>(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredUserUuid, setRegisteredUserUuid] = useState('');

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

  const goToStep2 = () => {
    if (!userType) {
      Alert.alert(t('common.error'), t('register.selectProfile'));
      return;
    }
    setStep(2);
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

    return true;
  };

  const validateSellerForm = (): boolean => {
    if (!validateBuyerForm()) {
      return false;
    }

    if (!customerName) {
      Alert.alert(t('common.error'), t('register.customerNameRequired'));
      return false;
    }

    return true;
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
          email,
          name,
          last_name: lastName || undefined,
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
        if (error instanceof ApiError) {
          Alert.alert(t('common.error'), error.message);
        } else {
          Alert.alert(t('common.error'), t('register.createFailed'));
        }
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
        if (error instanceof ApiError) {
          Alert.alert(t('common.error'), error.message);
        } else {
          Alert.alert(t('common.error'), t('register.createFailed'));
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Mostrar pantalla de verificación si el registro fue exitoso
  if (showVerification) {
    return (
      <VerificationCodeScreen
        email={registeredEmail}
        userUuid={registeredUserUuid}
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
        }}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-night-950">
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
                <ArrowLeft size={22} color="#02050F" />
              </TouchableOpacity>

              <Text className="text-center text-[#02050F] text-[20px] font-bold">
                {step === 1 ? t('register.chooseProfile') : t('register.createAccount')}
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

            {step === 2 && (
              <View className="mb-6">
                <Text variant="h3" className="mb-4 text-gray-800">
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

                {userType === 'seller' && (
                  <>
                    <Text variant="h3" className="mb-4 text-gray-800 mt-2">
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
                  </>
                )}
                
                <TouchableOpacity
                  onPress={handleRegister}
                  activeOpacity={0.9}
                  disabled={isLoading}
                  className={`mb-4 rounded-full min-h-[52px] items-center justify-center px-8 ${isLoading ? 'opacity-60' : 'opacity-100'} bg-primary-600`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-base leading-6 font-bold">
                      {userType === 'buyer' ? t('register.submitBuyer') : t('register.submitSeller')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={onBackToLogin} className="items-center mt-4">
                  <Text variant="caption" className="text-gray-500">
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
