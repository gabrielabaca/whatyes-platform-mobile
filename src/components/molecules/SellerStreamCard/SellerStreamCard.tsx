/**
 * Seller Stream Card
 * Tarjeta para mostrar información de un stream del seller
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Text } from '../../atoms/Text';
import { Eye, Heart, ShoppingCart, DollarSign } from 'lucide-react-native';

export interface SellerStreamData {
  id: string;
  title: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  salesCount: number;
  totalSales: number;
  date: string;
  duration: string;
  status: 'live' | 'ended';
}

interface SellerStreamCardProps {
  stream: SellerStreamData;
  onPress?: () => void;
}

export const SellerStreamCard: React.FC<SellerStreamCardProps> = ({ stream, onPress }) => {
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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: stream.thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {stream.status === 'live' && (
          <View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text variant="caption" className="text-white font-bold">
              EN VIVO
            </Text>
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text variant="caption" className="text-white">
            {stream.duration}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title and Date */}
        <View style={styles.header}>
          <Text variant="body" className="font-semibold text-gray-900 flex-1" numberOfLines={2}>
            {stream.title}
          </Text>
          <Text variant="caption" className="text-gray-500 ml-2">
            {stream.date}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {/* Views */}
          <View style={styles.statItem}>
            <Eye size={16} color="#6b7280" />
            <Text variant="caption" className="text-gray-600 ml-1">
              {formatNumber(stream.viewCount)}
            </Text>
          </View>

          {/* Likes */}
          <View style={styles.statItem}>
            <Heart size={16} color="#6b7280" />
            <Text variant="caption" className="text-gray-600 ml-1">
              {formatNumber(stream.likeCount)}
            </Text>
          </View>

          {/* Sales Count */}
          <View style={styles.statItem}>
            <ShoppingCart size={16} color="#6b7280" />
            <Text variant="caption" className="text-gray-600 ml-1">
              {stream.salesCount}
            </Text>
          </View>

          {/* Total Sales */}
          <View style={[styles.statItem, styles.totalSales]}>
            <DollarSign size={16} color="#059669" />
            <Text variant="caption" className="text-green-600 ml-1 font-bold">
              {formatCurrency(stream.totalSales)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbnailContainer: {
    width: 120,
    height: 100,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalSales: {
    marginLeft: 'auto',
  },
});
