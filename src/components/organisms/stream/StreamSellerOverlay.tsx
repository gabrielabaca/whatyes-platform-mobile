import React, { useEffect, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StreamSellerHeader,
  StreamChatOverlay,
  StreamActionRail,
  StreamChatComposer,
  StreamAuctionPanel,
} from '../../molecules/stream';
import { LiveControlBar } from '../../molecules/LiveControlBar';
import type { ChatMessage, AuctionBid } from '../../../hooks/useStreamChat';

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
  onEndStream: () => void;
  isStreamPaused: boolean;
  onTogglePause: () => void;
  onFlipCamera: () => void;
  flipCameraDisabled?: boolean;
  onAddPress?: () => void;
  onOpenProductCatalog?: () => void;
  onAddPaymentMethod?: () => void;
  onOpenClips?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  onStartAuction?: () => void;
  isMicMuted?: boolean;
  onToggleMic?: () => void;
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
  onEndStream,
  isStreamPaused,
  onTogglePause,
  onFlipCamera,
  flipCameraDisabled,
  onAddPress,
  onOpenProductCatalog,
  onAddPaymentMethod,
  onOpenClips,
  onShare,
  onMore,
  onStartAuction,
  isMicMuted,
  onToggleMic,
}) => {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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

  const lastBid = auctionBids.length > 0 ? auctionBids[auctionBids.length - 1] : null;
  const floorMajor = Math.round((productBasePriceCents ?? 0) / 100);
  const currentPrice = Math.max(lastBid?.amount ?? 0, floorMajor);
  const winningUsername =
    auctionWinnerUsername ?? (lastBid ? lastBid.username : null);

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
      <StreamSellerHeader
        variant="seller"
        sellerName={sellerName}
        avatarUrl={sellerAvatarUrl}
        rating={sellerRating}
        viewerCount={viewerCount}
      />

      <View style={[styles.contentBlock, { paddingBottom: contentPaddingBottom }]}>
        <View style={styles.chatBlock}>
          <View style={styles.chatRailRow}>
            <StreamChatOverlay messages={visibleMessages} />
            <StreamActionRail
              variant="seller"
              onExit={onEndStream}
              onAddPaymentMethod={onAddPaymentMethod}
              onOpenClips={onOpenClips}
              onShare={onShare}
              onMore={onMore}
              onStartAuction={onStartAuction}
              isStreamPaused={isStreamPaused}
              isMicMuted={isMicMuted}
              onToggleMic={onToggleMic}
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

        {isAuctionActive ? (
          <StreamAuctionPanel
            variant="seller"
            productTitle={productTitle}
            winningUsername={winningUsername}
            currentPrice={currentPrice}
            secondsRemaining={auctionSecondsRemaining}
            isAuctionActive={isAuctionActive}
          />
        ) : null}

        <LiveControlBar
          onAddPress={onAddPress}
          isStreamPaused={isStreamPaused}
          onTogglePause={onTogglePause}
          onFlipCamera={onFlipCamera}
          flipDisabled={flipCameraDisabled}
        />
      </View>
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
    gap: 16,
    width: '100%',
  },
  chatRailRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    width: '100%',
  },
});
