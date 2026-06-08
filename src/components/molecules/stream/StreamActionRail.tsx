import React from 'react';
import { View, StyleSheet, Alert, Text as RNText } from 'react-native';
import {
  CreditCard,
  Mic,
  MicOff,
  Plus,
  Video,
  Volume2,
  VolumeX,
  Share2,
  MoreVertical,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamIconButton } from '../../atoms/stream/StreamIconButton';
import { STREAM_COLORS } from './streamTokens';
import { FONT_FAMILY } from '../../../theme/typography';

const SellerPaymentIcon = () => (
  <View style={styles.iconHost}>
    <CreditCard size={24} color={STREAM_COLORS.white} />
    <View style={styles.iconPlus}>
      <Plus size={9} color={STREAM_COLORS.white} strokeWidth={3} />
    </View>
  </View>
);

const SellerVideoLibraryIcon = () => (
  <View style={styles.videoLibraryIcon}>
    <View style={styles.playTriangle} />
  </View>
);

export type StreamActionRailVariant = 'buyer' | 'seller';

export interface StreamActionRailProps {
  variant?: StreamActionRailVariant;
  onExit?: () => void;
  onOpenWallet?: () => void;
  isRecording?: boolean;
  recordingTimeLabel?: string;
  onToggleRecording?: () => void;
  /** Seller: gestión métodos de cobro (stub → comingSoon). */
  onAddPaymentMethod?: () => void;
  /** Seller: biblioteca de clips post-venta (stub). */
  onOpenClips?: () => void;
  /** Seller: compartir deep link del live (stub). */
  onShare?: () => void;
  /** Seller: menú opciones (moderación, finalizar, etc.). */
  onMore?: () => void;
  /** Seller: iniciar subasta desde menú más. */
  onStartAuction?: () => void;
  /** Seller: vivo pausado (oculta botón de mic). */
  isStreamPaused?: boolean;
  /** Seller: micrófono silenciado manualmente. */
  isMicMuted?: boolean;
  onToggleMic?: () => void;
  /** Viewer: audio del dispositivo silenciado. */
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
}

export const StreamActionRail: React.FC<StreamActionRailProps> = ({
  variant = 'buyer',
  onExit,
  onOpenWallet,
  isRecording = false,
  recordingTimeLabel = '0:00',
  onToggleRecording,
  onAddPaymentMethod,
  onOpenClips,
  onShare,
  onMore,
  onStartAuction,
  isStreamPaused = false,
  isMicMuted = false,
  onToggleMic,
  isAudioMuted = false,
  onToggleAudio,
}) => {
  const { t } = useTranslation();

  const comingSoon = () => {
    Alert.alert(t('common.appName'), t('stream.comingSoon'));
  };

  const handleBuyerMore = () => {
    Alert.alert(t('stream.moreTitle'), undefined, [
      { text: t('stream.exit'), style: 'destructive', onPress: onExit },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  /** Seller: menú con finalizar + iniciar subasta temporal hasta que + tenga acción. */
  const handleSellerMore = () => {
    if (onMore) {
      onMore();
      return;
    }
    const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];
    if (onStartAuction) {
      buttons.push({ text: t('stream.sellerStartAuction'), onPress: onStartAuction });
    }
    buttons.push({ text: t('stream.endStream'), style: 'destructive', onPress: onExit });
    buttons.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(t('stream.sellerMoreTitle'), undefined, buttons);
  };

  const handleRecordingPress = () => {
    if (onToggleRecording) {
      onToggleRecording();
      return;
    }
    comingSoon();
  };

  if (variant === 'seller') {
    return (
      <View style={styles.rail}>
        <StreamIconButton
          onPress={onAddPaymentMethod ?? comingSoon}
          accessibilityLabel={t('stream.payment')}
        >
          <SellerPaymentIcon />
        </StreamIconButton>
        {!isStreamPaused ? (
          <StreamIconButton
            onPress={onToggleMic ?? comingSoon}
            accessibilityLabel={isMicMuted ? t('stream.unmuteMic') : t('stream.muteMic')}
          >
            {isMicMuted ? (
              <MicOff size={24} color={STREAM_COLORS.liveStop} />
            ) : (
              <Mic size={24} color={STREAM_COLORS.white} />
            )}
          </StreamIconButton>
        ) : null}
        <StreamIconButton
          onPress={onOpenClips ?? comingSoon}
          accessibilityLabel={t('stream.videoLibrary')}
        >
          <SellerVideoLibraryIcon />
        </StreamIconButton>
        <StreamIconButton
          onPress={onShare ?? comingSoon}
          accessibilityLabel={t('stream.share')}
        >
          <Share2 size={24} color={STREAM_COLORS.white} />
        </StreamIconButton>
        <StreamIconButton onPress={handleSellerMore} accessibilityLabel={t('stream.more')}>
          <MoreVertical size={24} color={STREAM_COLORS.white} />
        </StreamIconButton>
      </View>
    );
  }

  return (
    <View style={styles.rail}>
      <StreamIconButton
        onPress={onOpenWallet ?? comingSoon}
        accessibilityLabel={t('stream.payment')}
      >
        <CreditCard size={24} color={STREAM_COLORS.white} />
      </StreamIconButton>

      <StreamIconButton
        onPress={onToggleAudio ?? comingSoon}
        accessibilityLabel={isAudioMuted ? t('stream.unmuteAudio') : t('stream.muteAudio')}
      >
        {isAudioMuted ? (
          <VolumeX size={24} color={STREAM_COLORS.liveStop} />
        ) : (
          <Volume2 size={24} color={STREAM_COLORS.white} />
        )}
      </StreamIconButton>

      <View style={styles.recordWrap}>
        <StreamIconButton
          onPress={handleRecordingPress}
          accessibilityLabel={
            isRecording ? t('stream.stopRecording') : t('stream.startRecording')
          }
        >
          <Video
            size={24}
            color={isRecording ? STREAM_COLORS.liveStop : STREAM_COLORS.white}
            fill={isRecording ? STREAM_COLORS.liveStop : 'transparent'}
          />
        </StreamIconButton>
        {isRecording ? (
          <RNText style={styles.recordTimer}>{recordingTimeLabel}</RNText>
        ) : null}
      </View>

      <StreamIconButton onPress={comingSoon} accessibilityLabel={t('stream.share')}>
        <Share2 size={24} color={STREAM_COLORS.white} />
      </StreamIconButton>
      <StreamIconButton onPress={handleBuyerMore} accessibilityLabel={t('stream.more')}>
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
    color: STREAM_COLORS.liveStop,
    includeFontPadding: false,
  },
  iconHost: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlus: {
    position: 'absolute',
    right: -1,
    top: -1,
    width: 11,
    height: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLibraryIcon: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: STREAM_COLORS.white,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: STREAM_COLORS.white,
    marginLeft: 2,
  },
});
