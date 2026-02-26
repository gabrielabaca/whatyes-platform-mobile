/**
 * Verification Code Screen
 * Pantalla para ingresar el código de verificación recibido por correo
 */

import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Text } from '../../atoms/Text';
import { verifyUser, resendVerificationCode, ApiError } from '../../../api';

interface VerificationCodeScreenProps {
  email: string;
  userUuid: string;
  onVerificationSuccess: () => void;
  onBack?: () => void;
}

export const VerificationCodeScreen: React.FC<VerificationCodeScreenProps> = ({
  email,
  userUuid,
  onVerificationSuccess,
  onBack,
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (!code || code.trim().length === 0) {
      Alert.alert('Error', 'Por favor ingresa el código de verificación');
      return;
    }

    setIsLoading(true);
    try {
      await verifyUser({
        email,
        hash_code: code.trim(),
        user_uuid: userUuid,
      });

      Alert.alert(
        '¡Cuenta verificada!',
        'Tu cuenta ha sido verificada exitosamente. Ya puedes iniciar sesión.',
        [
          {
            text: 'OK',
            onPress: onVerificationSuccess,
          },
        ]
      );
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'El código de verificación es incorrecto. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await resendVerificationCode(email);
      Alert.alert('Código reenviado', 'Se ha enviado un nuevo código de verificación a tu correo.');
      setCode(''); // Limpiar el campo
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'No se pudo reenviar el código. Intenta nuevamente.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-8 pb-6 justify-center">
            {/* Header */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-primary-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
                <Text className="text-white text-2xl font-bold">✓</Text>
              </View>
              <Text variant="h1" className="text-primary-600 mb-2">
                Verifica tu cuenta
              </Text>
              <Text variant="body" className="text-gray-600 text-center px-4">
                Hemos enviado un código de verificación a
              </Text>
              <Text variant="body" className="text-primary-600 font-semibold mt-1">
                {email}
              </Text>
              <Text variant="caption" className="text-gray-500 text-center mt-2 px-4">
                Ingresa el código que recibiste por correo electrónico
              </Text>
            </View>

            {/* Form Section */}
            <View className="mb-6">
              <Input
                label="Código de verificación"
                placeholder="123456"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                maxLength={10}
                containerClassName="mb-6"
              />

              <Button
                title="Verificar cuenta"
                onPress={handleVerify}
                loading={isLoading}
                disabled={!code || isLoading}
                variant="primary"
                size="large"
                className="mb-4"
              />

              <View className="items-center mt-4">
                <Text variant="caption" className="text-gray-500 mb-2">
                  ¿No recibiste el código?
                </Text>
                <Button
                  title="Reenviar código"
                  onPress={handleResendCode}
                  loading={isResending}
                  disabled={isResending}
                  variant="outline"
                  size="medium"
                />
              </View>

              {onBack && (
                <View className="items-center mt-6">
                  <Button
                    title="Volver"
                    onPress={onBack}
                    variant="outline"
                    size="medium"
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
