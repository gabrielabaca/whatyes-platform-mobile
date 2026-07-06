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
import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { StreamScreen } from '../StreamScreen';
import { useStreamCredentialCache } from '../../../hooks/useStreamCredentialCache';
import { useBuyerLiveRoomPreviews } from '../../../hooks/useBuyerLiveRoomPreviews';
import { previewToStreamData } from '../../../utils/streamPreviewToStreamData';
import { getViewerTransport } from '../../../api/config';
import type { StreamData } from '../../molecules/StreamCard';
import type { StreamWebRTCCredentialsResponse } from '../../../api/platformApi';

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
  /** Creds pre-fetacheadas listas para el stream activo. Null si no están disponibles aún. */
  activeCreds: StreamWebRTCCredentialsResponse | null;
}

// ------------------------------------------------------------------
// Slide inactivo: portada + info del seller (sin conexión de video)
// ------------------------------------------------------------------
interface CoverSlideProps {
  stream: StreamData;
  height: number;
}

const CoverSlide = React.memo<CoverSlideProps>(({ stream, height }) => (
  <View style={[slideStyles.root, { height }]}>
    {stream.coverUrl ? (
      <Image
        source={{ uri: stream.coverUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
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
  const isWebRTC = getViewerTransport() === 'webrtc';
  const { prefetch, consume } = useStreamCredentialCache();

  // Lista de lives, refrescada con polling. Arranca con el snapshot recibido.
  const [liveStreams, setLiveStreams] = useState<StreamData[]>(streams);
  const { previews } = useBuyerLiveRoomPreviews({
    interestCategoryUuid: categoryUuid ?? null,
    pollIntervalMs: FEED_POLL_MS,
    lightweight: true,
  });

  const [slideState, setSlideState] = useState<SlideState>({
    currentIndex: initialIndex,
    activeCreds: null,
  });

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

  // Pre-fetchea las creds de los streams adyacentes al índice dado.
  const schedulePrefetch = useCallback(
    (index: number, list: StreamData[]) => {
      if (!isWebRTC) return;
      [index - 1, index + 1].forEach((i) => {
        if (i >= 0 && i < list.length) {
          void prefetch(list[i].id);
        }
      });
    },
    [prefetch, isWebRTC],
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
      // Consumir creds en el mismo setState para que el nuevo StreamScreen las reciba
      // en su primer render (evita un render intermedio sin creds).
      const creds = isWebRTC ? consume(target.id) : null;
      setSlideState({ currentIndex: newIndex, activeCreds: creds });
      schedulePrefetch(newIndex, liveStreams);
    },
    [windowHeight, slideState.currentIndex, isWebRTC, consume, liveStreams, schedulePrefetch],
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
              initialCreds={slideState.activeCreds}
            />
          </View>
        );
      }
      return <CoverSlide stream={item} height={windowHeight} />;
    },
    [slideState, windowHeight, onClose],
  );

  return (
    <FlatList
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
