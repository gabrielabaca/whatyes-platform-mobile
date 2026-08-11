/**
 * Conversación 1 a 1 — overlay glass oscuro (Figma 636-26800 / 26843 / 26998).
 *
 * Modal de pantalla completa sobre la lista de chats: header con avatar + nombre
 * y X para cerrar, burbujas (las del otro con borde violeta y avatar a la
 * izquierda; las mías rellenas translúcidas con mi avatar a la derecha) y
 * composer de píldora con adjuntos: las fotos elegidas se previsualizan dentro
 * del composer con una X para quitarlas antes de enviar (Figma 636-26998).
 *
 * Tiempo real: polling cada 5 s mientras está abierta (el WS de usuario todavía
 * no tiene cliente en mobile); ver la conversación marca leído.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Share,
  Text as RNText,
  useWindowDimensions,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, Plus, SendHorizontal, X } from 'lucide-react-native';
import { GlassBackdrop } from '../profile/GlassBackdrop';
import {
  getConversationMessages,
  markConversationRead,
  sendConversationMessage,
  uploadConversationImages,
  type ConversationItem,
  type ConversationMessage,
} from '../../../api/platformApi';
import { storage } from '../../../utils/storage';
import { useAuth } from '../../../hooks/useAuth';
import type { UserMe } from '../../../api/types';
import { launchPhotoLibraryNow, photosFromPickerResponse, type PickerPhoto } from '../../../utils/mediaPicker';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { appAlert } from '../../../alerts';

const PRIMARY = themeColors.primary;
const G = themeColors.glass;
/** Borde violeta claro de las burbujas (Figma). */
const BUBBLE_BORDER = '#A9A2F2';
const POLL_INTERVAL_MS = 5000;
const MAX_ATTACHMENTS = 6;

/**
 * Mensaje en pantalla: los del server tal cual, más los propios en vuelo.
 * `localStatus` existe solo para mensajes aún no confirmados: 'sending' se ve
 * idéntico a un enviado (sin spinners) y 'failed' se pinta en rojo y se puede
 * tocar para reintentar. `localPhotos` guarda los adjuntos originales del
 * picker para poder reintentar la subida.
 */
type LocalMessage = ConversationMessage & {
  localStatus?: 'sending' | 'failed';
  localPhotos?: PickerPhoto[];
};

export interface ConversationModalProps {
  conversation: ConversationItem;
  onClose: () => void;
  /** Llega mensaje nuevo o se abre el hilo: la lista actualiza previews y badge. */
  onRead?: (conversationId: string) => void;
}

/** Círculo con foto o inicial del nombre (fallback del diseño). */
const PeerAvatar: React.FC<{ uri?: string | null; name?: string | null; size: number }> = ({
  uri,
  name,
  size,
}) => {
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={round} />;
  }
  return (
    <View style={[round, styles.avatarFallback]}>
      <RNText style={[styles.avatarInitial, { fontSize: size * 0.42 }]}>{initial}</RNText>
    </View>
  );
};

export const ConversationModal: React.FC<ConversationModalProps> = ({
  conversation,
  onClose,
  onRead,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();
  // Misma derivación que usa HomeScreen para el avatar del header.
  const myAvatarUri =
    (user as UserMe | null)?.profile_picture ?? user?.profile?.picture ?? null;
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<PickerPhoto[]>([]);
  /**
   * Fotos abiertas en pantalla completa (tap sobre una imagen de burbuja):
   * todas las del mensaje, para deslizar entre ellas; `index` es la visible
   * (arranca en la tocada) y es la que baja el botón de descargar.
   */
  const [preview, setPreview] = useState<{ urls: string[]; index: number } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const newestUuidRef = useRef<string | null>(null);
  const localSeqRef = useRef(0);

  const conversationId = conversation.uuid;
  const peerName = conversation.peer?.name?.trim() || '';

  const refresh = useCallback(
    async (initial = false) => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const data = await getConversationMessages(token, conversationId, { limit: 50 });
        const newest = data.items[0]?.uuid ?? null;
        if (initial || newest !== newestUuidRef.current) {
          newestUuidRef.current = newest;
          // Los mensajes en vuelo (o fallados) sobreviven al refresh del server.
          setMessages((prev) => [...prev.filter((m) => m.localStatus), ...data.items]);
          // Estoy mirando el hilo: lo que llegue queda leído.
          await markConversationRead(token, conversationId).catch(() => {});
          onRead?.(conversationId);
        }
      } catch {
        // Sin red: se conserva lo que hay; el próximo tick reintenta.
      } finally {
        if (initial) setLoading(false);
      }
    },
    [conversationId, onRead]
  );

  useEffect(() => {
    void refresh(true);
    const timer = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const handleAttach = () => {
    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) return;
    launchPhotoLibraryNow({ mediaType: 'photo', selectionLimit: remaining }, (response) => {
      const photos = photosFromPickerResponse(response);
      if (photos.length) {
        setAttachments((prev) => [...prev, ...photos].slice(0, MAX_ATTACHMENTS));
      }
    });
  };

  /** Sube (si hay fotos) y envía en background; al fallar, la burbuja queda roja. */
  const deliver = useCallback(
    async (local: LocalMessage) => {
      try {
        const token = await storage.getAccessToken();
        if (!token) throw new Error('no token');
        let imageUrls: string[] = [];
        if (local.localPhotos?.length) {
          imageUrls = await uploadConversationImages(token, local.localPhotos);
        }
        const sent = await sendConversationMessage(token, conversationId, local.body, imageUrls);
        newestUuidRef.current = sent.uuid;
        setMessages((prev) => {
          // El poll pudo traer ya la versión del server: no duplicar.
          const rest = prev.filter((m) => m.uuid !== local.uuid && m.uuid !== sent.uuid);
          return [sent, ...rest];
        });
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.uuid === local.uuid ? { ...m, localStatus: 'failed' } : m))
        );
      }
    },
    [conversationId]
  );

  const handleSend = () => {
    const text = draft.trim();
    if (!text && attachments.length === 0) return;
    // El mensaje sube a la lista al instante, como enviado; la red va por detrás.
    const local: LocalMessage = {
      uuid: `local-${++localSeqRef.current}`,
      conversation_id: conversationId,
      // El uuid real: así la burbuja agrupa con mis mensajes anteriores.
      sender_user_id: user?.uuid ?? 'me',
      body: text,
      // Las URIs locales del picker: <Image> las renderiza igual que las de S3.
      image_urls: attachments.map((p) => p.uri),
      is_mine: true,
      is_read: false,
      created_at: Math.floor(Date.now() / 1000),
      localStatus: 'sending',
      localPhotos: attachments,
    };
    setMessages((prev) => [local, ...prev]);
    setDraft('');
    setAttachments([]);
    void deliver(local);
  };

  /**
   * "Descargar" sin librerías de filesystem: en iOS se baja la imagen y se
   * comparte como data-URI — el share sheet ofrece "Guardar imagen" (mismo
   * enfoque que el share del visor de clips). En Android el Share nativo solo
   * acepta texto: se comparte el enlace.
   */
  const handleDownload = async (url: string) => {
    if (downloading) return;
    setDownloading(true);
    try {
      if (Platform.OS === 'ios') {
        const blob = await (await fetch(url)).blob();
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        await Share.share({ url: dataUri });
      } else {
        await Share.share({ message: url });
      }
    } catch {
      appAlert(t('common.appName'), t('chat.downloadError'));
    } finally {
      setDownloading(false);
    }
  };

  const handleRetry = (failed: LocalMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.uuid === failed.uuid ? { ...m, localStatus: 'sending' } : m))
    );
    void deliver(failed);
  };

  /** Avatar solo en el primer mensaje (el más viejo) de una tanda del mismo autor. */
  const startsGroup = (index: number) => {
    const older = messages[index + 1];
    return !older || older.sender_user_id !== messages[index].sender_user_id;
  };

  const renderMessage = ({ item, index }: { item: LocalMessage; index: number }) => {
    const mine = item.is_mine;
    const showAvatar = startsGroup(index);
    const failed = item.localStatus === 'failed';
    return (
      <View style={[styles.messageRow, mine ? styles.messageRowMine : null]}>
        {!mine ? (
          <View style={styles.messageAvatarSlot}>
            {showAvatar ? (
              <PeerAvatar
                uri={conversation.peer?.profile_picture}
                name={peerName}
                size={36}
              />
            ) : null}
          </View>
        ) : null}
        <TouchableOpacity
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubblePeer,
            failed ? styles.bubbleFailed : null,
          ]}
          // Solo una burbuja fallada responde al toque: reintenta el envío.
          disabled={!failed}
          onPress={() => handleRetry(item)}
          activeOpacity={0.7}
          accessibilityRole={failed ? 'button' : undefined}
          accessibilityLabel={failed ? t('chat.tapToRetry') : undefined}
        >
          {item.image_urls.length > 0 ? (
            <View style={styles.bubbleImages}>
              {item.image_urls.map((url, imageIndex) => (
                <TouchableOpacity
                  key={url}
                  // En una burbuja fallada el toque sigue siendo "reintentar".
                  onPress={() => {
                    if (failed) {
                      handleRetry(item);
                      return;
                    }
                    Keyboard.dismiss();
                    // Todas las fotos del mensaje, empezando por la tocada.
                    setPreview({ urls: item.image_urls, index: imageIndex });
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={failed ? t('chat.tapToRetry') : t('chat.viewImage')}
                >
                  <Image source={{ uri: url }} style={styles.bubbleImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {item.body ? <RNText style={styles.bubbleText}>{item.body}</RNText> : null}
          {failed ? (
            <RNText style={styles.bubbleRetryText}>{t('chat.tapToRetry')}</RNText>
          ) : null}
        </TouchableOpacity>
        {mine ? (
          <View style={styles.messageAvatarSlot}>
            {showAvatar ? <PeerAvatar uri={myAvatarUri} name={null} size={36} /> : null}
          </View>
        ) : null}
      </View>
    );
  };

  const canSend = draft.trim().length > 0 || attachments.length > 0;

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      // Atrás en Android: primero cierra el preview de imagen, después el chat.
      onRequestClose={() => (preview ? setPreview(null) : onClose())}
    >
      <View style={styles.root}>
        <GlassBackdrop />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <PeerAvatar uri={conversation.peer?.profile_picture} name={peerName} size={44} />
            <RNText style={styles.headerName} numberOfLines={1}>
              {peerName || t('chat.title')}
            </RNText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={26} color={G.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={PRIMARY} style={styles.loader} />
          ) : (
            <FlatList
              data={messages}
              inverted
              keyExtractor={(item) => item.uuid}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={[styles.composerBox, attachments.length ? styles.composerBoxTall : null]}>
              {attachments.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.attachmentsRow}
                >
                  {attachments.map((photo, index) => (
                    <View key={`${photo.uri}-${index}`} style={styles.attachmentWrap}>
                      <Image source={{ uri: photo.uri }} style={styles.attachmentThumb} />
                      <TouchableOpacity
                        style={styles.attachmentRemove}
                        onPress={() =>
                          setAttachments((prev) => prev.filter((_, i) => i !== index))
                        }
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t('chat.removePhoto')}
                      >
                        <X size={13} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
              <View style={styles.composerRow}>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={handleAttach}
                  accessibilityRole="button"
                  accessibilityLabel={t('chat.attachPhotos')}
                >
                  <Plus size={18} color={PRIMARY} strokeWidth={2.5} />
                </TouchableOpacity>
                <AppTextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={t('chat.inputPlaceholder')}
                  placeholderTextColor={G.placeholder}
                  style={styles.input}
                  multiline
                  maxLength={4000}
                  accessoryAppearance="dark"
                />
                <TouchableOpacity
                  style={[styles.sendButton, !canSend ? styles.sendButtonDisabled : null]}
                  onPress={handleSend}
                  disabled={!canSend}
                  accessibilityRole="button"
                  accessibilityLabel={t('chat.send')}
                >
                  <SendHorizontal size={18} color={PRIMARY} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Preview de imagen a pantalla completa. Va como overlay dentro de este
            Modal (un segundo <Modal> anidado no se presenta en iOS). Con varias
            fotos en el mensaje se desliza entre ellas (pager horizontal). */}
        {preview ? (
          <View style={styles.previewOverlay}>
            <FlatList
              style={styles.previewPager}
              data={preview.urls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(url) => url}
              initialScrollIndex={preview.index}
              // Páginas de ancho fijo: sin esto initialScrollIndex no puede saltar directo.
              getItemLayout={(_, i) => ({ length: windowWidth, offset: windowWidth * i, index: i })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
                setPreview((prev) =>
                  prev && index !== prev.index ? { ...prev, index } : prev
                );
              }}
              renderItem={({ item: url }) => (
                <Image
                  source={{ uri: url }}
                  style={[styles.previewImage, { width: windowWidth }]}
                  resizeMode="contain"
                />
              )}
            />
            {preview.urls.length > 1 ? (
              <RNText style={[styles.previewCounter, { top: insets.top + 12 }]}>
                {preview.index + 1}/{preview.urls.length}
              </RNText>
            ) : null}
            <TouchableOpacity
              style={[styles.previewClose, { top: insets.top + 8 }]}
              onPress={() => setPreview(null)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={26} color={G.text} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewDownload, { bottom: Math.max(insets.bottom, 16) + 16 }]}
              onPress={() => {
                void handleDownload(preview.urls[preview.index]);
              }}
              disabled={downloading}
              accessibilityRole="button"
              accessibilityLabel={t('chat.download')}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={G.text} />
              ) : (
                <Download size={18} color={G.text} strokeWidth={2} />
              )}
              <RNText style={styles.previewDownloadText}>{t('chat.download')}</RNText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerName: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: G.text,
    includeFontPadding: false,
  },
  loader: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageAvatarSlot: {
    width: 36,
  },
  avatarFallback: {
    backgroundColor: 'rgba(104,92,240,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  bubble: {
    maxWidth: '74%',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  bubblePeer: {
    borderColor: BUBBLE_BORDER,
    backgroundColor: 'transparent',
  },
  bubbleMine: {
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: G.rowBg,
  },
  /** Envío fallado: burbuja en rojo, tocable para reintentar. */
  bubbleFailed: {
    borderColor: themeColors.danger,
    backgroundColor: 'rgba(251,44,54,0.18)',
  },
  bubbleRetryText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 15,
    color: themeColors.danger,
    includeFontPadding: false,
  },
  bubbleText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
    color: G.text,
    includeFontPadding: false,
  },
  bubbleImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bubbleImage: {
    width: 110,
    height: 110,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  composerBox: {
    borderWidth: 1,
    borderColor: BUBBLE_BORDER,
    borderRadius: 24,
    backgroundColor: G.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  composerBoxTall: {
    paddingTop: 12,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  attachButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    backgroundColor: 'rgba(104,92,240,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 19,
    color: G.text,
    maxHeight: 120,
    paddingVertical: 6,
    padding: 0,
    includeFontPadding: false,
  },
  sendButton: {
    width: 52,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  attachmentsRow: {
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 2,
  },
  attachmentWrap: {
    position: 'relative',
  },
  attachmentThumb: {
    width: 84,
    height: 84,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  attachmentRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,5,15,0.96)',
  },
  previewPager: {
    ...StyleSheet.absoluteFillObject,
  },
  previewImage: {
    height: '100%',
  },
  previewCounter: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: G.text,
    includeFontPadding: false,
  },
  previewClose: {
    position: 'absolute',
    right: 16,
  },
  previewDownload: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 1000,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  previewDownloadText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: G.text,
    includeFontPadding: false,
  },
});
