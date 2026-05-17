import React, { useState } from 'react';
import { View, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { startLiveFullSheetProps, startLiveStyles } from './startLiveStyles';
import { StartLivePrimaryButton, StartLiveRadioRow } from './StartLivePrimitives';

export interface StartLiveBankPromptDrawerProps {
  visible: boolean;
  onClose: () => void;
  onContinue: (hasLocalAccount: boolean) => void;
}

/** Figma 536-25634 */
export const StartLiveBankPromptDrawer: React.FC<StartLiveBankPromptDrawerProps> = ({
  visible,
  onClose,
  onContinue,
}) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<'yes' | 'no' | null>(null);

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.bankPromptTitle')}
      onClose={onClose}
      {...startLiveFullSheetProps}
      contentContainerStyle={startLiveStyles.sheetContent}
    >
      <RNText style={startLiveStyles.subtitle}>{t('startLive.bankPromptBody')}</RNText>
      <View style={{ gap: 12, width: '100%' }}>
        <StartLiveRadioRow
          label={t('startLive.bankPromptHasAccount')}
          selected={choice === 'yes'}
          onPress={() => setChoice('yes')}
        />
        <StartLiveRadioRow
          label={t('startLive.bankPromptNoAccount')}
          selected={choice === 'no'}
          onPress={() => setChoice('no')}
        />
      </View>

      <StartLivePrimaryButton
        label={t('startLive.nextCta')}
        onPress={() => {
          if (choice === 'yes') onContinue(true);
          else if (choice === 'no') onContinue(false);
        }}
        disabled={choice == null}
      />
    </StreamBottomSheet>
  );
};
