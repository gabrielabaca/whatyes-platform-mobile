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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { forgotPasswordRequest, resetPassword, ApiError } from '../../../api';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { isValidEmail, passwordMeetsPolicy } from '../../../utils/formValidation';
import { VerificationCodeScreen } from '../VerificationCodeScreen';

/** Mismo largo que `origin="forgotPassword"` en VerificationCodeScreen */
const FORGOT_PASSWORD_OTP_LENGTH = 4;

type Step = 'request' | 'reset';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBackToLogin,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const forgotPasswordCodeDigits = code.slice(0, FORGOT_PASSWORD_OTP_LENGTH).split('');

  // Paso 1: Solicitar código
  const handleRequestCode = async () => {
    setEmailError(null);
    if (!email.trim()) {
      setEmailError(t('forgotPassword.enterEmail'));
      return;
    }
    if (!isValidEmail(email.trim())) {
      setEmailError(t('common.invalidEmail'));
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
    setNewPasswordError(null);
    setConfirmPasswordError(null);

    if (!code || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('forgotPassword.fillAll'));
      return;
    }

    if (!passwordMeetsPolicy(newPassword)) {
      setNewPasswordError(t('register.passwordPolicyError'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError(t('forgotPassword.passwordsMismatch'));
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
                <ArrowLeft size={22} color={c.text} />
              </TouchableOpacity>
              <Text className="text-[20px] font-bold text-[#02050F] dark:text-white">
                {step === 'request' ? t('forgotPassword.titleRequest') : t('forgotPassword.titleReset')}
              </Text>
              <View className="w-8 h-8" />
            </View>

            {step === 'request' && (
              <>
                <Text className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px] mb-6">
                  {t('forgotPassword.subtitleRequest')}
                </Text>

                <View className="mb-7">
                  <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2">
                    {t('forgotPassword.emailLabel')}
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                    style={{ fontFamily: FONT_FAMILY.regular }}
                    className={`rounded-full px-4 py-4 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border ${
                      emailError ? 'border-[#E53935]' : 'border-[#D9D9D9] dark:border-[#D9D9D9]'
                    }`}
                  />
                  {emailError ? (
                    <Text className="mt-1 text-[10px] leading-[18px]" style={{ color: '#E53935' }}>
                      {emailError}
                    </Text>
                  ) : null}
                </View>

                <Button
                  title={t('common.continue')}
                  variant="primary"
                  size="large"
                  loading={isLoading}
                  disabled={!email.trim() || isLoading}
                  onPress={handleRequestCode}
                  activeOpacity={0.9}
                  className="w-full rounded-full"
                />
              </>
            )}

            {step === 'reset' && (
              <View className="mb-6">
                <Text className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px] mb-6">
                  {t('forgotPassword.subtitleReset', { email })}
                </Text>

                <View className="mb-6">
                  <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-3 text-center">
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
                            className="h-[48px] w-[44px] items-center justify-center rounded-full border border-[#D9D9D9] dark:border-night-700"
                          >
                            <Text
                              className={`text-[20px] font-bold ${hasValue ? 'text-[#02050F] dark:text-white' : 'text-[#7D7E83] dark:text-night-muted'}`}
                            >
                              {hasValue ? forgotPasswordCodeDigits[index] : '_'}
                            </Text>
                          </View>
                        );
                      }
                    )}
                  </View>
                </View>
                <View className="mb-6">
                  <View className="relative">
                    <TextInput
                      value={newPassword}
                      onChangeText={(v) => {
                        setNewPassword(v);
                        if (newPasswordError) setNewPasswordError(null);
                      }}
                      placeholder={t('forgotPassword.newPassword')}
                      placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      editable={!isLoading}
                      style={{ fontFamily: FONT_FAMILY.regular }}
                      className={`rounded-full px-4 py-4 pr-12 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border ${
                        newPasswordError ? 'border-[#E53935]' : 'border-[#D9D9D9] dark:border-[#D9D9D9]'
                      }`}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-0 bottom-0 justify-center"
                      disabled={isLoading}
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} color={c.text} />
                      ) : (
                        <Eye size={18} color={c.text} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {newPasswordError ? (
                    <Text className="mt-1 text-[10px] leading-[18px]" style={{ color: '#E53935' }}>
                      {newPasswordError}
                    </Text>
                  ) : null}
                  <View className="relative mt-3">
                    <TextInput
                      value={confirmPassword}
                      onChangeText={(v) => {
                        setConfirmPassword(v);
                        if (confirmPasswordError) setConfirmPasswordError(null);
                      }}
                      placeholder={t('forgotPassword.confirmPassword')}
                      placeholderTextColor={isDark ? themeColors.dark.textMuted : '#7D7E83'}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      editable={!isLoading}
                      style={{ fontFamily: FONT_FAMILY.regular }}
                      className={`rounded-full px-4 py-4 pr-12 text-[12px] text-[#02050F] dark:text-white dark:bg-night-800 min-h-[52px] border ${
                        confirmPasswordError ? 'border-[#E53935]' : 'border-[#D9D9D9] dark:border-[#D9D9D9]'
                      }`}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-0 bottom-0 justify-center"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} color={c.text} />
                      ) : (
                        <Eye size={18} color={c.text} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {confirmPasswordError ? (
                    <Text className="mt-1 text-[10px] leading-[18px]" style={{ color: '#E53935' }}>
                      {confirmPasswordError}
                    </Text>
                  ) : null}
                </View>

                <Button
                  title={t('common.continue')}
                  variant="primary"
                  size="large"
                  loading={isLoading}
                  disabled={!code || !newPassword || !confirmPassword || isLoading}
                  onPress={handleResetPassword}
                  activeOpacity={0.9}
                  className="w-full rounded-full"
                />

                <TouchableOpacity onPress={handleRequestCode} className="items-center mt-3">
                  <Text className="text-primary-600 text-[12px] font-bold">{t('forgotPassword.resendCode')}</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {step === 'request' && (
              <View className="flex-1" />
            )}
            <View className="items-center mt-6">
              <Text className="text-[#4C4E55] dark:text-night-muted text-[12px]">
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
