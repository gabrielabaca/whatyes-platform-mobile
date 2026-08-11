/**
 * Modal confirmación eliminar cuenta — Figma 536-22950
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { useTranslation } from 'react-i18next';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { deleteOwnAccount, ApiError } from '../../../api/authApi';
import { appAlert } from '../../../alerts';

export interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
  onDeleted,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmWord = t('account.deleteAccountModal.confirmWord');
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
    modalRef.current?.dismiss();
  };

  const handleDelete = async () => {
    if (!isConfirmed || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await deleteOwnAccount();
      onDeleted?.();
      handleClose();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : t('account.deleteAccountModal.deleteError');
      appAlert(t('common.error'), msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      backdropDelayMs={400}
      backdropAccessibilityLabel={t('account.deleteAccountModal.cancel')}
      dismissOnBackdropPress={false}
      scrollable={false}
      contentContainerStyle={styles.content}
      header={
        <GlassModalHeader
          title={t('account.deleteAccountModal.title')}
          onClose={handleClose}
          closeDisabled={deleting}
        />
      }
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.deleteBtn, (!isConfirmed || deleting) && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={!isConfirmed || deleting}
            activeOpacity={0.88}
          >
            {deleting ? (
              <ActivityIndicator color={themeColors.glass.text} />
            ) : (
              <RNText style={styles.deleteBtnText}>
                {t('account.deleteAccountModal.delete')}
              </RNText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={12}
            style={styles.cancelWrap}
            disabled={deleting}
          >
            <RNText style={styles.cancelText}>{t('account.deleteAccountModal.cancel')}</RNText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.body}>
        <View style={styles.warningBlock}>
          <RNText style={styles.warningText}>
            {t('account.deleteAccountModal.warningLine1')}
          </RNText>
          <RNText style={styles.warningText}>
            {t('account.deleteAccountModal.warningLine2')}
          </RNText>
        </View>

        <RNText style={styles.fieldLabel}>
          {t('account.deleteAccountModal.confirmHint')}
        </RNText>
        <View style={styles.inputWrap}>
          <AppTextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={t('account.deleteAccountModal.confirmPlaceholder')}
            placeholderTextColor={themeColors.glass.placeholder}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!deleting}
          />
        </View>
      </View>
    </GlassFullScreenModal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  body: {
    flex: 1,
    gap: 16,
  },
  warningBlock: {
    gap: 8,
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
    paddingHorizontal: 24,
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
