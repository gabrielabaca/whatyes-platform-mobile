/**
 * Home Screen
 * Pantalla principal después del login.
 * Lista canales en vivo desde service-platform (GET /rooms, solo estado live).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../atoms/Text';
import { GeneralLayout } from '../../templates/GeneralLayout';
import { MenuOption } from '../../molecules/UserMenu';
import { StreamCard, StreamData } from '../../molecules/StreamCard';
import { SellerHomeScreen } from '../SellerHomeScreen';
import { LayoutGrid, Rows } from 'lucide-react-native';
import { useAuth } from '../../../hooks/useAuth';
import { getRooms } from '../../../api/platformApi';
import { storage } from '../../../utils/storage';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';

interface HomeScreenProps {
  onStreamPress?: (stream: StreamData | any) => void;
  onStartNewStream?: () => void;
  onEditDraft?: (draft: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStreamPress, onStartNewStream, onEditDraft }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const iconColor = isDark ? themeColors.dark.text : '#1f2937';
  const [numColumns, setNumColumns] = useState(2);
  const [liveStreams, setLiveStreams] = useState<StreamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setLiveStreams([]);
        return;
      }
      const rooms = await getRooms(token);
      setLiveStreams(
        rooms.map((r) => ({
          id: r.uuid,
          sellerName: r.name || r.stream_name || t('home.defaultRoomName'),
          viewerCount: 0,
          streamingTime: t('home.liveBadge'),
          thumbnail: undefined,
        })),
      );
    } catch (e) {
      setLiveStreams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 15000);
    return () => clearInterval(interval);
  }, [loadRooms]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigateToProfile = () => {
    // TODO: Implementar navegación a perfil
    console.log('Navegar a Perfil');
  };

  const handleNavigateToPurchases = () => {
    // TODO: Implementar navegación a Mis Compras
    console.log('Navegar a Mis Compras');
  };

  const handleNavigateToSales = () => {
    // TODO: Implementar navegación a Mis Ventas
    console.log('Navegar a Mis Ventas');
  };

  const handleStartStream = () => {
    // TODO: Implementar navegación a Iniciar Stream
    console.log('Iniciar Stream');
  };

  const handleNavigateToBilling = () => {
    // TODO: Implementar navegación a Facturación
    console.log('Navegar a Facturación');
  };

  const handleNavigateToHome = () => {
    // Ya estamos en inicio, solo cerrar el menú
    console.log('Ya estás en Inicio');
  };

  const handleStreamPress = (stream: StreamData) => {
    if (onStreamPress) {
      onStreamPress(stream);
    }
  };

  const toggleViewMode = () => {
    setNumColumns(numColumns === 2 ? 1 : 2);
  };

  if (!user) {
    return null;
  }

  // Opciones de menú específicas según el tipo de usuario
  const menuOptions: MenuOption[] = user.user_type === 'seller_user' 
    ? [
        {
          label: t('home.menuHome'),
          value: 'home',
          onPress: handleNavigateToHome,
        },
        {
          label: t('home.menuProfile'),
          value: 'profile',
          onPress: handleNavigateToProfile,
        },
        {
          label: t('home.menuSales'),
          value: 'sales',
          onPress: handleNavigateToSales,
        },
        {
          label: t('home.menuStartStream'),
          value: 'start_stream',
          onPress: handleStartStream,
        },
        {
          label: t('home.menuBilling'),
          value: 'billing',
          onPress: handleNavigateToBilling,
        },
        {
          label: t('home.menuLogout'),
          value: 'logout',
          onPress: handleLogout,
        },
      ]
    : [
        {
          label: t('home.menuHome'),
          value: 'home',
          onPress: handleNavigateToHome,
        },
        {
          label: t('home.menuProfile'),
          value: 'profile',
          onPress: handleNavigateToProfile,
        },
        {
          label: t('home.menuPurchases'),
          value: 'purchases',
          onPress: handleNavigateToPurchases,
        },
        {
          label: t('home.menuLogout'),
          value: 'logout',
          onPress: handleLogout,
        },
      ];

  // Si es seller_user, mostrar SellerHomeScreen
  if (user.user_type === 'seller_user') {
    return (
      <SellerHomeScreen 
        onStreamPress={onStreamPress}
        onStartNewStream={onStartNewStream}
        onEditDraft={onEditDraft}
      />
    );
  }

  // Si no es buyer_user ni seller_user, mostrar pantalla simple
  if (user.user_type !== 'buyer_user') {
    return (
      <View className="flex-1 bg-white p-6">
        <Text variant="h1" className="text-primary-600 mb-2">
          {t('home.welcome')}
        </Text>
        <Text variant="body" className="text-gray-600">
          {user.name} {user.last_name}
        </Text>
      </View>
    );
  }

  return (
    <GeneralLayout title={t('common.appName')} menuOptions={menuOptions}>
      <View style={styles.container} className="bg-[#f9fafb] dark:bg-night-950">
        {/* Header Section */}
        <View className="border-b border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-night-700 dark:bg-night-900">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text variant="h1" className="mb-2 text-primary-600 dark:text-primary-400">
                {t('home.liveStreams')}
              </Text>
              <Text variant="body" className="text-gray-600 dark:text-night-muted">
                {loading ? t('common.loading') : t('home.activeStreams', { count: liveStreams.length })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleViewMode}
              className="mt-1 rounded-lg bg-gray-100 p-2 dark:bg-night-800"
              activeOpacity={0.7}
            >
              {numColumns === 2 ? (
                <Rows size={24} color={iconColor} />
              ) : (
                <LayoutGrid size={24} color={iconColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Streams Grid/List */}
        <FlatList
          key={`streams-${numColumns}`}
          data={liveStreams}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary}
              colors={[themeColors.primary]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text variant="body" className="text-gray-500 dark:text-night-muted">
                  {t('home.noLiveStreams')}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={numColumns === 2 ? styles.cardWrapper : styles.cardWrapperFull}>
              <StreamCard
                stream={item}
                onPress={() => handleStreamPress(item)}
              />
            </View>
          )}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns === 2 ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </GeneralLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 8,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
  cardWrapperFull: {
    width: '100%',
  },
});
