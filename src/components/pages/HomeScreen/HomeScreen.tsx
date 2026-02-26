/**
 * Home Screen
 * Pantalla principal después del login.
 * Lista canales en vivo desde el servidor de livestream (GET /rooms).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../../atoms/Text';
import { GeneralLayout } from '../../templates/GeneralLayout';
import { MenuOption } from '../../molecules/UserMenu';
import { StreamCard, StreamData } from '../../molecules/StreamCard';
import { SellerHomeScreen } from '../SellerHomeScreen';
import { LayoutGrid, Rows } from 'lucide-react-native';
import { useAuth } from '../../../hooks/useAuth';
import { getRooms } from '../../../api/livestreamApi';
import { LIVESTREAM_HTTP_URL } from '../../../api/config';

interface HomeScreenProps {
  onStreamPress?: (stream: StreamData | any) => void;
  onStartNewStream?: () => void;
  onEditDraft?: (draft: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStreamPress, onStartNewStream, onEditDraft }) => {
  const { user, logout } = useAuth();
  const [numColumns, setNumColumns] = useState(2);
  const [liveStreams, setLiveStreams] = useState<StreamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      const rooms = await getRooms();
      setLiveStreams(
        rooms.map((r) => {
          const snapshotUrl = r.snapshot_url
            ? (r.snapshot_url.startsWith('http') ? r.snapshot_url : `${LIVESTREAM_HTTP_URL}${r.snapshot_url}`)
            : undefined;
          return {
            id: r.room_id,
            sellerName: r.seller_name || 'Streamer',
            viewerCount: r.viewer_count,
            streamingTime: 'En vivo',
            thumbnail: snapshotUrl,
          };
        }),
      );
    } catch (e) {
      setLiveStreams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
          label: 'Inicio',
          value: 'home',
          onPress: handleNavigateToHome,
        },
        {
          label: 'Perfil',
          value: 'profile',
          onPress: handleNavigateToProfile,
        },
        {
          label: 'Mis Ventas',
          value: 'sales',
          onPress: handleNavigateToSales,
        },
        {
          label: 'Iniciar Stream',
          value: 'start_stream',
          onPress: handleStartStream,
        },
        {
          label: 'Facturación',
          value: 'billing',
          onPress: handleNavigateToBilling,
        },
        {
          label: 'Cerrar Sesión',
          value: 'logout',
          onPress: handleLogout,
        },
      ]
    : [
        {
          label: 'Inicio',
          value: 'home',
          onPress: handleNavigateToHome,
        },
        {
          label: 'Perfil',
          value: 'profile',
          onPress: handleNavigateToProfile,
        },
        {
          label: 'Mis Compras',
          value: 'purchases',
          onPress: handleNavigateToPurchases,
        },
        {
          label: 'Cerrar Sesión',
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
          ¡Bienvenido!
        </Text>
        <Text variant="body" className="text-gray-600">
          {user.name} {user.last_name}
        </Text>
      </View>
    );
  }

  return (
    <GeneralLayout title="WhatYes!" menuOptions={menuOptions}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerText}>
              <Text variant="h1" className="text-primary-600 mb-2">
                Streams en Vivo
              </Text>
              <Text variant="body" className="text-gray-600">
                {loading ? 'Cargando...' : `${liveStreams.length} transmisiones activas`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleViewMode}
              style={styles.viewToggleButton}
              activeOpacity={0.7}
            >
              {numColumns === 2 ? (
                <Rows size={24} color="#1f2937" />
              ) : (
                <LayoutGrid size={24} color="#1f2937" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Streams Grid/List */}
        <FlatList
          key={`streams-${numColumns}`}
          data={liveStreams}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text variant="body" className="text-gray-500">No hay transmisiones en vivo</Text>
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
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  viewToggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginTop: 4,
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
