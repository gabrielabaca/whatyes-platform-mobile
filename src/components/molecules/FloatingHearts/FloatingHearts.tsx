/**
 * Muestra las reacciones (likes) de los participantes como corazones flotantes.
 * Visible para seller y viewers.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Heart } from 'lucide-react-native';
import { Text } from '../../atoms/Text';

export type LikeEvent = {
  id: string;
  username: string;
  offset: number;
};

const FloatingHeart: React.FC<{
  event: LikeEvent;
  onDone: (id: string) => void;
}> = ({ event, onDone }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone(event.id);
    });
  }, [event.id, onDone, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  return (
    <Animated.View
      style={[
        styles.floatingHeart,
        {
          right: 16 + event.offset,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Heart size={18} color="#ff4d6d" fill="#ff4d6d" />
      <Text style={styles.likeLabel}>{event.username}</Text>
    </Animated.View>
  );
};

/**
 * Hook para usar con useStreamChat - devuelve el handler onLike y los eventos para renderizar.
 */
export function useFloatingHearts() {
  const [likeEvents, setLikeEvents] = useState<LikeEvent[]>([]);
  const likeSeqRef = useRef(0);

  const handleLikeDone = useCallback((id: string) => {
    setLikeEvents((prev) => prev.filter((event) => event.id !== id));
  }, []);

  const handleLikeEvent = useCallback((like: { username?: string }) => {
    const username = (like.username || 'Alguien').trim() || 'Alguien';
    const id = `${Date.now()}-${likeSeqRef.current++}`;
    const offset = Math.floor(Math.random() * 40);
    setLikeEvents((prev) => [...prev, { id, username, offset }].slice(-6));
  }, []);

  return { likeEvents, handleLikeDone, handleLikeEvent };
}

interface FloatingHeartsLayerProps {
  likeEvents: LikeEvent[];
  onLikeDone: (id: string) => void;
}

export const FloatingHeartsLayer: React.FC<FloatingHeartsLayerProps> = ({
  likeEvents,
  onLikeDone,
}) => (
  <View pointerEvents="none" style={styles.container}>
    {likeEvents.map((event) => (
      <FloatingHeart key={event.id} event={event} onDone={onLikeDone} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 0,
    height: 180,
    zIndex: 5,
  },
  floatingHeart: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
  likeLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
