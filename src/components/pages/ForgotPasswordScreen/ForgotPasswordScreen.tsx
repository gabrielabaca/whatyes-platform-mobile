/**
 * Forgot Password Screen
 * Pantalla para recuperar contraseña con flujo de dos pasos
 */

import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Text } from '../../atoms/Text';
import { forgotPasswordRequest, resetPassword, ApiError } from '../../../api';

type Step = 'request' | 'reset';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBackToLogin,
}) => {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Paso 1: Solicitar código
  const handleRequestCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPasswordRequest(email);
      Alert.alert(
        'Código enviado',
        'Se ha enviado un código de recuperación a tu correo electrónico.',
        [{ text: 'OK', onPress: () => setStep('reset') }]
      );
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'No se pudo enviar el código. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Restablecer contraseña con código
  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
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
        'Contraseña restablecida',
        'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
        [
          {
            text: 'OK',
            onPress: () => {
              onBackToLogin();
            },
          },
        ]
      );
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'No se pudo restablecer la contraseña. Verifica el código e intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'reset') {
      setStep('request');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      onBackToLogin();
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
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-primary-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
                <Text className="text-white text-2xl font-bold">🔒</Text>
              </View>
              <Text variant="h1" className="text-primary-600 mb-2">
                {step === 'request' && 'Recuperar contraseña'}
                {step === 'reset' && 'Restablecer contraseña'}
              </Text>
              <Text variant="body" className="text-gray-600 text-center px-4">
                {step === 'request' &&
                  'Ingresa tu correo electrónico para recibir un código de recuperación'}
                {step === 'reset' &&
                  `Ingresa el código que enviamos a ${email} y tu nueva contraseña`}
              </Text>
            </View>

            {/* Form Section */}
            <View className="mb-6">
              {/* Paso 1: Solicitar código */}
              {step === 'request' && (
                <>
                  <Input
                    label="Correo electrónico"
                    placeholder="tu@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    containerClassName="mb-6"
                  />

                  <Button
                    title="Enviar código"
                    onPress={handleRequestCode}
                    loading={isLoading}
                    disabled={!email || isLoading}
                    variant="primary"
                    size="large"
                    className="mb-4"
                  />
                </>
              )}

              {/* Paso 2: Restablecer contraseña con código */}
              {step === 'reset' && (
                <>
                  <Input
                    label="Código de verificación"
                    placeholder="123456"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={10}
                    containerClassName="mb-4"
                  />

                  <Input
                    label="Nueva contraseña"
                    placeholder="••••••••"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                    containerClassName="mb-4"
                  />

                  <Input
                    label="Confirmar contraseña"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                    containerClassName="mb-6"
                  />

                  <Button
                    title="Restablecer contraseña"
                    onPress={handleResetPassword}
                    loading={isLoading}
                    disabled={!code || !newPassword || !confirmPassword || isLoading}
                    variant="primary"
                    size="large"
                    className="mb-4"
                  />

                  <TouchableOpacity
                    onPress={handleRequestCode}
                    className="items-center mb-4"
                  >
                    <Text variant="caption" className="text-primary-600">
                      Reenviar código
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Back Button */}
              <TouchableOpacity onPress={handleBack} className="items-center mt-4">
                <Text variant="caption" className="text-gray-500">
                  {step === 'request' && '¿Recordaste tu contraseña? '}
                  {step !== 'request' && 'Volver'}
                </Text>
                {step === 'request' && (
                  <Text variant="caption" className="text-primary-600 font-semibold">
                    Inicia sesión
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
