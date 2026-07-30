import React from 'react';
import { StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from './StreamBottomSheet';
import { StreamPromptContent, streamPromptContentStyle } from './StreamPromptContent';
import { themeColors } from '../../../theme/colors';

/**
 * Figma 698-5913 — drawer automático para seguir al vendedor durante el vivo.
 * Mismo patrón visual que el intro del wallet (cuerpo en `StreamPromptContent`).
 */
export interface StreamFollowSellerDrawerProps {
  visible: boolean;
  sellerName: string;
  followLoading?: boolean;
  onClose: () => void;
  onFollow: () => void;
  onNotNow?: () => void;
}

export const StreamFollowSellerDrawer: React.FC<StreamFollowSellerDrawerProps> = ({
  visible,
  sellerName,
  followLoading,
  onClose,
  onFollow,
  onNotNow,
}) => {
  const { t } = useTranslation();

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.followPrompt.title')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
      cancelLabel={t('stream.followPrompt.notNowCta')}
      onCancelPress={onNotNow}
      footer={
        <TouchableOpacity
          style={[streamSheetStyles.primaryBtn, followLoading && styles.btnDisabled]}
          onPress={onFollow}
          disabled={followLoading}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <RNText style={streamSheetStyles.primaryBtnText}>
            {t('stream.followPrompt.followCta', { seller: sellerName })}
          </RNText>
        </TouchableOpacity>
      }
    >
      <StreamPromptContent
        headline={t('stream.followPrompt.headline', { seller: sellerName })}
        note={t('stream.followPrompt.note')}
      />
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: streamPromptContentStyle,
  btnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
});
