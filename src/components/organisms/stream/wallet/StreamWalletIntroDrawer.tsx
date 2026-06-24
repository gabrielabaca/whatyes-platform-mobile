import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from '../StreamBottomSheet';
import { FONT_FAMILY } from '../../../../theme/typography';

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
    >
      <RNText style={styles.headline}>{t('stream.wallet.introHeadline')}</RNText>

      <View style={styles.noteRow}>
        <View style={styles.checkWrap}>
          <Check size={8} color="#FFFFFF" strokeWidth={3} />
        </View>
        <RNText style={styles.noteText}>{t('stream.wallet.introNote')}</RNText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={streamSheetStyles.primaryBtn}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <RNText style={streamSheetStyles.primaryBtnText}>
            {t('stream.wallet.addInfoCta')}
          </RNText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRemindLater ?? onClose}
          hitSlop={12}
          activeOpacity={0.8}
        >
          <RNText style={styles.remindLater}>{t('stream.wallet.remindLaterCta')}</RNText>
        </TouchableOpacity>
      </View>
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 24,
    alignItems: 'center',
  },
  headline: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 24,
    lineHeight: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.12,
    includeFontPadding: false,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'center',
  },
  checkWrap: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00C566',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: '#FFFFFF',
    letterSpacing: 0.05,
    flexShrink: 1,
    includeFontPadding: false,
  },
  actions: {
    width: '100%',
    gap: 24,
    alignItems: 'center',
  },
  remindLater: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FDC700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
