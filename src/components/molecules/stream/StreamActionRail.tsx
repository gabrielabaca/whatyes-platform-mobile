import React from 'react';
import { View, StyleSheet, Alert, Text as RNText } from 'react-native';
import {
  CreditCard,
  Video,
  Volume2,
  VolumeX,
  Share2,
  MoreVertical,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import MoreVertIcon from '../../../../assets/icons/stream/moreVert.svg';
import CommentBankIcon from '../../../../assets/icons/stream/commentBank.svg';
import ShareIcon from '../../../../assets/icons/stream/share.svg';
import ArrowShapeUpStackIcon from '../../../../assets/icons/stream/arrowShapeUpStack2.svg';
import CameraSwitchIcon from '../../../../assets/icons/stream/cameraSwitch.svg';
import { StreamIconButton } from '../../atoms/stream/StreamIconButton';
import { STREAM_COLORS } from './streamTokens';
import { FONT_FAMILY } from '../../../theme/typography';

/** Figma 890-1335: los iconos del rail del vendedor son de 32px. */
const SELLER_ICON = 32;

export type StreamActionRailVariant = 'buyer' | 'seller';

export interface StreamActionRailProps {
  variant?: StreamActionRailVariant;
  /** Viewer: salir del live desde el menú "más". */
  onExit?: () => void;
  onOpenWallet?: () => void;
  isRecording?: boolean;
  recordingTimeLabel?: string;
  onToggleRecording?: () => void;
  /**
   * Nota del vivo → icono comment_bank. En el vendedor abre el drawer de edición;
   * en el viewer, la nota publicada en solo lectura.
   */
  onOpenNote?: () => void;
  /** Seller: compartir deep link del live (stub). */
  onShare?: () => void;
  /** Seller: abre el menú de opciones (lo monta el overlay). */
  onMore?: () => void;
  /** Seller: subir producto al vivo → icono arrow_shape_up_stack_2. */
  onAddProduct?: () => void;
  /** Seller: cambiar cámara → icono cameraswitch. */
  onFlipCamera?: () => void;
  flipCameraDisabled?: boolean;
  /** Viewer: audio del dispositivo silenciado. */
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  /** Muestra un aviso con el look del vivo; sin esto se cae al Alert nativo. */
  onNotify?: (text: string) => void;
}

export const StreamActionRail: React.FC<StreamActionRailProps> = ({
  variant = 'buyer',
  onExit,
  onOpenWallet,
  isRecording = false,
  recordingTimeLabel = '0:00',
  onToggleRecording,
  onOpenNote,
  onShare,
  onMore,
  onAddProduct,
  onFlipCamera,
  flipCameraDisabled,
  isAudioMuted = false,
  onToggleAudio,
  onNotify,
}) => {
  const { t } = useTranslation();

  // Con `onNotify` el aviso sale como píldora del vivo; sin él, cae al diálogo
  // nativo (pantallas que todavía no montan el toast).
  const comingSoon = () => {
    const text = t('stream.comingSoon');
    if (onNotify) {
      onNotify(text);
      return;
    }
    Alert.alert(t('common.appName'), text);
  };

  const handleBuyerMore = () => {
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

  if (variant === 'seller') {
    // Figma 890-1335: más / comment_bank / share / subir producto / cambiar cámara.
    return (
      <View style={styles.rail}>
        <StreamIconButton
          size="md"
          onPress={onMore ?? comingSoon}
          accessibilityLabel={t('stream.more')}
        >
          <MoreVertIcon width={SELLER_ICON} height={SELLER_ICON} />
        </StreamIconButton>
        <StreamIconButton
          size="md"
          onPress={onOpenNote ?? comingSoon}
          accessibilityLabel={t('stream.noteDrawer.title')}
        >
          <CommentBankIcon width={SELLER_ICON} height={SELLER_ICON} />
        </StreamIconButton>
        <StreamIconButton
          size="md"
          onPress={onShare ?? comingSoon}
          accessibilityLabel={t('stream.share')}
        >
          <ShareIcon width={SELLER_ICON} height={SELLER_ICON} />
        </StreamIconButton>
        <StreamIconButton
          size="md"
          onPress={onAddProduct ?? comingSoon}
          accessibilityLabel={t('stream.sellerAddProduct')}
        >
          <ArrowShapeUpStackIcon width={SELLER_ICON} height={SELLER_ICON} />
        </StreamIconButton>
        <StreamIconButton
          size="md"
          onPress={onFlipCamera ?? comingSoon}
          disabled={flipCameraDisabled}
          accessibilityLabel={t('stream.flipCamera')}
        >
          <CameraSwitchIcon width={SELLER_ICON} height={SELLER_ICON} />
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
      {/* Nota del vivo en solo lectura. Mismo glifo que el vendedor (comment_bank),
          a 24 como el resto del rail del comprador. */}
      <StreamIconButton
        onPress={onOpenNote ?? comingSoon}
        accessibilityLabel={t('stream.noteDrawer.title')}
      >
        <CommentBankIcon width={24} height={24} />
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
});
