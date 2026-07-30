import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from '../../atoms/Text';
import { IconChevronRight } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';
import ArrowForwardIcon from '../../../../assets/icons/account/arrow-forward-ios.svg';

/** Tokens Figma nodo 698:2693 */
const BORDER = '#CBCEFF';
/**
 * El círculo se mantiene claro en ambos temas: los SVG de `assets/icons/account`
 * traen el fill horneado (#71717B / #18181B) y no responden al prop `color`,
 * así que oscurecer el círculo dejaría el glifo ilegible.
 */
const ICON_BG = '#DBDBDF';
const LABEL_COLOR = '#18181B';
const DANGER_COLOR = '#DC2626';

export interface AccountMenuRowProps {
  label: string;
  /**
   * SVG exportado de Figma (assets/icons/account, usa width/height) o ícono del
   * proyecto (Icons.tsx, usa size/color) — se pasan ambos juegos de props.
   */
  icon: React.FC<any>;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

export const AccountMenuRow: React.FC<AccountMenuRowProps> = ({
  label,
  icon: IconCmp,
  onPress,
  variant = 'default',
}) => {
  const isDanger = variant === 'danger';
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.row, isDark ? { borderColor: c.surfaceAlt } : null]}
      accessibilityRole="button"
    >
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <IconCmp
            width={18}
            height={18}
            size={18}
            color={isDanger ? DANGER_COLOR : LABEL_COLOR}
            strokeWidth={1.75}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { fontFamily: FONT_FAMILY.semibold },
            isDark ? { color: c.text } : null,
            isDanger ? { color: DANGER_COLOR } : null,
          ]}
        >
          {label}
        </Text>
      </View>
      {isDanger ? (
        <View style={styles.chevronSpacer} />
      ) : isDark ? (
        // El chevron exportado de Figma trae el fill #18181B horneado: en oscuro
        // se usa el equivalente del proyecto, que sí acepta `color`.
        <IconChevronRight size={16} color={c.text} />
      ) : (
        <ArrowForwardIcon width={16} height={16} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    padding: 12,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: BORDER,
    // Figma 698:2693: fill transparente — la fila deja ver el gradiente de la
    // página. Sin fondo, la sombra iOS/elevation no renderiza bien, así que se omite.
    backgroundColor: 'transparent',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    color: LABEL_COLOR,
    flexShrink: 1,
  },
  chevronSpacer: {
    width: 16,
    height: 16,
  },
});
