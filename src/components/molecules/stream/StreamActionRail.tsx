import React from 'react';
import { View, StyleSheet, Alert, Text as RNText } from 'react-native';
import {
  CreditCard,
  Video,
  Share2,
  MoreVertical,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamIconButton } from '../../atoms/stream/StreamIconButton';
import { STREAM_COLORS } from './streamTokens';
import { FONT_FAMILY } from '../../../theme/typography';

export interface StreamActionRailProps {
  onExit?: () => void;
  onOpenWallet?: () => void;
  isRecording?: boolean;
  recordingTimeLabel?: string;
  onToggleRecording?: () => void;
}

export const StreamActionRail: React.FC<StreamActionRailProps> = ({
  onExit,
  onOpenWallet,
  isRecording = false,
  recordingTimeLabel = '0:00',
  onToggleRecording,
}) => {
  const { t } = useTranslation();

  const comingSoon = () => {
    Alert.alert(t('common.appName'), t('stream.comingSoon'));
  };

  const handleMore = () => {
    Alert.alert(t('stream.moreTitle'), undefined, [
      { text: t('stream.exit'), style: 'destructive', onPress: onExit },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleRecordingPress = () => {
    if (onToggleRecording) {
      onToggleRecording();
      return;
    }
    comingSoon();
  };

  return (
    <View style={styles.rail}>
      <StreamIconButton
        onPress={onOpenWallet ?? comingSoon}
        accessibilityLabel={t('stream.payment')}
      >
        <CreditCard size={24} color={STREAM_COLORS.white} />
      </StreamIconButton>

      <View style={styles.recordWrap}>
        <StreamIconButton
          onPress={handleRecordingPress}
          accessibilityLabel={
            isRecording ? t('stream.stopRecording') : t('stream.startRecording')
          }
        >
          <Video size={24} color={isRecording ? '#FB2C36' : STREAM_COLORS.white} fill={isRecording ? '#FB2C36' : 'transparent'} />
        </StreamIconButton>
        {isRecording ? (
          <RNText style={styles.recordTimer}>{recordingTimeLabel}</RNText>
        ) : null}
      </View>

      <StreamIconButton onPress={comingSoon} accessibilityLabel={t('stream.share')}>
        <Share2 size={24} color={STREAM_COLORS.white} />
      </StreamIconButton>
      <StreamIconButton onPress={handleMore} accessibilityLabel={t('stream.more')}>
        <MoreVertical size={24} color={STREAM_COLORS.white} />
      </StreamIconButton>
    </View>
  );
};

const styles = StyleSheet.create({
  rail: {
    width: 46,
    alignItems: 'center',
    gap: 24,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  recordWrap: {
    alignItems: 'center',
    gap: 4,
  },
  recordTimer: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    lineHeight: 14,
    color: '#FB2C36',
    includeFontPadding: false,
  },
});
