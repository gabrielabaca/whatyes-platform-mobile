import React from 'react';
import { StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from '../StreamBottomSheet';
import { StreamPromptContent, streamPromptContentStyle } from '../StreamPromptContent';

/** Figma 536-20451 — intro wallet en vivo */
export interface StreamWalletIntroDrawerProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  onRemindLater?: () => void;
}

export const StreamWalletIntroDrawer: React.FC<StreamWalletIntroDrawerProps> = ({
  visible,
  onClose,
  onContinue,
  onRemindLater,
}) => {
  const { t } = useTranslation();

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.wallet.introTitle')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
      cancelLabel={t('stream.wallet.remindLaterCta')}
      onCancelPress={onRemindLater}
      footer={
        <TouchableOpacity
          style={streamSheetStyles.primaryBtn}
          onPress={onContinue}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <RNText style={streamSheetStyles.primaryBtnText}>
            {t('stream.wallet.addInfoCta')}
          </RNText>
        </TouchableOpacity>
      }
    >
      <StreamPromptContent
        headline={t('stream.wallet.introHeadline')}
        note={t('stream.wallet.introNote')}
      />
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: streamPromptContentStyle,
});
