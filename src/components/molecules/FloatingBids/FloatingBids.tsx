/**
 * Muestra cada nueva puja de una subasta como un "globo" flotante (estilo corazones de like),
 * en lugar de meterla en el chat. Visible para seller y viewers.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Gavel } from 'lucide-react-native';
import { Text } from '../../atoms/Text';
import type { AuctionBid } from '../../../hooks/useStreamChat';

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
        duration: 1700,
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
      <Gavel size={16} color="#FDC700" />
      <Text style={styles.bidUser} numberOfLines={1}>
        {event.username}
      </Text>
      <Text style={styles.bidAmount}>${event.amount}</Text>
    </Animated.View>
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
  <View pointerEvents="none" style={styles.container}>
    {bidEvents.map((event) => (
      <FloatingBid key={event.id} event={event} onDone={onBidDone} />
    ))}
  </View>
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
