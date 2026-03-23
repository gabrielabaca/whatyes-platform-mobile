/**
 * Loading Screen
 * Pantalla de carga mientras se verifica el estado de autenticación
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../atoms/Text';

export const LoadingScreen: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-night-950 justify-center items-center">
      <ActivityIndicator size="large" color="#0284c7" />
      <Text variant="body" className="text-gray-600 dark:text-night-muted mt-4">
        {t('loading.message')}
      </Text>
    </SafeAreaView>
  );
};
