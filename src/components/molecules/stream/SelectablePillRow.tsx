/**
 * Fila-píldora seleccionable de los drawers glass: elemento a la izquierda, título y
 * subtítulo, indicador de elegido y borrado opcional.
 *
 * Vive acá porque la usan los métodos de pago (icono + check a la derecha) y el
 * selector de direcciones (radio a la izquierda, sin check): el layout, los radios y
 * el área táctil separada del borrado son los mismos y no pueden divergir.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';

export interface SelectablePillRowProps {
  /** Icono o radio a la izquierda del texto. */
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  selected: boolean;
  /** Check a la derecha. Ponerlo en false cuando `leading` ya muestra el estado. */
  showCheck?: boolean;
  titleLines?: number;
  onPress: () => void;
  onDelete?: () => void;
  deleteAccessibilityLabel?: string;
}

export const SelectablePillRow: React.FC<SelectablePillRowProps> = ({
  leading,
  title,
  subtitle,
  selected,
  showCheck = true,
  titleLines = 2,
  onPress,
  onDelete,
  deleteAccessibilityLabel,
}) => (
  <TouchableOpacity
    style={[pillRowStyles.row, selected && pillRowStyles.rowSelected]}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="button"
  >
    <View style={pillRowStyles.left}>
      {leading}
      <View style={pillRowStyles.textCol}>
        <RNText style={pillRowStyles.title} numberOfLines={titleLines}>
          {title}
        </RNText>
        {subtitle ? (
          <RNText style={pillRowStyles.subtitle} numberOfLines={1}>
            {subtitle}
          </RNText>
        ) : null}
      </View>
    </View>
    {selected && showCheck ? (
      <Check size={22} color={themeColors.primary} strokeWidth={2.5} />
    ) : null}
    {onDelete ? (
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={10}
        style={pillRowStyles.deleteBtn}
        accessibilityRole="button"
        accessibilityLabel={deleteAccessibilityLabel}
      >
        <Trash2 size={18} color={themeColors.glass.textSoft} strokeWidth={2} />
      </TouchableOpacity>
    ) : null}
  </TouchableOpacity>
);

/** Radio del selector: violeta lleno cuando la fila está elegida. */
export const PillRadio: React.FC<{ selected: boolean }> = ({ selected }) => (
  <View style={[pillRowStyles.radio, selected && pillRowStyles.radioSelected]}>
    {selected ? <View style={pillRowStyles.radioDot} /> : null}
  </View>
);

/** Compartidos para que las filas no-seleccionables del mismo drawer calcen igual. */
export const pillRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.glass.rowBg,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    minHeight: 64,
  },
  rowSelected: {
    borderColor: themeColors.primary,
    borderWidth: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: themeColors.glass.text,
    letterSpacing: 0.08,
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
  },
  /** Tocable aparte dentro de la fila: eliminar no puede confundirse con seleccionar. */
  deleteBtn: {
    marginLeft: 8,
    padding: 6,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: themeColors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: themeColors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: themeColors.primary,
  },
});
