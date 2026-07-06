import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from './StreamBottomSheet';
import { FONT_FAMILY } from '../../../theme/typography';

/**
 * Figma 698-5913 — drawer automático para seguir al vendedor durante el vivo.
 * Mismo patrón visual que el intro del wallet, con título propio de la acción.
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
    >
      <RNText style={styles.headline}>
        {t('stream.followPrompt.headline', { seller: sellerName })}
      </RNText>

      <View style={styles.noteRow}>
        <View style={styles.checkWrap}>
          <Check size={8} color="#FFFFFF" strokeWidth={3} />
        </View>
        <RNText style={styles.noteText}>{t('stream.followPrompt.note')}</RNText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[streamSheetStyles.primaryBtn, followLoading && styles.btnDisabled]}
          onPress={onFollow}
          disabled={followLoading}
          activeOpacity={0.85}
        >
          <RNText style={streamSheetStyles.primaryBtnText}>
            {t('stream.followPrompt.followCta', { seller: sellerName })}
          </RNText>
        </TouchableOpacity>

        <TouchableOpacity onPress={onNotNow ?? onClose} hitSlop={12} activeOpacity={0.8}>
          <RNText style={styles.notNow}>{t('stream.followPrompt.notNowCta')}</RNText>
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
  notNow: {
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
