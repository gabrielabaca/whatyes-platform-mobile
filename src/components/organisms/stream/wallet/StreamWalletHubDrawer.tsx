import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { AppTextInput } from '../../../atoms/AppTextInput';
import { useTranslation } from 'react-i18next';
import { CreditCard, Truck } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from '../StreamBottomSheet';
import { FONT_FAMILY } from '../../../../theme/typography';
import { themeColors } from '../../../../theme/colors';
import { appAlert } from '../../../../alerts';

/** Figma 536-20085 — hub wallet */
export interface StreamWalletHubDrawerProps {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  shippingActionLabel: string;
  paymentActionLabel: string;
  onShippingPress: () => void;
  onPaymentPress: () => void;
}

export const StreamWalletHubDrawer: React.FC<StreamWalletHubDrawerProps> = ({
  visible,
  onClose,
  loading = false,
  shippingActionLabel,
  paymentActionLabel,
  onShippingPress,
  onPaymentPress,
}) => {
  const { t } = useTranslation();
  const [bonusCode, setBonusCode] = useState('');

  useEffect(() => {
    if (!visible) setBonusCode('');
  }, [visible]);

  const handleApplyBonus = () => {
    appAlert(t('common.appName'), t('stream.wallet.bonusComingSoon'));
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.wallet.hubTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
      dismissOnBackdropPress={false}
    >
      {loading ? (
        <ActivityIndicator color={themeColors.glass.text} style={styles.loader} />
      ) : (
        <>
          <View style={styles.configSection}>
            <HubPillRow
              icon={<CreditCard size={24} color={themeColors.glass.text} strokeWidth={2} />}
              title={t('stream.wallet.paymentRow')}
              actionLabel={paymentActionLabel}
              onPress={onPaymentPress}
            />
            <HubPillRow
              icon={<Truck size={24} color={themeColors.glass.text} strokeWidth={2} />}
              title={t('stream.wallet.shippingRow')}
              actionLabel={shippingActionLabel}
              onPress={onShippingPress}
            />
          </View>

          <View style={styles.bonusRow}>
            <AppTextInput
              style={styles.bonusInput}
              value={bonusCode}
              onChangeText={setBonusCode}
              placeholder={t('stream.wallet.bonusPlaceholder')}
              placeholderTextColor={themeColors.glass.placeholder}
            />
            <TouchableOpacity
              style={[streamSheetStyles.primaryBtn, styles.bonusApplyBtn]}
              onPress={handleApplyBonus}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <RNText style={streamSheetStyles.primaryBtnText}>
                {t('stream.wallet.bonusApply')}
              </RNText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </StreamBottomSheet>
  );
};

function HubPillRow({
  icon,
  title,
  actionLabel,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.pillRow}>
      <View style={styles.pillLeft}>
        {icon}
        <RNText style={styles.pillTitle}>{title}</RNText>
      </View>
      <TouchableOpacity
        style={[streamSheetStyles.primaryBtn, styles.actionBtn]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <RNText style={streamSheetStyles.primaryBtnText}>{actionLabel}</RNText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    width: '100%',
  },
  loader: {
    marginVertical: 24,
  },
  configSection: {
    width: '100%',
    gap: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.glass.border,
  },
  pillRow: {
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
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  pillTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: themeColors.glass.text,
    letterSpacing: 0.08,
    includeFontPadding: false,
  },
  /** Acción dentro de la píldora: mismo botón primario, ancho al contenido. */
  actionBtn: {
    width: 'auto',
    minWidth: 80,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.glass.inputBg,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    gap: 8,
    width: '100%',
  },
  bonusInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  /** Los bonos todavía no están disponibles: primario atenuado. */
  bonusApplyBtn: {
    width: 80,
    opacity: themeColors.disabledOpacity,
  },
});
