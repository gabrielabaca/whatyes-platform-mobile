import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CirclePlus } from 'lucide-react-native';
import SwitchCameraIcon from '../../../../assets/icons/switchCamera.svg';
import { useTranslation } from 'react-i18next';
import { StopLiveButton } from '../../atoms/StopLiveButton';
import { StreamIconButton } from '../../atoms/stream/StreamIconButton';
import { STREAM_COLORS } from '../stream/streamTokens';

export interface LiveControlBarProps {
  onAddPress?: () => void;
  isStreamPaused: boolean;
  onTogglePause: () => void;
  onFlipCamera: () => void;
  flipDisabled?: boolean;
}

/** Barra inferior de controles live: + / pausa-resume / flip cámara (Figma 636-30226). */
export const LiveControlBar: React.FC<LiveControlBarProps> = ({
  onAddPress,
  isStreamPaused,
  onTogglePause,
  onFlipCamera,
  flipDisabled,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.bar}>
      <StreamIconButton
        size="lg"
        onPress={onAddPress}
        accessibilityLabel={t('stream.sellerAddProduct')}
      >
        <CirclePlus size={40} color={STREAM_COLORS.white} strokeWidth={1.7} />
      </StreamIconButton>

      <StopLiveButton
        variant={isStreamPaused ? 'paused' : 'live'}
        onPress={onTogglePause}
        accessibilityLabel={isStreamPaused ? t('stream.resumeStream') : t('stream.pauseStream')}
      />

      <StreamIconButton
        size="lg"
        onPress={onFlipCamera}
        disabled={flipDisabled}
        accessibilityLabel={t('stream.flipCamera')}
      >
        <SwitchCameraIcon width={32} height={32} />
      </StreamIconButton>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
});
