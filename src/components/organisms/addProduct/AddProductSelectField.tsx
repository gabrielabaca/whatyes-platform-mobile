import React from 'react';
import { View, TouchableOpacity, Text as RNText } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { addProductStyles } from './addProductStyles';

export interface AddProductSelectFieldProps {
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
}

export const AddProductSelectField: React.FC<AddProductSelectFieldProps> = ({
  label,
  value,
  placeholder,
  onPress,
}) => (
  <View style={addProductStyles.field}>
    <RNText style={addProductStyles.fieldLabel}>{label}</RNText>
    <TouchableOpacity style={addProductStyles.pillSelect} onPress={onPress} activeOpacity={0.85}>
      <RNText
        style={[
          addProductStyles.pillSelectText,
          value ? addProductStyles.pillSelectTextFilled : null,
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </RNText>
      <ChevronRight size={20} color="#71717B" style={{ transform: [{ rotate: '90deg' }] }} />
    </TouchableOpacity>
  </View>
);
