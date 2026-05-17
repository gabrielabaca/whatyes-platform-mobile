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
  productImageUrl?: string;
  productCount?: number;
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
}

export const StreamBuyerOverlay: React.FC<StreamBuyerOverlayProps> = ({
  sellerName,
  sellerAvatarUrl,
  sellerRating,
  productTitle,
  productImageUrl,
  productCount = 1,
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
}) => {
  const insets = useSafeAreaInsets();

  const lastBid = auctionBids.length > 0 ? auctionBids[auctionBids.length - 1] : null;
  const currentPrice = lastBid?.amount ?? 0;
  const winningUsername =
    auctionWinnerUsername ?? (lastBid ? lastBid.username : null);

  const suggestedBid = useMemo(() => {
    if (lastBid) {
      return lastBid.amount + BID_INCREMENT;
    }
    return DEFAULT_BID;
  }, [lastBid?.amount]);

  const productImages = useMemo(() => {
    if (!productImageUrl) {
      return [];
    }
    return [productImageUrl, productImageUrl, productImageUrl];
  }, [productImageUrl]);

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
        productImageUrls={productImages}
        productExtraCount={productCount > 3 ? productCount - 3 : 0}
      />

      <StreamAuctionPanel
        productTitle={productTitle}
        itemCount={productCount}
        winningUsername={winningUsername}
        currentPrice={currentPrice}
        secondsRemaining={auctionSecondsRemaining}
        isAuctionActive={isAuctionActive}
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
