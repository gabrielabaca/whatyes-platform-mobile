import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Text } from '../../atoms/Text';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../api';

interface LoginScreenProps {
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      await login({
        username: email,
        password,
      });
      // La navegación se maneja automáticamente en App.tsx
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'No se pudo iniciar sesión. Intenta nuevamente.');
      }
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
            {/* Logo / Header Section */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-primary-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
                <Text className="text-white text-3xl font-bold">WY</Text>
              </View>
              <Text variant="h1" className="text-primary-600 mb-2">
                WhatYes!
              </Text>
              <Text variant="body" className="text-gray-600 text-center">
                Inicia sesión para continuar
              </Text>
            </View>

            {/* Form Section */}
            <View className="mb-6">
              <Input
                label="Correo electrónico"
                placeholder="tu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                containerClassName="mb-4"
              />

              <Input
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                containerClassName="mb-6"
              />

              <Button
                title="Iniciar sesión"
                onPress={handleLogin}
                loading={isLoading}
                disabled={!email || !password || isLoading}
                variant="primary"
                size="large"
                className="mb-4"
              />

              <TouchableOpacity
                onPress={onNavigateToForgotPassword}
                className="items-center mt-4"
              >
                <Text variant="caption" className="text-primary-600 underline">
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <TouchableOpacity onPress={onNavigateToRegister} className="mt-8 items-center">
              <Text variant="caption" className="text-gray-500">
                ¿No tienes una cuenta?{' '}
                <Text variant="caption" className="text-primary-600 font-semibold">
                  Regístrate
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
