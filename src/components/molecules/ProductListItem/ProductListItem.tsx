/**
 * Product List Item
 * Componente para mostrar un producto en la lista de productos del stream
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../atoms/Text';
import { Trash2, Package } from 'lucide-react-native';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  unit: 'unidad' | 'lote';
}

interface ProductListItemProps {
  product: Product;
  onDelete: () => void;
}

export const ProductListItem: React.FC<ProductListItemProps> = ({ product, onDelete }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Package size={20} color="#2563eb" />
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="body" className="font-semibold text-gray-900 flex-1">
            {product.name}
          </Text>
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        <Text variant="caption" className="text-gray-600 mb-2" numberOfLines={2}>
          {product.description}
        </Text>
        
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text variant="caption" className="text-gray-500">
              Precio:
            </Text>
            <Text variant="caption" className="text-gray-900 font-semibold ml-1">
              {formatCurrency(product.price)}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text variant="caption" className="text-gray-500">
              Stock:
            </Text>
            <Text variant="caption" className="text-gray-900 font-semibold ml-1">
              {product.quantity} {product.unit === 'lote' ? 'lotes' : 'unidades'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  deleteButton: {
    padding: 4,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
