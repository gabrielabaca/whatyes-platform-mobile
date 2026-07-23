import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from './StreamBottomSheet';
import { FONT_FAMILY } from '../../../theme/typography';

export interface StreamEndLiveDrawerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const StreamEndLiveDrawer: React.FC<StreamEndLiveDrawerProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const { t } = useTranslation();

  return (
    <StreamBottomSheet
      visible={visible}
      nativeModal
      title={t('stream.endStreamConfirmTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
    >
      <RNText style={styles.message}>{t('stream.endStreamConfirmMessage')}</RNText>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.endBtn, loading && styles.btnDisabled]}
          onPress={onConfirm}
          disabled={loading}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <RNText style={streamSheetStyles.primaryBtnText}>{t('stream.endStream')}</RNText>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.8}>
          <RNText style={styles.cancel}>{t('common.cancel')}</RNText>
        </TouchableOpacity>
      </View>
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 24,
    width: '100%',
    alignItems: 'center',
  },
  message: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    includeFontPadding: false,
  },
  actions: {
    width: '100%',
    gap: 24,
    alignItems: 'center',
  },
  endBtn: {
    ...streamSheetStyles.primaryBtn,
    backgroundColor: '#EF4444',
  },
  cancel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FDC700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
