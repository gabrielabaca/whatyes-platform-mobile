/**
 * Register Screen
 * Pantalla de registro con tabs para buyer y seller
 */

import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Text } from '../../atoms/Text';
import { TabSelector, TabOption } from '../../molecules/TabSelector';
import { CountrySelect } from '../../molecules/CountrySelect';
import { VerificationCodeScreen } from '../VerificationCodeScreen';
import { createBuyerUser, createSellerUser, ApiError } from '../../../api';
import type { CreateBuyerUserRequest, CreateSellerUserRequest } from '../../../api/types';

type UserType = 'buyer' | 'seller';

interface RegisterScreenProps {
  onBackToLogin: () => void;
  onRegisterSuccess?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onBackToLogin,
  onRegisterSuccess,
}) => {
  const [userType, setUserType] = useState<UserType>('buyer');
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

  const tabOptions: TabOption[] = [
    { label: 'Comprador', value: 'buyer' },
    { label: 'Streamer', value: 'seller' },
  ];

  const validateBuyerForm = (): boolean => {
    if (!email || !name || !password || !repeatPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return false;
    }

    if (password !== repeatPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    return true;
  };

  const validateSellerForm = (): boolean => {
    if (!validateBuyerForm()) {
      return false;
    }

    if (!customerName) {
      Alert.alert('Error', 'El nombre del cliente es obligatorio');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
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
            'Éxito',
            'Tu cuenta ha sido creada. Revisa tu correo para verificar tu cuenta.',
            [
              {
                text: 'OK',
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
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Error', 'No se pudo crear la cuenta. Intenta nuevamente.');
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
            'Éxito',
            'Tu cuenta de streamer ha sido creada. Revisa tu correo para verificar tu cuenta.',
            [
              {
                text: 'OK',
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
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Error', 'No se pudo crear la cuenta. Intenta nuevamente.');
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
          <View className="flex-1 px-6 pt-8 pb-6">
            {/* Header */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-primary-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
                <Text className="text-white text-3xl font-bold">WY</Text>
              </View>
              <Text variant="h1" className="text-primary-600 mb-2">
                Crear cuenta
              </Text>
              <Text variant="body" className="text-gray-600 text-center">
                Únete a WhatYes!
              </Text>
            </View>

            {/* Tab Selector */}
            <TabSelector
              options={tabOptions}
              selectedValue={userType}
              onValueChange={(value) => setUserType(value as UserType)}
            />

            {/* Form Section */}
            <View className="mb-6">
              {/* Información Personal */}
              <Text variant="h3" className="mb-4 text-gray-800">
                Información Personal
              </Text>

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
                label="Nombre"
                placeholder="Juan"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                containerClassName="mb-4"
              />

              <Input
                label="Apellido"
                placeholder="Pérez"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
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
                containerClassName="mb-4"
              />

              <Input
                label="Confirmar contraseña"
                placeholder="••••••••"
                value={repeatPassword}
                onChangeText={setRepeatPassword}
                secureTextEntry
                autoCapitalize="none"
                containerClassName="mb-6"
              />

              {/* Información del Cliente (solo para seller) */}
              {userType === 'seller' && (
                <>
                  <Text variant="h3" className="mb-4 text-gray-800 mt-2">
                    Información del Cliente
                  </Text>

                  <Input
                    label="Nombre del cliente *"
                    placeholder="Mi Empresa"
                    value={customerName}
                    onChangeText={setCustomerName}
                    autoCapitalize="words"
                    containerClassName="mb-4"
                  />

                  <Input
                    label="Dominio"
                    placeholder="miempresa.com"
                    value={customerDomain}
                    onChangeText={setCustomerDomain}
                    autoCapitalize="none"
                    keyboardType="url"
                    containerClassName="mb-4"
                  />

                  <Input
                    label="Dirección"
                    placeholder="Calle y número"
                    value={customerAddressLine1}
                    onChangeText={setCustomerAddressLine1}
                    containerClassName="mb-4"
                  />

                  <Input
                    label="Ciudad"
                    placeholder="Ciudad"
                    value={customerCity}
                    onChangeText={setCustomerCity}
                    autoCapitalize="words"
                    containerClassName="mb-4"
                  />

                  <View className="flex-row mb-4">
                    <View className="flex-1 mr-2">
                      <Input
                        label="Estado/Provincia"
                        placeholder="Estado"
                        value={customerState}
                        onChangeText={setCustomerState}
                        autoCapitalize="words"
                      />
                    </View>
                    <View className="flex-1 ml-2">
                      <Input
                        label="Código Postal"
                        placeholder="12345"
                        value={customerPostalCode}
                        onChangeText={setCustomerPostalCode}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <CountrySelect
                    label="País"
                    value={customerCountry}
                    onValueChange={setCustomerCountry}
                    placeholder="Seleccionar país"
                    containerClassName="mb-4"
                  />

                  <Input
                    label="Teléfono de contacto"
                    placeholder="+1234567890"
                    value={customerContactPhone}
                    onChangeText={setCustomerContactPhone}
                    keyboardType="phone-pad"
                    containerClassName="mb-6"
                  />
                </>
              )}

              <Button
                title={userType === 'buyer' ? 'Crear cuenta' : 'Crear cuenta de streamer'}
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                variant="primary"
                size="large"
                className="mb-4"
              />

              {/* Back to Login */}
              <TouchableOpacity onPress={onBackToLogin} className="items-center mt-4">
                <Text variant="caption" className="text-gray-500">
                  ¿Ya tienes una cuenta?{' '}
                  <Text variant="caption" className="text-primary-600 font-semibold">
                    Inicia sesión
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
