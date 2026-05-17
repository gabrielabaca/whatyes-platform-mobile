import React from 'react';
import { View, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { startLiveWelcomeSheetProps, startLiveStyles } from './startLiveStyles';
import { StartLivePrimaryButton } from './StartLivePrimitives';

export interface StartLiveReadyDrawerProps {
  visible: boolean;
  onClose: () => void;
  onStart: () => void;
}

/** Paso final — línea visual wallet intro (Figma 536-20451) */
export const StartLiveReadyDrawer: React.FC<StartLiveReadyDrawerProps> = ({
  visible,
  onClose,
  onStart,
}) => {
  const { t } = useTranslation();

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.readyTitle')}
      onClose={onClose}
      {...startLiveWelcomeSheetProps}
      contentContainerStyle={startLiveStyles.sheetContent}
    >
      <View style={{ gap: 24, alignItems: 'center', width: '100%' }}>
        <View style={{ gap: 12, alignItems: 'center' }}>
          <View style={startLiveStyles.consentCheck}>
            <Check size={8} color="#FFFFFF" strokeWidth={3} />
          </View>
          <RNText style={startLiveStyles.readyHeadline}>{t('startLive.readyHeadline')}</RNText>
          <RNText style={startLiveStyles.readyBody}>{t('startLive.readyBody')}</RNText>
          <RNText style={startLiveStyles.readyTip}>{t('startLive.readyTip')}</RNText>
        </View>
        <StartLivePrimaryButton label={t('startLive.readyCta')} onPress={onStart} />
      </View>
    </StreamBottomSheet>
  );
};
