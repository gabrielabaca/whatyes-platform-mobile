/**
 * Forgot Password Screen
 * Pantalla para recuperar contraseña con flujo de dos pasos
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import { forgotPasswordRequest, resetPassword, ApiError } from '../../../api';
import { FONT_FAMILY } from '../../../theme/typography';
import { VerificationCodeScreen } from '../VerificationCodeScreen';

/** Mismo largo que `origin="forgotPassword"` en VerificationCodeScreen */
const FORGOT_PASSWORD_OTP_LENGTH = 6;

type Step = 'request' | 'reset';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBackToLogin,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const forgotPasswordCodeDigits = code.slice(0, FORGOT_PASSWORD_OTP_LENGTH).split('');

  // Paso 1: Solicitar código
  const handleRequestCode = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('forgotPassword.enterEmail'));
      return;
    }

    setIsLoading(true);
    try {
      await forgotPasswordRequest(email);
      setShowVerification(true);
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.error'), t('forgotPassword.sendCodeFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Restablecer contraseña con código
  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('forgotPassword.fillAll'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('forgotPassword.passwordsMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('forgotPassword.passwordMin'));
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({
        username: email,
        new_password: newPassword,
        hash_code: code.trim(),
      });

      Alert.alert(
        t('forgotPassword.resetSuccessTitle'),
        t('forgotPassword.resetSuccessBody'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              onBackToLogin();
            },
          },
        ]
      );
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.error'), t('forgotPassword.resetFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'reset') {
      setNewPassword('');
      setConfirmPassword('');
      setCode('');
      setShowVerification(true);
      return;
    }
    onBackToLogin();
  };

  if (showVerification) {
    return (
      <VerificationCodeScreen
        email={email}
        origin="forgotPassword"
        onVerificationSuccess={() => {}}
        onForgotPasswordCodeNext={(enteredCode) => {
          setShowVerification(false);
          setCode(enteredCode);
          setStep('reset');
        }}
        onBack={() => setShowVerification(false)}
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
          <View className="flex-1 px-6 pt-4 pb-6">
            <View className="flex-row items-center justify-between mt-2 mb-8">
              <TouchableOpacity
                onPress={handleBack}
                className="w-8 h-8 items-start justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={22} color="#02050F" />
              </TouchableOpacity>
              <Text className="text-[20px] font-bold text-[#02050F]">
                {step === 'request' ? t('forgotPassword.titleRequest') : t('forgotPassword.titleReset')}
              </Text>
              <View className="w-8 h-8" />
            </View>

            {step === 'request' && (
              <>
                <Text className="text-center text-[#4C4E55] text-[14px] leading-[22px] mb-6">
                  {t('forgotPassword.subtitleRequest')}
                </Text>

                <View className="mb-7">
                  <Text className="text-[10px] text-[#34363E] mb-2">{t('forgotPassword.emailLabel')}</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    placeholderTextColor="#7D7E83"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                    style={{ fontFamily: FONT_FAMILY.regular }}
                    className="border border-[#D9D9D9] rounded-full px-4 py-4 text-[12px] text-[#02050F] min-h-[52px]"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleRequestCode}
                  activeOpacity={0.9}
                  disabled={!email || isLoading}
                  className={`rounded-full min-h-[52px] items-center justify-center px-8 bg-primary-600 ${!email || isLoading ? 'opacity-60' : 'opacity-100'}`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-base leading-6 font-semibold">{t('common.continue')}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 'reset' && (
              <View className="mb-6">
                <Text className="text-center text-[#4C4E55] text-[14px] leading-[22px] mb-6">
                  {t('forgotPassword.subtitleReset', { email })}
                </Text>

                <View className="mb-6">
                  <Text className="text-[10px] text-[#34363E] mb-3 text-center">
                    {t('forgotPassword.verificationCodeLabel')}
                  </Text>
                  <View className="flex-row items-center justify-center flex-wrap gap-2">
                    {Array.from({ length: FORGOT_PASSWORD_OTP_LENGTH }, (_, index) => index).map(
                      (index) => {
                        const hasValue = !!forgotPasswordCodeDigits[index];
                        return (
                          <View
                            key={index}
                            pointerEvents="none"
                            className="h-[48px] w-[44px] items-center justify-center rounded-full border border-[#D9D9D9]"
                          >
                            <Text
                              className={`text-[20px] font-bold ${hasValue ? 'text-[#02050F]' : 'text-[#7D7E83]'}`}
                            >
                              {hasValue ? forgotPasswordCodeDigits[index] : '_'}
                            </Text>
                          </View>
                        );
                      }
                    )}
                  </View>
                </View>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('forgotPassword.newPassword')}
                  placeholderTextColor="#7D7E83"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                  style={{ fontFamily: FONT_FAMILY.regular }}
                  className="border border-[#D9D9D9] rounded-full px-4 py-4 text-[12px] text-[#02050F] min-h-[52px] mb-4"
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('forgotPassword.confirmPassword')}
                  placeholderTextColor="#7D7E83"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                  style={{ fontFamily: FONT_FAMILY.regular }}
                  className="border border-[#D9D9D9] rounded-full px-4 py-4 text-[12px] text-[#02050F] min-h-[52px] mb-6"
                />

                <TouchableOpacity
                  onPress={handleResetPassword}
                  activeOpacity={0.9}
                  disabled={!code || !newPassword || !confirmPassword || isLoading}
                  className={`rounded-full min-h-[52px] items-center justify-center px-8 bg-primary-600 ${!code || !newPassword || !confirmPassword || isLoading ? 'opacity-60' : 'opacity-100'}`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white text-base leading-6 font-semibold">{t('common.continue')}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleRequestCode} className="items-center mt-3">
                  <Text className="text-primary-600 text-[12px] font-bold">{t('forgotPassword.resendCode')}</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {step === 'request' && (
              <View className="flex-1" />
            )}
            <View className="items-center mt-6">
              <Text className="text-[#4C4E55] text-[12px]">
                {step === 'request' ? t('forgotPassword.footerRemember') : t('forgotPassword.footerBackLogin')}
                <Text className="text-primary-600 text-[12px] font-bold" onPress={onBackToLogin}>
                  {t('forgotPassword.signIn')}
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
