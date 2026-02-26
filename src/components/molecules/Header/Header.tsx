/**
 * Header Component
 * Header de la aplicación con título y botón de menú
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../../atoms/Text';
import { Menu } from 'lucide-react-native';

interface HeaderProps {
  title: string;
  onMenuPress: () => void;
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onMenuPress,
  showMenuButton = true,
}) => {
  return (
    <View style={styles.header}>
      {showMenuButton && (
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.menuButton}
          activeOpacity={0.7}
        >
          <Menu size={24} color="#1f2937" />
        </TouchableOpacity>
      )}
      <Text variant="h2" className="text-gray-900 font-bold flex-1 text-center">
        {title}
      </Text>
      {showMenuButton && <View style={styles.menuButtonPlaceholder} />}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  menuButtonPlaceholder: {
    width: 40, // Mismo ancho que el botón del menú para centrar el título
  },
});
