/**
 * Peek de un vivo: overlay que se abre al mantener presionada una card del
 * home. Muestra la miniatura viva al instante y, ~1 s después, el video real
 * del stage precalentado (IvsPreviewVideoView se attacha sola cuando llega el
 * stream; hasta entonces es transparente). Dura PEEK_SECONDS y se cierra solo;
 * antes de eso se puede cerrar con la X, el fondo o el back de Android.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { IconEye } from '../../icons';
import { Text } from '../../atoms/Text';
import { FONT_FAMILY } from '../../../theme/typography';
import { IvsPreviewVideoView } from '../../../native/IvsStageNative';
import type { LiveStreamPreviewModel } from './types';

/** Duración del peek antes de cerrarse solo. */
const PEEK_SECONDS = 10;

interface LivePeekOverlayProps {
  stream: LiveStreamPreviewModel | null;
  onClose: () => void;
}

export const LivePeekOverlay: React.FC<LivePeekOverlayProps> = ({ stream, onClose }) => {
  const { width } = useWindowDimensions();
  const [secondsLeft, setSecondsLeft] = useState(PEEK_SECONDS);
  // onClose no está memoizado en el padre: por ref, así el timer no se reinicia
  // en cada render (solo depende de qué vivo se está espiando).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const streamId = stream?.id ?? null;

  useEffect(() => {
    if (!streamId) return;
    setSecondsLeft(PEEK_SECONDS);
    const tick = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    // El cierre lo maneja un timeout propio (no el updater del contador, que
    // no debe tener efectos secundarios).
    const closeTimer = setTimeout(() => onCloseRef.current(), PEEK_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(closeTimer);
    };
  }, [streamId]);

  if (!stream) return null;

  const cardW = width - 48;
  const cardH = Math.round(cardW * 1.5);

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Pressable interno sin onPress: los toques sobre la card no cierran. */}
        <Pressable style={[styles.card, { width: cardW, height: cardH }]}>
          {stream.thumbnail ? (
            <Image
              source={{ uri: stream.thumbnail }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}
          <IvsPreviewVideoView style={StyleSheet.absoluteFillObject} pointerEvents="none" />

          <View style={styles.countdownBadge} pointerEvents="none">
            <Text style={[styles.countdownText, { fontFamily: FONT_FAMILY.bold }]}>
              {secondsLeft}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Cerrar"
          >
            <X size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.infoBar}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={[styles.liveText, { fontFamily: FONT_FAMILY.bold }]}>LIVE</Text>
            </View>
            <Text
              style={[styles.seller, { fontFamily: FONT_FAMILY.semibold }]}
              numberOfLines={1}
            >
              {stream.sellerName}
            </Text>
            <View style={styles.viewers}>
              <IconEye size={13} color="#fff" strokeWidth={2} />
              <Text style={[styles.viewersText, { fontFamily: FONT_FAMILY.semibold }]}>
                {stream.viewerCount}
              </Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 2,
  },
  countdownBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 2,
  },
  countdownText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  infoBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fb2c36',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
  },
  seller: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
  viewers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewersText: {
    color: '#fff',
    fontSize: 12,
  },
});
