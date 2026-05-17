import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { startLiveFullSheetProps, startLiveStyles } from './startLiveStyles';
import { StartLivePrimaryButton, StartLiveRadioRow } from './StartLivePrimitives';

export interface StartLiveFirstAuctionDrawerProps {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onContinue: (isFirst: boolean) => void;
}

type ExperienceChoice = 'beginner' | 'active' | null;

/** Figma 536-24857 — experiencia del vendedor */
export const StartLiveFirstAuctionDrawer: React.FC<StartLiveFirstAuctionDrawerProps> = ({
  visible,
  busy,
  onClose,
  onContinue,
}) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<ExperienceChoice>(null);

  const handleNext = () => {
    if (choice === 'beginner') {
      onContinue(true);
    } else if (choice === 'active') {
      onContinue(false);
    }
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.experienceTitle')}
      onClose={onClose}
      {...startLiveFullSheetProps}
      contentContainerStyle={startLiveStyles.sheetContent}
    >
      <View style={{ gap: 12, width: '100%' }}>
        <StartLiveRadioRow
          label={t('startLive.experienceBeginner')}
          selected={choice === 'beginner'}
          onPress={() => setChoice('beginner')}
        />
        <StartLiveRadioRow
          label={t('startLive.experienceActive')}
          selected={choice === 'active'}
          onPress={() => setChoice('active')}
        />
      </View>

      <StartLivePrimaryButton
        label={t('startLive.nextCta')}
        onPress={handleNext}
        disabled={choice == null}
        loading={busy}
      />
    </StreamBottomSheet>
  );
};
