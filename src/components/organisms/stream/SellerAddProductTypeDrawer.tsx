/**
 * Drawer para elegir tipo de lista al agregar producto — Figma 698:13700.
 * Picker de una sola opción: el tap ejecuta la acción y cierra, sin estado propio.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { CalendarCheck, CloudUpload, Timer } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle } from './StreamBottomSheet';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';

/** Chip claro del icono (Figma): disco gris con el glifo en tinta oscura. */
const ICON_CHIP_BG = '#DBDBDF';
const ICON_CHIP_TINT = '#18181B';

export type ProductListType = 'temporary' | 'permanent';

export interface SellerAddProductTypeDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: ProductListType) => void;
}

export const SellerAddProductTypeDrawer: React.FC<SellerAddProductTypeDrawerProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  const { t } = useTranslation();

  const rows = [
    {
      key: 'temporary',
      icon: <Timer size={18} color={ICON_CHIP_TINT} strokeWidth={2} />,
      titleKey: 'stream.addProductTypeTemporary',
      descKey: 'stream.addProductTypeTemporaryDesc',
      disabled: false,
    },
    {
      key: 'permanent',
      icon: <CalendarCheck size={18} color={ICON_CHIP_TINT} strokeWidth={2} />,
      titleKey: 'stream.addProductTypePermanent',
      descKey: 'stream.addProductTypePermanentDesc',
      disabled: false,
    },
    {
      key: 'import',
      icon: <CloudUpload size={18} color={ICON_CHIP_TINT} strokeWidth={2} />,
      titleKey: 'stream.addProductTypeImport',
      descKey: 'stream.addProductTypeImportDesc',
      disabled: true,
    },
  ] as const;

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.addProductTypeTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
      scrollEnabled
    >
      {rows.map((row) => (
        <TouchableOpacity
          key={row.key}
          style={[styles.row, row.disabled && styles.rowDisabled]}
          onPress={() => {
            if (row.disabled) return;
            onSelectType(row.key);
          }}
          activeOpacity={row.disabled ? 1 : 0.85}
          disabled={row.disabled}
          accessibilityRole="button"
        >
          <View style={styles.iconCircle}>{row.icon}</View>
          <View style={styles.rowText}>
            <RNText style={styles.rowTitle}>{t(row.titleKey)}</RNText>
            <RNText style={styles.rowDesc}>{t(row.descKey)}</RNText>
            {row.disabled ? (
              <RNText style={styles.comingSoon}>{t('stream.comingSoon')}</RNText>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 24,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 221, 221, 0.35)',
  },
  rowDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ICON_CHIP_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  rowDesc: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.glass.textMuted,
  },
  comingSoon: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    color: themeColors.glass.textSoft,
    marginTop: 2,
  },
});
