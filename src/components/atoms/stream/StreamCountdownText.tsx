import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';

export interface StreamCountdownTextProps {
  seconds: number | null;
}

export function formatCountdown(seconds: number | null): string {
  if (seconds === null || seconds < 0) {
    return '--:--';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const StreamCountdownText: React.FC<StreamCountdownTextProps> = ({ seconds }) => (
  <RNText style={styles.text}>{formatCountdown(seconds)}</RNText>
);

const styles = StyleSheet.create({
  text: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: STREAM_COLORS.white,
    textAlign: 'right',
    includeFontPadding: false,
  },
});
