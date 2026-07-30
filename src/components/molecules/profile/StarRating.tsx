import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';

const GOLD = themeColors.gold;

export interface StarRatingProps {
  /** Valor 0–5 (admite medias estrellas). */
  value: number;
  size?: number;
  gap?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ value, size = 10, gap = 2 }) => {
  const { isDark } = useTheme();
  /**
   * La estrella vacía en claro es gris `#D4D4D8`; sobre navy ese gris brilla casi
   * como la dorada y el rating se lee inflado.
   */
  const emptyColor = isDark ? themeColors.dark.textMuted : '#D4D4D8';
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
              color={filled || half ? GOLD : emptyColor}
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
