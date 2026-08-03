/**
 * Paso único de bienvenida al vender: pitch + experiencia + términos.
 * Fusiona los antiguos drawers de bienvenida, términos y encuesta en una sola
 * pantalla para reducir la fricción del primer live.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { startLiveFullSheetProps, startLiveStyles } from './startLiveStyles';
import {
  StartLiveFeatureList,
  StartLivePrimaryButton,
  StartLiveRadioRow,
  StartLiveTermsCheckbox,
  type StartLiveFeatureItem,
} from './StartLivePrimitives';

export interface StartLiveIntroDrawerProps {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onContinue: (isFirstAuction: boolean) => void;
}

type ExperienceChoice = 'beginner' | 'active' | null;

export const StartLiveIntroDrawer: React.FC<StartLiveIntroDrawerProps> = ({
  visible,
  busy,
  onClose,
  onContinue,
}) => {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<ExperienceChoice>(null);
  const [accepted, setAccepted] = useState(false);

  const items: StartLiveFeatureItem[] = [
    { title: t('startLive.welcome1Feature1Title'), body: t('startLive.welcome1Feature1Body') },
    { title: t('startLive.welcome1Feature2Title'), body: t('startLive.welcome1Feature2Body') },
    { title: t('startLive.welcome1Feature3Title'), body: t('startLive.welcome1Feature3Body') },
  ];

  const canContinue = choice != null && accepted && !busy;

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.welcome1Title')}
      onClose={onClose}
      {...startLiveFullSheetProps}
      contentContainerStyle={startLiveStyles.sheetContent}
      scrollEnabled={false}
      dismissOnBackdropPress={false}
      footer={
        <StartLivePrimaryButton
          label={t('startLive.introCta')}
          onPress={() => onContinue(choice === 'beginner')}
          disabled={!canContinue}
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

        <RNText style={[startLiveStyles.subtitle, { marginTop: 16, marginBottom: 12 }]}>
          {t('startLive.experienceTitle')}
        </RNText>
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

        <View style={localStyles.termsBlock}>
          <StartLiveTermsCheckbox
            checked={accepted}
            label={t('startLive.termsCheckbox')}
            onToggle={() => setAccepted((v) => !v)}
          />
        </View>
      </ScrollView>
    </StreamBottomSheet>
  );
};

const localStyles = StyleSheet.create({
  /** Separa los términos de los radios y los alinea con el resto del contenido. */
  termsBlock: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingBottom: 8,
  },
});
