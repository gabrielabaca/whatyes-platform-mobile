/**
 * SellerStreamScreen
 * Pantalla para el streamer: crea room, pasa a live (Kinesis) y envía video con WebRTC (master).
 * UI overlay: Figma 636-30152 vía StreamSellerOverlay.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from 'react-native-webrtc';
import { ArrowLeft } from 'lucide-react-native';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import { Text } from '../../atoms/Text';
import type { StreamConfig } from '../StreamConfigScreen';
import { useAuth } from '../../../hooks/useAuth';
import { storage } from '../../../utils/storage';
import {
  createRoom,
  goLive,
  endStream,
  getWebRTCCredentials,
  getRoomLiveCommerce,
  getRoomCatalog,
  type LiveCommerceResponse,
  type RoomCatalogProductItem,
} from '../../../api/platformApi';
import { getUserPublicProfile, type UserPublicProfile } from '../../../api/profileApi';
import {
  startKinesisWebRTCMaster,
  stopKinesisWebRTCMaster,
  switchKinesisWebRTCMasterCamera,
  setKinesisWebRTCMasterVideoEnabled,
  setKinesisWebRTCMasterMicMuted,
} from '../../../native/KinesisWebRTCNative';
import { useStreamChat } from '../../../hooks/useStreamChat';
import { useLiveAutoCoverSnapshot } from '../../../hooks/useLiveAutoCoverSnapshot';
import { AuctionWinnerOverlay } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerOverlay';
import { useFloatingHearts, FloatingHeartsLayer } from '../../molecules/FloatingHearts/FloatingHearts';
import { useLiveKeepAwake } from '../../../hooks/useLiveKeepAwake';
import { PreLiveSetupOverlay } from '../../organisms/startLive/PreLiveSetupOverlay';
import { StreamSellerOverlay } from '../../organisms/stream/StreamSellerOverlay';
import { StreamVideoScrim } from '../../organisms/stream/StreamVideoScrim';
import { StreamRoomProductsDrawer } from '../../organisms/stream/StreamRoomProductsDrawer';
import { SellerAddProductDrawer } from '../../organisms/stream/SellerAddProductDrawer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SellerStreamScreenProps {
  streamConfig: StreamConfig;
  onEndStream: () => void;
}

export const SellerStreamScreen: React.FC<SellerStreamScreenProps> = ({
  streamConfig,
  onEndStream,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front');
  const [token, setToken] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [preLiveReady, setPreLiveReady] = useState(false);
  const [resolvedStreamConfig, setResolvedStreamConfig] = useState<StreamConfig>(streamConfig);
  const [localWebRTCStream, setLocalWebRTCStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<UserPublicProfile | null>(null);
  const [liveCommerce, setLiveCommerce] = useState<LiveCommerceResponse | null>(null);
  const [productCatalogVisible, setProductCatalogVisible] = useState(false);
  const [addProductVisible, setAddProductVisible] = useState(false);
  const [catalogItems, setCatalogItems] = useState<RoomCatalogProductItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState('10');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveCoverUrl, setLiveCoverUrl] = useState<string | null>(null);
  const userProvidedCover = Boolean(resolvedStreamConfig.coverUrl?.trim());
  const cameraRef = useRef<Camera>(null);
  const streamViewRef = useRef<View>(null);

  const { likeEvents, handleLikeDone, handleLikeEvent } = useFloatingHearts();

  const {
    messages,
    viewerCount,
    sendChat,
    sendLike,
    sendAuctionStart,
    sendStreamPause,
    sendStreamResume,
    isStreamPaused,
    isAuctionActive,
    auctionSecondsRemaining,
    auctionBids,
    auctionWinner,
  } = useStreamChat({
    roomId,
    accessToken: token,
    onLike: handleLikeEvent,
  });

  useLiveKeepAwake();

  const handleLiveCoverUploaded = useCallback((url: string) => {
    setLiveCoverUrl(url);
  }, []);

  useLiveAutoCoverSnapshot({
    roomId,
    videoViewRef: streamViewRef,
    enabled:
      !userProvidedCover &&
      isStreaming &&
      Boolean(localWebRTCStream) &&
      !isStreamPaused,
    onCoverUploaded: handleLiveCoverUploaded,
  });

  useEffect(() => {
    if (!preLiveReady) return;
    let cancelled = false;
    (async () => {
      try {
        const accessToken = await storage.getAccessToken();
        if (!accessToken || cancelled) {
          if (!cancelled) setStreamError('No se pudo obtener la sesión');
          return;
        }
        setToken(accessToken);
        const name = resolvedStreamConfig?.title || user?.name || undefined;
        const categoryUuids = resolvedStreamConfig?.interestCategoryUuids;
        const room = await createRoom(
          accessToken,
          name || null,
          categoryUuids?.length ? categoryUuids : null,
          {
            scheduled_at: resolvedStreamConfig.scheduledAt ?? null,
            recurrence: resolvedStreamConfig.recurrence ?? 'none',
            moderator_user_ids: resolvedStreamConfig.moderatorUserIds ?? [],
            sale_format: resolvedStreamConfig.saleFormat ?? 'individual',
            explicit_content: resolvedStreamConfig.explicitContent ?? false,
            blocked_words_enabled: resolvedStreamConfig.blockedWordsEnabled ?? false,
            blocked_words: resolvedStreamConfig.blockedWords ?? [],
            privacy: resolvedStreamConfig.privacy ?? 'public',
            cover_url: resolvedStreamConfig.coverUrl ?? null,
            intro_video_url: resolvedStreamConfig.introVideoUrl ?? null,
          }
        );
        if (cancelled) return;
        const live = await goLive(accessToken, room.uuid);
        if (cancelled) return;
        setRoomId(live.uuid);
        try {
          const webrtcCreds = await getWebRTCCredentials(accessToken, live.uuid, 'master');
          setIsStreaming(true);
          await new Promise<void>((resolve) => setTimeout(resolve, 200));
          await startKinesisWebRTCMaster(webrtcCreds, {
            initialFacingMode: cameraPosition === 'front' ? 'user' : 'environment',
            onLocalStream: (stream) => {
              setLocalWebRTCStream(stream as unknown as MediaStream);
            },
          });
        } catch (e: unknown) {
          if (!cancelled) {
            setIsStreaming(false);
            const msg = e instanceof Error ? e.message : 'No se pudo iniciar el envío por WebRTC. Comprueba la conexión.';
            setStreamError(msg);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Error al iniciar la sala';
          setStreamError(msg);
        }
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [preLiveReady, resolvedStreamConfig, user?.name]);

  useEffect(() => {
    if (!token || !user?.uuid) return;
    let cancelled = false;
    getUserPublicProfile(user.uuid, token)
      .then((profile) => {
        if (!cancelled) setSellerProfile(profile);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, user?.uuid]);

  useEffect(() => {
    if (!token || !roomId) return;
    let cancelled = false;
    const fetchCommerce = () => {
      getRoomLiveCommerce(token, roomId)
        .then((data) => {
          if (!cancelled) setLiveCommerce(data);
        })
        .catch(() => {
          if (!cancelled) setLiveCommerce(null);
        });
    };
    fetchCommerce();
    const interval = setInterval(fetchCommerce, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, roomId]);

  const openProductCatalog = useCallback(async () => {
    if (!token || !roomId) return;
    setProductCatalogVisible(true);
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await getRoomCatalog(token, roomId);
      setCatalogItems(res.items ?? []);
    } catch {
      setCatalogError(t('stream.productsCatalogEmpty'));
      setCatalogItems([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [token, roomId, t]);

  const closeProductCatalog = useCallback(() => {
    setProductCatalogVisible(false);
  }, []);

  const openAddProduct = useCallback(() => {
    if (!resolvedStreamConfig.interestCategoryUuids?.[0]) {
      Alert.alert(t('common.appName'), t('stream.addProductNoCategory'));
      return;
    }
    setAddProductVisible(true);
  }, [resolvedStreamConfig.interestCategoryUuids, t]);

  const closeAddProduct = useCallback(() => {
    setAddProductVisible(false);
  }, []);

  const refreshLiveCommerce = useCallback(() => {
    if (!token || !roomId) return;
    getRoomLiveCommerce(token, roomId)
      .then((data) => setLiveCommerce(data))
      .catch(() => {});
  }, [token, roomId]);

  const confirmEndStream = useCallback(async () => {
    try {
      await stopKinesisWebRTCMaster();
    } catch {
      // ignore
    }
    setLocalWebRTCStream(null);
    setIsStreaming(false);
    if (token && roomId) {
      try {
        await endStream(token, roomId);
      } catch {
        // ignore
      }
    }
    onEndStream();
  }, [token, roomId, onEndStream]);

  const handleEndStream = useCallback(() => {
    Alert.alert(
      t('stream.endStreamConfirmTitle'),
      t('stream.endStreamConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('stream.endStream'), style: 'destructive', onPress: confirmEndStream },
      ],
    );
  }, [t, confirmEndStream]);

  const handleStartAuction = useCallback(() => {
    const duration = Math.max(5, Math.min(300, parseInt(auctionDuration, 10) || 10));
    sendAuctionStart(duration);
    setShowAuctionModal(false);
  }, [auctionDuration, sendAuctionStart]);

  const openAuctionModal = useCallback(() => {
    setShowAuctionModal(true);
  }, []);

  const { hasPermission, requestPermission } = useCameraPermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = cameraPosition === 'front' ? frontDevice : backDevice;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const handlePreLiveStart = useCallback((config: StreamConfig) => {
    setResolvedStreamConfig(config);
    setIsStarting(true);
    setPreLiveReady(true);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (messageText.trim()) {
      sendChat(messageText.trim());
      setMessageText('');
    }
  }, [messageText, sendChat]);

  const handleToggleMic = useCallback(async () => {
    const nextMuted = !isMicMuted;
    try {
      await setKinesisWebRTCMasterMicMuted(nextMuted);
      setIsMicMuted(nextMuted);
    } catch {
      Alert.alert(t('common.appName'), t('stream.muteMicError'));
    }
  }, [isMicMuted, t]);

  const handleTogglePause = useCallback(async () => {
    const nextPaused = !isStreamPaused;
    try {
      await setKinesisWebRTCMasterVideoEnabled(!nextPaused);
    } catch {
      Alert.alert(t('common.appName'), t('stream.pauseStreamError'));
      return;
    }
    if (nextPaused) {
      sendStreamPause();
    } else {
      sendStreamResume();
    }
  }, [isStreamPaused, sendStreamPause, sendStreamResume, t]);

  const handleToggleCamera = useCallback(async () => {
    const nextPosition = cameraPosition === 'front' ? 'back' : 'front';
    if (localWebRTCStream) {
      try {
        await switchKinesisWebRTCMasterCamera(nextPosition === 'front' ? 'user' : 'environment');
      } catch {
        Alert.alert(t('common.appName'), t('stream.flipCameraWebRtcHint'));
        return;
      }
    }
    setCameraPosition(nextPosition);
  }, [cameraPosition, localWebRTCStream, t]);

  const productTitle =
    liveCommerce?.active_product?.title?.trim() ||
    resolvedStreamConfig.title?.trim() ||
    sellerProfile?.display_name ||
    user?.name ||
    '';
  const productImageUrls =
    liveCommerce?.active_product?.image_urls?.filter((u) => Boolean(u?.trim())) ??
    (resolvedStreamConfig.coverUrl ? [resolvedStreamConfig.coverUrl] : []);
  const catalogTotal = liveCommerce?.catalog_preview?.total_products_in_room ?? productImageUrls.length;
  const productExtraCount = Math.max(0, catalogTotal - Math.min(productImageUrls.length, 3));
  const productBasePriceCents = Math.max(liveCommerce?.active_product?.base_price_cents ?? 100, 100);
  const sellerName =
    sellerProfile?.display_name?.trim() || user?.name?.trim() || t('home.defaultRoomName');
  const sellerRating = sellerProfile?.reviews_avg ?? null;

  if (!preLiveReady) {
    return (
      <PreLiveSetupOverlay
        visible
        initialConfig={resolvedStreamConfig}
        onCancel={onEndStream}
        onStart={handlePreLiveStart}
      />
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">{t('stream.cameraPermissionTitle')}</Text>
        <Text variant="body" className="text-white text-center mb-6">{t('stream.cameraPermissionBody')}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
          <Text variant="body" className="text-white font-semibold">{t('stream.cameraPermissionCta')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!frontDevice && !backDevice) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">{t('stream.cameraUnavailable')}</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={onEndStream} activeOpacity={0.8}>
          <Text variant="body" className="text-white font-semibold">{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (streamError) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onEndStream} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text variant="h3" className="text-white text-center mb-4">{t('common.error')}</Text>
        <Text variant="body" className="text-white text-center mb-6">{streamError}</Text>
        <TouchableOpacity style={styles.backButtonText} onPress={onEndStream} activeOpacity={0.8}>
          <Text variant="body" className="text-white font-semibold">{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isStarting || !roomId) {
    return (
      <View style={[styles.container, styles.loadingScreen]}>
        <View style={styles.loadingContent}>
          <View style={styles.logoWrap}>
            <HeaderLogo width={72} height={64} accessibilityLabel="PulpoLive" />
            <ActivityIndicator size="large" color="#685CF0" style={styles.loadingSpinner} />
          </View>
          <Text variant="h3" className="text-white text-center mb-2">
            {t('stream.startingRoomTitle')}
          </Text>
          <Text variant="body" className="text-white/80 text-center px-4">
            {t('stream.startingRoomSubtitle')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onEndStream}
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

  const activeDevice = device || (cameraPosition === 'front' ? backDevice : frontDevice);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
      <StatusBar hidden />

      {localWebRTCStream ? (
        <View ref={streamViewRef} style={styles.camera} collapsable={false}>
          <RTCView
            streamURL={localWebRTCStream.toURL()}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
          />
        </View>
      ) : (
        <>
          {activeDevice && !isStreaming && (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              device={activeDevice}
              isActive
              video
              audio
            />
          )}
          {(!activeDevice || isStreaming) && (
            <View style={styles.camera}>
              <ActivityIndicator size="large" color="#fff" style={StyleSheet.absoluteFill} />
              <Text variant="body" className="text-white text-center">
                {isStreaming ? t('stream.startingTransmission') : t('stream.preparingCamera')}
              </Text>
            </View>
          )}
        </>
      )}

      <StreamVideoScrim />
      <AuctionWinnerOverlay winner={auctionWinner} />
      <FloatingHeartsLayer likeEvents={likeEvents} onLikeDone={handleLikeDone} />

      <StreamSellerOverlay
        sellerName={sellerName}
        sellerAvatarUrl={sellerProfile?.profile_picture}
        sellerRating={sellerRating}
        viewerCount={viewerCount}
        messages={messages}
        messageText={messageText}
        onMessageChange={setMessageText}
        onSendMessage={handleSendMessage}
        onLike={sendLike}
        productTitle={productTitle}
        productImageUrls={productImageUrls}
        productExtraCount={productExtraCount}
        productBasePriceCents={productBasePriceCents}
        isAuctionActive={isAuctionActive}
        auctionSecondsRemaining={auctionSecondsRemaining}
        auctionBids={auctionBids}
        auctionWinnerUsername={auctionWinner?.username}
        onEndStream={handleEndStream}
        isStreamPaused={isStreamPaused}
        onTogglePause={handleTogglePause}
        isMicMuted={isMicMuted}
        onToggleMic={handleToggleMic}
        onFlipCamera={handleToggleCamera}
        onOpenProductCatalog={openProductCatalog}
        onAddPress={openAddProduct}
        onStartAuction={openAuctionModal}
      />

      <SellerAddProductDrawer
        visible={addProductVisible}
        onClose={closeAddProduct}
        roomId={roomId ?? ''}
        categoryUuid={resolvedStreamConfig.interestCategoryUuids?.[0] ?? null}
        saleFormat="individual"
        onSaved={refreshLiveCommerce}
      />

      <StreamRoomProductsDrawer
        visible={productCatalogVisible}
        onClose={closeProductCatalog}
        loading={catalogLoading}
        items={catalogItems}
        errorMessage={catalogError}
      />

      <Modal visible={showAuctionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="h3" className="text-white mb-2">{t('stream.sellerStartAuction')}</Text>
            <Text variant="body" className="text-white/80 mb-4">{t('stream.auctionDurationHint')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="10"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={auctionDuration}
              onChangeText={setAuctionDuration}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAuctionModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalStartButton} onPress={handleStartAuction} activeOpacity={0.7}>
                <Text style={styles.modalStartText}>{t('stream.auctionStartCta')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  camera: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  permissionContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  permissionButton: {
    backgroundColor: '#685CF0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  backButtonText: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'rgba(30,30,30,0.98)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modalCancelText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalStartButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#685CF0',
  },
  modalStartText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
