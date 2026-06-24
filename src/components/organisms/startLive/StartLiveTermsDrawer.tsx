import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { startLiveWelcomeSheetProps, startLiveStyles } from './startLiveStyles';
import {
  StartLiveFeatureList,
  StartLivePrimaryButton,
  StartLiveTermsCheckbox,
  type StartLiveFeatureItem,
} from './StartLivePrimitives';

export interface StartLiveTermsDrawerProps {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onContinue: () => void;
}

/** Figma 536-23999 */
export const StartLiveTermsDrawer: React.FC<StartLiveTermsDrawerProps> = ({
  visible,
  busy,
  onClose,
  onContinue,
}) => {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  const items: StartLiveFeatureItem[] = [
    { title: t('startLive.termsFeature1Title'), body: t('startLive.termsFeature1Body') },
    { title: t('startLive.termsFeature2Title'), body: t('startLive.termsFeature2Body') },
    { title: t('startLive.termsFeature3Title'), body: t('startLive.termsFeature3Body') },
    { title: t('startLive.termsFeature4Title'), body: t('startLive.termsFeature4Body') },
    { title: t('startLive.termsFeature5Title'), body: t('startLive.termsFeature5Body') },
  ];

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.termsTitle')}
      onClose={onClose}
      {...startLiveWelcomeSheetProps}
      contentContainerStyle={startLiveStyles.welcomeSheetContent}
      scrollEnabled={false}
      footer={
        <StartLivePrimaryButton
          label={t('startLive.termsCta')}
          onPress={onContinue}
          disabled={!accepted}
          loading={busy}
        />
      }
    >
      <ScrollView
        style={startLiveStyles.welcomeScrollBody}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <StartLiveFeatureList items={items} />
        <StartLiveTermsCheckbox
          checked={accepted}
          label={t('startLive.termsCheckbox')}
          onToggle={() => setAccepted((v) => !v)}
        />
      </ScrollView>
    </StreamBottomSheet>
  );
};
