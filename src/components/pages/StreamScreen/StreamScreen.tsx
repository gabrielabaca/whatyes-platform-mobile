/**
 * Stream Screen — viewer en vivo (buyer) — Figma 536-18831
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { Text } from '../../atoms/Text';
import type { StreamData } from '../../molecules/StreamCard';
import { storage } from '../../../utils/storage';
import {
  getWebRTCCredentials,
  getStreamWatch,
  getRoomLiveCommerce,
  getRoomCatalog,
  getRooms,
  buyNowActiveOffer,
  BuyNowUnavailableError,
  SeatsFullError,
  type IvsStageCredentials,
  type LiveCommerceResponse,
  type RoomCatalogProductItem,
  type StreamWatchResponse,
  type StreamWebRTCCredentialsResponse,
  type ViewerTransportDecision,
} from '../../../api/platformApi';
import { startKinesisWebRTCViewer, stopKinesisWebRTCViewer } from '../../../native/KinesisWebRTCNative';
import type { MediaStream } from 'react-native-webrtc';
import { getViewerTransport } from '../../../api/config';
import {
  addIvsStageListeners,
  joinIvsStageAsViewer,
  leaveIvsStage,
  setIvsRemoteAudioMuted,
  IvsRemoteVideoView,
} from '../../../native/IvsStageNative';
import { HlsStreamPlayer } from '../../molecules/stream/HlsStreamPlayer';
import { StreamToast, useStreamToast } from '../../molecules/stream/StreamToast';
import { StreamViewerSplash } from '../../molecules/stream/StreamViewerSplash';
import { fetchLiveRoomIds, pickNextLiveStreamIndex } from '../../../utils/streamLiveNavigation';
import {
  useStreamChat,
  type AuctionWinner,
  type AuctionCancelledInfo,
} from '../../../hooks/useStreamChat';
import { auctionCancelledMessageKey } from '../../organisms/stream/StreamAuctionCancelDrawer';
import { AuctionWinnerOverlay } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerOverlay';
import { AuctionWinnerCelebration } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerCelebration';
import { useAuth } from '../../../hooks/useAuth';
import { useFloatingHearts, FloatingHeartsLayer } from '../../molecules/FloatingHearts/FloatingHearts';
import { useFloatingBids, FloatingBidsLayer } from '../../molecules/FloatingBids/FloatingBids';
import { enableSpeakerphone, disableSpeakerphone, muteSpeakerOutput } from '../../../utils/audioRoute';
import { useLiveKeepAwake } from '../../../hooks/useLiveKeepAwake';
import { StreamBuyerOverlay } from '../../organisms/stream/StreamBuyerOverlay';
import { StreamLiveNoteDrawer } from '../../organisms/stream/StreamLiveNoteDrawer';
import { useLiveRoomNote } from '../../../hooks/useLiveRoomNote';
import {
  StreamRoomProductsDrawer,
  type LiveProductCardVM,
} from '../../organisms/stream/StreamRoomProductsDrawer';
import { StreamVideoScrim } from '../../organisms/stream/StreamVideoScrim';
import { StreamFollowSellerDrawer } from '../../organisms/stream/StreamFollowSellerDrawer';
import { StreamShippingRateDrawer } from '../../organisms/stream/StreamShippingRateDrawer';
import { StreamShippingAddressDrawer } from '../../organisms/stream/StreamShippingAddressDrawer';
import { StreamPausedMedia } from '../../organisms/stream/StreamPausedMedia';
import { UserProfileScreen } from '../UserProfileScreen';
import { ConversationModal } from '../../organisms/chat/ConversationModal';
import { useStartChat } from '../../../hooks/useStartChat';
import { useSellerFollow } from '../../../hooks/useSellerFollow';
import { FollowSuccessCelebration } from '../../molecules/profile';
import { getUserPublicProfile } from '../../../api/profileApi';
import { useLiveScreenRecording } from '../../../hooks/useLiveScreenRecording';
import { useStreamWalletFlow } from '../../../hooks/useStreamWalletFlow';
import { useProductShippingQuote } from '../../../hooks/useProductShippingQuote';
import { WalletFlowDrawers } from '../../organisms/stream/wallet';
import { hasUsableShippingAddress, formatShippingAddressLine } from '../../../utils/shippingAddress';

/** Tiempo máximo de espera del primer frame antes de reintentar/errorear la conexión WebRTC. */
const CONNECT_TIMEOUT_MS = 12_000;
/** Espera antes de los prompts automáticos del vivo (seguir vendedor / configurar wallet). */
const AUTO_PROMPTS_DELAY_MS = 15_000;
/** Reintentos automáticos (con credenciales frescas) antes de mostrar error. */
const MAX_CONNECT_ATTEMPTS = 2;

export type StreamEndedReason = 'ended' | 'disconnect';

/** Contexto del feed de swipe para navegar al siguiente live al finalizar uno. */
export interface StreamEndedFeedContext {
  streams: StreamData[];
  currentIndex: number;
  categoryUuid?: string;
  onNavigateToStream: (index: number, streamId: string) => void;
  onLeaveFeed: () => void;
}

export interface StreamScreenProps {
  stream: StreamData;
  onClose: () => void;
  /**
   * Decisión de transporte pre-fetcheada por el contenedor de swipe
   * (GET /stream/watch). Cuando está presente se omite el round-trip HTTP.
   */
  initialWatch?: StreamWatchResponse | null;
  /** Feed de swipe: permite ir al siguiente live o salir a inicio. */
  endedFeedContext?: StreamEndedFeedContext;
  /** Fallback cuando no hay feed de swipe (p. ej. stream abierto fuera del carrusel). */
  onLiveEndedAccept?: () => void;
}

export const StreamScreen: React.FC<StreamScreenProps> = ({
  stream,
  onClose,
  initialWatch,
  endedFeedContext,
  onLiveEndedAccept,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [messageText, setMessageText] = useState('');
  // Transporte por sala: el backend decide vía GET /stream/watch — 'ivs' (stage
  // administrado, sin cupos), 'webrtc' (KVS legacy con asientos) u 'hls' (cupo
  // lleno). VIEWER_TRANSPORT=hls fuerza HLS globalmente (debug/rollout).
  const forcedHls = getViewerTransport() === 'hls';
  const initialTransport: ViewerTransportDecision | null = forcedHls
    ? 'hls'
    : initialWatch?.transport === 'ivs' && initialWatch.ivs
      ? 'ivs'
      : initialWatch?.transport === 'webrtc' && initialWatch.webrtc_credentials
        ? 'webrtc'
        : null;
  const [transport, setTransport] = useState<ViewerTransportDecision | null>(initialTransport);
  const isHls = transport === 'hls';
  const isIvs = transport === 'ivs';
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hlsReady, setHlsReady] = useState(false);
  // Transporte IVS: token SUBSCRIBE del stage (viene de /stream/watch).
  const [ivsCreds, setIvsCreds] = useState<IvsStageCredentials | null>(
    initialTransport === 'ivs' ? (initialWatch?.ivs ?? null) : null
  );
  const [ivsReady, setIvsReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [liveCommerce, setLiveCommerce] = useState<LiveCommerceResponse | null>(null);
  const { user } = useAuth();
  /**
   * Copia local del ganador cuando soy yo: el festejo persiste hasta que el
   * usuario lo cierra, aunque el evento del chat se limpie a los segundos.
   */
  const [winCelebration, setWinCelebration] = useState<AuctionWinner | null>(null);
  /** Compra directa en vuelo: bloquea la barra hasta que el backend resuelve. */
  const [buyNowPending, setBuyNowPending] = useState(false);
  const [productCatalogVisible, setProductCatalogVisible] = useState(false);
  const [noteDrawerVisible, setNoteDrawerVisible] = useState(false);
  const [catalogItems, setCatalogItems] = useState<RoomCatalogProductItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sellerProfileUserId, setSellerProfileUserId] = useState<string | null>(null);
  const [resolvedSellerUserId, setResolvedSellerUserId] = useState<string | null>(
    stream.sellerUserId ?? null
  );
  const viewerCleanupRef = useRef<(() => void) | null>(null);
  // Credenciales pre-fetcheadas: se usan una sola vez en el primer montaje.
  const initialCredsRef = useRef<StreamWebRTCCredentialsResponse | null>(
    initialTransport === 'webrtc' ? (initialWatch?.webrtc_credentials ?? null) : null
  );
  // Avisos del vivo (compra directa, errores): píldora con el look de la app en
  // lugar del diálogo nativo, que tapa el video y corta la experiencia.
  const { toast, showToast, dismissToast } = useStreamToast();
  const { likeEvents, handleLikeDone, handleLikeEvent } = useFloatingHearts();
  const { isRecording, recordingTimeLabel, toggleRecording } = useLiveScreenRecording();
  const wallet = useStreamWalletFlow();
  const [sellerFollowInitial, setSellerFollowInitial] = useState(false);
  // Inicializar con stream.coverUrl para que la portada esté disponible inmediatamente
  // sin esperar el GET /rooms. El WS o el getRooms pueden sobreescribirlo luego.
  const [roomCoverUrl, setRoomCoverUrl] = useState<string | null>(stream.coverUrl ?? null);
  const [roomIntroVideoUrl, setRoomIntroVideoUrl] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [rtcViewEpoch, setRtcViewEpoch] = useState(0);
  const wasStreamPausedRef = useRef(false);
  // Reintento de conexión: connectAttempt dispara el effect; el ref lleva la cuenta persistente.
  const [connectAttempt, setConnectAttempt] = useState(0);
  const connectAttemptRef = useRef(0);
  const [streamEndedReason, setStreamEndedReason] = useState<StreamEndedReason | null>(null);
  const [endedAcceptLoading, setEndedAcceptLoading] = useState(false);

  const roomId = stream.id;

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

  const onStreamEndedFromWs = useCallback((reason?: string) => {
    setStreamEndedReason(reason === 'master_absent' ? 'disconnect' : 'ended');
  }, []);

  // Tarea 18: al cancelar el vendedor, el viewer ve SOLO el mensaje genérico del
  // motivo (el detalle interno nunca viaja por el WS).
  const handleAuctionCancelled = useCallback(
    (info: AuctionCancelledInfo) => {
      showToast(t(auctionCancelledMessageKey(info.reasonCode)), 'info');
    },
    [showToast, t]
  );

  const {
    messages,
    viewerCount,
    isConnected: isChatConnected,
    sendChat,
    sendLike,
    sendBid,
    auction,
    isAuctionActive,
    isAuctionPaused,
    hasLiveOffer,
    offerSaleMode,
    auctionSecondsRemaining,
    auctionBids,
    auctionWinner,
    lastAuctionExtension,
    isStreamPaused,
    isSellerAudioMuted,
    sellerAudioEvent,
    roomCoverUrl: wsCoverUrl,
    roomIntroVideoUrl: wsIntroVideoUrl,
    roomNote,
    disconnectPermanently,
  } = useStreamChat({
    roomId,
    accessToken: chatToken,
    onLike: handleLikeEvent,
    onStreamEnded: onStreamEndedFromWs,
    onAuctionCancelled: handleAuctionCancelled,
  });

  // Toast solo cuando el toggle del mic ocurre con el viewer ya adentro:
  // `sellerAudioEvent` viene únicamente del broadcast (nunca del init), así que
  // quien entra con el mic ya silenciado ve la píldora persistente y ningún toast.
  useEffect(() => {
    if (!sellerAudioEvent) return;
    showToast(
      t(sellerAudioEvent.muted ? 'stream.sellerMicMuted' : 'stream.sellerMicActive'),
      'info'
    );
  }, [sellerAudioEvent, showToast, t]);

  // Nota del vivo en solo lectura: el viewer nunca es dueño de la sala (canEdit false).
  const liveNote = useLiveRoomNote({
    roomId,
    accessToken: chatToken,
    initialNote: liveCommerce?.note ?? null,
    liveNote: roomNote,
  });

  /**
   * ¿Gané yo? Se compara por uuid (confiable) y, como respaldo para backends que
   * aún no envían user_id, por el nombre para mostrar que usa el chat.
   */
  useEffect(() => {
    if (!auctionWinner || !user) return;
    const byId = !!auctionWinner.user_id && auctionWinner.user_id === user.uuid;
    const myChatName = (user.name ?? '').trim();
    const byName =
      !auctionWinner.user_id &&
      !!myChatName &&
      auctionWinner.username.trim().toLowerCase() === myChatName.toLowerCase();
    if (byId || byName) {
      setWinCelebration(auctionWinner);
    }
  }, [auctionWinner, user]);

  useEffect(() => {
    if (!streamEndedReason) return;
    stopKinesisWebRTCViewer().catch(() => {});
    viewerCleanupRef.current?.();
    viewerCleanupRef.current = null;
    setRemoteStream(null);
    setIsConnecting(false);
    setHlsReady(false);
    disconnectPermanently();
  }, [streamEndedReason, disconnectPermanently]);

  const handleEndedAccept = useCallback(async () => {
    if (endedAcceptLoading) return;
    setEndedAcceptLoading(true);
    try {
      if (endedFeedContext) {
        const liveIds = await fetchLiveRoomIds(endedFeedContext.categoryUuid);
        const nextIndex = pickNextLiveStreamIndex(
          endedFeedContext.streams,
          stream.id,
          liveIds,
          endedFeedContext.currentIndex
        );
        if (nextIndex != null) {
          const target = endedFeedContext.streams[nextIndex];
          endedFeedContext.onNavigateToStream(nextIndex, target.id);
          return;
        }
        endedFeedContext.onLeaveFeed();
        return;
      }
      if (onLiveEndedAccept) {
        onLiveEndedAccept();
        return;
      }
      onClose();
    } finally {
      setEndedAcceptLoading(false);
    }
  }, [
    endedAcceptLoading,
    endedFeedContext,
    onClose,
    onLiveEndedAccept,
    stream.id,
  ]);
  const { bidEvents, handleBidDone } = useFloatingBids(auctionBids);

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

  // isAuctionActive en deps: al iniciar/terminar una subasta puede cambiar el
  // producto activo, así que se refresca el contexto de comercio del vivo.
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
  }, [chatToken, roomId, isAuctionActive]);

  const activeProductId = liveCommerce?.active_product?.uuid ?? null;
  const {
    quote: shippingQuote,
    shippingAddress,
    sellerPickupAddress,
    refresh: refreshShippingQuote,
  } = useProductShippingQuote({
    roomId,
    productId: activeProductId,
  });

  // Al cerrar una subasta se registra la compra del ganador: recotizar porque el
  // próximo envío puede pasar a gratis (combinado con esa compra).
  useEffect(() => {
    if (!isAuctionActive) {
      void refreshShippingQuote();
    }
  }, [isAuctionActive, refreshShippingQuote]);

  // Drawer "Tasa de Envío" (Figma 698-7308): se abre desde el link del panel de
  // subasta solo si el comprador ya tiene domicilio configurado; si no, se abre
  // el selector (vacío + "Adicionar Domicilio").
  const [shippingRateDrawerVisible, setShippingRateDrawerVisible] = useState(false);
  const [shippingSelectorVisible, setShippingSelectorVisible] = useState(false);
  const hasShippingAddressConfigured = hasUsableShippingAddress(shippingAddress);
  const shippingAddressLabel = shippingAddress
    ? formatShippingAddressLine(shippingAddress)
    : '';
  const shippingDefaultFullName = `${user?.name ?? ''} ${user?.last_name ?? ''}`.trim();

  const handlePressShippingRate = useCallback(() => {
    if (hasShippingAddressConfigured) {
      setShippingRateDrawerVisible(true);
    } else {
      setShippingSelectorVisible(true);
    }
  }, [hasShippingAddressConfigured]);

  const handleEditShippingAddress = useCallback(() => {
    setShippingRateDrawerVisible(false);
    setShippingSelectorVisible(true);
  }, []);

  // ---- Auto-prompts del vivo (Figma 698-5913 / 698-6121) ----
  // A los 15s: si no sigue al vendedor → drawer de follow; al resolverse (o si
  // ya lo sigue), si falta configurar pago o domicilio → intro del wallet.
  // Cada prompt se evalúa una sola vez por vivo y no pisa drawers abiertos.
  const [followPromptVisible, setFollowPromptVisible] = useState(false);
  const autoPromptFiredRef = useRef(false);
  const setupPromptCheckedRef = useRef(false);
  // Snapshot del estado actual para leer valores frescos dentro del timer.
  const autoPromptStateRef = useRef({
    isFollowingSeller: false,
    walletStep: 'closed' as string,
    productCatalogVisible: false,
    sellerProfileOpen: false,
    hasSellerId: false,
  });
  autoPromptStateRef.current = {
    isFollowingSeller,
    walletStep: wallet.step,
    productCatalogVisible,
    sellerProfileOpen: sellerProfileUserId != null,
    hasSellerId: resolvedSellerUserId != null,
  };

  const maybeShowSetupPrompt = useCallback(async () => {
    if (setupPromptCheckedRef.current) return;
    setupPromptCheckedRef.current = true;
    try {
      const configured = await wallet.isWalletConfigured();
      const s = autoPromptStateRef.current;
      if (
        !configured &&
        s.walletStep === 'closed' &&
        !s.productCatalogVisible &&
        !s.sellerProfileOpen
      ) {
        wallet.openWallet();
      }
    } catch {
      // Sin red o sin sesión: no interrumpir el vivo.
    }
  }, [wallet.isWalletConfigured, wallet.openWallet]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (autoPromptFiredRef.current) return;
      autoPromptFiredRef.current = true;
      const s = autoPromptStateRef.current;
      const busy = s.walletStep !== 'closed' || s.productCatalogVisible || s.sellerProfileOpen;
      if (busy) return;
      if (!s.isFollowingSeller && s.hasSellerId) {
        setFollowPromptVisible(true);
      } else {
        void maybeShowSetupPrompt();
      }
    }, AUTO_PROMPTS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [maybeShowSetupPrompt]);

  const handleFollowPromptFollow = useCallback(() => {
    setFollowPromptVisible(false);
    void (async () => {
      await toggleSellerFollow();
      await maybeShowSetupPrompt();
    })();
  }, [toggleSellerFollow, maybeShowSetupPrompt]);

  const handleFollowPromptDismiss = useCallback(() => {
    setFollowPromptVisible(false);
    void maybeShowSetupPrompt();
  }, [maybeShowSetupPrompt]);
  // ---- fin auto-prompts ----

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
      showToast(t('profile.loadError'), 'error');
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
    showToast,
  ]);

  const { conversation: directChat, startChat, closeChat } = useStartChat();

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

  const productCards = useMemo<LiveProductCardVM[]>(
    () =>
      catalogItems.map((it) => ({
        uuid: it.uuid,
        title: it.title,
        imageUrl: it.image_url,
        priceCents: it.base_price_cents,
        currency: it.currency,
        articleCount: it.article_count ?? it.quantity_on_hand,
        startsSoon: it.starts_soon,
        auctionSecondsRemaining: it.auction_seconds_remaining,
      })),
    [catalogItems],
  );

  useEffect(() => {
    // Resolver transporte con el backend (asiento WebRTC u HLS) cuando no vino
    // pre-decidido (sin initialCreds y sin override por env).
    if (transport !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) {
          if (!cancelled) setStreamError('No se pudo obtener la sesión');
          return;
        }
        const watch = await getStreamWatch(token, roomId);
        if (cancelled) return;
        if (watch.transport === 'ivs' && watch.ivs) {
          setIvsCreds(watch.ivs);
          setTransport('ivs');
        } else if (watch.transport === 'webrtc' && watch.webrtc_credentials) {
          initialCredsRef.current = watch.webrtc_credentials;
          setTransport('webrtc');
        } else {
          setTransport('hls');
        }
      } catch {
        // Backend sin /stream/watch (rollout) o error transitorio: comportamiento
        // previo — intentar WebRTC directo (el 409 SEATS_FULL derivará a HLS).
        // Las salas IVS solo existen con backend nuevo, así que el fallback KVS
        // sigue siendo el correcto acá.
        if (!cancelled) setTransport('webrtc');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transport, roomId]);

  useEffect(() => {
    // Esperando la decisión de transporte del backend.
    if (transport === null) return;
    // En HLS el video lo maneja <HlsStreamPlayer/>; en IVS, el efecto de
    // conexión al stage (el SDK gestiona su propia sesión de audio, sin
    // incall-manager) y <IvsRemoteVideoView/> como render.
    if (isHls || isIvs) {
      setIsConnecting(false);
      return;
    }
    let cancelled = false;
    let receivedStream = false;
    let handledFailure = false;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearConnectTimer = () => {
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
    };

    // Maneja un fallo de conexión: reintenta con credenciales frescas hasta
    // MAX_CONNECT_ATTEMPTS; agotados los intentos, muestra error.
    // `handledFailure` evita doble procesamiento (timeout + onError simultáneos).
    const handleConnectFailure = (msg?: string) => {
      if (cancelled || receivedStream || handledFailure) return;
      handledFailure = true;
      clearConnectTimer();
      viewerCleanupRef.current?.();
      viewerCleanupRef.current = null;
      if (connectAttemptRef.current < MAX_CONNECT_ATTEMPTS) {
        connectAttemptRef.current += 1;
        setConnectAttempt((n) => n + 1); // re-dispara el effect → credenciales frescas
      } else {
        setStreamError(msg || 'Error de conexión WebRTC');
      }
    };

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
        // Primer intento: usar creds pre-fetcheadas si las hay (evita el round-trip HTTP).
        // En reintentos siempre se piden frescas (las cacheadas pudieron vencer).
        let webrtcCreds = initialCredsRef.current;
        initialCredsRef.current = null;
        if (!webrtcCreds) {
          webrtcCreds = await getWebRTCCredentials(token, roomId, 'viewer');
        }
        if (cancelled) return;

        const cleanup = await startKinesisWebRTCViewer(
          webrtcCreds,
          (mediaStream) => {
            if (cancelled) return;
            receivedStream = true;
            clearConnectTimer();
            setRemoteStream(mediaStream);
          },
          (err) => {
            handleConnectFailure(err?.message);
          },
          () => {
            if (!cancelled) {
              onClose();
            }
          }
        );
        if (cancelled) {
          cleanup();
          return;
        }
        viewerCleanupRef.current = cleanup;

        // Timeout: si no llega el primer frame en CONNECT_TIMEOUT_MS, reintentar/errorear.
        connectTimer = setTimeout(() => {
          handleConnectFailure('timeout');
        }, CONNECT_TIMEOUT_MS);
      } catch (e: unknown) {
        if (e instanceof SeatsFullError) {
          // El asiento se ocupó entre la decisión y la conexión (o en un
          // reintento con credenciales frescas): degradar a HLS sin error.
          if (!cancelled) setTransport('hls');
          return;
        }
        const msg = e instanceof Error ? e.message : 'No se pudo cargar el stream';
        handleConnectFailure(msg);
      } finally {
        if (!cancelled) {
          setIsConnecting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      clearConnectTimer();
      viewerCleanupRef.current?.();
      viewerCleanupRef.current = null;
      disableSpeakerphone();
    };
  }, [roomId, onClose, transport, isHls, isIvs, connectAttempt]);

  // IVS: error/desconexión del stage → reintentar con token fresco (re-resuelve
  // /stream/watch); agotados los intentos, error visible.
  const handleIvsError = useCallback((err: Error) => {
    if (connectAttemptRef.current < MAX_CONNECT_ATTEMPTS) {
      connectAttemptRef.current += 1;
      setIvsReady(false);
      setIvsCreds(null);
      setTransport(null); // vuelve a pedir /stream/watch → token nuevo
    } else {
      setStreamError(err.message || 'Error de conexión IVS');
    }
  }, []);
  const handleIvsReady = useCallback(() => setIvsReady(true), []);

  // IVS: la conexión al stage vive acá (no en el componente de video) para que
  // avance aunque el splash de "conectando" esté en pantalla. Los listeners se
  // registran ANTES del join: si el video del seller llega en el mismo instante,
  // el evento no se pierde. La view nativa (IvsRemoteVideoView) es render puro y
  // se attacha al stream vigente aunque se monte después.
  useEffect(() => {
    if (!isIvs || !ivsCreds) return;
    let cancelled = false;
    const unsubscribe = addIvsStageListeners({
      onRemoteVideo: (hasVideo) => {
        if (!cancelled && hasVideo) handleIvsReady();
      },
      onConnectionState: (state, error) => {
        if (!cancelled && state === 'DISCONNECTED' && error) {
          handleIvsError(new Error(error));
        }
      },
      onError: (error) => {
        if (!cancelled) handleIvsError(new Error(error));
      },
    });
    joinIvsStageAsViewer(ivsCreds.token).catch((e) => {
      if (!cancelled) handleIvsError(e instanceof Error ? e : new Error(String(e)));
    });
    return () => {
      cancelled = true;
      unsubscribe();
      leaveIvsStage().catch(() => {});
    };
  }, [isIvs, ivsCreds, handleIvsReady, handleIvsError]);

  // IVS: el mute del viewer y la pausa silencian el audio remoto vía gain nativo.
  useEffect(() => {
    if (!isIvs) return;
    setIvsRemoteAudioMuted(isStreamPaused || isAudioMuted).catch(() => {});
  }, [isIvs, isStreamPaused, isAudioMuted]);


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

  const handleRetryConnection = useCallback(() => {
    connectAttemptRef.current = 0;
    setStreamError(null);
    setRemoteStream(null);
    setIsConnecting(true);
    setConnectAttempt((n) => n + 1);
  }, []);

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

  /**
   * Panel + barra de acción: solo con una oferta en curso (WS o live-commerce).
   * `hasLiveOffer` incluye la ventana de gracia posterior al cierre, así que el
   * panel no parpadea si una puja tardía reabre la subasta.
   */
  const showAuctionUi = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const apiAuction = liveCommerce?.active_auction;
    if (apiAuction?.status === 'active' && apiAuction.ends_at > nowSec) {
      return true;
    }
    return hasLiveOffer;
  }, [liveCommerce?.active_auction, hasLiveOffer]);

  // El WS manda mientras haya oferta viva; live-commerce cubre el hueco entre
  // abrir el vivo y recibir el `init` (o backends que aún no mandan sale_mode).
  const apiActiveAuction = liveCommerce?.active_auction ?? null;
  const effectiveSaleMode = auction
    ? offerSaleMode
    : apiActiveAuction?.sale_mode === 'buy_now'
      ? 'buy_now'
      : 'auction';
  const buyNowPriceCents = auction?.priceCents ?? apiActiveAuction?.price_cents ?? null;
  const activeOfferId = auction?.id ?? apiActiveAuction?.uuid ?? null;

  /**
   * Compra directa: el backend resuelve quién llegó primero. El cierre para
   * todos (y la celebración del ganador) llega por el `auction_end` del WS, así
   * que acá solo hay que contemplar el caso de haber llegado segundo.
   */
  const handleBuyNow = useCallback(async () => {
    if (buyNowPending) return;
    setBuyNowPending(true);
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        showToast(t('common.error'), 'error');
        return;
      }
      await buyNowActiveOffer(token, roomId, activeOfferId);
    } catch (e: unknown) {
      if (e instanceof BuyNowUnavailableError) {
        showToast(t('stream.buyNowTooLate'), 'race');
      } else {
        showToast(e instanceof Error ? e.message : t('common.error'), 'error');
      }
    } finally {
      setBuyNowPending(false);
    }
  }, [buyNowPending, roomId, activeOfferId, t, showToast]);

  const splashCoverUrl = effectiveCoverUrl ?? stream.coverUrl ?? null;

  if (streamEndedReason) {
    const endedSubtitle =
      streamEndedReason === 'disconnect'
        ? t('stream.endedByBroadcasterDisconnect')
        : t('stream.endedByBroadcaster');
    return (
      <StreamViewerSplash
        coverUrl={splashCoverUrl}
        title={t('stream.endedTitle')}
        subtitle={endedSubtitle}
        actionLabel={t('stream.endedAccept')}
        onAction={() => {
          void handleEndedAccept();
        }}
      />
    );
  }

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
        <View style={styles.errorActions}>
          <TouchableOpacity onPress={handleRetryConnection} style={styles.retryBtn}>
            <Text variant="body" className="text-white font-semibold">
              {t('common.retry', 'Reintentar')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.errorBtn}>
            <Text variant="body" className="text-white">
              Cerrar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const videoReady = isHls ? hlsReady : isIvs ? ivsReady : !!remoteStream;
  if ((isConnecting || !videoReady) && !isStreamPaused) {
    return (
      <StreamViewerSplash
        coverUrl={splashCoverUrl}
        title={isConnecting ? t('stream.connectingTitle') : t('stream.waitingVideoTitle')}
        subtitle={
          isConnecting ? t('stream.connectingSubtitle') : t('stream.waitingVideoSubtitle')
        }
        actionLabel={t('stream.cancelJoin')}
        onAction={onClose}
        showSpinner
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {isIvs ? (
        <IvsRemoteVideoView
          style={[styles.video, isStreamPaused && styles.videoWhilePaused]}
          pointerEvents="none"
        />
      ) : isHls ? (
        <HlsStreamPlayer
          roomId={roomId}
          paused={isStreamPaused}
          muted={isAudioMuted}
          style={[styles.video, isStreamPaused && styles.videoWhilePaused]}
          onReady={() => setHlsReady(true)}
          onError={(err) => setStreamError(err.message)}
        />
      ) : remoteStream ? (
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

      <StreamToast
        message={toast}
        onDismiss={dismissToast}
        topOffset={Math.max(insets.top, 16) + 64}
      />

      {/* El ganador ve el festejo completo; el resto, el banner compacto. */}
      <AuctionWinnerOverlay winner={winCelebration ? null : auctionWinner} />
      <AuctionWinnerCelebration
        winner={winCelebration}
        productTitle={liveCommerce?.active_product?.title ?? null}
        onDismiss={() => setWinCelebration(null)}
      />
      <FloatingHeartsLayer likeEvents={likeEvents} onLikeDone={handleLikeDone} />
      <FloatingBidsLayer bidEvents={bidEvents} onBidDone={handleBidDone} />
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
        onBuyNow={handleBuyNow}
        onExit={onClose}
        onOpenWallet={() => {
          void wallet.openWallet();
        }}
        isRecording={isRecording}
        recordingTimeLabel={recordingTimeLabel}
        onToggleRecording={toggleRecording}
        showAuctionUi={showAuctionUi}
        isAuctionActive={isAuctionActive}
        isAuctionPaused={isAuctionPaused}
        auctionSecondsRemaining={auctionSecondsRemaining}
        auctionBids={auctionBids}
        auctionWinnerUsername={auctionWinner?.username ?? null}
        currentUsername={user?.name ?? null}
        auctionExtension={lastAuctionExtension}
        saleMode={effectiveSaleMode}
        buyNowPriceCents={buyNowPriceCents}
        isBuyNowPending={buyNowPending}
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
        onOpenNote={() => setNoteDrawerVisible(true)}
        shippingQuote={shippingQuote}
        onPressShipping={handlePressShippingRate}
        onNotify={showToast}
        isSellerAudioMuted={isSellerAudioMuted}
      />

      {/* La nota es solo lectura para el viewer: acá no hay edición ni "Publicar". */}
      <StreamLiveNoteDrawer
        visible={noteDrawerVisible}
        onClose={() => setNoteDrawerVisible(false)}
        mode="read"
        note={liveNote.note}
      />

      {sellerProfileUserId ? (
        <View style={styles.sellerProfileOverlay}>
          <UserProfileScreen
            userId={sellerProfileUserId}
            variant="sellerPublic"
            underStatusBar
            onBack={closeSellerProfile}
            onStartChat={(peerUserId) => {
              void startChat(peerUserId);
            }}
          />
        </View>
      ) : null}

      {/* Chat con el vendedor abierto desde su perfil durante el vivo. */}
      {directChat ? <ConversationModal conversation={directChat} onClose={closeChat} /> : null}

      <StreamRoomProductsDrawer
        visible={productCatalogVisible}
        onClose={closeProductCatalog}
        loading={catalogLoading}
        items={productCards}
        errorMessage={catalogError}
      />

      <StreamShippingRateDrawer
        visible={shippingRateDrawerVisible}
        quote={shippingQuote}
        addressLabel={shippingAddressLabel}
        sellerAddressLabel={sellerPickupAddress}
        onClose={() => setShippingRateDrawerVisible(false)}
        onEditAddress={handleEditShippingAddress}
      />

      <StreamShippingAddressDrawer
        visible={shippingSelectorVisible}
        defaultFullName={shippingDefaultFullName}
        onClose={() => setShippingSelectorVisible(false)}
        onChanged={() => {
          void refreshShippingQuote();
        }}
      />

      <StreamFollowSellerDrawer
        visible={followPromptVisible}
        sellerName={stream.sellerName}
        onClose={handleFollowPromptDismiss}
        onFollow={handleFollowPromptFollow}
        onNotNow={handleFollowPromptDismiss}
      />

      <WalletFlowDrawers
        wallet={wallet}
        onShippingSaved={() => {
          void refreshShippingQuote();
        }}
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
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoWhilePaused: {
    opacity: 0,
  },

  errorActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#685CF0',
    borderRadius: 8,
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
