import React, { useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
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
}) => {
  const insets = useSafeAreaInsets();

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
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents="box-none"
      keyboardVerticalOffset={0}
    >
      <StreamSellerHeader
        sellerName={sellerName}
        avatarUrl={sellerAvatarUrl}
        rating={sellerRating}
        viewerCount={viewerCount}
      />

      <View style={styles.midRow}>
        <StreamChatOverlay messages={messages} />
        <StreamActionRail
          onExit={onExit}
          onOpenWallet={onOpenWallet}
          isRecording={isRecording}
          recordingTimeLabel={recordingTimeLabel}
          onToggleRecording={onToggleRecording}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  midRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 120,
  },
});
