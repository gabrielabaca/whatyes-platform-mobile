/**
 * Cuerpo compartido de los drawers de invitación del vivo (Figma 698-5913 / 536-20451):
 * titular grande centrado + una nota con check verde.
 * Lo usan `StreamFollowSellerDrawer` y `wallet/StreamWalletIntroDrawer`; la CTA y el
 * "ahora no" viven en los slots `footer`/`cancelLabel` de `StreamBottomSheet`.
 */
import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Check } from 'lucide-react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';

export interface StreamPromptContentProps {
  headline: string;
  note: string;
}

export const StreamPromptContent: React.FC<StreamPromptContentProps> = ({ headline, note }) => (
  <>
    <RNText style={styles.headline}>{headline}</RNText>

    <View style={styles.noteRow}>
      <View style={styles.checkWrap}>
        <Check size={8} color={themeColors.glass.text} strokeWidth={3} />
      </View>
      <RNText style={styles.noteText}>{note}</RNText>
    </View>
  </>
);

/** Estilo del slot `contentContainerStyle` del sheet que envuelve a este contenido. */
export const streamPromptContentStyle = {
  gap: 24,
  alignItems: 'center',
} as const;

const styles = StyleSheet.create({
  headline: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 24,
    lineHeight: 32,
    color: themeColors.glass.text,
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
    backgroundColor: themeColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.text,
    letterSpacing: 0.05,
    flexShrink: 1,
    includeFontPadding: false,
  },
});
