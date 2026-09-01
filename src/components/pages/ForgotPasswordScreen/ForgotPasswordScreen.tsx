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
  TouchableOpacity,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Eye, EyeOff } from 'lucide-react-native';
import { AuthHeader } from '../../molecules/auth';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { forgotPasswordRequest, resetPassword, ApiError } from '../../../api';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import { isValidEmail, passwordMeetsPolicy } from '../../../utils/formValidation';
import { VerificationCodeScreen } from '../VerificationCodeScreen';
import { appAlert } from '../../../alerts';

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
        appAlert(t('common.error'), error.message);
      } else {
        appAlert(t('common.error'), t('forgotPassword.sendCodeFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Restablecer contraseña con código
  const handleResetPassword = async () => {
    setNewPasswordError(null);
    setConfirmPasswordError(null);

    // Campos vacíos: error inline por campo (mismo criterio que Login y Crear Cuenta).
    if (!newPassword || !confirmPassword) {
      if (!newPassword) setNewPasswordError(t('register.fillRequired'));
      if (!confirmPassword) setConfirmPasswordError(t('register.fillRequired'));
      return;
    }

    // Sin código no hay reset posible: solo puede pasar si algo rompió el flujo del OTP.
    if (!code) {
      appAlert(t('common.error'), t('forgotPassword.fillAll'));
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

      appAlert(
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
        appAlert(t('common.error'), error.message);
      } else {
        appAlert(t('common.error'), t('forgotPassword.resetFailed'));
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
        <KeyboardDismissScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-4 pb-6">
            {/* Figma 1109:2387 / 1118:4638 diseña este flujo con un ENLACE por email
                ("Te enviaremos un enlace", "¿No recibiste el enlace? Reenviar enlace en
                40s", link final "Cancelar" sin paso de código). El backend real
                (authApi.resetPassword) exige `hash_code`, así que el flujo intercala la
                pantalla de verificación con un código de 4 dígitos. Acá se sigue el
                Figma en títulos, labels y botones, pero el copy habla de código y el
                reenvío vive en VerificationCodeScreen, con el cooldown de 60 s de
                ChangePasswordModal (no los 40 s del enlace dibujado).
                No "corregirlo" hacia el enlace sin un cambio de backend. */}
            <AuthHeader
              title={
                step === 'request'
                  ? t('forgotPassword.titleRequest')
                  : t('forgotPassword.titleReset')
              }
              onBack={handleBack}
              className="mt-2 mb-8"
            />

            {step === 'request' && (
              <>
                <Text className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px] mb-6">
                  {t('forgotPassword.subtitleRequest')}
                </Text>

                <View className="mb-7">
                  <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2">
                    {t('forgotPassword.emailLabel')}
                  </Text>
                  <AppTextInput
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
                  title={t('forgotPassword.requestCta')}
                  variant="primary"
                  size="large"
                  loading={isLoading}
                  disabled={isLoading}
                  onPress={handleRequestCode}
                  activeOpacity={0.9}
                  className="w-full rounded-full"
                />
              </>
            )}

            {step === 'reset' && (
              <View className="mb-6">
                <Text className="text-center text-[#4C4E55] dark:text-night-muted text-[14px] leading-[22px] mb-6">
                  {t('forgotPassword.subtitleReset')}
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
                  <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2">
                    {t('common.password')}
                  </Text>
                  <View className="relative">
                    <AppTextInput
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
                      accessibilityRole="button"
                      accessibilityLabel={showNewPassword ? t('common.hidePassword') : t('common.showPassword')}
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
                  <Text className="text-[10px] text-[#34363E] dark:text-night-muted mb-2 mt-3">
                    {t('register.confirmPassword')}
                  </Text>
                  <View className="relative">
                    <AppTextInput
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
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? t('common.hidePassword') : t('common.showPassword')}
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

                  <View className="flex-row gap-2 mt-3">
                    <View className="mt-0.5">
                      <Check size={14} color={themeColors.success} strokeWidth={3} />
                    </View>
                    <Text className="flex-1 text-[10px] leading-[18px] text-[#4C4E55] dark:text-night-muted tracking-[0.05px]">
                      {t('register.passwordPolicyHint')}
                    </Text>
                  </View>
                </View>

                <Button
                  title={t('forgotPassword.resetCta')}
                  variant="primary"
                  size="large"
                  loading={isLoading}
                  disabled={isLoading}
                  onPress={handleResetPassword}
                  activeOpacity={0.9}
                  className="w-full rounded-full"
                />

                {/* Figma: link único "Cancelar". El reenvío del código no va acá:
                    vive en VerificationCodeScreen, a un "volver" de distancia. */}
                <Button
                  title={t('common.cancel')}
                  variant="ghost"
                  size="medium"
                  disabled={isLoading}
                  onPress={onBackToLogin}
                  titleClassName="text-[16px] font-semibold"
                  className="mt-4 self-center"
                />
              </View>
            )}
            
            {step === 'request' && (
              <>
                <View className="flex-1" />
                {/* El pie del Figma ("¿No recibiste el enlace? Reenviar enlace en 40s")
                    describe el flujo por enlace que no existe; ver el comentario del
                    header. Este pie da la salida real: volver al login. */}
                <View className="items-center mt-6">
                  <Text className="text-[#4C4E55] dark:text-night-muted text-[12px]">
                    {t('forgotPassword.footerRemember')}
                    <Text
                      className="text-primary-600 text-[12px] font-bold"
                      accessibilityRole="link"
                      onPress={onBackToLogin}
                    >
                      {t('forgotPassword.signIn')}
                    </Text>
                  </Text>
                </View>
              </>
            )}
          </View>
        </KeyboardDismissScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
