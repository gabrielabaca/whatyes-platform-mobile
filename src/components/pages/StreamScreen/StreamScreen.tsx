/**
 * Stream Screen — viewer en vivo (buyer) — Figma 536-18831
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { RTCView } from 'react-native-webrtc';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import { Text } from '../../atoms/Text';
import type { StreamData } from '../../molecules/StreamCard';
import { storage } from '../../../utils/storage';
import {
  getWebRTCCredentials,
  getRoomLiveCommerce,
  getRoomCatalog,
  getRooms,
  type LiveCommerceResponse,
  type RoomCatalogProductItem,
} from '../../../api/platformApi';
import { startKinesisWebRTCViewer, stopKinesisWebRTCViewer } from '../../../native/KinesisWebRTCNative';
import type { MediaStream } from 'react-native-webrtc';
import { useStreamChat } from '../../../hooks/useStreamChat';
import { AuctionWinnerOverlay } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerOverlay';
import { useFloatingHearts, FloatingHeartsLayer } from '../../molecules/FloatingHearts/FloatingHearts';
import { enableSpeakerphone, disableSpeakerphone, muteSpeakerOutput } from '../../../utils/audioRoute';
import { useLiveKeepAwake } from '../../../hooks/useLiveKeepAwake';
import { StreamBuyerOverlay } from '../../organisms/stream/StreamBuyerOverlay';
import { StreamRoomProductsDrawer } from '../../organisms/stream/StreamRoomProductsDrawer';
import { StreamVideoScrim } from '../../organisms/stream/StreamVideoScrim';
import { StreamPausedMedia } from '../../organisms/stream/StreamPausedMedia';
import { UserProfileScreen } from '../UserProfileScreen';
import { useSellerFollow } from '../../../hooks/useSellerFollow';
import { FollowSuccessCelebration } from '../../molecules/profile';
import { getUserPublicProfile } from '../../../api/profileApi';
import { useLiveScreenRecording } from '../../../hooks/useLiveScreenRecording';
import { useStreamWalletFlow } from '../../../hooks/useStreamWalletFlow';
import { ShippingAddressModal } from '../../organisms/account/ShippingAddressModal';
import { BuyerKycModal } from '../../organisms/account/BuyerKycModal';
import {
  StreamWalletIntroDrawer,
  StreamWalletHubDrawer,
  StreamPaymentMethodsDrawer,
  StreamAddCardDrawer,
  StreamWalletSuccessDrawer,
  StreamMpWalletConnectModal,
} from '../../organisms/stream/wallet';

export interface StreamScreenProps {
  stream: StreamData;
  onClose: () => void;
}

export const StreamScreen: React.FC<StreamScreenProps> = ({ stream, onClose }) => {
  const { t } = useTranslation();
  const [messageText, setMessageText] = useState('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [liveCommerce, setLiveCommerce] = useState<LiveCommerceResponse | null>(null);
  const [productCatalogVisible, setProductCatalogVisible] = useState(false);
  const [catalogItems, setCatalogItems] = useState<RoomCatalogProductItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sellerProfileUserId, setSellerProfileUserId] = useState<string | null>(null);
  const [resolvedSellerUserId, setResolvedSellerUserId] = useState<string | null>(
    stream.sellerUserId ?? null
  );
  const viewerCleanupRef = useRef<(() => void) | null>(null);
  const { likeEvents, handleLikeDone, handleLikeEvent } = useFloatingHearts();
  const { isRecording, recordingTimeLabel, toggleRecording } = useLiveScreenRecording();
  const wallet = useStreamWalletFlow();
  const [sellerFollowInitial, setSellerFollowInitial] = useState(false);
  // No usar stream.thumbnail como cover de pausa: puede contener el avatar del seller.
  // El cover real se obtiene del WS (cover_url) o del GET /rooms, ambos sólo devuelven imágenes S3.
  const [roomCoverUrl, setRoomCoverUrl] = useState<string | null>(null);
  const [roomIntroVideoUrl, setRoomIntroVideoUrl] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [rtcViewEpoch, setRtcViewEpoch] = useState(0);
  const wasStreamPausedRef = useRef(false);

  const {
    isFollowing: isFollowingSeller,
    celebrationVisible: followCelebrationVisible,
    toggleFollow: toggleSellerFollow,
    dismissCelebration: dismissFollowCelebration,
    setIsFollowing: setIsFollowingSeller,
  } = useSellerFollow({
    sellerUserId: resolvedSellerUserId,
    sellerName: stream.sellerName,
    initialFollowing: sellerFollowInitial,
  });

  const roomId = stream.id;
  const {
    messages,
    viewerCount,
    isConnected: isChatConnected,
    sendChat,
    sendLike,
    sendBid,
    isAuctionActive,
    auctionSecondsRemaining,
    auctionBids,
    auctionWinner,
    isStreamPaused,
    roomCoverUrl: wsCoverUrl,
    roomIntroVideoUrl: wsIntroVideoUrl,
  } = useStreamChat({ roomId, accessToken: chatToken, onLike: handleLikeEvent });

  const effectiveCoverUrl = wsCoverUrl ?? roomCoverUrl;
  const effectiveIntroVideoUrl = wsIntroVideoUrl ?? roomIntroVideoUrl;

  useLiveKeepAwake();

  // Carga el token del chat en paralelo con el WebRTC para que el WebSocket conecte lo antes posible
  useEffect(() => {
    let cancelled = false;
    storage.getAccessToken().then((token) => {
      if (!cancelled && token) setChatToken(token);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!chatToken || !roomId) return;
    let cancelled = false;
    getRooms(chatToken)
      .then((rooms) => {
        if (cancelled) return;
        const room = rooms.find((r) => r.uuid === roomId);
        if (room) {
          if (room.cover_url?.trim()) {
            setRoomCoverUrl(room.cover_url.trim());
          }
          if (room.intro_video_url?.trim()) {
            setRoomIntroVideoUrl(room.intro_video_url.trim());
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chatToken, roomId]);

  useEffect(() => {
    let cancelled = false;
    if (!chatToken || !roomId) return;
    getRoomLiveCommerce(chatToken, roomId)
      .then((data) => {
        if (!cancelled) setLiveCommerce(data);
      })
      .catch(() => {
        if (!cancelled) setLiveCommerce(null);
      });
    return () => {
      cancelled = true;
    };
  }, [chatToken, roomId]);

  useEffect(() => {
    if (stream.sellerUserId) {
      setResolvedSellerUserId(stream.sellerUserId);
    }
  }, [stream.sellerUserId]);

  useEffect(() => {
    const fromCommerce = liveCommerce?.seller?.user_id;
    if (fromCommerce) {
      setResolvedSellerUserId(fromCommerce);
    }
  }, [liveCommerce?.seller?.user_id]);

  useEffect(() => {
    if (resolvedSellerUserId || !chatToken || !roomId) return;
    let cancelled = false;
    getRooms(chatToken)
      .then((rooms) => {
        if (cancelled) return;
        const room = rooms.find((r) => r.uuid === roomId);
        const id = room?.creator?.uuid ?? room?.created_by_user_id ?? null;
        if (id) setResolvedSellerUserId(id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chatToken, roomId, resolvedSellerUserId]);

  useEffect(() => {
    if (!resolvedSellerUserId || !chatToken) return;
    let cancelled = false;
    getUserPublicProfile(resolvedSellerUserId, chatToken)
      .then((p) => {
        if (!cancelled) setSellerFollowInitial(p.is_following ?? false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [resolvedSellerUserId, chatToken]);

  const closeProductCatalog = useCallback(() => {
    setProductCatalogVisible(false);
  }, []);

  const openSellerProfile = useCallback(async () => {
    let sellerId =
      liveCommerce?.seller?.user_id ?? resolvedSellerUserId ?? stream.sellerUserId ?? null;

    if (!sellerId && chatToken) {
      try {
        const rooms = await getRooms(chatToken);
        const room = rooms.find((r) => r.uuid === roomId);
        sellerId = room?.creator?.uuid ?? room?.created_by_user_id ?? null;
        if (sellerId) setResolvedSellerUserId(sellerId);
      } catch {
        // ignore
      }
    }

    if (!sellerId) {
      Alert.alert(t('common.appName'), t('profile.loadError'));
      return;
    }
    setSellerProfileUserId(sellerId);
  }, [
    liveCommerce?.seller?.user_id,
    resolvedSellerUserId,
    stream.sellerUserId,
    chatToken,
    roomId,
    t,
  ]);

  const closeSellerProfile = useCallback(() => {
    setSellerProfileUserId(null);
    if (resolvedSellerUserId && chatToken) {
      getUserPublicProfile(resolvedSellerUserId, chatToken)
        .then((p) => {
          setSellerFollowInitial(p.is_following ?? false);
          setIsFollowingSeller(p.is_following ?? false);
        })
        .catch(() => {});
    }
  }, [resolvedSellerUserId, chatToken, setIsFollowingSeller]);

  const openProductCatalog = useCallback(() => {
    setProductCatalogVisible(true);
    setCatalogLoading(true);
    setCatalogError(null);
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) {
          setCatalogError(t('common.error'));
          setCatalogItems([]);
          return;
        }
        const data = await getRoomCatalog(token, roomId);
        setCatalogItems(data.items);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : t('common.error');
        setCatalogError(msg);
        setCatalogItems([]);
      } finally {
        setCatalogLoading(false);
      }
    })();
  }, [roomId, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        enableSpeakerphone();
        const token = await storage.getAccessToken();
        if (!token) {
          if (!cancelled) {
            setStreamError('No se pudo obtener la sesión');
          }
          return;
        }
        const webrtcCreds = await getWebRTCCredentials(token, roomId, 'viewer');
        const cleanup = await startKinesisWebRTCViewer(
          webrtcCreds,
          (mediaStream) => {
            if (!cancelled) {
              setRemoteStream(mediaStream);
            }
          },
          (err) => {
            if (!cancelled) {
              setStreamError(err?.message || 'Error de conexión WebRTC');
            }
          },
          () => {
            if (!cancelled) {
              onClose();
            }
          }
        );
        if (!cancelled) {
          viewerCleanupRef.current = cleanup;
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'No se pudo cargar el stream';
          setStreamError(msg);
        }
      } finally {
        if (!cancelled) {
          setIsConnecting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      viewerCleanupRef.current?.();
      viewerCleanupRef.current = null;
      stopKinesisWebRTCViewer().catch(() => {});
      disableSpeakerphone();
    };
  }, [roomId, onClose]);

  useEffect(() => {
    if (!remoteStream) {
      return;
    }
    enableSpeakerphone();
    const t1 = setTimeout(() => enableSpeakerphone(), 400);
    const t2 = setTimeout(() => enableSpeakerphone(), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [remoteStream]);

  useEffect(() => {
    if (!remoteStream) return;
    const shouldPlayAudio = !isStreamPaused && !isAudioMuted;
    remoteStream.getAudioTracks().forEach((track) => {
      track.enabled = shouldPlayAudio;
    });
    remoteStream.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });
    if (shouldPlayAudio) {
      enableSpeakerphone();
    } else {
      muteSpeakerOutput();
    }
  }, [remoteStream, isStreamPaused, isAudioMuted]);

  useEffect(() => {
    if (wasStreamPausedRef.current && !isStreamPaused && remoteStream) {
      setRtcViewEpoch((epoch) => epoch + 1);
    }
    wasStreamPausedRef.current = isStreamPaused;
  }, [isStreamPaused, remoteStream]);

  const handleToggleAudio = useCallback(() => {
    setIsAudioMuted((prev) => !prev);
  }, []);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendChat(messageText.trim());
      setMessageText('');
    }
  };

  const productTitle =
    liveCommerce?.active_product?.title?.trim() ||
    stream.title?.trim() ||
    stream.sellerName;
  const productImageUrlsForStack =
    liveCommerce?.active_product?.image_urls?.filter((u) => Boolean(u?.trim())) ??
    (stream.productImageUrl ? [stream.productImageUrl] : []);
  const itemStockCount =
    liveCommerce?.active_product?.quantity_on_hand ?? stream.productCount ?? 1;
  const productBasePriceCents = liveCommerce?.active_product?.base_price_cents ?? 0;
  const displayViewerCount = isChatConnected ? viewerCount : stream.viewerCount;

  if (streamError) {
    const isNoFragments =
      streamError.includes('Aún no hay video') || streamError.includes('broadcaster');
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="h3" className="text-white mb-2">
          {isNoFragments ? 'Esperando video' : 'Error al conectar'}
        </Text>
        <Text variant="body" className="text-white mb-4 text-center">
          {streamError}
        </Text>
        {isNoFragments ? (
          <Text variant="body" className="text-white/80 mb-4 text-center">
            Pide al streamer que confirme que la transmisión está activa y vuelve a intentar.
          </Text>
        ) : null}
        <TouchableOpacity onPress={onClose} style={styles.errorBtn}>
          <Text variant="body" className="text-white">
            Cerrar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if ((isConnecting || !remoteStream) && !isStreamPaused) {
    return (
      <View style={[styles.container, styles.loadingScreen]}>
        <View style={styles.loadingContent}>
          <View style={styles.logoWrap}>
            <HeaderLogo width={72} height={64} accessibilityLabel="PulpoLive" />
            <ActivityIndicator
              size="large"
              color="#685CF0"
              style={styles.loadingSpinner}
            />
          </View>
          <Text variant="h3" className="text-white text-center mb-2">
            {isConnecting ? t('stream.connectingTitle') : t('stream.waitingVideoTitle')}
          </Text>
          <Text variant="body" className="text-white/80 text-center px-4">
            {isConnecting ? t('stream.connectingSubtitle') : t('stream.waitingVideoSubtitle')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.cancelBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('stream.cancelJoin')}
        >
          <Text variant="body" className="text-white font-semibold">
            {t('stream.cancelJoin')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {remoteStream ? (
        <RTCView
          key={`viewer-rtc-${rtcViewEpoch}`}
          streamURL={remoteStream.toURL()}
          style={[styles.video, isStreamPaused && styles.videoWhilePaused]}
          objectFit="cover"
          zOrder={0}
          pointerEvents="none"
        />
      ) : null}

      {isStreamPaused ? (
        <StreamPausedMedia
          variant="viewer"
          introVideoUrl={effectiveIntroVideoUrl}
          coverUrl={effectiveCoverUrl}
        />
      ) : null}

      <StreamVideoScrim />

      <AuctionWinnerOverlay winner={auctionWinner} />
      <FloatingHeartsLayer likeEvents={likeEvents} onLikeDone={handleLikeDone} />
      <FollowSuccessCelebration
        visible={followCelebrationVisible}
        sellerName={stream.sellerName}
        onDismiss={dismissFollowCelebration}
      />

      <StreamBuyerOverlay
        sellerName={stream.sellerName}
        sellerAvatarUrl={stream.sellerAvatarUrl}
        sellerRating={stream.sellerRating}
        productTitle={productTitle}
        productImageUrls={productImageUrlsForStack}
        itemCount={itemStockCount}
        productBasePriceCents={productBasePriceCents}
        viewerCount={displayViewerCount}
        messages={messages}
        messageText={messageText}
        onMessageChange={setMessageText}
        onSendMessage={handleSendMessage}
        onLike={sendLike}
        onBid={sendBid}
        onExit={onClose}
        onOpenWallet={() => {
          void wallet.openWallet();
        }}
        isRecording={isRecording}
        recordingTimeLabel={recordingTimeLabel}
        onToggleRecording={toggleRecording}
        isAuctionActive={isAuctionActive}
        auctionSecondsRemaining={auctionSecondsRemaining}
        auctionBids={auctionBids}
        auctionWinnerUsername={auctionWinner?.username ?? null}
        onOpenProductCatalog={openProductCatalog}
        onSellerPress={() => {
          void openSellerProfile();
        }}
        isFollowingSeller={isFollowingSeller}
        onFollowSeller={() => {
          void toggleSellerFollow();
        }}
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
      />

      {sellerProfileUserId ? (
        <View style={styles.sellerProfileOverlay}>
          <UserProfileScreen
            userId={sellerProfileUserId}
            variant="sellerPublic"
            onBack={closeSellerProfile}
          />
        </View>
      ) : null}

      <StreamRoomProductsDrawer
        visible={productCatalogVisible}
        onClose={closeProductCatalog}
        loading={catalogLoading}
        items={catalogItems}
        errorMessage={catalogError}
      />

      <StreamWalletIntroDrawer
        visible={wallet.step === 'intro'}
        onClose={wallet.closeAll}
        onContinue={() => {
          void wallet.goToHub();
        }}
        onRemindLater={wallet.closeAll}
      />
      <StreamWalletHubDrawer
        visible={wallet.step === 'hub'}
        onClose={wallet.closeAll}
        loading={wallet.hubLoading}
        shippingActionLabel={wallet.shippingActionLabel}
        paymentActionLabel={wallet.paymentActionLabel}
        onShippingPress={wallet.openShipping}
        onPaymentPress={() => {
          void wallet.openPayment();
        }}
      />
      <ShippingAddressModal
        visible={wallet.step === 'shipping'}
        defaultFullName={
          stream.sellerName ? `${stream.sellerName}` : undefined
        }
        onClose={() => {
          void wallet.returnToHub();
        }}
        onSaved={() => {
          void wallet.onShippingSaved();
        }}
      />
      <BuyerKycModal
        visible={wallet.step === 'kyc'}
        onClose={wallet.closeAll}
        onVerified={() => {
          void wallet.onKycVerified();
        }}
      />
      <StreamPaymentMethodsDrawer
        visible={wallet.step === 'methods'}
        onClose={wallet.closeAll}
        loading={wallet.hubLoading}
        cards={wallet.cards}
        preferredOrigin={wallet.preferredOrigin}
        onSelectMpWallet={() => {
          void wallet.selectMpWallet();
        }}
        onSelectCard={(card) => {
          void wallet.selectCard(card);
        }}
        onAddCard={wallet.openCardForm}
      />
      <StreamMpWalletConnectModal
        visible={wallet.mpConnectVisible}
        session={wallet.mpConnectSession}
        loading={wallet.mpConnectLoading}
        onReturn={wallet.onMpWalletConnectReturn}
        onTestAckConfirm={wallet.confirmMpWalletTestAck}
        onCancel={wallet.cancelMpWalletConnect}
      />
      <StreamAddCardDrawer
        visible={wallet.step === 'cardForm'}
        onClose={wallet.closeAll}
        payerEmail={wallet.userEmail}
        setAsDefault={wallet.cards.length === 0}
        onSaved={(card) => {
          void wallet.onCardSaved(card);
        }}
      />
      <StreamWalletSuccessDrawer
        visible={wallet.step === 'success'}
        paymentMethod={wallet.successPaymentMethod}
        onClose={wallet.closeAll}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingScreen: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  loadingSpinner: {
    marginTop: 20,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    minWidth: 160,
    alignItems: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoWhilePaused: {
    opacity: 0,
  },

  errorBtn: {
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  sellerProfileOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 300,
    backgroundColor: '#FFFFFF',
  },
});
