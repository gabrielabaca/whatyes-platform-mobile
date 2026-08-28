import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  Platform,
  Pressable,
  Share,
  Text as RNText,
  type KeyboardEvent,
} from 'react-native';
import { MicOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  StreamSellerHeader,
  StreamChatOverlay,
  StreamActionRail,
  StreamChatComposer,
  StreamAuctionPanel,
  StreamBidBar,
  StreamAuctionBanner,
} from '../../molecules/stream';
import { StreamBidIncrementDrawer } from './StreamBidIncrementDrawer';
import type {
  ChatMessage,
  AuctionBid,
  AuctionExtension,
  LiveOfferSaleMode,
} from '../../../hooks/useStreamChat';
import type { ShippingQuoteState } from '../../../hooks/useProductShippingQuote';
import { StreamGlassPill } from '../../atoms/stream/StreamGlassPill';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';
import { FONT_FAMILY } from '../../../theme/typography';
import { APP_DOWNLOAD_URL } from '../../../constants/externalLinks';
import { storage } from '../../../utils/storage';
import {
  parseBidMultiplier,
  suggestedBidAmount,
  bidIncrementAmount,
  type BidMultiplier,
} from '../../../utils/bidIncrement';

export interface StreamBuyerOverlayProps {
  sellerName: string;
  sellerAvatarUrl?: string | null;
  sellerRating?: number | null;
  productTitle: string;
  /** URLs para el stack de miniaturas (Figma); vacío oculta el stack. */
  productImageUrls?: string[];
  /** Stock u “N artículos” en el panel de subasta */
  itemCount?: number;
  /** Precio base del producto (centavos); la oferta visible es max(puja, base). */
  productBasePriceCents?: number;
  viewerCount: number;
  messages: ChatMessage[];
  messageText: string;
  onMessageChange: (text: string) => void;
  onSendMessage: () => void;
  onLike: () => void;
  onBid: (amount: number) => void;
  /** Compra directa: el primero que confirma se lleva el producto. */
  onBuyNow?: () => void;
  onExit: () => void;
  onOpenWallet?: () => void;
  isRecording?: boolean;
  recordingTimeLabel?: string;
  onToggleRecording?: () => void;
  /** Muestra panel + barra de acción (solo con una oferta en curso). */
  showAuctionUi?: boolean;
  isAuctionActive: boolean;
  /** Oferta congelada por el vendedor (flujo de cancelación): no entran ofertas. */
  isAuctionPaused?: boolean;
  auctionSecondsRemaining: number | null;
  auctionBids: AuctionBid[];
  auctionWinnerUsername?: string | null;
  /** Nombre del usuario logueado en el chat: habilita el "Estás ganando..." */
  currentUsername?: string | null;
  /** Segundos que la última puja le sumó al reloj (anti-sniping). */
  auctionExtension?: AuctionExtension | null;
  /** Modo de la oferta en curso: define si se puja o se compra a precio fijo. */
  saleMode?: LiveOfferSaleMode;
  /** Precio fijo de la compra directa (centavos). Cae al precio base si falta. */
  buyNowPriceCents?: number | null;
  /** Compra en vuelo: bloquea la barra hasta que el backend resuelve. */
  isBuyNowPending?: boolean;
  /** Abre el listado de productos del vivo (stack de fotos / "N artículos"). */
  onOpenProductCatalog?: () => void;
  /** Tocar avatar o nombre del vendedor en el header. */
  onSellerPress?: () => void;
  isFollowingSeller?: boolean;
  onFollowSeller?: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  /** Botón comment_bank: abre la nota del vivo en solo lectura. */
  onOpenNote?: () => void;
  /** Cotización de envío del producto activo hacia el domicilio del comprador. */
  shippingQuote?: ShippingQuoteState;
  /** Tocar la fila de envío cuando falta domicilio (abre wallet → shipping). */
  onPressShipping?: () => void;
  /** Avisos del vivo (píldora con el look de la app en vez de un diálogo bloqueante). */
  onNotify?: (text: string) => void;
  /** El vendedor silenció su micrófono (estado real, vía WS). */
  isSellerAudioMuted?: boolean;
  /** Figma 881-960: interludio entre productos, en el hueco del panel. */
  showAuctionInterlude?: boolean;
  onDismissAuctionInterlude?: () => void;
}

export const StreamBuyerOverlay: React.FC<StreamBuyerOverlayProps> = ({
  sellerName,
  sellerAvatarUrl,
  sellerRating,
  productTitle,
  productImageUrls: productImageUrlsProp,
  itemCount = 1,
  productBasePriceCents = 0,
  viewerCount,
  messages,
  messageText,
  onMessageChange,
  onSendMessage,
  onLike,
  onBid,
  onBuyNow,
  onExit,
  onOpenWallet,
  isRecording,
  recordingTimeLabel,
  onToggleRecording,
  showAuctionUi = false,
  isAuctionActive,
  isAuctionPaused = false,
  auctionSecondsRemaining,
  auctionBids,
  auctionWinnerUsername,
  currentUsername,
  auctionExtension,
  saleMode = 'auction',
  buyNowPriceCents,
  isBuyNowPending = false,
  onOpenProductCatalog,
  onSellerPress,
  isFollowingSeller,
  onFollowSeller,
  isAudioMuted,
  onToggleAudio,
  onOpenNote,
  shippingQuote,
  onPressShipping,
  onNotify,
  isSellerAudioMuted = false,
  showAuctionInterlude = false,
  onDismissAuctionInterlude,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [bidMultiplier, setBidMultiplier] = useState<BidMultiplier>(1);
  const [tuneOpen, setTuneOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void storage.getBidMultiplier().then((stored) => {
      if (!cancelled) setBidMultiplier(parseBidMultiplier(stored));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isKeyboardVisible = keyboardHeight > 0;
  const contentPaddingBottom = isKeyboardVisible ? 5 : insets.bottom + 32;

  const isBuyNow = saleMode === 'buy_now';
  const lastBid = auctionBids.length > 0 ? auctionBids[auctionBids.length - 1] : null;
  const bidAmount = lastBid?.amount ?? 0;
  /** API en centavos; pujas WS en pesos enteros (misma unidad que DEFAULT_BID). */
  const floorMajor = Math.round((productBasePriceCents ?? 0) / 100);
  /** Compra directa: precio fijo de la oferta (o el base del producto). Nunca sube. */
  const buyNowPrice = Math.round((buyNowPriceCents ?? productBasePriceCents ?? 0) / 100);
  const currentPrice = isBuyNow ? buyNowPrice : Math.max(bidAmount, floorMajor);
  const winningUsername = isBuyNow
    ? null
    : (auctionWinnerUsername ?? (lastBid ? lastBid.username : null));

  /**
   * Piso local de la puja: la barra confirma sin esperar animación ni eco del
   * WS, así que dos deslizadas seguidas podrían mandar el mismo monto. Cada
   * envío sube este piso; el eco del servidor lo supera apenas llega.
   */
  const [localBidFloor, setLocalBidFloor] = useState(0);

  useEffect(() => {
    // Cerró la oferta: el piso local no debe filtrarse a la siguiente subasta.
    if (!showAuctionUi) setLocalBidFloor(0);
  }, [showAuctionUi]);

  const suggestedBid = useMemo(() => {
    const derived = suggestedBidAmount({
      lastBidAmount: lastBid?.amount ?? null,
      floorMajor,
      multiplier: bidMultiplier,
    });
    return Math.max(derived, localBidFloor);
  }, [lastBid?.amount, floorMajor, bidMultiplier, localBidFloor]);

  const bidStep = bidIncrementAmount(floorMajor, bidMultiplier);

  const handleBid = useCallback(() => {
    onBid(suggestedBid);
    setLocalBidFloor(suggestedBid + bidStep);
  }, [onBid, suggestedBid, bidStep]);

  const handleSelectMultiplier = useCallback((next: BidMultiplier) => {
    setBidMultiplier(next);
    void storage.setBidMultiplier(next);
  }, []);

  const handleShare = useCallback(() => {
    // El mensaje habla del vivo y la app, no del lote en pantalla (rota durante
    // el vivo y el receptor puede llegar cuando ya se vendió).
    const seller = sellerName?.trim() || t('home.defaultRoomName');
    void (async () => {
      try {
        // Android solo acepta texto; en iOS el `url` viaja aparte (habilita
        // Guardar / Abrir enlace), así que se interpola vacío para no duplicarlo.
        if (Platform.OS === 'ios') {
          const message = t('stream.shareLiveViewer', { seller, url: '' }).trimEnd();
          await Share.share({ message, url: APP_DOWNLOAD_URL });
        } else {
          await Share.share({
            message: t('stream.shareLiveViewer', { seller, url: APP_DOWNLOAD_URL }),
          });
        }
      } catch {
        // Cancelar la hoja de compartir no es un error.
      }
    })();
  }, [sellerName, t]);

  const stackUrls = productImageUrlsProp?.filter(Boolean) ?? [];
  const stackExtra =
    stackUrls.length > 3 ? stackUrls.length - 3 : 0;

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 36 : 16) + 8,
          bottom: keyboardHeight,
        },
      ]}
      pointerEvents="box-none"
    >
      {isKeyboardVisible ? (
        <Pressable
          style={styles.keyboardDismissBackdrop}
          onPress={Keyboard.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Ocultar teclado"
        />
      ) : null}

      <StreamSellerHeader
        sellerName={sellerName}
        avatarUrl={sellerAvatarUrl}
        rating={sellerRating}
        viewerCount={viewerCount}
        onSellerPress={onSellerPress}
        isFollowing={isFollowingSeller}
        onFollowPress={onFollowSeller}
        onExitPress={onExit}
      />

      {/* Informativo, no alarma: explica por qué no se escucha nada. Mismo glass
          neutro del resto del overlay, cerca del header del vendedor. */}
      {isSellerAudioMuted ? (
        <View style={styles.micMutedRow} pointerEvents="none" accessibilityLiveRegion="polite">
          <StreamGlassPill style={styles.micMutedPill}>
            <View style={styles.micMutedContent}>
              <MicOff size={14} color={STREAM_COLORS.white} strokeWidth={2.2} />
              <RNText style={styles.micMutedText} maxFontSizeMultiplier={1.2}>
                {t('stream.sellerMicMuted')}
              </RNText>
            </View>
          </StreamGlassPill>
        </View>
      ) : null}

      <View
        style={[styles.contentBlock, { paddingBottom: contentPaddingBottom }]}
        pointerEvents="box-none"
      >
        <View style={styles.midRow} pointerEvents="box-none">
          <StreamChatOverlay messages={messages} />
          <StreamActionRail
            onExit={onExit}
            onOpenWallet={onOpenWallet}
            isRecording={isRecording}
            recordingTimeLabel={recordingTimeLabel}
            onToggleRecording={onToggleRecording}
            isAudioMuted={isAudioMuted}
            onToggleAudio={onToggleAudio}
            onOpenNote={onOpenNote}
            onShare={handleShare}
            onNotify={onNotify}
          />
        </View>

        <StreamChatComposer
          value={messageText}
          onChangeText={onMessageChange}
          onSubmit={onSendMessage}
          onLike={onLike}
          productImageUrls={stackUrls}
          productExtraCount={stackExtra}
          onProductStackPress={onOpenProductCatalog}
        />

        {showAuctionInterlude ? (
          <StreamAuctionBanner
            variant="interlude"
            visible
            onDismiss={onDismissAuctionInterlude ?? (() => {})}
          />
        ) : showAuctionUi ? (
          <StreamAuctionPanel
            productTitle={productTitle}
            itemCount={itemCount}
            winningUsername={winningUsername}
            currentUsername={currentUsername}
            currentPrice={currentPrice}
            secondsRemaining={auctionSecondsRemaining}
            isAuctionActive={isAuctionActive}
            saleMode={saleMode}
            timeExtension={auctionExtension}
            onPressItemsRow={onOpenProductCatalog}
            shippingQuote={shippingQuote}
            onPressShipping={onPressShipping}
          />
        ) : null}

        {/* Misma barra deslizable en los dos modos: solo cambia qué confirma.
            En pausa (vendedor decidiendo si cancela) queda inerte: el servidor
            rechazaría la oferta igual, pero no invitamos a un gesto muerto.
            Sin oferta en curso la barra NO se oculta: queda deshabilitada con
            "Esperando subasta..." y se habilita sola cuando arranca la venta.
            El Figma (821-3811) la oculta, pero contentBlock es flex-end y no
            reserva el hueco: al ocultarla el chat y el rail saltan en cada
            subasta. Por eso no seguimos el diseño acá. */}
        {!showAuctionUi ? (
          <StreamBidBar
            mode="idle"
            bidAmount={0}
            onBid={() => {}}
            isAuctionActive={false}
            disabled
          />
        ) : isBuyNow ? (
          <StreamBidBar
            mode="buy_now"
            bidAmount={buyNowPrice}
            onBid={() => onBuyNow?.()}
            isAuctionActive={isAuctionActive}
            disabled={isBuyNowPending || !onBuyNow || isAuctionPaused}
          />
        ) : (
          <StreamBidBar
            bidAmount={suggestedBid}
            onBid={handleBid}
            isAuctionActive={isAuctionActive}
            disabled={isAuctionPaused}
            onTunePress={() => setTuneOpen(true)}
            tuneAccessibilityLabel={t('stream.bidIncrementA11y')}
          />
        )}
      </View>

      <StreamBidIncrementDrawer
        visible={tuneOpen}
        onClose={() => setTuneOpen(false)}
        floorMajor={floorMajor}
        multiplier={bidMultiplier}
        onSelect={handleSelectMultiplier}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  midRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 120,
    width: '100%',
  },
  keyboardDismissBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Fila propia bajo el header del vendedor: no tapa ni desplaza nada. */
  micMutedRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  micMutedPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  micMutedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  micMutedText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
});
