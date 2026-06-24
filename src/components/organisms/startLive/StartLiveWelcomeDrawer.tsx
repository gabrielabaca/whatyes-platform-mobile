import React from 'react';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { startLiveWelcomeSheetProps, startLiveStyles } from './startLiveStyles';
import {
  StartLiveFeatureList,
  StartLivePrimaryButton,
  type StartLiveFeatureItem,
} from './StartLivePrimitives';

export interface StartLiveWelcomeDrawerProps {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onContinue: () => void;
}

/** Figma 536-23618 */
export const StartLiveWelcomeDrawer: React.FC<StartLiveWelcomeDrawerProps> = ({
  visible,
  busy,
  onClose,
  onContinue,
}) => {
  const { t } = useTranslation();

  const items: StartLiveFeatureItem[] = [
    {
      title: t('startLive.welcome1Feature1Title'),
      body: t('startLive.welcome1Feature1Body'),
    },
    {
      title: t('startLive.welcome1Feature2Title'),
      body: t('startLive.welcome1Feature2Body'),
    },
    {
      title: t('startLive.welcome1Feature3Title'),
      body: t('startLive.welcome1Feature3Body'),
    },
  ];

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.welcome1Title')}
      onClose={onClose}
      {...startLiveWelcomeSheetProps}
      contentContainerStyle={startLiveStyles.welcomeSheetContent}
      footer={
        <StartLivePrimaryButton
          label={t('startLive.welcome1Cta')}
          onPress={onContinue}
          loading={busy}
        />
      }
    >
      <StartLiveFeatureList items={items} />
    </StreamBottomSheet>
  );
};
