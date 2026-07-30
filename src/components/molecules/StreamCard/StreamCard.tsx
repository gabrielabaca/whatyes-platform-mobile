/**
 * Stream Card Component
 * Tarjeta individual para mostrar un stream en vivo
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Text } from '../../atoms/Text';
import { Users, Clock } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';

export interface StreamData {
  id: string;
  sellerName: string;
  viewerCount: number;
  streamingTime: string; // Formato: "2h 30m" o "45m"
  thumbnail?: string;
  streamUrl?: string; // URL del stream en vivo
  title?: string;
  sellerAvatarUrl?: string | null;
  sellerRating?: number | null;
  /** UUID del vendedor (creador de la sala) para abrir su perfil público. */
  sellerUserId?: string;
  productImageUrl?: string;
  productCount?: number;
  /** URL de portada de la sala para mostrar como fondo mientras carga el video. */
  coverUrl?: string | null;
}

interface StreamCardProps {
  stream: StreamData;
  onPress?: () => void;
}

export const StreamCard: React.FC<StreamCardProps> = ({ stream, onPress }) => {
  const { isDark } = useTheme();
  /** Superficie y tinta del ícono por tema. El badge "EN VIVO" es semántico: no se tematiza. */
  const surface = isDark ? themeColors.dark.surface : themeColors.light.surface;
  const mutedIcon = isDark ? themeColors.dark.textMuted : '#6b7280';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: surface }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Thumbnail del stream */}
      <View style={styles.thumbnailContainer}>
        {stream.thumbnail ? (
          <Image source={{ uri: stream.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text className="text-white text-2xl font-bold">LIVE</Text>
          </View>
        )}
        
        {/* Badge de "En vivo" */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>EN VIVO</Text>
        </View>

        {/* Contador de viewers */}
        <View style={styles.viewerBadge}>
          <Users size={14} color="#ffffff" />
          <Text style={styles.viewerText}>{stream.viewerCount}</Text>
        </View>
      </View>

      {/* Información del stream */}
      <View style={styles.infoContainer}>
        <Text
          variant="body"
          className="text-gray-900 dark:text-white font-semibold mb-1"
          numberOfLines={1}
        >
          {stream.sellerName}
        </Text>
        <View style={styles.timeContainer}>
          <Clock size={12} color={mutedIcon} />
          <Text variant="caption" className="text-gray-500 dark:text-night-muted ml-1">
            {stream.streamingTime}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#1f2937',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 4,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  viewerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});
