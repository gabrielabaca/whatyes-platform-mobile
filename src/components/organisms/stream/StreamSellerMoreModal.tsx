import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GlassBackdrop, DrawerPanelGlass, DRAWER_PANEL_FALLBACK } from '../profile/GlassBackdrop';
import { drawerPanelGlassKey } from '../../../theme/glassTokens';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';

export interface StreamSellerMoreAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

export interface StreamSellerMoreModalProps {
  visible: boolean;
  onClose: () => void;
  actions: StreamSellerMoreAction[];
}

/**
 * Menú "más" del vendedor: modal centrado con una fila por acción (icono +
 * etiqueta). Reemplaza al menú de opciones tipo alert con botones, que en
 * Android no muestra iconos y en iOS apila las opciones sin jerarquía visual.
 */
export const StreamSellerMoreModal: React.FC<StreamSellerMoreModalProps> = ({
  visible,
  onClose,
  actions,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.host}>
        <GlassBackdrop />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        />

        <View
          style={styles.panel}
          collapsable={false}
          {...(Platform.OS === 'ios' ? { needsOffscreenAlphaCompositing: true } : null)}
        >
          <DrawerPanelGlass key={drawerPanelGlassKey} />

          <View style={styles.panelContent}>
            <View style={styles.header}>
              <RNText style={styles.title} numberOfLines={1}>
                {t('stream.sellerMoreTitle')}
              </RNText>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={12}
                style={styles.closeBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <X size={22} color={STREAM_COLORS.white} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <View style={styles.list}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={styles.row}
                  onPress={() => {
                    onClose();
                    action.onPress();
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <View style={styles.iconSlot}>{action.icon}</View>
                  <RNText style={styles.rowLabel} numberOfLines={2}>
                    {action.label}
                  </RNText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    overflow: 'hidden',
    // Dentro de un Modal nativo el blur puede no tener nada que difuminar; el
    // color de fallback garantiza que el panel se lea siempre.
    backgroundColor: DRAWER_PANEL_FALLBACK,
  },
  panelContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: STREAM_COLORS.white,
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
  list: {
    width: '100%',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
});
