/**
 * Figma 536-20145 — Confirmación compacta tras seleccionar método de pago.
 * Panel inferior con icono del método + "Conectando con [método]…", auto-dismiss 2.5 s.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { StreamBottomSheet, streamBottomPanelStyle } from '../StreamBottomSheet';
import { FONT_FAMILY } from '../../../../theme/typography';
import { themeColors } from '../../../../theme/colors';

export type SuccessPaymentMethod =
  | { type: 'mp_wallet' }
  | { type: 'card'; network?: string | null; lastFour?: string | null };

export interface StreamWalletSuccessDrawerProps {
  visible: boolean;
  onClose: () => void;
  paymentMethod?: SuccessPaymentMethod | null;
}

const AUTO_DISMISS_MS = 2500;

export const StreamWalletSuccessDrawer: React.FC<StreamWalletSuccessDrawerProps> = ({
  visible,
  onClose,
  paymentMethod,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  const label = resolveLabel(paymentMethod, t);

  return (
    <StreamBottomSheet
      visible={visible}
      /* Toast: se cierra solo a los 2,5 s, sin título ni X de drawer. */
      title=""
      showCloseButton={false}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
    >
      <View style={styles.row}>
        <MethodIcon method={paymentMethod} />
        <RNText style={styles.label} numberOfLines={1}>
          {label}
        </RNText>
      </View>
    </StreamBottomSheet>
  );
};

function resolveLabel(
  method: SuccessPaymentMethod | null | undefined,
  t: TFunction,
): string {
  if (!method) return t('stream.wallet.connectingDefault');
  if (method.type === 'mp_wallet') return t('stream.wallet.connectingMp');
  const parts: string[] = [];
  if (method.network) parts.push(method.network);
  if (method.lastFour) parts.push(`···· ${method.lastFour}`);
  const name = parts.length ? parts.join(' ') : t('stream.wallet.connectingCard');
  return t('stream.wallet.connectingWith').replace('{method}', name);
}

function MethodIcon({ method }: { method?: SuccessPaymentMethod | null }) {
  if (method?.type === 'mp_wallet') {
    return (
      <View style={[styles.pill, styles.pillMp]}>
        <RNText style={styles.pillMpText}>MP</RNText>
      </View>
    );
  }
  return (
    <View style={styles.pill}>
      <CreditCard size={14} color="#02050F" strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    width: 34,
    height: 24,
    borderRadius: 1000,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pillMp: {
    backgroundColor: '#009EE3',
    borderColor: '#009EE3',
  },
  pillMpText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    lineHeight: 12,
    color: '#FFFFFF',
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
  label: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: themeColors.glass.text,
    letterSpacing: 0.08,
    flex: 1,
    includeFontPadding: false,
  },
});
