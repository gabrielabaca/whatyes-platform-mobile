/**
 * Aviso de ganador para los ESPECTADORES: banner compacto que no tapa el show.
 * El ganador ve el festejo a pantalla completa (AuctionWinnerCelebration).
 */
import React from 'react';
import { View, StyleSheet, Dimensions, Text as RNText } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useTranslation } from 'react-i18next';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { FONT_FAMILY } from '../../../theme/typography';
import type { AuctionWinner } from '../../../hooks/useStreamChat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AuctionWinnerOverlayProps {
  winner: AuctionWinner | null;
}

export const AuctionWinnerOverlay: React.FC<AuctionWinnerOverlayProps> = ({ winner }) => {
  const { t } = useTranslation();
  if (!winner) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <ConfettiCannon
        count={70}
        origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
        explosionSpeed={380}
        fallSpeed={2800}
        fadeOut
        colors={['#FFC900', '#685CF0', '#FFFFFF', '#00C566']}
        autoStart
      />
      <View style={styles.banner}>
        <RNText style={styles.text} numberOfLines={1}>
          🏆{' '}
          <RNText style={styles.name}>{winner.username}</RNText>{' '}
          {t('stream.winnerBannerWon')}{' '}
          <RNText style={styles.amount}>{formatStreamPrice(winner.amount)}</RNText>
        </RNText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '30%',
    zIndex: 100,
  },
  banner: {
    maxWidth: '86%',
    backgroundColor: 'rgba(6,4,20,0.88)',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: '#FFC900',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    includeFontPadding: false,
  },
  name: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFFFFF',
  },
  amount: {
    fontFamily: FONT_FAMILY.bold,
    color: '#FFC900',
  },
});
