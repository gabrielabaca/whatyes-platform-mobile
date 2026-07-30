/**
 * Product List Item
 * Componente para mostrar un producto en la lista de productos del stream
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../atoms/Text';
import { Trash2, Package } from 'lucide-react-native';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';

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
  const { isDark } = useTheme();
  /**
   * Superficie, borde y píldora del ícono por tema. El acento usa `primary` en ambos
   * temas: este ítem se renderiza dentro de StreamConfigScreen, que ya migró su azul
   * `#2563eb` (fuera de paleta) a `primary`, y convivían los dos azules en pantalla.
   */
  const surface = isDark ? themeColors.dark.surface : themeColors.light.surface;
  const border = isDark ? themeColors.dark.borderSubtle : '#e5e7eb';
  const iconBg = isDark ? themeColors.dark.surfaceAlt : themeColors.primaryTint;
  const iconColor = themeColors.primary;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor: border }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Package size={20} color={iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="body" className="font-semibold text-gray-900 dark:text-white flex-1">
            {product.name}
          </Text>
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Trash2 size={18} color={themeColors.danger} />
          </TouchableOpacity>
        </View>
        
        <Text
          variant="caption"
          className="text-gray-600 dark:text-night-muted mb-2"
          numberOfLines={2}
        >
          {product.description}
        </Text>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text variant="caption" className="text-gray-500 dark:text-night-muted">
              Precio:
            </Text>
            <Text variant="caption" className="text-gray-900 dark:text-white font-semibold ml-1">
              {formatCurrency(product.price)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text variant="caption" className="text-gray-500 dark:text-night-muted">
              Stock:
            </Text>
            <Text variant="caption" className="text-gray-900 dark:text-white font-semibold ml-1">
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
