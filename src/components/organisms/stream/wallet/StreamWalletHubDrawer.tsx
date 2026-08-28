import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CreditCard, Landmark, Truck } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from '../StreamBottomSheet';
import { FONT_FAMILY } from '../../../../theme/typography';
import { themeColors } from '../../../../theme/colors';

/** Figma 536-20085 — hub wallet */
export interface StreamWalletHubDrawerProps {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  shippingActionLabel: string;
  paymentActionLabel: string;
  payoutActionLabel: string;
  showPayoutRow?: boolean;
  onShippingPress: () => void;
  onPaymentPress: () => void;
  onPayoutPress: () => void;
}

export const StreamWalletHubDrawer: React.FC<StreamWalletHubDrawerProps> = ({
  visible,
  onClose,
  loading = false,
  shippingActionLabel,
  paymentActionLabel,
  payoutActionLabel,
  showPayoutRow = false,
  onShippingPress,
  onPaymentPress,
  onPayoutPress,
}) => {
  const { t } = useTranslation();

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
          {showPayoutRow ? (
            <View style={styles.payoutSection}>
              <View style={styles.divider} />
              <RNText style={styles.sectionHint}>{t('stream.wallet.bankSectionHint')}</RNText>
              <HubPillRow
                icon={<Landmark size={24} color={themeColors.glass.text} strokeWidth={2} />}
                title={t('stream.wallet.bankRow')}
                actionLabel={payoutActionLabel}
                onPress={onPayoutPress}
              />
            </View>
          ) : null}
        </View>
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
  },
  payoutSection: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.glass.border,
    width: '100%',
  },
  sectionHint: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.glass.textMuted,
    letterSpacing: 0.06,
    includeFontPadding: false,
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
});
