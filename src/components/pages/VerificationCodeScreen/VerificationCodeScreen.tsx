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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
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
                <ArrowLeft size={22} color="#02050F" />
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

            <TouchableOpacity
              onPress={handleVerify}
              activeOpacity={0.9}
              disabled={code.length !== otpLength || isLoading}
              className={`rounded-full min-h-[52px] items-center justify-center px-8 bg-primary-600 ${code.length !== otpLength || isLoading ? 'opacity-60' : 'opacity-100'}`}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base leading-6 font-semibold">{t('common.continue')}</Text>
              )}
            </TouchableOpacity>

            <View className="items-center mt-3">
              <Text className="text-[#4C4E55] text-[12px]">
                {t('verification.noReceivedPrompt')}{' '}
                <Text
                  className="text-primary-600 text-[12px] font-bold"
                  onPress={isResending ? undefined : handleResendCode}
                >
                  {isResending ? t('verification.resending') : t('verification.resend')}
                </Text>
              </Text>
            </View>

            {onBack && (
              <View className="items-center mt-6">
                <TouchableOpacity onPress={onBack}>
                  <Text className="text-[#4C4E55] text-[12px] underline">{t('verification.back')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
