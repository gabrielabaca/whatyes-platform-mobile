/**
 * Input de calificación con estrellas — "Cuéntanos tu opinión" (Figma 698-3403).
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

const GOLD = '#EAB308';

export interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  gap?: number;
}

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  size = 28,
  gap = 24,
}) => (
  <View style={[styles.row, { gap }]}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => onChange(star)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${star}/5`}
      >
        <Star
          size={size}
          color={GOLD}
          fill={star <= value ? GOLD : 'transparent'}
          strokeWidth={1.75}
        />
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
