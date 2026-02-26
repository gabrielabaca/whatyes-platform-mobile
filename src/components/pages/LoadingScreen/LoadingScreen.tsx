/**
 * Loading Screen
 * Pantalla de carga mientras se verifica el estado de autenticación
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../atoms/Text';

export const LoadingScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-white justify-center items-center">
      <ActivityIndicator size="large" color="#0284c7" />
      <Text variant="body" className="text-gray-600 mt-4">
        Cargando...
      </Text>
    </SafeAreaView>
  );
};
