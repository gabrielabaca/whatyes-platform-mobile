/**
 * Cada puja nueva de la subasta se muestra fuera del chat, en dos capas:
 *
 *  - un globo con quién ofertó y cuánto, y
 *  - una bandada de pulpitos que suben de abajo hacia arriba como burbujas.
 *
 * Las pujas llegan por WS, así que lo ven todos: vendedor y viewers, incluido
 * quien ofertó. Este es el festejo de la oferta: por eso la barra de puja
 * confirma y vuelve al instante, sin animación propia que retrase la siguiente.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { PulpoLogo } from '../../atoms/stream/PulpoLogo';
import { Text } from '../../atoms/Text';
import type { AuctionBid } from '../../../hooks/useStreamChat';

/** Vida del globo; las burbujas se quedan dentro de esta ventana para no
 *  cortarse cuando el evento se saca de la lista. */
const BID_LIFETIME_MS = 1700;
/** Pulpitos por puja. */
const BUBBLE_COUNT = 6;

export type BidEvent = {
  id: string;
  username: string;
  amount: number;
  offset: number;
};

const FloatingBid: React.FC<{
  event: BidEvent;
  onDone: (id: string) => void;
}> = ({ event, onDone }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: BID_LIFETIME_MS,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 140 }),
      ]),
    ]).start(({ finished }) => {
      if (finished) onDone(event.id);
    });
  }, [event.id, onDone, progress, pop]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -150],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [1, 1, 0],
  });
  const scale = pop.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <Animated.View
      style={[
        styles.floatingBid,
        {
          right: 16 + event.offset,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Text style={styles.bidUser} numberOfLines={1}>
        {event.username}
      </Text>
      <Text style={styles.bidAmount}>${event.amount}</Text>
    </Animated.View>
  );
};

type Bubble = {
  key: string;
  size: number;
  delay: number;
  duration: number;
  /** Distancia al borde derecho desde donde arranca la burbuja. */
  right: number;
  /** Deriva horizontal mientras sube (px, puede ser negativa). */
  drift: number;
  /** Altura del recorrido (px). */
  rise: number;
  /** Sentido del bamboleo. */
  spin: number;
};

/** Un pulpito subiendo: aparece abajo, deriva a los costados y se desvanece. */
const PulpoBubble: React.FC<{ bubble: Bubble }> = ({ bubble }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      delay: bubble.delay,
      duration: bubble.duration,
      useNativeDriver: true,
    }).start();
  }, [bubble.delay, bubble.duration, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -bubble.rise],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [0, bubble.drift, -bubble.drift * 0.6, bubble.drift * 0.3],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.4, 1, 0.85],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', `${12 * bubble.spin}deg`, `${-10 * bubble.spin}deg`],
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          right: bubble.right,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }, { rotate }],
        },
      ]}
    >
      <PulpoLogo size={bubble.size} />
    </Animated.View>
  );
};

/** Bandada de pulpitos que sale con cada puja. */
const PulpoBubbles: React.FC<{ event: BidEvent }> = ({ event }) => {
  const bubbles = useMemo<Bubble[]>(
    () =>
      Array.from({ length: BUBBLE_COUNT }, (_, i) => {
        const delay = Math.round(Math.random() * 260);
        return {
          key: `${event.id}-pulpo-${i}`,
          size: 18 + Math.round(Math.random() * 14),
          delay,
          // Todo termina dentro de la vida del evento: si no, el desmontaje
          // cortaría las burbujas más lentas a mitad de camino.
          duration: BID_LIFETIME_MS - delay,
          right: 12 + Math.round(Math.random() * 110),
          drift: 10 + Math.round(Math.random() * 26),
          rise: 170 + Math.round(Math.random() * 110),
          spin: i % 2 === 0 ? 1 : -1,
        };
      }),
    [event.id]
  );

  return (
    <>
      {bubbles.map((bubble) => (
        <PulpoBubble key={bubble.key} bubble={bubble} />
      ))}
    </>
  );
};

/**
 * Hook que observa la lista de pujas y emite un evento flotante por cada puja nueva.
 */
export function useFloatingBids(auctionBids: AuctionBid[]) {
  const [bidEvents, setBidEvents] = useState<BidEvent[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const seqRef = useRef(0);

  const handleBidDone = useCallback((id: string) => {
    setBidEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  useEffect(() => {
    // Primera carga: marcar las pujas existentes como vistas sin animarlas.
    if (seenIdsRef.current.size === 0 && auctionBids.length > 0) {
      auctionBids.forEach((b) => seenIdsRef.current.add(b.id));
      return;
    }
    const fresh = auctionBids.filter((b) => !seenIdsRef.current.has(b.id));
    if (fresh.length === 0) return;
    const newEvents: BidEvent[] = fresh.map((b) => {
      seenIdsRef.current.add(b.id);
      return {
        id: `${b.id}-${seqRef.current++}`,
        username: (b.username || 'Alguien').trim() || 'Alguien',
        amount: b.amount,
        offset: Math.floor(Math.random() * 40),
      };
    });
    setBidEvents((prev) => [...prev, ...newEvents].slice(-6));
  }, [auctionBids]);

  return { bidEvents, handleBidDone };
}

interface FloatingBidsLayerProps {
  bidEvents: BidEvent[];
  onBidDone: (id: string) => void;
}

export const FloatingBidsLayer: React.FC<FloatingBidsLayerProps> = ({ bidEvents, onBidDone }) => (
  <>
    {/* Los pulpitos nacen más abajo que el globo (a la altura de la barra de
        puja) y lo cruzan al subir, así que van en su propia capa detrás. */}
    <View pointerEvents="none" style={styles.bubbleContainer}>
      {bidEvents.map((event) => (
        <PulpoBubbles key={`pulpos-${event.id}`} event={event} />
      ))}
    </View>
    <View pointerEvents="none" style={styles.container}>
      {bidEvents.map((event) => (
        <FloatingBid key={event.id} event={event} onDone={onBidDone} />
      ))}
    </View>
  </>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    bottom: Platform.OS === 'ios' ? 200 : 180,
    left: 0,
    height: 200,
    zIndex: 6,
  },
  bubbleContainer: {
    position: 'absolute',
    right: 0,
    left: 0,
    bottom: Platform.OS === 'ios' ? 130 : 110,
    height: 320,
    zIndex: 5,
  },
  bubble: {
    position: 'absolute',
    bottom: 0,
  },
  floatingBid: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(253,199,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    maxWidth: 200,
  },
  bidUser: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  bidAmount: {
    color: '#FDC700',
    fontSize: 13,
    fontWeight: '800',
  },
});
