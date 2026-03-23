/**
 * Header Component
 * Barra superior alineada a tokens de tema (claro / oscuro)
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../../atoms/Text';
import { Menu } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';

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
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  const iconColor = c.text;
  const menuBtnBg = isDark ? themeColors.dark.surface : '#f3f4f6';

  return (
    <View
      className="flex-row items-center justify-between border-b px-4 py-3 bg-white border-gray-200 dark:bg-night-900 dark:border-night-700"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 2,
        elevation: isDark ? 6 : 3,
      }}
    >
      {showMenuButton ? (
        <TouchableOpacity
          onPress={onMenuPress}
          className="rounded-lg p-2"
          style={{ backgroundColor: menuBtnBg }}
          activeOpacity={0.7}
        >
          <Menu size={24} color={iconColor} />
        </TouchableOpacity>
      ) : null}
      <Text variant="h2" className="flex-1 text-center font-bold text-gray-900 dark:text-white">
        {title}
      </Text>
      {showMenuButton ? <View className="w-10" /> : null}
    </View>
  );
};
