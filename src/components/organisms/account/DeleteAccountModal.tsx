/**
 * Modal confirmación eliminar cuenta — Figma 536-22950
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text as RNText,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { FONT_FAMILY } from '../../../theme/typography';
import { deleteOwnAccount, ApiError } from '../../../api/authApi';

const DANGER_RED = '#FB2C36';
const CANCEL_GOLD = '#FDC700';

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
  const insets = useSafeAreaInsets();
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
      Alert.alert(t('common.error'), msg);
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
      containerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      header={
        <View style={styles.header}>
          <RNText style={styles.title}>{t('account.deleteAccountModal.title')}</RNText>
          <TouchableOpacity onPress={handleClose} hitSlop={12} disabled={deleting}>
            <X size={22} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
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
              <ActivityIndicator color="#FFFFFF" />
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
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={t('account.deleteAccountModal.confirmPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.5)"
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    flex: 1,
    includeFontPadding: false,
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
    color: 'rgba(255,255,255,0.9)',
    includeFontPadding: false,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: '#FFFFFF',
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
    backgroundColor: DANGER_RED,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  cancelWrap: {
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: CANCEL_GOLD,
    includeFontPadding: false,
  },
});
