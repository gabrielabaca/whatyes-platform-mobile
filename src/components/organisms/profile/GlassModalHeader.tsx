/**
 * Header canónico de los modales glass: título a la izquierda y X a la derecha.
 *
 * Existe para que todos los modales tengan el mismo alto, el mismo padding y el mismo
 * área táctil de cierre (40x40). Antes cada modal lo rearmaba y quedaron variantes con
 * X de 22 y de 24, con y sin caja táctil, y con chevron de "atrás" duplicando el cierre.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';

export interface GlassModalHeaderProps {
  title: string;
  onClose: () => void;
  /** Bloquea el cierre mientras hay una operación en curso (guardando, borrando). */
  closeDisabled?: boolean;
  /** El modal ya aporta el safe area superior (p. ej. dentro de un contenedor con padding). */
  skipTopInset?: boolean;
}

export const GlassModalHeader: React.FC<GlassModalHeaderProps> = ({
  title,
  onClose,
  closeDisabled = false,
  skipTopInset = false,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: skipTopInset ? 16 : insets.top + 16 }]}>
      <RNText style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.15}>
        {title}
      </RNText>
      <TouchableOpacity
        onPress={onClose}
        hitSlop={12}
        style={styles.closeBtn}
        disabled={closeDisabled}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        <X size={22} color={themeColors.glass.text} strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: themeColors.glass.text,
    flex: 1,
    marginRight: 8,
    includeFontPadding: false,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
