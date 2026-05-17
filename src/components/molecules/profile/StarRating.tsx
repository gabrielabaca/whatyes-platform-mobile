import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

const GOLD = '#FDC700';

export interface StarRatingProps {
  /** Valor 0–5 (admite medias estrellas). */
  value: number;
  size?: number;
  gap?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ value, size = 10, gap = 2 }) => {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <View style={[styles.row, { gap }]}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = clamped >= i;
        const half = !filled && clamped >= i - 0.5;
        return (
          <View key={i} style={styles.starWrap}>
            <Star
              size={size}
              color={filled || half ? GOLD : '#D4D4D8'}
              fill={filled ? GOLD : half ? GOLD : 'transparent'}
              strokeWidth={1.5}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
