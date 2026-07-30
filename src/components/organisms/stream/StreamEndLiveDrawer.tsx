import React from 'react';
import { StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from './StreamBottomSheet';
import { themeColors } from '../../../theme/colors';

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
      title={t('stream.endStreamConfirmTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
      cancelLabel={t('common.cancel')}
      footer={
        <TouchableOpacity
          style={[styles.endBtn, loading && styles.btnDisabled]}
          onPress={onConfirm}
          disabled={loading}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <RNText style={streamSheetStyles.primaryBtnText}>{t('stream.endStream')}</RNText>
        </TouchableOpacity>
      }
    >
      <RNText style={[streamSheetStyles.bodyText, styles.message]}>
        {t('stream.endStreamConfirmMessage')}
      </RNText>
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
    textAlign: 'center',
  },
  endBtn: {
    ...streamSheetStyles.primaryBtn,
    backgroundColor: themeColors.danger,
  },
  btnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
});
