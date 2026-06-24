import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CreditCard, Truck } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle } from '../StreamBottomSheet';
import { FONT_FAMILY } from '../../../../theme/typography';

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
    Alert.alert(t('common.appName'), t('stream.wallet.bonusComingSoon'));
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.wallet.hubTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={styles.loader} />
      ) : (
        <>
          <View style={styles.configSection}>
            <HubPillRow
              icon={<CreditCard size={24} color="#02050F" strokeWidth={2} />}
              title={t('stream.wallet.paymentRow')}
              actionLabel={paymentActionLabel}
              onPress={onPaymentPress}
            />
            <HubPillRow
              icon={<Truck size={24} color="#02050F" strokeWidth={2} />}
              title={t('stream.wallet.shippingRow')}
              actionLabel={shippingActionLabel}
              onPress={onShippingPress}
            />
          </View>

          <View style={styles.bonusRow}>
            <TextInput
              style={styles.bonusInput}
              value={bonusCode}
              onChangeText={setBonusCode}
              placeholder={t('stream.wallet.bonusPlaceholder')}
              placeholderTextColor="#C4C4C4"
            />
            <TouchableOpacity
              style={styles.bonusApplyBtn}
              onPress={handleApplyBonus}
              activeOpacity={0.85}
            >
              <RNText style={styles.bonusApplyText}>{t('stream.wallet.bonusApply')}</RNText>
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
      <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.85}>
        <RNText style={styles.actionBtnText}>{actionLabel}</RNText>
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
    borderBottomColor: '#DDDDDD',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#C9C9C9',
    borderWidth: 1,
    borderColor: 'rgba(221, 221, 221, 0.87)',
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
    color: '#02050F',
    letterSpacing: 0.08,
    includeFontPadding: false,
  },
  actionBtn: {
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 1000,
    backgroundColor: '#685CF0',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  actionBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 27, 0.9)',
    borderWidth: 0.701,
    borderColor: '#27272A',
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
    color: '#FFFFFF',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  bonusApplyBtn: {
    width: 80,
    height: 40,
    borderRadius: 1000,
    backgroundColor: '#A09FA1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusApplyText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
