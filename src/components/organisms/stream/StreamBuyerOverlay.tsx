import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StreamSellerHeader,
  StreamChatOverlay,
  StreamActionRail,
  StreamChatComposer,
  StreamAuctionPanel,
  StreamBidBar,
} from '../../molecules/stream';
import type { ChatMessage, AuctionBid } from '../../../hooks/useStreamChat';

const BID_INCREMENT = 1000;
const DEFAULT_BID = 10000;

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
  onExit: () => void;
  onOpenWallet?: () => void;
  isRecording?: boolean;
  recordingTimeLabel?: string;
  onToggleRecording?: () => void;
  isAuctionActive: boolean;
  auctionSecondsRemaining: number | null;
  auctionBids: AuctionBid[];
  auctionWinnerUsername?: string | null;
  /** Abre el listado de productos del vivo (stack de fotos / "N artículos"). */
  onOpenProductCatalog?: () => void;
  /** Tocar avatar o nombre del vendedor en el header. */
  onSellerPress?: () => void;
  isFollowingSeller?: boolean;
  onFollowSeller?: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
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
  onExit,
  onOpenWallet,
  isRecording,
  recordingTimeLabel,
  onToggleRecording,
  isAuctionActive,
  auctionSecondsRemaining,
  auctionBids,
  auctionWinnerUsername,
  onOpenProductCatalog,
  onSellerPress,
  isFollowingSeller,
  onFollowSeller,
  isAudioMuted,
  onToggleAudio,
}) => {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const lastBid = auctionBids.length > 0 ? auctionBids[auctionBids.length - 1] : null;
  const bidAmount = lastBid?.amount ?? 0;
  /** API en centavos; pujas WS en pesos enteros (misma unidad que DEFAULT_BID). */
  const floorMajor = Math.round((productBasePriceCents ?? 0) / 100);
  const currentPrice = Math.max(bidAmount, floorMajor);
  const winningUsername =
    auctionWinnerUsername ?? (lastBid ? lastBid.username : null);

  const suggestedBid = useMemo(() => {
    if (lastBid) {
      return lastBid.amount + BID_INCREMENT;
    }
    if (floorMajor > 0) {
      return floorMajor + BID_INCREMENT;
    }
    return DEFAULT_BID;
  }, [lastBid?.amount, productBasePriceCents]);

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
      <StreamSellerHeader
        sellerName={sellerName}
        avatarUrl={sellerAvatarUrl}
        rating={sellerRating}
        viewerCount={viewerCount}
        onSellerPress={onSellerPress}
        isFollowing={isFollowingSeller}
        onFollowPress={onFollowSeller}
      />

      <View style={[styles.contentBlock, { paddingBottom: contentPaddingBottom }]}>
        <View style={styles.midRow}>
          <StreamChatOverlay messages={messages} />
          <StreamActionRail
            onExit={onExit}
            onOpenWallet={onOpenWallet}
            isRecording={isRecording}
            recordingTimeLabel={recordingTimeLabel}
            onToggleRecording={onToggleRecording}
            isAudioMuted={isAudioMuted}
            onToggleAudio={onToggleAudio}
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

        <StreamAuctionPanel
          productTitle={productTitle}
          itemCount={itemCount}
          winningUsername={winningUsername}
          currentPrice={currentPrice}
          secondsRemaining={auctionSecondsRemaining}
          isAuctionActive={isAuctionActive}
          onPressItemsRow={onOpenProductCatalog}
        />

        <StreamBidBar
          bidAmount={suggestedBid}
          onBid={() => onBid(suggestedBid)}
          isAuctionActive={isAuctionActive}
        />
      </View>
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
});
