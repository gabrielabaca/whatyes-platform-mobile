/**
 * Overlay que muestra el ganador de la subasta con efecto de confeti.
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Text } from '../../atoms/Text';
import type { AuctionWinner } from '../../../hooks/useStreamChat';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AuctionWinnerOverlayProps {
  winner: AuctionWinner | null;
}

export const AuctionWinnerOverlay: React.FC<AuctionWinnerOverlayProps> = ({ winner }) => {
  if (!winner) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <ConfettiCannon
        count={150}
        origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 }}
        explosionSpeed={400}
        fallSpeed={3500}
        fadeOut
        colors={['#22c55e', '#f59e0b', '#0284c7', '#ef4444', '#ffffff', '#a855f7']}
        autoStart
      />
      <View style={styles.card}>
        <Text variant="h2" className="text-white text-center mb-1">
          ¡Ganador!
        </Text>
        <Text variant="h3" className="text-white font-bold text-center mb-2">
          {winner.username}
        </Text>
        <Text variant="body" className="text-white/90 text-center">
          ${winner.amount}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    padding: 24,
    minWidth: 200,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
});
