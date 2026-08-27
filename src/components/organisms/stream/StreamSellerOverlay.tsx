import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  Share,
  Animated,
  Text as RNText,
} from 'react-native';
import { Mic, MicOff, Pause } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StreamSellerHeader,
  StreamChatOverlay,
  StreamActionRail,
  StreamChatComposer,
  StreamAuctionPanel,
  SellerLiveActionBar,
} from '../../molecules/stream';
import { StreamEndLiveDrawer } from './StreamEndLiveDrawer';
import {
  StreamSellerMoreModal,
  type StreamSellerMoreAction,
} from './StreamSellerMoreModal';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';
import { FONT_FAMILY } from '../../../theme/typography';
import type {
  ChatMessage,
  AuctionBid,
  AuctionExtension,
  LiveOfferSaleMode,
} from '../../../hooks/useStreamChat';
import { APP_DOWNLOAD_URL } from '../../../constants/externalLinks';

export interface StreamSellerOverlayProps {
  sellerName: string;
  sellerAvatarUrl?: string | null;
  sellerRating?: number | null;
  productTitle: string;
  productImageUrls?: string[];
  productExtraCount?: number;
  productBasePriceCents?: number;
  viewerCount: number;
  messages: ChatMessage[];
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  onLike?: () => void;
  isAuctionActive: boolean;
  auctionSecondsRemaining: number | null;
  auctionBids: AuctionBid[];
  auctionWinnerUsername?: string | null;
  /** Segundos que la última puja le sumó al reloj (anti-sniping). */
  auctionExtension?: AuctionExtension | null;
  /** Modo de la oferta en curso (subasta o compra directa a precio fijo). */
  saleMode?: LiveOfferSaleMode;
  /** Precio fijo de la compra directa (centavos). Cae al precio base si falta. */
  buyNowPriceCents?: number | null;
  onEndStream: () => void;
  isStreamPaused: boolean;
  onTogglePause: () => void;
  /** El vendedor ya tocó "Comenzar Live" al menos una vez en esta sala. */
  hasStartedLive: boolean;
  /** Saca el vivo de pausa: arranca (o reanuda) la transmisión. */
  onStartLive: () => void;
  startLiveDisabled?: boolean;
  onFlipCamera: () => void;
  flipCameraDisabled?: boolean;
  onAddPress?: () => void;
  onOpenProductCatalog?: () => void;
  /** Flechas < > de la barra (Figma 890-1384): navegan el producto en juego. */
  onPrevProduct?: () => void;
  onNextProduct?: () => void;
  /** Con una oferta corriendo o un solo producto, las flechas quedan inertes. */
  productNavDisabled?: boolean;
  /** CTA central: "Iniciar subasta/venta/sorteo" o "Cancelar" según el estado. */
  primaryActionLabel: string;
  onPrimaryAction?: () => void;
  primaryActionDisabled?: boolean;
  primaryActionVariant?: 'start' | 'cancel';
  /** Botón comment_bank: abre el drawer de la nota del vivo (edición). */
  onOpenNote?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  isMicMuted?: boolean;
  /** Requerido: silenciar el mic es una acción real del vendedor, sin fallback. */
  onToggleMic: () => void;
}

export const StreamSellerOverlay: React.FC<StreamSellerOverlayProps> = ({
  sellerName,
  sellerAvatarUrl,
  sellerRating,
  productTitle,
  productImageUrls: productImageUrlsProp,
  productExtraCount,
  productBasePriceCents = 0,
  viewerCount,
  messages,
  messageText,
  onMessageChange,
  onSendMessage,
  onLike,
  isAuctionActive,
  auctionSecondsRemaining,
  auctionBids,
  auctionWinnerUsername,
  auctionExtension,
  saleMode = 'auction',
  buyNowPriceCents,
  onEndStream,
  isStreamPaused,
  onTogglePause,
  hasStartedLive,
  onStartLive,
  startLiveDisabled,
  onFlipCamera,
  flipCameraDisabled,
  onAddPress,
  onOpenProductCatalog,
  onPrevProduct,
  onNextProduct,
  productNavDisabled,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled,
  primaryActionVariant,
  onOpenNote,
  onShare,
  onMore,
  isMicMuted,
  onToggleMic,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [endDrawerVisible, setEndDrawerVisible] = useState(false);
  const [moreVisible, setMoreVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const contentPaddingBottom = isKeyboardVisible ? 5 : insets.bottom + 32;

  const isBuyNow = saleMode === 'buy_now';
  const lastBid = auctionBids.length > 0 ? auctionBids[auctionBids.length - 1] : null;
  const floorMajor = Math.round((productBasePriceCents ?? 0) / 100);
  // Compra directa: el precio no se mueve; en subasta sube con las pujas.
  const currentPrice = isBuyNow
    ? Math.round((buyNowPriceCents ?? productBasePriceCents ?? 0) / 100)
    : Math.max(lastBid?.amount ?? 0, floorMajor);
  const winningUsername = isBuyNow
    ? null
    : (auctionWinnerUsername ?? (lastBid ? lastBid.username : null));

  /**
   * Acciones del menú "más". Figma 890-1336 deja un único icono para las acciones
   * secundarias, así que micrófono y pausa —que antes tenían botón propio en el
   * rail— se agrupan acá. Iniciar la subasta ya no vive acá: es la CTA central
   * de la barra inferior (Figma 890-1384).
   * Finalizar el vivo tampoco: está en la X del header, que confirma con el drawer.
   */
  const moreActions = useMemo<StreamSellerMoreAction[]>(() => {
    const actions: StreamSellerMoreAction[] = [];

    actions.push({
      key: 'mic',
      label: isMicMuted ? t('stream.unmuteMic') : t('stream.muteMic'),
      icon: isMicMuted ? (
        <MicOff size={24} color={STREAM_COLORS.liveStop} />
      ) : (
        <Mic size={24} color={STREAM_COLORS.white} />
      ),
      onPress: onToggleMic,
    });

    // Estando pausado, quien reanuda es la CTA "Reanudar Live" de la barra inferior.
    if (!isStreamPaused) {
      actions.push({
        key: 'pause',
        label: t('stream.pauseStream'),
        icon: <Pause size={24} color={STREAM_COLORS.white} />,
        onPress: onTogglePause,
      });
    }

    return actions;
  }, [
    t,
    isMicMuted,
    onToggleMic,
    isStreamPaused,
    onTogglePause,
  ]);

  const stackUrls = productImageUrlsProp?.filter(Boolean) ?? [];
  const stackExtra = productExtraCount ?? (stackUrls.length > 3 ? stackUrls.length - 3 : 0);
  const visibleMessages =
    messages.length > 0
      ? messages
      : [{
          id: 'seller-joined',
          username: sellerName,
          message: 'Se unió 👋',
          timestamp: '',
        }];

  /**
   * Confirmación transitoria al togglear el micrófono. Solo con el CAMBIO de
   * estado (el ref arranca en null para no disparar al montar) y se desvanece
   * sola a los ~2s. Mientras está visible, el readyHint cede el centro.
   */
  const [micNotice, setMicNotice] = useState<'muted' | 'active' | null>(null);
  const micNoticeAnim = useRef(new Animated.Value(0)).current;
  const prevMicMutedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const muted = Boolean(isMicMuted);
    if (prevMicMutedRef.current === null) {
      prevMicMutedRef.current = muted;
      return;
    }
    if (prevMicMutedRef.current === muted) return;
    prevMicMutedRef.current = muted;
    setMicNotice(muted ? 'muted' : 'active');
    micNoticeAnim.setValue(1);
    const anim = Animated.sequence([
      Animated.delay(1800),
      Animated.timing(micNoticeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setMicNotice(null);
    });
    return () => anim.stop();
  }, [isMicMuted, micNoticeAnim]);

  const handleShare = () => {
    // Primera persona: el vendedor invita a su propio vivo, sin mencionar el lote.
    void (async () => {
      try {
        // Android solo acepta texto; en iOS el `url` viaja aparte (habilita
        // Guardar / Abrir enlace), así que se interpola vacío para no duplicarlo.
        if (Platform.OS === 'ios') {
          const message = t('stream.shareLiveSeller', { url: '' }).trimEnd();
          await Share.share({ message, url: APP_DOWNLOAD_URL });
        } else {
          await Share.share({
            message: t('stream.shareLiveSeller', { url: APP_DOWNLOAD_URL }),
          });
        }
      } catch {
        // Cancelar la hoja de compartir no es un error.
      }
    })();
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 36 : 16) + 8,
          paddingBottom: 0,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents="box-none"
      keyboardVerticalOffset={0}
    >
      {isKeyboardVisible ? (
        <Pressable
          style={styles.keyboardDismissBackdrop}
          onPress={Keyboard.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Ocultar teclado"
        />
      ) : null}

      {/* El diseño (698-12229 / 890-1303) no dibuja la X, pero la mantenemos como
          salida rápida del vivo además de la barra inferior y el menú "más". */}
      <StreamSellerHeader
        variant="seller"
        sellerName={sellerName}
        avatarUrl={sellerAvatarUrl}
        rating={sellerRating}
        viewerCount={viewerCount}
        onExitPress={() => setEndDrawerVisible(true)}
      />

      {/* Alarma persistente: el vendedor puede hablar sin ser escuchado, así que
          gana en rojo bajo el header, sin taparlo ni desplazarlo. */}
      {isMicMuted ? (
        <View style={styles.micMutedRow} pointerEvents="none" accessibilityLiveRegion="polite">
          <View style={styles.micMutedPill}>
            <MicOff size={15} color={STREAM_COLORS.white} strokeWidth={2.4} />
            <RNText style={styles.micMutedPillText} maxFontSizeMultiplier={1.2}>
              {t('stream.micMutedPill')}
            </RNText>
          </View>
        </View>
      ) : null}

      {/* Mientras el aviso de mic ocupa el centro, el readyHint cede el lugar:
          el aviso dura ~2s y responde a una acción recién hecha por el vendedor. */}
      {isStreamPaused && !micNotice ? (
        <View style={styles.readyHint} pointerEvents="none" accessibilityLiveRegion="polite">
          <RNText style={styles.readyHintTitle} maxFontSizeMultiplier={1.2}>
            {hasStartedLive
              ? t('stream.sellerPausedTitle')
              : t('stream.sellerReadyToStartTitle')}
          </RNText>
          <RNText style={styles.readyHintBody} maxFontSizeMultiplier={1.2}>
            {hasStartedLive
              ? t('stream.sellerPausedHint')
              : t('stream.sellerReadyToStartHint')}
          </RNText>
        </View>
      ) : null}

      {micNotice ? (
        <Animated.View
          style={[styles.readyHint, { opacity: micNoticeAnim }]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <RNText style={styles.readyHintTitle} maxFontSizeMultiplier={1.2}>
            {t(micNotice === 'muted' ? 'stream.micMutedPill' : 'stream.micActiveNotice')}
          </RNText>
        </Animated.View>
      ) : null}

      <View
        style={[styles.contentBlock, { paddingBottom: contentPaddingBottom }]}
        pointerEvents="box-none"
      >
        <View style={styles.chatBlock}>
          <View style={styles.chatRailRow} pointerEvents="box-none">
            <StreamChatOverlay messages={visibleMessages} />
            <StreamActionRail
              variant="seller"
              onOpenNote={onOpenNote}
              onShare={onShare ?? handleShare}
              onMore={onMore ?? (() => setMoreVisible(true))}
              onAddProduct={onAddPress}
              onFlipCamera={onFlipCamera}
              flipCameraDisabled={flipCameraDisabled}
            />
          </View>

          <StreamChatComposer
            value={messageText}
            onChangeText={onMessageChange}
            onSubmit={onSendMessage}
            onLike={onLike}
            showLikeButton
            productImageUrls={stackUrls}
            productExtraCount={stackExtra}
            showProductPlaceholder
            onProductStackPress={onOpenProductCatalog}
          />
        </View>

        <View style={styles.commerceBlock}>
          {/* El primer producto del catálogo se muestra siempre, haya o no una
              subasta corriendo: es el que pone en juego el slider. */}
          {productTitle ? (
            <StreamAuctionPanel
              variant="seller"
              productTitle={productTitle}
              productImageUrl={stackUrls[0] ?? null}
              winningUsername={winningUsername}
              currentPrice={currentPrice}
              bidCount={auctionBids.length}
              secondsRemaining={auctionSecondsRemaining}
              isAuctionActive={isAuctionActive}
              saleMode={saleMode}
              timeExtension={auctionExtension}
            />
          ) : null}

          <SellerLiveActionBar
            isStreamPaused={isStreamPaused}
            hasStartedLive={hasStartedLive}
            onStartLive={onStartLive}
            startDisabled={startLiveDisabled}
            onPrevProduct={onPrevProduct}
            onNextProduct={onNextProduct}
            navDisabled={productNavDisabled}
            primaryLabel={primaryActionLabel}
            onPrimaryPress={onPrimaryAction}
            primaryDisabled={primaryActionDisabled}
            primaryVariant={primaryActionVariant}
          />
        </View>
      </View>

      <StreamSellerMoreModal
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        actions={moreActions}
      />

      <StreamEndLiveDrawer
        visible={endDrawerVisible}
        onClose={() => setEndDrawerVisible(false)}
        onConfirm={() => {
          setEndDrawerVisible(false);
          onEndStream();
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  contentBlock: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 16,
    width: '100%',
  },
  chatBlock: {
    // Figma 890-1324: chat y composer van pegados (8), no a 16.
    gap: 8,
    width: '100%',
  },
  /** Figma 890-1361: panel de subasta y acciones separados por 12. */
  commerceBlock: {
    gap: 12,
    width: '100%',
  },
  chatRailRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    width: '100%',
  },
  keyboardDismissBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Fila propia bajo el header: no tapa ni desplaza la pill del vendedor. */
  micMutedRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  micMutedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: STREAM_COLORS.liveStop,
    borderRadius: 1000,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  micMutedPillText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  /**
   * Hint centrado mientras el vivo está pausado / por comenzar: guía al CTA
   * inferior sin tapar controles (pointerEvents none). Va un poco por encima
   * del centro para no solaparse con el chat.
   */
  readyHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '26%',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 5,
  },
  readyHintTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: STREAM_COLORS.white,
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  readyHintBody: {
    marginTop: 8,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
