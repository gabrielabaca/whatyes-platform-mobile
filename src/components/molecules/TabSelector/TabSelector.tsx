/**
 * Tab Selector Component
 * Componente para seleccionar entre opciones tipo tab
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../../atoms/Text';

export interface TabOption {
  label: string;
  value: string;
}

interface TabSelectorProps {
  options: TabOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export const TabSelector: React.FC<TabSelectorProps> = ({
  options,
  selectedValue,
  onValueChange,
}) => {
  return (
    <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onValueChange(option.value)}
            className={`flex-1 py-3 rounded-lg ${
              isSelected ? 'bg-primary-600' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                isSelected ? 'text-white' : 'text-gray-600'
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
