/**
 * Seller Home Screen
 * Pantalla principal para usuarios seller con listado de sus streams
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text } from '../../atoms/Text';
import { GeneralLayout } from '../../templates/GeneralLayout';
import { MenuOption } from '../../molecules/UserMenu';
import { SellerStreamCard, SellerStreamData } from '../../molecules/SellerStreamCard';
import { Plus, TrendingUp, FileText } from 'lucide-react-native';
import { useAuth } from '../../../hooks/useAuth';
import { storage } from '../../../utils/storage';
import type { StreamConfig } from '../StreamConfigScreen';

interface SellerHomeScreenProps {
  onStreamPress?: (stream: SellerStreamData) => void;
  onStartNewStream?: () => void;
  onEditDraft?: (draft: StreamConfig) => void;
}

export const SellerHomeScreen: React.FC<SellerHomeScreenProps> = ({ 
  onStreamPress,
  onStartNewStream,
  onEditDraft,
}) => {
  const { user, logout } = useAuth();
  const [streamDraft, setStreamDraft] = useState<StreamConfig | null>(null);

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigateToProfile = () => {
    // TODO: Implementar navegación a perfil
    console.log('Navegar a Perfil');
  };

  const handleNavigateToSales = () => {
    // TODO: Implementar navegación a Mis Ventas
    console.log('Navegar a Mis Ventas');
  };

  const handleStartStream = () => {
    if (onStartNewStream) {
      onStartNewStream();
    } else {
      console.log('Iniciar Stream - onStartNewStream no está definido');
    }
  };

  const handleNavigateToBilling = () => {
    // TODO: Implementar navegación a Facturación
    console.log('Navegar a Facturación');
  };

  const handleNavigateToHome = () => {
    // Ya estamos en inicio
    console.log('Ya estás en Inicio');
  };

  const handleStreamPress = (stream: SellerStreamData) => {
    if (onStreamPress) {
      onStreamPress(stream);
    }
  };

  // Cargar borrador al montar el componente y cuando se vuelve a la pantalla
  useEffect(() => {
    loadStreamDraft();
    
    // Recargar borrador cuando se vuelve a la pantalla (focus)
    const focusListener = () => {
      loadStreamDraft();
    };
    
    // Nota: En una app real usarías React Navigation focus listener
    // Por ahora recargamos cada vez que el componente se monta
    return () => {
      // Cleanup si es necesario
    };
  }, []);

  const loadStreamDraft = async () => {
    try {
      const draft = await storage.getStreamDraft();
      if (draft) {
        setStreamDraft(draft);
      } else {
        setStreamDraft(null);
      }
    } catch (error) {
      console.error('Error al cargar borrador:', error);
      setStreamDraft(null);
    }
  };

  const handleEditDraft = () => {
    if (streamDraft && onEditDraft) {
      onEditDraft(streamDraft);
    }
  };

  // Datos hardcodeados de streams del seller
  const myStreams: SellerStreamData[] = [
    {
      id: '1',
      title: 'Colección Primavera-Verano 2026 - Parte 1',
      thumbnailUrl: 'https://picsum.photos/seed/stream1/300/200',
      viewCount: 2450,
      likeCount: 380,
      salesCount: 45,
      totalSales: 125000,
      date: '15 Ene',
      duration: '2h 30m',
      status: 'ended',
    },
    {
      id: '2',
      title: 'Ofertas Especiales de Electrónica',
      thumbnailUrl: 'https://picsum.photos/seed/stream2/300/200',
      viewCount: 1890,
      likeCount: 245,
      salesCount: 32,
      totalSales: 89500,
      date: '12 Ene',
      duration: '1h 45m',
      status: 'ended',
    },
    {
      id: '3',
      title: 'Lanzamiento Exclusivo - Nuevos Productos',
      thumbnailUrl: 'https://picsum.photos/seed/stream3/300/200',
      viewCount: 5600,
      likeCount: 892,
      salesCount: 78,
      totalSales: 234000,
      date: '10 Ene',
      duration: '3h 15m',
      status: 'ended',
    },
    {
      id: '4',
      title: 'Stream de Prueba - Configuración',
      thumbnailUrl: 'https://picsum.photos/seed/stream4/300/200',
      viewCount: 120,
      likeCount: 15,
      salesCount: 2,
      totalSales: 3500,
      date: '08 Ene',
      duration: '25m',
      status: 'ended',
    },
    {
      id: '5',
      title: 'Moda Deportiva - Colección Fitness',
      thumbnailUrl: 'https://picsum.photos/seed/stream5/300/200',
      viewCount: 3200,
      likeCount: 567,
      salesCount: 56,
      totalSales: 178000,
      date: '05 Ene',
      duration: '2h 50m',
      status: 'ended',
    },
    {
      id: '6',
      title: 'Accesorios y Complementos - Tendencias 2026',
      thumbnailUrl: 'https://picsum.photos/seed/stream6/300/200',
      viewCount: 1450,
      likeCount: 234,
      salesCount: 28,
      totalSales: 45600,
      date: '02 Ene',
      duration: '1h 20m',
      status: 'ended',
    },
    {
      id: '7',
      title: 'Liquidación de Temporada - Últimas Unidades',
      thumbnailUrl: 'https://picsum.photos/seed/stream7/300/200',
      viewCount: 4100,
      likeCount: 678,
      salesCount: 92,
      totalSales: 156000,
      date: '28 Dic',
      duration: '4h 10m',
      status: 'ended',
    },
    {
      id: '8',
      title: 'Especial Navidad - Regalos Únicos',
      thumbnailUrl: 'https://picsum.photos/seed/stream8/300/200',
      viewCount: 6800,
      likeCount: 1200,
      salesCount: 124,
      totalSales: 389000,
      date: '20 Dic',
      duration: '5h 30m',
      status: 'ended',
    },
  ];

  if (!user) {
    return null;
  }

  // Calcular estadísticas totales
  const totalViews = myStreams.reduce((acc, stream) => acc + stream.viewCount, 0);
  const totalSales = myStreams.reduce((acc, stream) => acc + stream.totalSales, 0);
  const totalStreamCount = myStreams.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const menuOptions: MenuOption[] = [
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
  ];

  return (
    <GeneralLayout title="Mis Streams" menuOptions={menuOptions}>
      <View style={styles.container}>
        {/* Stats Header */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <TrendingUp size={20} color="#059669" />
            <View style={styles.statContent}>
              <Text variant="h2" className="text-gray-900 font-bold">
                {formatCurrency(totalSales)}
              </Text>
              <Text variant="caption" className="text-gray-500">
                Ventas Totales
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.miniStatCard}>
              <Text variant="body" className="text-gray-900 font-bold">
                {totalStreamCount}
              </Text>
              <Text variant="caption" className="text-gray-500">
                Streams
              </Text>
            </View>

            <View style={styles.miniStatCard}>
              <Text variant="body" className="text-gray-900 font-bold">
                {formatNumber(totalViews)}
              </Text>
              <Text variant="caption" className="text-gray-500">
                Views
              </Text>
            </View>
          </View>
        </View>

        {/* New Stream Button */}
        <TouchableOpacity
          style={styles.newStreamButton}
          onPress={handleStartStream}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#ffffff" />
          <Text variant="body" className="text-white font-semibold ml-2">
            Iniciar Nuevo Stream
          </Text>
        </TouchableOpacity>

        {/* Draft Stream Card */}
        {streamDraft && (
          <TouchableOpacity
            style={styles.draftCard}
            onPress={handleEditDraft}
            activeOpacity={0.7}
          >
            <View style={styles.draftCardContent}>
              <View style={styles.draftIconContainer}>
                <FileText size={24} color="#0284c7" />
              </View>
              <View style={styles.draftInfo}>
                <Text variant="body" className="text-gray-900 font-semibold">
                  {streamDraft.title || 'Borrador sin título'}
                </Text>
                <Text variant="caption" className="text-gray-500 mt-1">
                  {streamDraft.products?.length || 0} producto(s) • Borrador
                </Text>
              </View>
              <View style={styles.draftBadge}>
                <Text variant="caption" className="text-primary-600 font-semibold">
                  Editar
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Streams List */}
        <View style={styles.listHeader}>
          <Text variant="h3" className="text-gray-900 font-semibold">
            Historial de Streams
          </Text>
          <Text variant="caption" className="text-gray-500">
            {myStreams.length} transmisiones
          </Text>
        </View>

        <FlatList
          data={myStreams}
          renderItem={({ item }) => (
            <SellerStreamCard
              stream={item}
              onPress={() => handleStreamPress(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="body" className="text-gray-500 text-center">
                No tienes streams aún
              </Text>
              <Text variant="caption" className="text-gray-400 text-center mt-2">
                ¡Inicia tu primer transmisión!
              </Text>
            </View>
          }
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
  statsContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statContent: {
    marginLeft: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  newStreamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  draftCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  draftCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  draftIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  draftInfo: {
    flex: 1,
  },
  draftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
});
