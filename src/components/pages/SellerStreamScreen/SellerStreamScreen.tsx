/**
 * SellerStreamScreen
 * Pantalla para el streamer: crea room, pasa a live (Kinesis) y envía video con WebRTC (master).
 * UI overlay: Figma 636-30152 vía StreamSellerOverlay.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  ActivityIndicator,
  AppState,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from 'react-native-webrtc';
import { ArrowLeft } from 'lucide-react-native';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import { Text } from '../../atoms/Text';
import type { StreamConfig } from '../../organisms/startLive/types';
import { useAuth } from '../../../hooks/useAuth';
import { storage } from '../../../utils/storage';
import {
  createRoom,
  goLive,
  endStream,
  getMyLiveRoom,
  getWebRTCCredentials,
  startRecording,
  getRoomLiveCommerce,
  getRoomCatalog,
  pinRoomProduct,
  startRoomProductAuction,
  startRoomProductBuyNow,
  startRoomProductRaffle,
  pauseRoomAuction,
  resumeRoomAuction,
  cancelRoomAuction,
  type AuctionCancelReasonCode,
  type LiveCommerceResponse,
  type PlatformRoomResponse,
  type RoomCatalogProductItem,
} from '../../../api/platformApi';
import { getUserPublicProfile, type UserPublicProfile } from '../../../api/profileApi';
import { getViewerTransport } from '../../../api/config';
import {
  startKinesisWebRTCMaster,
  stopKinesisWebRTCMaster,
  switchKinesisWebRTCMasterCamera,
  setKinesisWebRTCMasterVideoEnabled,
  setKinesisWebRTCMasterMicMuted,
} from '../../../native/KinesisWebRTCNative';
import {
  addIvsStageListeners,
  joinIvsStageAsPublisher,
  leaveIvsStage,
  setIvsStageMicMuted,
  setIvsStageVideoEnabled,
  switchIvsStageCamera,
  IvsLocalPreviewView,
  type IvsConnectionState,
} from '../../../native/IvsStageNative';
import {
  addLivePipListener,
  isLivePipSupported,
  setLivePipEnabled,
} from '../../../native/LivePipNative';
import { useStreamChat } from '../../../hooks/useStreamChat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StreamToast, useStreamToast } from '../../molecules/stream/StreamToast';
import { StreamAuctionCancelDrawer } from '../../organisms/stream/StreamAuctionCancelDrawer';
import { useLiveAutoCoverSnapshot } from '../../../hooks/useLiveAutoCoverSnapshot';
import { AuctionWinnerOverlay } from '../../molecules/AuctionWinnerOverlay/AuctionWinnerOverlay';
import { useFloatingHearts, FloatingHeartsLayer } from '../../molecules/FloatingHearts/FloatingHearts';
import { useFloatingBids, FloatingBidsLayer } from '../../molecules/FloatingBids/FloatingBids';
import { useLiveKeepAwake } from '../../../hooks/useLiveKeepAwake';
import { PreLiveSetupOverlay } from '../../organisms/startLive/PreLiveSetupOverlay';
import { StreamSellerOverlay } from '../../organisms/stream/StreamSellerOverlay';
import { StreamVideoScrim } from '../../organisms/stream/StreamVideoScrim';
import {
  StreamRoomProductsDrawer,
  type LiveProductCardVM,
  type LiveProductSaleMode,
} from '../../organisms/stream/StreamRoomProductsDrawer';
import { StreamLiveNoteDrawer } from '../../organisms/stream/StreamLiveNoteDrawer';
import { useLiveRoomNote } from '../../../hooks/useLiveRoomNote';
import { SellerAddProductDrawer } from '../../organisms/stream/SellerAddProductDrawer';
import { SellerAddProductTypeDrawer, type ProductListType } from '../../organisms/stream/SellerAddProductTypeDrawer';
import type { ProductListScope } from '../../../api/types';
import { appAlert, runWhenAppAlertClosed } from '../../../alerts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Reintentos de reconexión al stage cuando el servidor dice que la sala sigue viva. */
const IVS_RECONNECT_MAX_ATTEMPTS = 4;
const IVS_RECONNECT_BASE_DELAY_MS = 1000;
/** GET /rooms/me/live: reintentos ante error de red antes de responder 'unknown'. */
const ROOM_ALIVE_CHECK_ATTEMPTS = 3;
const ROOM_ALIVE_CHECK_RETRY_MS = 1500;

interface SellerStreamScreenProps {
  streamConfig: StreamConfig;
  /**
   * Vivo LIVE a retomar tras un crash (GET /rooms/me/live): salta el asistente y
   * reusa la sala con el mismo token de publicación en vez de crear una nueva.
   */
  resumeRoom?: PlatformRoomResponse | null;
  onEndStream: () => void;
}

export const SellerStreamScreen: React.FC<SellerStreamScreenProps> = ({
  streamConfig,
  resumeRoom = null,
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
  const [preLiveReady, setPreLiveReady] = useState(Boolean(resumeRoom));
  const [resolvedStreamConfig, setResolvedStreamConfig] = useState<StreamConfig>(streamConfig);
  const [localWebRTCStream, setLocalWebRTCStream] = useState<MediaStream | null>(null);
  // Publicando al IVS Stage (transporte 'ivs'): el preview local es la view nativa.
  const [ivsPublishing, setIvsPublishing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<UserPublicProfile | null>(null);
  const [liveCommerce, setLiveCommerce] = useState<LiveCommerceResponse | null>(null);
  const [productCatalogVisible, setProductCatalogVisible] = useState(false);
  const [addProductTypeVisible, setAddProductTypeVisible] = useState(false);
  const [addProductVisible, setAddProductVisible] = useState(false);
  const [pendingScope, setPendingScope] = useState<ProductListScope>('room_exclusive');
  /**
   * Lista ya elegida en este vivo (tarea 29): con contexto activo, "Agregar
   * producto" abre el form directo en vez de volver a preguntar el tipo de lista.
   * null = todavía no hay lista (primer producto) → sí se muestra el prompt.
   */
  const [activeListScope, setActiveListScope] = useState<ProductListScope | null>(null);
  const [catalogItems, setCatalogItems] = useState<RoomCatalogProductItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [saleMode, setSaleMode] = useState<LiveProductSaleMode>('auction');
  /**
   * Producto elegido con las flechas < > (tarea 17). null = seguir al activo que
   * resuelve el backend. Navegación 100% local: no escribe nada en el servidor
   * (y por eso tampoco dispara cotizaciones ni otros cálculos por producto);
   * recién al iniciar la oferta el backend marca el producto como activo.
   */
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cancelDrawerVisible, setCancelDrawerVisible] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  /** Pausa (o inicio) en vuelo: evita doble tap sobre la CTA central. */
  const [auctionActionPending, setAuctionActionPending] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const isMicMutedRef = useRef(false);
  /**
   * El mic lo silenció una pausa (botón, "por comenzar" o background), no el
   * vendedor: al despausar se restaura el estado previo. Un solo flag para
   * todos los caminos — si el vendedor ya lo había muteado a mano, queda false
   * y despausar no le reabre el mic.
   */
  const micMutedByPauseRef = useRef(false);
  // Figma 698-12228: al crear la sala el vivo ya queda listado, pero arranca en
  // pausa ("por comenzar") hasta que el vendedor toca "Comenzar Live".
  const [hasStartedLive, setHasStartedLive] = useState(Boolean(resumeRoom));
  const [startLivePending, setStartLivePending] = useState(false);
  const initialPauseSentRef = useRef(Boolean(resumeRoom));
  /** Token PUBLISH del stage (go_live o /me/live): reconectar con el mismo conserva la grabación. */
  const ivsPublishTokenRef = useRef<string | null>(null);
  /** Hay que mandar stream_resume apenas el WS conecte (vuelta de background / retomar). */
  const pendingResumeRef = useRef(false);
  /** App en background: el WS se cierra para que corra el grace period del servidor. */
  const [wsSuspended, setWsSuspended] = useState(false);
  /** Salida voluntaria o vivo ya cerrado: un DISCONNECTED del stage acá no es una caída. */
  const leavingRef = useRef(false);
  const [liveCoverUrl, setLiveCoverUrl] = useState<string | null>(null);
  const [noteDrawerVisible, setNoteDrawerVisible] = useState(false);
  const userProvidedCover = Boolean(resolvedStreamConfig.coverUrl?.trim());
  const cameraRef = useRef<Camera>(null);
  const streamViewRef = useRef<View>(null);

  const { likeEvents, handleLikeDone, handleLikeEvent } = useFloatingHearts();
  const insets = useSafeAreaInsets();
  const { toast, showToast, dismissToast } = useStreamToast();

  const handleStreamEnded = useCallback(() => {
    onEndStream();
  }, [onEndStream]);

  /**
   * Confirmación de la cancelación por el canal autoritativo (WS): cubre también
   * una cancelación hecha desde otra sesión del mismo vendedor.
   */
  const handleAuctionCancelled = useCallback(() => {
    showToast(t('stream.auctionCancelledSellerConfirm'), 'info');
  }, [showToast, t]);

  const {
    messages,
    viewerCount,
    sendChat,
    sendLike,
    sendStreamPause,
    sendStreamResume,
    sendSellerAudioMuted,
    disconnectPermanently,
    isConnected,
    isStreamPaused,
    auction,
    isAuctionActive,
    hasLiveOffer,
    offerSaleMode,
    auctionSecondsRemaining,
    auctionBids,
    auctionWinner,
    lastAuctionExtension,
    roomNote,
  } = useStreamChat({
    roomId,
    accessToken: token,
    enabled: !wsSuspended,
    role: 'master',
    reconnect: true,
    onLike: handleLikeEvent,
    onStreamEnded: handleStreamEnded,
    onAuctionCancelled: handleAuctionCancelled,
  });

  const { bidEvents, handleBidDone } = useFloatingBids(auctionBids);

  // Nota del vivo: el vendedor es el dueño de la sala, así que puede editarla.
  const liveNote = useLiveRoomNote({
    roomId,
    accessToken: token,
    initialNote: liveCommerce?.note ?? null,
    liveNote: roomNote,
    canEdit: true,
  });

  useLiveKeepAwake();

  const isPublishing = ivsPublishing || Boolean(localWebRTCStream);

  const setTransportVideoEnabled = useCallback(
    (enabled: boolean) =>
      (ivsPublishing
        ? setIvsStageVideoEnabled(enabled)
        : setKinesisWebRTCMasterVideoEnabled(enabled)
      ).catch(() => {}),
    [ivsPublishing],
  );
  const applyMicMuted = useCallback(
    (muted: boolean) =>
      ivsPublishing ? setIvsStageMicMuted(muted) : setKinesisWebRTCMasterMicMuted(muted),
    [ivsPublishing],
  );
  /** Cierra el mic en pausa sin tocar `isMicMuted` (eso es el mute a mano). */
  const muteMicForPause = useCallback(async () => {
    if (isMicMutedRef.current || micMutedByPauseRef.current) return;
    await applyMicMuted(true);
    micMutedByPauseRef.current = true;
  }, [applyMicMuted]);
  /** Reabre el mic solo si la pausa lo había cerrado y el vendedor no lo muteó. */
  const restoreMicAfterPause = useCallback(async () => {
    if (!micMutedByPauseRef.current) return;
    if (!isMicMutedRef.current) {
      await applyMicMuted(false);
    }
    micMutedByPauseRef.current = false;
  }, [applyMicMuted]);

  // Estado "por comenzar": en cuanto hay publicación cortamos video y mic para
  // que los viewers vean la espera y nada quede al aire (tampoco en la grabación).
  useEffect(() => {
    if (!isPublishing || hasStartedLive) return;
    (async () => {
      try {
        if (ivsPublishing) {
          await setIvsStageVideoEnabled(false);
        } else {
          await setKinesisWebRTCMasterVideoEnabled(false);
        }
        await muteMicForPause();
      } catch {
        // Si el transporte no soporta apagar video/mic, el vivo igual queda en
        // pausa para los viewers vía WebSocket.
      }
    })();
  }, [isPublishing, ivsPublishing, hasStartedLive, muteMicForPause]);

  // El pause hacia los viewers necesita el WS conectado; se manda una sola vez.
  useEffect(() => {
    if (!isPublishing || hasStartedLive || !isConnected) return;
    if (initialPauseSentRef.current) return;
    initialPauseSentRef.current = true;
    sendStreamPause();
  }, [isPublishing, hasStartedLive, isConnected, sendStreamPause]);

  const handleLiveCoverUploaded = useCallback((url: string) => {
    setLiveCoverUrl(url);
  }, []);

  useLiveAutoCoverSnapshot({
    roomId,
    videoViewRef: streamViewRef,
    enabled:
      !userProvidedCover &&
      isStreaming &&
      (Boolean(localWebRTCStream) || ivsPublishing) &&
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
        let live: PlatformRoomResponse;
        if (resumeRoom) {
          // Recuperación tras crash: la sala ya está LIVE en el servidor; se reusa
          // con el mismo token de publicación en vez de crear otra.
          live = resumeRoom;
          pendingResumeRef.current = true;
        } else {
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
          live = await goLive(accessToken, room.uuid);
          if (cancelled) return;
        }
        setRoomId(live.uuid);
        try {
          if (live.video_transport === 'ivs' && live.ivs_publish?.token) {
            // IVS Real-Time: una sola publicación al stage (AWS hace el fan-out).
            // La grabación la hace AWS (Individual Participant Recording): sin
            // startRecording ni storage KVS. El preview local es la view nativa.
            //
            // Los permisos deben estar concedidos ANTES del join: el SDK captura
            // cámara/mic nativo directo y en Android arrancar la captura sin
            // RECORD_AUDIO mata el proceso (con KVS los pedía getUserMedia).
            if (Camera.getCameraPermissionStatus() !== 'granted') {
              const cam = await Camera.requestCameraPermission();
              if (cam !== 'granted') {
                throw new Error('Se necesita permiso de cámara para transmitir.');
              }
            }
            if (Camera.getMicrophonePermissionStatus() !== 'granted') {
              const mic = await Camera.requestMicrophonePermission();
              if (mic !== 'granted') {
                throw new Error('Se necesita permiso de micrófono para transmitir.');
              }
            }
            if (cancelled) return;
            setIsStreaming(true);
            ivsPublishTokenRef.current = live.ivs_publish.token;
            await joinIvsStageAsPublisher(live.ivs_publish.token, {
              initialFacingMode: cameraPosition === 'front' ? 'user' : 'environment',
            });
            if (!cancelled) setIvsPublishing(true);
          } else {
            const webrtcCreds = await getWebRTCCredentials(accessToken, live.uuid, 'master');
            setIsStreaming(true);
            await new Promise<void>((resolve) => setTimeout(resolve, 200));
            await startKinesisWebRTCMaster(webrtcCreds, {
              initialFacingMode: cameraPosition === 'front' ? 'user' : 'environment',
              onLocalStream: (stream) => {
                setLocalWebRTCStream(stream as unknown as MediaStream);
              },
            });
            // Grabación (ingestión WebRTC → KVS) SOLO en modo HLS: al habilitar storage, AWS rompe el
            // P2P master↔viewer, así que con viewers WebRTC en tiempo real NO debe activarse.
            if (getViewerTransport() === 'hls') {
              startRecording(accessToken, live.uuid).catch((recErr) => {
                console.warn('[Seller] No se pudo iniciar la grabación:', recErr);
              });
            }
          }
        } catch (e: unknown) {
          if (!cancelled) {
            setIsStreaming(false);
            setIvsPublishing(false);
            const msg = e instanceof Error ? e.message : 'No se pudo iniciar la transmisión. Comprueba la conexión.';
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
  }, [preLiveReady, resolvedStreamConfig, resumeRoom, user?.name]);

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

  /**
   * Reingreso a un vivo con productos: el scope del producto activo dice en qué
   * lista se está trabajando, así el flow de agregar no vuelve a preguntar. La
   * elección explícita del vendedor (si la hubo) no se pisa.
   */
  useEffect(() => {
    if (activeListScope) return;
    const scope = liveCommerce?.active_product?.scope;
    if (scope === 'global' || scope === 'room_exclusive') {
      setActiveListScope(scope);
    }
  }, [liveCommerce, activeListScope]);

  const refreshCatalog = useCallback(async () => {
    if (!token || !roomId) return;
    try {
      const res = await getRoomCatalog(token, roomId);
      setCatalogItems(res.items ?? []);
      setCatalogError(null);
    } catch {
      setCatalogError(t('stream.productsCatalogEmpty'));
      setCatalogItems([]);
    }
  }, [token, roomId, t]);

  const openProductCatalog = useCallback(async () => {
    if (!token || !roomId) return;
    setProductCatalogVisible(true);
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      await refreshCatalog();
    } finally {
      setCatalogLoading(false);
    }
  }, [token, roomId, refreshCatalog]);

  const closeProductCatalog = useCallback(() => {
    setProductCatalogVisible(false);
  }, []);

  const refreshLiveCommerce = useCallback(() => {
    if (!token || !roomId) return;
    getRoomLiveCommerce(token, roomId)
      .then((data) => setLiveCommerce(data))
      .catch(() => {});
  }, [token, roomId]);

  /**
   * Las flechas < > navegan sobre el catálogo, así que se carga apenas existe la
   * sala (antes solo se pedía al abrir el drawer de productos).
   */
  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  // Con una oferta corriendo la pantalla sigue al producto en juego (el backend
  // ya lo resolvió como activo): la selección local de las flechas se suelta.
  useEffect(() => {
    if (hasLiveOffer) setSelectedProductId(null);
  }, [hasLiveOffer]);

  // Si el producto elegido salió del catálogo (se vendió/quitó), volver al activo.
  useEffect(() => {
    if (!selectedProductId) return;
    if (!catalogItems.some((it) => it.uuid === selectedProductId)) {
      setSelectedProductId(null);
    }
  }, [catalogItems, selectedProductId]);

  const productCards = useMemo<LiveProductCardVM[]>(
    () =>
      catalogItems
        .filter((it) => {
          // Un producto recién cargado llega con live_sale_mode null: si lo
          // filtráramos por igualdad estricta desaparecería de los tres tabs.
          // Lo mostramos en todos, así el vendedor lo encuentra apenas lo sube.
          const mode = it.live_sale_mode;
          if (mode == null || mode === '') return true;
          return mode === saleMode;
        })
        .map((it, index) => ({
          uuid: it.uuid,
          title: it.title,
          imageUrl: it.image_url,
          priceCents: it.base_price_cents,
          currency: it.currency,
          articleCount: it.article_count ?? it.quantity_on_hand,
          startsSoon: it.starts_soon,
          auctionSecondsRemaining: it.auction_seconds_remaining,
          status: it.is_active ? 'live' : it.starts_soon ? 'scheduled' : undefined,
          isPinned: it.is_pinned,
          // El primero del catálogo filtrado es el que la vista del vendedor
          // muestra y el que pone en juego el deslizamiento de "Siguiente Subasta".
          isNext: index === 0,
        })),
    [catalogItems, saleMode],
  );

  /** Pone un producto en juego según el modo de venta elegido en el drawer. */
  const startProductById = useCallback(
    async (productId: string) => {
      if (!token || !roomId) return;
      // Con el vivo pausado (por comenzar o pausa media) no se abre ninguna oferta.
      if (isStreamPaused) {
        showToast(t('stream.salesBlockedWhilePaused'), 'info');
        return;
      }
      try {
        if (saleMode === 'auction') {
          // Sin duración: el backend usa la config guardada al crear el producto.
          await startRoomProductAuction(token, roomId, productId);
        } else if (saleMode === 'buy_now') {
          // Compra directa: mismo temporizador que la subasta, precio fijo del
          // producto. Gana el primero que compra (se resuelve en el backend).
          await startRoomProductBuyNow(token, roomId, productId);
        } else {
          // El modo de participación se define al cargar el producto. Si el
          // catálogo lo devuelve lo mandamos explícito; si no, se omite y el
          // backend usa el guardado (mismo criterio que la duración de subasta).
          const item = catalogItems.find((it) => it.uuid === productId);
          await startRoomProductRaffle(token, roomId, productId, {
            participationMode: item?.raffle_participation_mode ?? undefined,
          });
        }
        // Con la oferta abierta el backend ya marcó el producto activo: la
        // selección local de las flechas se suelta y la vista lo sigue.
        setSelectedProductId(null);
        await refreshCatalog();
        refreshLiveCommerce();
        setProductCatalogVisible(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('common.error');
        appAlert(t('common.appName'), msg);
      }
    },
    [
      saleMode,
      token,
      roomId,
      isStreamPaused,
      catalogItems,
      refreshCatalog,
      refreshLiveCommerce,
      showToast,
      t,
    ],
  );

  const handleStartProduct = useCallback(
    (item: LiveProductCardVM) => startProductById(item.uuid),
    [startProductById],
  );

  /**
   * Tocar una card lo deja primero en la lista (sin arrancarlo): el catálogo se
   * ordena por `pinned_at` desc, así que re-fijarlo lo lleva al tope y pasa a
   * ser el producto que muestra la pantalla y que arranca el slider.
   */
  const handleSelectProduct = useCallback(
    async (item: LiveProductCardVM) => {
      if (!token || !roomId) return;
      if (item.isNext) {
        setProductCatalogVisible(false);
        return;
      }
      try {
        // `pin` es un toggle en el backend: si ya estaba fijado hay que soltarlo
        // para volver a fijarlo con timestamp nuevo y que quede primero.
        if (item.isPinned) {
          await pinRoomProduct(token, roomId, item.uuid);
        }
        await pinRoomProduct(token, roomId, item.uuid);
        await refreshCatalog();
        refreshLiveCommerce();
        setProductCatalogVisible(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('common.error');
        appAlert(t('common.appName'), msg);
      }
    },
    [token, roomId, refreshCatalog, refreshLiveCommerce, t],
  );

  const handlePinProduct = useCallback(
    async (item: LiveProductCardVM) => {
      if (!token || !roomId) return;
      try {
        await pinRoomProduct(token, roomId, item.uuid);
        await refreshCatalog();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('common.error');
        appAlert(t('common.appName'), msg);
      }
    },
    [token, roomId, refreshCatalog, t],
  );

  const openAddProductFlow = useCallback(() => {
    if (!resolvedStreamConfig.interestCategoryUuids?.[0]) {
      appAlert(t('common.appName'), t('stream.addProductNoCategory'));
      return;
    }
    /** Ya hay lista en este vivo: se usa directo, sin re-preguntar (tarea 29). */
    if (activeListScope) {
      setPendingScope(activeListScope);
      setAddProductVisible(true);
      return;
    }
    setAddProductTypeVisible(true);
  }, [resolvedStreamConfig.interestCategoryUuids, activeListScope, t]);

  const handleSelectProductListType = useCallback((type: ProductListType) => {
    const scope: ProductListScope = type === 'temporary' ? 'room_exclusive' : 'global';
    setPendingScope(scope);
    setActiveListScope(scope);
    setAddProductTypeVisible(false);
    setAddProductVisible(true);
  }, []);

  const openAddProduct = openAddProductFlow;

  const closeAddProduct = useCallback(() => {
    setAddProductVisible(false);
  }, []);

  const confirmEndStream = useCallback(async () => {
    // Salida voluntaria: el DISCONNECTED del stage que sigue no es una caída.
    leavingRef.current = true;
    disconnectPermanently();
    try {
      if (ivsPublishing) {
        await leaveIvsStage();
      } else {
        await stopKinesisWebRTCMaster();
      }
    } catch {
      // ignore
    }
    setLocalWebRTCStream(null);
    setIvsPublishing(false);
    setIsStreaming(false);
    if (token && roomId) {
      try {
        await endStream(token, roomId);
      } catch {
        // ignore
      }
    }
    onEndStream();
  }, [token, roomId, onEndStream, disconnectPermanently]);

  const { hasPermission, requestPermission } = useCameraPermission();
  // El micrófono se pide explícito: el publisher IVS captura audio nativo directo
  // (con KVS lo pedía implícitamente el getUserMedia de libwebrtc). Sin el permiso
  // RECORD_AUDIO concedido, Android mata el proceso al arrancar la captura.
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } =
    useMicrophonePermission();
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = cameraPosition === 'front' ? frontDevice : backDevice;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!hasMicPermission) requestMicPermission();
  }, [hasMicPermission, requestMicPermission]);

  const handlePreLiveStart = useCallback((config: StreamConfig) => {
    setResolvedStreamConfig(config);
    setIsStarting(true);
    setPreLiveReady(true);
    // Recordar las categorías para precargarlas en el próximo live.
    void storage.setLastLiveCategoryUuids(config.interestCategoryUuids ?? []);
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
      // En pausa el transporte queda muteado siempre: solo cambia la intención
      // del vendedor (y el aviso a los viewers). Si despausáramos el transporte
      // acá, el mic volvería al aire mientras cree que está en pausa.
      if (isStreamPaused || micMutedByPauseRef.current) {
        micMutedByPauseRef.current = !nextMuted;
        setIsMicMuted(nextMuted);
        sendSellerAudioMuted(nextMuted);
        return;
      }
      if (ivsPublishing) {
        await setIvsStageMicMuted(nextMuted);
      } else {
        await setKinesisWebRTCMasterMicMuted(nextMuted);
      }
      setIsMicMuted(nextMuted);
      // Recién después de que el transporte lo aplicó: lo que ve el comprador
      // es el estado real del mic, no un booleano optimista.
      sendSellerAudioMuted(nextMuted);
    } catch {
      appAlert(t('common.appName'), t('stream.muteMicError'));
    }
  }, [isMicMuted, isStreamPaused, ivsPublishing, sendSellerAudioMuted, t]);

  const handleTogglePause = useCallback(async () => {
    const nextPaused = !isStreamPaused;
    try {
      if (nextPaused) {
        // Mic primero: si falla, no mandamos pausa (el vendedor no creería
        // que está en privado con el audio todavía al aire / grabándose).
        await muteMicForPause();
        if (ivsPublishing) {
          await setIvsStageVideoEnabled(false);
        } else {
          await setKinesisWebRTCMasterVideoEnabled(false);
        }
      } else {
        if (ivsPublishing) {
          await setIvsStageVideoEnabled(true);
        } else {
          await setKinesisWebRTCMasterVideoEnabled(true);
        }
        await restoreMicAfterPause();
      }
    } catch {
      appAlert(t('common.appName'), t('stream.pauseStreamError'));
      return;
    }
    if (nextPaused) {
      sendStreamPause();
    } else {
      sendStreamResume();
    }
  }, [
    isStreamPaused,
    ivsPublishing,
    muteMicForPause,
    restoreMicAfterPause,
    sendStreamPause,
    sendStreamResume,
    t,
  ]);

  /** "Comenzar Live" / "Reanudar Live": saca el vivo de pausa (Figma 698-12307). */
  const handleStartLive = useCallback(async () => {
    setStartLivePending(true);
    try {
      if (ivsPublishing) {
        await setIvsStageVideoEnabled(true);
      } else {
        await setKinesisWebRTCMasterVideoEnabled(true);
      }
      await restoreMicAfterPause();
    } catch {
      appAlert(t('common.appName'), t('stream.pauseStreamError'));
      setStartLivePending(false);
      return;
    }
    sendStreamResume();
    setHasStartedLive(true);
    setStartLivePending(false);
  }, [ivsPublishing, restoreMicAfterPause, sendStreamResume, t]);

  // ---------------------------------------------------------------------------
  // B-04 · El vendedor tiene que saber si su vivo sigue vivo.
  //
  // Fuente de verdad: el servidor (GET /rooms/me/live), nunca un timer local ni
  // el estado optimista de la pantalla. Tres entradas al mismo camino:
  //  - AppState → background: pausar por el mismo camino que el botón y cerrar
  //    el WS, que es lo que arranca el grace period de 2 min en el servidor.
  //  - AppState → active: preguntar si la sala sigue LIVE; recién ahí despausar.
  //  - Stage DISCONNECTED (con o sin `error`): preguntar y reconectar con el
  //    mismo token, o avisar que el vivo terminó si el servidor ya lo cerró.
  // ---------------------------------------------------------------------------
  const liveActive = isPublishing && roomId != null && token != null && !streamError;

  const tokenRef = useRef(token);
  const roomIdRef = useRef(roomId);
  const isStreamPausedRef = useRef(isStreamPaused);
  const cameraPositionRef = useRef(cameraPosition);
  const onEndStreamRef = useRef(onEndStream);
  useEffect(() => {
    tokenRef.current = token;
    roomIdRef.current = roomId;
    isStreamPausedRef.current = isStreamPaused;
    isMicMutedRef.current = isMicMuted;
    cameraPositionRef.current = cameraPosition;
    onEndStreamRef.current = onEndStream;
  });

  /** Último estado del stage que reportó el nativo. */
  const ivsStateRef = useRef<IvsConnectionState>('CONNECTING');
  /** App en background (o PiP): el vivo quedó pausado y el WS cerrado hasta volver. */
  const suspendedRef = useRef(false);
  /** La pausa la puso el background, no el vendedor: al volver se reanuda sola. */
  const autoPausedRef = useRef(false);
  const ivsRecoveringRef = useRef(false);
  const ivsRetryCountRef = useRef(0);
  const [ivsReconnecting, setIvsReconnecting] = useState(false);
  const [pipActive, setPipActive] = useState(false);

  /** Pregunta al servidor si ESTA sala sigue LIVE. 'unknown' = sin respuesta (red). */
  const checkRoomAlive = useCallback(async (): Promise<'live' | 'ended' | 'unknown'> => {
    const accessToken = tokenRef.current;
    const currentRoomId = roomIdRef.current;
    if (!accessToken || !currentRoomId) return 'unknown';
    for (let attempt = 0; attempt < ROOM_ALIVE_CHECK_ATTEMPTS; attempt += 1) {
      try {
        const room = await getMyLiveRoom(accessToken);
        return room?.uuid === currentRoomId ? 'live' : 'ended';
      } catch {
        await new Promise<void>((resolve) => setTimeout(resolve, ROOM_ALIVE_CHECK_RETRY_MS));
      }
    }
    return 'unknown';
  }, []);

  /** El servidor ya cerró la sala (pasaron los 2 minutos): no hay nada que reconectar. */
  const handleLiveEnded = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    suspendedRef.current = false;
    setIvsReconnecting(false);
    disconnectPermanently();
    (ivsPublishing ? leaveIvsStage() : stopKinesisWebRTCMaster()).catch(() => {});
    appAlert(t('stream.sellerLiveEndedTitle'), t('stream.sellerLiveEndedBody'), [
      {
        text: t('stream.endedAccept'),
        // La pantalla tiene drawers (Modal nativo): desmontarla recién con el alert cerrado.
        onPress: () => runWhenAppAlertClosed(() => onEndStreamRef.current()),
      },
    ]);
  }, [disconnectPermanently, ivsPublishing, t]);

  /** La sala vive pero no hay forma de volver a publicar: cerrarla y salir con error. */
  const giveUpLive = useCallback(
    (message: string) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      suspendedRef.current = false;
      setIvsReconnecting(false);
      disconnectPermanently();
      (ivsPublishing ? leaveIvsStage() : stopKinesisWebRTCMaster()).catch(() => {});
      // Cerrarla ahora en vez de dejar que el grace la barra con los viewers
      // mirando una pausa que no vuelve.
      if (tokenRef.current && roomIdRef.current) {
        endStream(tokenRef.current, roomIdRef.current).catch(() => {});
      }
      setStreamError(message);
    },
    [disconnectPermanently, ivsPublishing],
  );

  const recoverIvsConnectionRef = useRef<() => Promise<void>>(async () => {});
  /** Stage caído con la app activa: confirmar con el servidor y reconectar con el mismo token. */
  const recoverIvsConnection = useCallback(async () => {
    if (ivsRecoveringRef.current || leavingRef.current || suspendedRef.current) return;
    ivsRecoveringRef.current = true;
    setIvsReconnecting(true);
    try {
      const alive = await checkRoomAlive();
      if (leavingRef.current || suspendedRef.current) return;
      if (alive === 'ended') {
        handleLiveEnded();
        return;
      }
      const publishToken = ivsPublishTokenRef.current;
      if (!publishToken || ivsRetryCountRef.current >= IVS_RECONNECT_MAX_ATTEMPTS) {
        giveUpLive(t('stream.sellerReconnectFailed'));
        return;
      }
      ivsRetryCountRef.current += 1;
      await new Promise<void>((resolve) =>
        setTimeout(resolve, IVS_RECONNECT_BASE_DELAY_MS * ivsRetryCountRef.current),
      );
      if (leavingRef.current || suspendedRef.current) return;
      await joinIvsStageAsPublisher(publishToken, {
        initialFacingMode: cameraPositionRef.current === 'front' ? 'user' : 'environment',
      });
      // El join arranca con cámara y mic abiertos: volver al estado que ve el comprador.
      await setIvsStageVideoEnabled(!isStreamPausedRef.current);
      await setIvsStageMicMuted(
        isMicMutedRef.current || isStreamPausedRef.current || micMutedByPauseRef.current,
      );
    } catch {
      // El join falló sin llegar a emitir DISCONNECTED: reintentar desde acá.
      setTimeout(() => {
        void recoverIvsConnectionRef.current();
      }, IVS_RECONNECT_BASE_DELAY_MS);
    } finally {
      ivsRecoveringRef.current = false;
    }
  }, [checkRoomAlive, giveUpLive, handleLiveEnded, t]);
  useEffect(() => {
    recoverIvsConnectionRef.current = recoverIvsConnection;
  }, [recoverIvsConnection]);

  /** Background: pausar por el mismo camino que el botón y cerrar el WS. */
  const suspendLive = useCallback(() => {
    if (suspendedRef.current || leavingRef.current) return;
    suspendedRef.current = true;
    ivsRetryCountRef.current = 0;
    setIvsReconnecting(false);
    // Solo si el vendedor no lo había pausado él (o todavía no lo había empezado):
    // al volver se reanuda únicamente lo que pausó el background.
    autoPausedRef.current = !isStreamPausedRef.current;
    if (autoPausedRef.current) {
      sendStreamPause();
      void setTransportVideoEnabled(false);
    }
    // Mismo flag que el botón: si el vendedor ya había pausado, no pisamos ni
    // restauramos el mic al volver (seguiría en pausa). Si el mute es nuestro,
    // muteMicForPause es idempotente.
    void muteMicForPause().catch(() => {});
    // Cerrar el WS (después de mandar la pausa) arranca el grace period en el
    // servidor: es lo que hace valer los 2 minutos también en Android, donde el
    // socket sobreviviría en background.
    setWsSuspended(true);
  }, [muteMicForPause, sendStreamPause, setTransportVideoEnabled]);

  const resumeLiveRef = useRef<() => Promise<void>>(async () => {});
  /** Vuelta a foreground: preguntar al servidor y recién ahí despausar. */
  const resumeLive = useCallback(async () => {
    if (!suspendedRef.current || leavingRef.current) return;
    const alive = await checkRoomAlive();
    if (!suspendedRef.current || leavingRef.current) return;
    if (alive === 'ended') {
      handleLiveEnded();
      return;
    }
    if (alive === 'unknown') {
      appAlert(t('stream.sellerCheckFailedTitle'), t('stream.sellerCheckFailedBody'), [
        {
          text: t('stream.endLiveCta'),
          style: 'cancel',
          onPress: () => runWhenAppAlertClosed(() => void confirmEndStream()),
        },
        {
          text: t('stream.sellerCheckRetry'),
          onPress: () => void resumeLiveRef.current(),
        },
      ]);
      return;
    }
    suspendedRef.current = false;
    setWsSuspended(false);
    if (autoPausedRef.current) {
      autoPausedRef.current = false;
      void setTransportVideoEnabled(true);
      void restoreMicAfterPause().catch(() => {});
      // El stream_resume sale apenas el WS reconecte (effect de abajo).
      pendingResumeRef.current = true;
      showToast(t('stream.sellerResumedAfterBackground'), 'info');
    }
    // Si el vendedor había pausado a mano, el mic sigue cerrado (el flag queda)
    // hasta handleStartLive / handleTogglePause. Restaurar acá reabriría el
    // audio en pausa.
    // Si el stage cayó mientras estábamos fuera, el listener no actuó: reconectar ahora.
    if (ivsPublishing && ivsStateRef.current === 'DISCONNECTED') {
      void recoverIvsConnection();
    }
  }, [
    checkRoomAlive,
    confirmEndStream,
    handleLiveEnded,
    ivsPublishing,
    recoverIvsConnection,
    restoreMicAfterPause,
    setTransportVideoEnabled,
    showToast,
    t,
  ]);
  useEffect(() => {
    resumeLiveRef.current = resumeLive;
  }, [resumeLive]);

  // stream_resume diferido: el WS se cerró en background (o es un vivo retomado)
  // y recién ahora conectó. El video/mic ya los restauró resumeLive (si la pausa
  // era automática); este effect solo avisa a los viewers.
  useEffect(() => {
    if (!isConnected || !pendingResumeRef.current) return;
    pendingResumeRef.current = false;
    sendStreamResume();
  }, [isConnected, sendStreamResume]);

  // Listener de AppState SOLO mientras se transmite: al salir del vivo se desmonta.
  // iOS pasa por 'inactive' antes de 'background' (centro de control, switcher):
  // solo 'background' pausa.
  useEffect(() => {
    if (!liveActive) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') suspendLive();
      else if (state === 'active') void resumeLive();
    });
    return () => sub.remove();
  }, [liveActive, resumeLive, suspendLive]);

  // El vendedor escucha su propia conexión al stage (antes solo lo hacía el viewer).
  useEffect(() => {
    if (!ivsPublishing) return;
    const unsubscribe = addIvsStageListeners({
      onConnectionState: (state) => {
        ivsStateRef.current = state;
        if (state === 'CONNECTED') {
          ivsRetryCountRef.current = 0;
          setIvsReconnecting(false);
          return;
        }
        // DISCONNECTED con o sin `error`: una caída limpia (red, background) no lo
        // trae. En background se resuelve al volver (resumeLive), no acá.
        if (state !== 'DISCONNECTED' || leavingRef.current || suspendedRef.current) return;
        void recoverIvsConnection();
      },
    });
    return unsubscribe;
  }, [ivsPublishing, recoverIvsConnection]);

  // Android: PiP con el vivo PAUSADO como recordatorio de "tenés un vivo abierto".
  // Solo con un vivo activo; al salir del vivo la activity vuelve a no entrar a PiP.
  // Entrar a PiP pasa la activity a onPause → AppState 'background' → suspendLive;
  // tocar la ventanita la expande → 'active' → resumeLive (mismo camino).
  useEffect(() => {
    if (!liveActive || !isLivePipSupported) return;
    void setLivePipEnabled(true);
    const unsubscribe = addLivePipListener(setPipActive);
    return () => {
      unsubscribe();
      setPipActive(false);
      void setLivePipEnabled(false);
    };
  }, [liveActive]);

  // Desmontar es una salida, no una caída: que una recuperación en vuelo no
  // vuelva a publicar al stage después de irse.
  useEffect(
    () => () => {
      leavingRef.current = true;
    },
    [],
  );

  /**
   * Flechas < > (tarea 17): mueven el producto en pantalla una posición dentro
   * del catálogo, con vuelta circular. Solo estado local — ver `selectedProductId`.
   */
  const stepProduct = useCallback(
    (direction: 1 | -1) => {
      if (catalogItems.length < 2) return;
      const currentId =
        selectedProductId ?? liveCommerce?.active_product?.uuid ?? null;
      const currentIndex = catalogItems.findIndex((it) => it.uuid === currentId);
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        (baseIndex + direction + catalogItems.length) % catalogItems.length;
      const target = catalogItems[nextIndex];
      if (target) setSelectedProductId(target.uuid);
    },
    [catalogItems, selectedProductId, liveCommerce?.active_product?.uuid],
  );

  const handlePrevProduct = useCallback(() => stepProduct(-1), [stepProduct]);
  const handleNextProduct = useCallback(() => stepProduct(1), [stepProduct]);

  /**
   * "Cancelar" (tareas 17/18): primero se PAUSA la oferta en el backend —reloj
   * congelado y pujas rechazadas desde ya— y recién entonces se abre el drawer
   * de motivos. Si la pausa falla (la oferta cerró justo antes), se avisa y no
   * se abre nada.
   */
  const openCancelFlow = useCallback(async () => {
    if (!token || !roomId || auctionActionPending) return;
    setAuctionActionPending(true);
    try {
      await pauseRoomAuction(token, roomId);
      setCancelDrawerVisible(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      showToast(msg, 'error');
      refreshLiveCommerce();
    } finally {
      setAuctionActionPending(false);
    }
  }, [token, roomId, auctionActionPending, showToast, refreshLiveCommerce, t]);

  /** Desistir de cancelar: cerrar el drawer reanuda desde el restante pausado. */
  const handleCancelDrawerClose = useCallback(() => {
    setCancelDrawerVisible(false);
    if (!token || !roomId) return;
    resumeRoomAuction(token, roomId).catch((err) => {
      // La subasta quedó pausada: con el toast alcanza porque "Cancelar" sigue
      // en pantalla y reintentar (pausa idempotente + resume) es un tap.
      const msg = err instanceof Error ? err.message : t('common.error');
      showToast(msg, 'error');
    });
  }, [token, roomId, showToast, t]);

  const handleConfirmCancelAuction = useCallback(
    async (reasonCode: AuctionCancelReasonCode, details: string) => {
      if (!token || !roomId) return;
      setCancelPending(true);
      try {
        await cancelRoomAuction(token, roomId, { reasonCode, details });
        // El WS (auction_cancelled) limpia la oferta en pantalla y muestra la
        // confirmación; acá solo se refresca el contexto de comercio.
        setCancelDrawerVisible(false);
        await refreshCatalog();
        refreshLiveCommerce();
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('common.error');
        showToast(msg, 'error');
      } finally {
        setCancelPending(false);
      }
    },
    [token, roomId, refreshCatalog, refreshLiveCommerce, showToast, t],
  );

  /** CTA central: inicia la oferta del producto visible o abre la cancelación. */
  const handlePrimaryAction = useCallback(() => {
    if (isStreamPaused) {
      showToast(t('stream.salesBlockedWhilePaused'), 'info');
      return;
    }
    if (hasLiveOffer) {
      void openCancelFlow();
      return;
    }
    const productId =
      selectedProductId ?? liveCommerce?.active_product?.uuid ?? null;
    if (!productId) return;
    // startProductById ya reporta sus propios errores con appAlert.
    void startProductById(productId);
  }, [
    isStreamPaused,
    hasLiveOffer,
    openCancelFlow,
    selectedProductId,
    liveCommerce?.active_product?.uuid,
    startProductById,
    showToast,
    t,
  ]);

  const handleToggleCamera = useCallback(async () => {
    const nextPosition = cameraPosition === 'front' ? 'back' : 'front';
    if (ivsPublishing) {
      try {
        await switchIvsStageCamera(nextPosition === 'front' ? 'user' : 'environment');
      } catch {
        appAlert(t('common.appName'), t('stream.flipCameraWebRtcHint'));
        return;
      }
    } else if (localWebRTCStream) {
      try {
        await switchKinesisWebRTCMasterCamera(nextPosition === 'front' ? 'user' : 'environment');
      } catch {
        appAlert(t('common.appName'), t('stream.flipCameraWebRtcHint'));
        return;
      }
    }
    setCameraPosition(nextPosition);
  }, [cameraPosition, localWebRTCStream, ivsPublishing, t]);

  /**
   * Producto que muestra el panel: el elegido con las flechas o, sin selección
   * local, el activo que resuelve el backend (primero del catálogo si no hay
   * nada corriendo). La navegación no toca el servidor, así que los datos del
   * elegido salen del catálogo ya cargado — sin requests ni cálculos extra por
   * producto (tarea 25: el vendedor jamás cotiza envío).
   */
  const activeProduct = liveCommerce?.active_product ?? null;
  const selectedCatalogItem =
    selectedProductId != null
      ? catalogItems.find((it) => it.uuid === selectedProductId) ?? null
      : null;
  const showsServerActive =
    selectedCatalogItem == null || selectedCatalogItem.uuid === activeProduct?.uuid;

  const productTitle =
    (showsServerActive ? activeProduct?.title?.trim() : selectedCatalogItem?.title?.trim()) ||
    resolvedStreamConfig.title?.trim() ||
    sellerProfile?.display_name ||
    user?.name ||
    '';
  const productImageUrls = showsServerActive
    ? activeProduct?.image_urls?.filter((u) => Boolean(u?.trim())) ??
      (resolvedStreamConfig.coverUrl ? [resolvedStreamConfig.coverUrl] : [])
    : selectedCatalogItem?.image_url?.trim()
      ? [selectedCatalogItem.image_url]
      : [];
  const catalogTotal = liveCommerce?.catalog_preview?.total_products_in_room ?? productImageUrls.length;
  const productExtraCount = Math.max(0, catalogTotal - Math.min(productImageUrls.length, 3));
  const productBasePriceCents = Math.max(
    (showsServerActive
      ? activeProduct?.base_price_cents
      : selectedCatalogItem?.base_price_cents) ?? 100,
    100,
  );
  const productCurrency =
    (showsServerActive ? activeProduct?.currency : selectedCatalogItem?.currency) ?? null;
  const displayedProductId = selectedCatalogItem?.uuid ?? activeProduct?.uuid ?? null;
  // `hasLiveOffer` en vez de `isAuctionActive`: durante la ventana de gracia la
  // oferta todavía puede reabrirse por una puja tardía, así que ni las flechas
  // ni un nuevo inicio se habilitan hasta que baje de pantalla.
  const productNavDisabled = hasLiveOffer || catalogItems.length < 2;
  /**
   * CTA central (Figma 1094-749): inicia la oferta del producto visible según el
   * modo elegido, o cancela la que corre (tarea 17). Durante la ventana de
   * gracia (0s pero reabrible) no hay nada que iniciar ni que cancelar.
   */
  const primaryIsCancel = hasLiveOffer;
  const primaryActionLabel = primaryIsCancel
    ? t('stream.cancelOfferCta')
    : t(
        saleMode === 'buy_now'
          ? 'stream.startBuyNowCta'
          : saleMode === 'raffle'
            ? 'stream.startRaffleCta'
            : 'stream.startAuctionCta',
      );
  const primaryActionDisabled = primaryIsCancel
    ? !isAuctionActive || auctionActionPending || cancelDrawerVisible
    : !displayedProductId || auctionActionPending;
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

  if (pipActive) {
    // Ventanita de PiP (Android): recordatorio, no transmisión. El vivo está
    // pausado y el mic silenciado; tocarla vuelve a la app y reanuda.
    return (
      <View style={styles.pipContainer}>
        <Text variant="body" className="text-white font-semibold text-center">
          {t('stream.sellerPipTitle')}
        </Text>
        <Text variant="caption" className="text-white/70 text-center">
          {t('stream.sellerPipHint')}
        </Text>
      </View>
    );
  }

  const activeDevice = device || (cameraPosition === 'front' ? backDevice : frontDevice);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {ivsPublishing ? (
        <View ref={streamViewRef} style={styles.camera} collapsable={false}>
          <IvsLocalPreviewView style={StyleSheet.absoluteFill} />
        </View>
      ) : localWebRTCStream ? (
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
      <AuctionWinnerOverlay winner={auctionWinner} currency={productCurrency} />
      <FloatingHeartsLayer likeEvents={likeEvents} onLikeDone={handleLikeDone} />
      <FloatingBidsLayer bidEvents={bidEvents} onBidDone={handleBidDone} />

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
        productCurrency={productCurrency}
        isAuctionActive={isAuctionActive}
        auctionSecondsRemaining={auctionSecondsRemaining}
        auctionBids={auctionBids}
        auctionWinnerUsername={auctionWinner?.username}
        auctionExtension={lastAuctionExtension}
        saleMode={offerSaleMode}
        buyNowPriceCents={auction?.priceCents ?? null}
        onEndStream={confirmEndStream}
        isStreamPaused={isStreamPaused}
        onTogglePause={handleTogglePause}
        hasStartedLive={hasStartedLive}
        onStartLive={handleStartLive}
        startLiveDisabled={startLivePending || !isPublishing}
        isMicMuted={isMicMuted}
        onToggleMic={handleToggleMic}
        onFlipCamera={handleToggleCamera}
        onOpenProductCatalog={openProductCatalog}
        onPrevProduct={handlePrevProduct}
        onNextProduct={handleNextProduct}
        productNavDisabled={productNavDisabled}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={handlePrimaryAction}
        primaryActionDisabled={primaryActionDisabled}
        primaryActionVariant={primaryIsCancel ? 'cancel' : 'start'}
        onAddPress={openAddProduct}
        onOpenNote={() => setNoteDrawerVisible(true)}
      />

      {/* Avisos del vivo con el look de la app (pausa/cancelación de subasta). */}
      <StreamToast
        message={toast}
        onDismiss={dismissToast}
        topOffset={Math.max(insets.top, 16) + 64}
      />

      {ivsReconnecting ? (
        <View
          style={[styles.reconnectPill, { top: Math.max(insets.top, 16) + 12 }]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <ActivityIndicator size="small" color="#ffffff" />
          <Text variant="body" className="text-white ml-2">
            {t('stream.sellerReconnecting')}
          </Text>
        </View>
      ) : null}

      {/* Tarea 18: el drawer abre con la subasta YA pausada (openCancelFlow);
          cerrarlo sin confirmar reanuda desde el restante congelado. */}
      <StreamAuctionCancelDrawer
        visible={cancelDrawerVisible}
        onClose={handleCancelDrawerClose}
        onConfirm={handleConfirmCancelAuction}
        confirmPending={cancelPending}
      />

      <StreamLiveNoteDrawer
        visible={noteDrawerVisible}
        onClose={() => {
          liveNote.clearError();
          setNoteDrawerVisible(false);
        }}
        mode="edit"
        note={liveNote.note}
        publishing={liveNote.publishing}
        error={liveNote.error}
        onPublish={async (text) => {
          const ok = await liveNote.publish(text);
          // Con error el drawer queda abierto mostrándolo, para no perder el borrador.
          if (ok) setNoteDrawerVisible(false);
        }}
      />

      <SellerAddProductTypeDrawer
        visible={addProductTypeVisible}
        onClose={() => setAddProductTypeVisible(false)}
        onSelectType={handleSelectProductListType}
      />

      <SellerAddProductDrawer
        visible={addProductVisible}
        onClose={closeAddProduct}
        roomId={roomId ?? ''}
        categoryUuid={resolvedStreamConfig.interestCategoryUuids?.[0] ?? null}
        saleFormat="individual"
        scope={pendingScope}
        defaultSaleMode={saleMode}
        onSaved={() => {
          refreshLiveCommerce();
          refreshCatalog().catch(() => {});
        }}
      />

      <StreamRoomProductsDrawer
        visible={productCatalogVisible}
        onClose={closeProductCatalog}
        loading={catalogLoading}
        items={productCards}
        errorMessage={catalogError}
        interactive
        saleMode={saleMode}
        onSaleModeChange={setSaleMode}
        onSelectProduct={handleSelectProduct}
        onStartProduct={isStreamPaused ? undefined : handleStartProduct}
        emptyLabel={
          catalogItems.length === 0
            ? t('stream.productsCatalogEmpty')
            : t('stream.productsCatalogEmptyFiltered')
        }
        onPinProduct={handlePinProduct}
        onAddProduct={() => {
          setProductCatalogVisible(false);
          openAddProductFlow();
        }}
      />

    </View>
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
  pipContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  reconnectPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 20,
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
});
