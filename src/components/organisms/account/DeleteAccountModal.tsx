/**
 * Modal confirmación eliminar cuenta — Figma 536-22950
 * Mismo overlay blur que Preferencias / Dirección de envío.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text as RNText,
  Animated,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../profile/GlassBackdrop';
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
  const slideAnim = useRef(new Animated.Value(1)).current;
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [backdropReady, setBackdropReady] = useState(false);

  const confirmWord = t('account.deleteAccountModal.confirmWord');
  const isConfirmed =
    confirmText.trim().toLowerCase() === confirmWord.trim().toLowerCase();

  useEffect(() => {
    if (!visible) {
      setBackdropReady(false);
      return;
    }
    setConfirmText('');
    setDeleting(false);
    slideAnim.setValue(1);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
    const timer = setTimeout(() => setBackdropReady(true), 400);
    return () => clearTimeout(timer);
  }, [visible, slideAnim]);

  const handleClose = () => {
    if (deleting) {
      return;
    }
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
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

  if (!visible) {
    return null;
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 600],
  });

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GlassBackdrop />
      <TouchableOpacity
        style={styles.backdropPress}
        activeOpacity={1}
        onPress={backdropReady ? handleClose : undefined}
        disabled={!backdropReady}
        accessibilityRole="button"
        accessibilityLabel={t('account.deleteAccountModal.cancel')}
      />

      <View style={styles.sheet} pointerEvents="box-none">
        <KeyboardAvoidingView
          style={styles.sheetBottom}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheetContent,
              {
                transform: [{ translateY }],
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.header}>
              <RNText style={styles.title}>{t('account.deleteAccountModal.title')}</RNText>
              <TouchableOpacity onPress={handleClose} hitSlop={12} disabled={deleting}>
                <X size={22} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

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

            <View style={styles.homeIndicator}>
              <View style={styles.homeIndicatorBar} />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 300,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: 'flex-end',
  },
  sheetBottom: {
    width: '100%',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    flex: 1,
    includeFontPadding: false,
  },
  warningBlock: {
    gap: 0,
  },
  warningText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.08,
    includeFontPadding: false,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.regular,
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
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  deleteBtn: {
    height: 40,
    borderRadius: 1000,
    backgroundColor: DANGER_RED,
    alignItems: 'center',
    justifyContent: 'center',
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
  homeIndicator: {
    height: 31,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#C7C8CA',
  },
});
