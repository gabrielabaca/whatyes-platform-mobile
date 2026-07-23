/**
 * Verification Code Screen
 * Pantalla para ingresar el código de verificación recibido por correo
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
import { ArrowLeft } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';
import { verifyUser, resendVerificationCode, forgotPasswordRequest, ApiError } from '../../../api';
import type { VerifyUserResponse } from '../../../api/types';
import { storage } from '../../../utils/storage';
import { FONT_FAMILY } from '../../../theme/typography';

export type VerificationOrigin = 'register' | 'forgotPassword';

interface VerificationCodeScreenProps {
  email: string;
  /** Obligatorio cuando origin es registro de cuenta */
  userUuid?: string;
  /** Origen del flujo (por defecto registro) */
  origin?: VerificationOrigin;
  /** Perfil en registro: el vendedor no debe conservar tokens (sigue yendo al login). */
  registrationProfile?: 'buyer' | 'seller';
  onVerificationSuccess: () => void;
  /**
   * Si se define (p. ej. comprador), se llama con la respuesta del API sin alert de éxito
   * (tokens ya guardados en storage salvo que se limpien para vendedor).
   */
  onVerifiedRaw?: (result: VerifyUserResponse) => void | Promise<void>;
  /** Solo flujo forgotPassword: código listo para restablecer contraseña */
  onForgotPasswordCodeNext?: (code: string) => void;
  onBack?: () => void;
}

export const VerificationCodeScreen: React.FC<VerificationCodeScreenProps> = ({
  email,
  userUuid,
  origin = 'register',
  registrationProfile,
  onVerificationSuccess,
  onVerifiedRaw,
  onForgotPasswordCodeNext,
  onBack,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const otpLength = 4;
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const codeDigits = code.slice(0, otpLength).split('');
  const activeIndex = Math.min(codeDigits.length, otpLength - 1);

  const handleVerify = async () => {
    if (!code || code.trim().length !== otpLength) {
      Alert.alert(
        t('common.error'),
        origin === 'forgotPassword'
          ? t('verification.enterCodeN', { count: otpLength })
          : t('verification.enterCode4')
      );
      return;
    }

    if (origin === 'forgotPassword') {
      onForgotPasswordCodeNext?.(code.trim());
      return;
    }

    if (!userUuid) {
      Alert.alert(t('common.error'), t('verification.missingUserUuid'));
      return;
    }

    setIsLoading(true);
    try {
      const data = await verifyUser({
        email,
        hash_code: code.trim(),
        user_uuid: userUuid,
      });

      if (
        origin === 'register' &&
        registrationProfile === 'seller' &&
        (data.access_token || data.refresh_token)
      ) {
        await storage.clearAuthTokens();
      }

      if (onVerifiedRaw) {
        await onVerifiedRaw(data);
        return;
      }

      Alert.alert(
        t('verification.verifiedTitle'),
        t('verification.verifiedBody'),
        [
          {
            text: t('common.ok'),
            onPress: onVerificationSuccess,
          },
        ]
      );
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.error'), t('verification.wrongCode'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      if (origin === 'forgotPassword') {
        await forgotPasswordRequest(email);
      } else {
        await resendVerificationCode(email);
      }
      Alert.alert(t('verification.resendTitle'), t('verification.resendBody'));
      setCode('');
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.error'), t('verification.resendFailed'));
      }
    } finally {
      setIsResending(false);
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
          <View className="flex-1 px-6 pt-4 pb-6">
            <View className="flex-row items-center justify-between mt-2 mb-10">
              <TouchableOpacity
                onPress={onBack}
                className="w-8 h-8 items-start justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={22} color={c.text} />
              </TouchableOpacity>
              <Text className="text-[20px] font-bold text-[#02050F]">{t('verification.title')}</Text>
              <View className="w-8 h-8" />
            </View>

            <Text className="text-center text-[#4C4E55] text-[14px] leading-[22px] mb-10">
              {origin === 'forgotPassword'
                ? t('verification.introForgot', { count: otpLength, email })
                : t('verification.introRegister', { email })}
            </Text>

            <View className="items-center mb-10">
              <TextInput
                value={code}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, otpLength))}
                keyboardType="number-pad"
                maxLength={otpLength}
                autoFocus
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, fontFamily: FONT_FAMILY.regular }}
              />

              <View
                className={`flex-row items-center justify-center flex-wrap ${origin === 'forgotPassword' ? 'gap-2' : 'gap-[18px]'}`}
              >
                {Array.from({ length: otpLength }, (_, index) => index).map((index) => {
                  const hasValue = !!codeDigits[index];
                  const isActive = index === activeIndex && codeDigits.length < otpLength;
                  const slotSize =
                    origin === 'forgotPassword' ? 'w-[44px] h-[48px]' : 'w-[51px] h-[52px]';
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={1}
                      onPress={() => {}}
                      className={`${slotSize} rounded-full items-center justify-center border ${isActive ? 'border-[#49A9E1]' : 'border-[#D9D9D9]'}`}
                    >
                      <Text className={`text-[20px] font-bold ${hasValue ? 'text-[#02050F]' : 'text-[#7D7E83]'}`}>
                        {hasValue ? codeDigits[index] : '_'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Button
              title={t('common.continue')}
              variant="primary"
              size="large"
              loading={isLoading}
              disabled={code.length !== otpLength || isLoading}
              onPress={handleVerify}
              className="w-full min-h-[52px] rounded-full"
            />

            <View className="items-center mt-3 gap-1">
              <Text className="text-[#4C4E55] dark:text-night-muted text-[12px]">
                {t('verification.noReceivedPrompt')}
              </Text>
              <Button
                title={isResending ? t('verification.resending') : t('verification.resend')}
                variant="ghost"
                size="small"
                loading={isResending}
                disabled={isResending}
                onPress={handleResendCode}
                titleClassName="text-[12px] font-bold"
                className="min-h-[36px] px-2"
              />
            </View>

            {onBack ? (
              <Button
                title={t('verification.back')}
                variant="ghost"
                size="small"
                onPress={onBack}
                titleClassName="text-[12px] text-[#4C4E55] dark:text-night-muted underline"
                className="mt-6 self-center min-h-[36px] px-2"
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
