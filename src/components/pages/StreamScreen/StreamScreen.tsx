/**
 * Stream Screen — viewer en vivo (buyer) — Figma 536-18831
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
  SeatsFullError,
  type LiveCommerceResponse,
  type RoomCatalogProductItem,
  type StreamWebRTCCredentialsResponse,
  type ViewerTransportDecision,
} from '../../../api/platformApi';
import { startKinesisWebRTCViewer, stopKinesisWebRTCViewer } from '../../../native/KinesisWebRTCNative';
import type { MediaStream } from 'react-native-webrtc';
import { getViewerTransport } from '../../../api/config';
import { HlsStreamPlayer } from '../../molecules/stream/HlsStreamPlayer';
import { StreamViewerSplash } from '../../molecules/stream/StreamViewerSplash';
import { fetchLiveRoomIds, pickNextLiveStreamIndex } from '../../../utils/streamLiveNavigation';
import { useStreamChat, type AuctionWinner } from '../../../hooks/useStreamChat';
import { AuctionWinnerOverlay } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerOverlay';
import { AuctionWinnerCelebration } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerCelebration';
import { useAuth } from '../../../hooks/useAuth';
import { useFloatingHearts, FloatingHeartsLayer } from '../../molecules/FloatingHearts/FloatingHearts';
import { useFloatingBids, FloatingBidsLayer } from '../../molecules/FloatingBids/FloatingBids';
import { enableSpeakerphone, disableSpeakerphone, muteSpeakerOutput } from '../../../utils/audioRoute';
import { useLiveKeepAwake } from '../../../hooks/useLiveKeepAwake';
import { StreamBuyerOverlay } from '../../organisms/stream/StreamBuyerOverlay';
import {
  StreamRoomProductsDrawer,
  type LiveProductCardVM,
} from '../../organisms/stream/StreamRoomProductsDrawer';
import { StreamVideoScrim } from '../../organisms/stream/StreamVideoScrim';
import { StreamFollowSellerDrawer } from '../../organisms/stream/StreamFollowSellerDrawer';
import { StreamShippingRateDrawer } from '../../organisms/stream/StreamShippingRateDrawer';
import { StreamPausedMedia } from '../../organisms/stream/StreamPausedMedia';
import { UserProfileScreen } from '../UserProfileScreen';
import { useSellerFollow } from '../../../hooks/useSellerFollow';
import { FollowSuccessCelebration } from '../../molecules/profile';
import { getUserPublicProfile } from '../../../api/profileApi';
import { useLiveScreenRecording } from '../../../hooks/useLiveScreenRecording';
import { useStreamWalletFlow } from '../../../hooks/useStreamWalletFlow';
import { useProductShippingQuote } from '../../../hooks/useProductShippingQuote';
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
   * Credenciales WebRTC pre-fetacheadas por el contenedor de swipe.
   * Cuando están presentes se omite el round-trip HTTP a /webrtc-credentials.
   */
  initialCreds?: StreamWebRTCCredentialsResponse | null;
  /** Feed de swipe: permite ir al siguiente live o salir a inicio. */
  endedFeedContext?: StreamEndedFeedContext;
  /** Fallback cuando no hay feed de swipe (p. ej. stream abierto fuera del carrusel). */
  onLiveEndedAccept?: () => void;
}

export const StreamScreen: React.FC<StreamScreenProps> = ({
  stream,
  onClose,
  initialCreds,
  endedFeedContext,
  onLiveEndedAccept,
}) => {
  const { t } = useTranslation();
  const [messageText, setMessageText] = useState('');
  // Transporte híbrido: el backend decide por sala (asiento WebRTC si hay cupo,
  // HLS si está llena) vía GET /stream/watch. VIEWER_TRANSPORT=hls fuerza HLS
  // globalmente (debug/rollout); cualquier otro valor = automático.
  const forcedHls = getViewerTransport() === 'hls';
  const [transport, setTransport] = useState<ViewerTransportDecision | null>(
    forcedHls ? 'hls' : initialCreds ? 'webrtc' : null
  );
  const isHls = transport === 'hls';
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hlsReady, setHlsReady] = useState(false);
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
  const [productCatalogVisible, setProductCatalogVisible] = useState(false);
  const [catalogItems, setCatalogItems] = useState<RoomCatalogProductItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sellerProfileUserId, setSellerProfileUserId] = useState<string | null>(null);
  const [resolvedSellerUserId, setResolvedSellerUserId] = useState<string | null>(
    stream.sellerUserId ?? null
  );
  const viewerCleanupRef = useRef<(() => void) | null>(null);
  // Credenciales pre-fetacheadas: se usan una sola vez en el primer montaje.
  const initialCredsRef = useRef<StreamWebRTCCredentialsResponse | null>(initialCreds ?? null);
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
    disconnectPermanently,
  } = useStreamChat({
    roomId,
    accessToken: chatToken,
    onLike: handleLikeEvent,
    onStreamEnded: onStreamEndedFromWs,
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
  // subasta solo si el comprador ya tiene domicilio configurado; si no, se lo
  // manda directo al modal de domicilio del wallet.
  const [shippingRateDrawerVisible, setShippingRateDrawerVisible] = useState(false);
  const hasShippingAddressConfigured = Boolean(
    shippingAddress?.address_line1?.trim() && shippingAddress?.postal_code?.trim()
  );
  const shippingAddressLabel = [
    shippingAddress?.address_line1?.trim(),
    shippingAddress?.city?.trim(),
    shippingAddress?.state?.trim(),
  ]
    .filter(Boolean)
    .join(', ');

  const handlePressShippingRate = useCallback(() => {
    if (hasShippingAddressConfigured) {
      setShippingRateDrawerVisible(true);
    } else {
      wallet.openShipping();
    }
  }, [hasShippingAddressConfigured, wallet.openShipping]);

  const handleEditShippingAddress = useCallback(() => {
    setShippingRateDrawerVisible(false);
    wallet.openShipping();
  }, [wallet.openShipping]);

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
        if (watch.transport === 'webrtc' && watch.webrtc_credentials) {
          initialCredsRef.current = watch.webrtc_credentials;
          setTransport('webrtc');
        } else {
          setTransport('hls');
        }
      } catch {
        // Backend sin /stream/watch (rollout) o error transitorio: comportamiento
        // previo — intentar WebRTC directo (el 409 SEATS_FULL derivará a HLS).
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
    // En modo HLS el video lo maneja <HlsStreamPlayer/>; no abrir peer WebRTC.
    if (isHls) {
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
  }, [roomId, onClose, transport, isHls, connectAttempt]);

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

  /** Panel de subasta y bid bar: solo con subasta en curso (WS o live-commerce). */
  const showAuctionUi = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const apiAuction = liveCommerce?.active_auction;
    if (apiAuction?.status === 'active' && apiAuction.ends_at > nowSec) {
      return true;
    }
    if (isAuctionActive && (auctionSecondsRemaining ?? 0) > 0) {
      return true;
    }
    return false;
  }, [liveCommerce?.active_auction, isAuctionActive, auctionSecondsRemaining]);

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

  const videoReady = isHls ? hlsReady : !!remoteStream;
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

      {isHls ? (
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
        onExit={onClose}
        onOpenWallet={() => {
          void wallet.openWallet();
        }}
        isRecording={isRecording}
        recordingTimeLabel={recordingTimeLabel}
        onToggleRecording={toggleRecording}
        showAuctionUi={showAuctionUi}
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
        shippingQuote={shippingQuote}
        onPressShipping={handlePressShippingRate}
      />

      {sellerProfileUserId ? (
        <View style={styles.sellerProfileOverlay}>
          <UserProfileScreen
            userId={sellerProfileUserId}
            variant="sellerPublic"
            underStatusBar
            onBack={closeSellerProfile}
          />
        </View>
      ) : null}

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

      <StreamFollowSellerDrawer
        visible={followPromptVisible}
        sellerName={stream.sellerName}
        onClose={handleFollowPromptDismiss}
        onFollow={handleFollowPromptFollow}
        onNotNow={handleFollowPromptDismiss}
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
        onClose={() => {
          void wallet.returnToHub();
        }}
        onSaved={() => {
          void wallet.onShippingSaved();
          void refreshShippingQuote();
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
