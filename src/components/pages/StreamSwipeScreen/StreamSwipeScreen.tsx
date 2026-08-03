/**
 * StreamSwipeScreen — contenedor de swipe vertical entre lives (estilo TikTok).
 *
 * Estrategia de rendimiento (Opción 2):
 *  - Un solo StreamScreen activo a la vez (sin conexiones WebRTC simultáneas).
 *  - Pre-fetch HTTP de credenciales para los streams N-1 y N+1 mientras se ve N.
 *  - Al swipear, el nuevo StreamScreen recibe las creds ya listas → ahorra el round-trip.
 *  - Los slides inactivos muestran solo el cover + info (sin video ni conexión).
 *
 * Lista viva: el snapshot inicial (props) se mantiene fresco con polling de GET /rooms.
 * La reconciliación es append-only (nunca remueve ni reordena) para no desplazar el scroll:
 * los lives nuevos aparecen al final, de modo que el usuario siempre puede seguir swipeando
 * hacia el "siguiente disponible". Un live que terminó queda en la lista pero al entrar
 * muestra el estado de error/reintento de StreamScreen.
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  useWindowDimensions,
  StyleSheet,
  Image,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ListRenderItemInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../../atoms/Text';
import { StreamScreen, type StreamEndedFeedContext } from '../StreamScreen';
import { useStreamCredentialCache } from '../../../hooks/useStreamCredentialCache';
import { useBuyerLiveRoomPreviews } from '../../../hooks/useBuyerLiveRoomPreviews';
import { previewToStreamData } from '../../../utils/streamPreviewToStreamData';
import { getViewerTransport } from '../../../api/config';
import type { StreamData } from '../../molecules/StreamCard';
import type { StreamWatchResponse } from '../../../api/platformApi';
import {
  startIvsStagePreview,
  stopIvsStagePreview,
  IvsPreviewVideoView,
} from '../../../native/IvsStageNative';

/** Frecuencia de refresco de la lista de lives dentro del feed de swipe. */
const FEED_POLL_MS = 8000;

export interface StreamSwipeScreenProps {
  streams: StreamData[];
  initialIndex: number;
  /** Categoría activa con la que el usuario entró al feed (mantiene el mismo filtro). */
  categoryUuid?: string;
  onClose: () => void;
}

interface SlideState {
  currentIndex: number;
  /** Decisión de transporte pre-fetcheada para el stream activo (ivs/webrtc/hls). */
  activeWatch: StreamWatchResponse | null;
}

// ------------------------------------------------------------------
// Slide inactivo: portada + info del seller (sin conexión de video)
// ------------------------------------------------------------------
interface CoverSlideProps {
  stream: StreamData;
  height: number;
  /** El stage de este slide está precalentado: mostrar el video real (sin audio)
   *  detrás de la info mientras el usuario arrastra hacia acá. */
  livePreviewActive?: boolean;
}

const CoverSlide = React.memo<CoverSlideProps>(({ stream, height, livePreviewActive }) => (
  <View style={[slideStyles.root, { height }]}>
    {stream.coverUrl ? (
      <Image
        source={{ uri: stream.coverUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    ) : null}
    {livePreviewActive ? (
      <IvsPreviewVideoView style={StyleSheet.absoluteFill} pointerEvents="none" />
    ) : null}
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={slideStyles.dimOverlay} />
    </View>
    <View style={slideStyles.info}>
      <Text variant="h3" className="text-white font-bold mb-1">
        {stream.sellerName}
      </Text>
      {stream.title ? (
        <Text variant="body" className="text-white/80">
          {stream.title}
        </Text>
      ) : null}
    </View>
  </View>
));

const slideStyles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: '#111',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  info: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
  },
});

// ------------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------------
export const StreamSwipeScreen: React.FC<StreamSwipeScreenProps> = ({
  streams,
  initialIndex,
  categoryUuid,
  onClose,
}) => {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  // Con HLS forzado por env no hay nada que pre-fetchear (sin creds ni tokens).
  const canPrefetch = getViewerTransport() !== 'hls';
  const { prefetch, consume, peek } = useStreamCredentialCache();

  // Lista de lives, refrescada con polling. Arranca con el snapshot recibido.
  const [liveStreams, setLiveStreams] = useState<StreamData[]>(streams);
  const { previews } = useBuyerLiveRoomPreviews({
    interestCategoryUuid: categoryUuid ?? null,
    pollIntervalMs: FEED_POLL_MS,
    lightweight: true,
  });

  const [slideState, setSlideState] = useState<SlideState>({
    currentIndex: initialIndex,
    activeWatch: null,
  });
  const flatListRef = useRef<FlatList<StreamData>>(null);

  // Reconciliación append-only: agrega lives nuevos al final, nunca remueve ni reordena
  // (remover/reordenar desplazaría el scroll del usuario). Devuelve la misma referencia
  // si no hay altas, para no re-renderizar el FlatList en cada poll.
  useEffect(() => {
    if (!previews.length) return;
    setLiveStreams((prev) => {
      const known = new Set(prev.map((s) => s.id));
      const additions = previews
        .filter((p) => !known.has(p.id))
        .map((p) => previewToStreamData(p, t('home.liveBadge')));
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
  }, [previews, t]);

  // El stage precalentado del slide siguiente (video real durante el drag y
  // promoción instantánea al swipear). Solo informativo para el CoverSlide.
  const [previewRoomId, setPreviewRoomId] = useState<string | null>(null);
  // Generación del warmup: invalida warmups en vuelo cuando el usuario ya
  // volvió a swipear (un warmup viejo no debe pisar al preview vigente).
  const warmupGenRef = useRef(0);

  // Pre-fetchea las creds de los streams adyacentes al índice dado y precalienta
  // el stage IVS del SIGUIENTE (audio en gain 0; joinAsViewer lo promueve al swipear).
  const schedulePrefetch = useCallback(
    (index: number, list: StreamData[]) => {
      if (!canPrefetch) return;
      [index - 1, index + 1].forEach((i) => {
        if (i >= 0 && i < list.length) {
          void prefetch(list[i].id);
        }
      });
      const generation = ++warmupGenRef.current;
      const next = list[index + 1];
      if (!next) {
        setPreviewRoomId(null);
        void stopIvsStagePreview();
        return;
      }
      void (async () => {
        // Dar aire a la promoción del slide recién activado antes de tocar el
        // slot de preview (joinAsViewer promueve en el commit del render).
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 600));
        await prefetch(next.id);
        if (warmupGenRef.current !== generation) return;
        const watch = peek(next.id);
        if (watch?.transport === 'ivs' && watch.ivs?.token) {
          try {
            await startIvsStagePreview(watch.ivs.token);
            if (warmupGenRef.current === generation) setPreviewRoomId(next.id);
          } catch {
            if (warmupGenRef.current === generation) setPreviewRoomId(null);
          }
        } else {
          setPreviewRoomId(null);
          void stopIvsStagePreview();
        }
      })();
    },
    [prefetch, peek, canPrefetch],
  );

  // Soltar el stage precalentado al salir del feed.
  useEffect(() => {
    return () => {
      void stopIvsStagePreview();
    };
  }, []);

  const handleNavigateToStream = useCallback(
    (index: number, streamId: string) => {
      const watch = canPrefetch ? consume(streamId) : null;
      setSlideState({ currentIndex: index, activeWatch: watch });
      schedulePrefetch(index, liveStreams);
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({ index, animated: false });
      });
    },
    [consume, canPrefetch, liveStreams, schedulePrefetch]
  );

  const endedFeedContext = useMemo<StreamEndedFeedContext>(
    () => ({
      streams: liveStreams,
      currentIndex: slideState.currentIndex,
      categoryUuid,
      onNavigateToStream: handleNavigateToStream,
      onLeaveFeed: onClose,
    }),
    [liveStreams, slideState.currentIndex, categoryUuid, handleNavigateToStream, onClose]
  );

  // Pre-fetch inicial al montar (N-1 y N+1 del stream de entrada).
  useEffect(() => {
    schedulePrefetch(initialIndex, streams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.y / windowHeight);
      if (newIndex === slideState.currentIndex) return;
      const target = liveStreams[newIndex];
      if (!target) return;
      // Consumir la decisión en el mismo setState para que el nuevo StreamScreen la
      // reciba en su primer render (evita un render intermedio sin transporte).
      const watch = canPrefetch ? consume(target.id) : null;
      setSlideState({ currentIndex: newIndex, activeWatch: watch });
      schedulePrefetch(newIndex, liveStreams);
    },
    [windowHeight, slideState.currentIndex, canPrefetch, consume, liveStreams, schedulePrefetch],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<StreamData> | null | undefined, index: number) => ({
      length: windowHeight,
      offset: windowHeight * index,
      index,
    }),
    [windowHeight],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<StreamData>) => {
      if (index === slideState.currentIndex) {
        return (
          <View style={{ height: windowHeight }}>
            <StreamScreen
              stream={item}
              onClose={onClose}
              initialWatch={slideState.activeWatch}
              endedFeedContext={endedFeedContext}
            />
          </View>
        );
      }
      return (
        <CoverSlide
          stream={item}
          height={windowHeight}
          livePreviewActive={previewRoomId === item.id}
        />
      );
    },
    [slideState, windowHeight, onClose, endedFeedContext, previewRoomId],
  );

  return (
    <FlatList
      ref={flatListRef}
      data={liveStreams}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      extraData={slideState}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      initialScrollIndex={initialIndex}
      getItemLayout={getItemLayout}
      onMomentumScrollEnd={onMomentumScrollEnd}
      windowSize={3}
      maxToRenderPerBatch={3}
      removeClippedSubviews={false}
      style={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#000',
  },
});
