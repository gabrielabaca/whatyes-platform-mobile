/**
 * Confirmación por texto para borrar una tarjeta (Figma 1195:8992).
 *
 * Replica la estructura de DeleteAccountModal (palabra + CTA deshabilitado) sin
 * extraer un componente compartido: aquel vive en GlassFullScreenModal (Modal nativo)
 * y este tiene que montarse con `nativeModal={false}` para no anidarse sobre el
 * StreamBottomSheet de métodos, que ya está en OverlayPortal.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppTextInput } from '../../../atoms/AppTextInput';
import { StreamBottomSheet } from '../StreamBottomSheet';
import { FONT_FAMILY } from '../../../../theme/typography';
import { themeColors } from '../../../../theme/colors';
import type { SavedCard } from '../../../../api/paymentsApi';

export interface DeletePaymentMethodModalProps {
  visible: boolean;
  card: SavedCard | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function cardLabel(card: SavedCard): string {
  return [card.payment_method_id, card.last_four ? `···· ${card.last_four}` : '']
    .filter(Boolean)
    .join(' ');
}

export const DeletePaymentMethodModal: React.FC<DeletePaymentMethodModalProps> = ({
  visible,
  card,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmWord = t('stream.wallet.deleteCardConfirmWord');
  const isConfirmed =
    confirmText.trim().toLowerCase() === confirmWord.trim().toLowerCase();

  useEffect(() => {
    if (!visible) {
      return;
    }
    setConfirmText('');
    setDeleting(false);
  }, [visible]);

  const handleClose = () => {
    if (deleting) {
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!isConfirmed || deleting || !card) {
      return;
    }
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  const methodName = card ? cardLabel(card) : '';

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.wallet.deleteCardTitle')}
      onClose={handleClose}
      bottomPanel={false}
      fullHeight
      nativeModal={false}
      dismissOnBackdropPress={false}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.deleteBtn, (!isConfirmed || deleting) && styles.deleteBtnDisabled]}
            onPress={() => {
              void handleDelete();
            }}
            disabled={!isConfirmed || deleting}
            activeOpacity={0.88}
            accessibilityRole="button"
          >
            {deleting ? (
              <ActivityIndicator color={themeColors.glass.text} />
            ) : (
              <RNText style={styles.deleteBtnText}>
                {t('stream.wallet.deleteCardConfirm')}
              </RNText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={12}
            style={styles.cancelWrap}
            disabled={deleting}
            accessibilityRole="button"
          >
            <RNText style={styles.cancelText}>{t('common.cancel')}</RNText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.body}>
        <RNText style={styles.warningText}>
          {t('stream.wallet.deleteCardMessage').replace('{method}', methodName)}
        </RNText>
        <RNText style={styles.fieldLabel}>
          {t('stream.wallet.deleteCardConfirmHint')}
        </RNText>
        <View style={styles.inputWrap}>
          <AppTextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={t('stream.wallet.deleteCardConfirmPlaceholder')}
            placeholderTextColor={themeColors.glass.placeholder}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!deleting}
          />
        </View>
      </View>
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  body: {
    width: '100%',
    gap: 16,
  },
  warningText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.text,
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: themeColors.glass.inputBg,
  },
  input: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.text,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  footer: {
    gap: 24,
    alignItems: 'center',
    width: '100%',
  },
  deleteBtn: {
    width: '100%',
    height: 40,
    borderRadius: 1000,
    backgroundColor: themeColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  deleteBtnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  deleteBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  cancelWrap: {
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.gold,
    includeFontPadding: false,
  },
});
