import React from 'react';
import { View, Text as RNText, StyleSheet } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS, STREAM_RADIUS } from '../../molecules/stream/streamTokens';

export interface StreamChatBubbleProps {
  username: string;
  message: string;
}

export const StreamChatBubble: React.FC<StreamChatBubbleProps> = ({ username, message }) => (
  <View style={styles.bubble}>
    <RNText style={styles.text} numberOfLines={2}>
      <RNText style={styles.username}>{username}: </RNText>
      {message}
    </RNText>
  </View>
);

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: STREAM_COLORS.pillOverlay,
    borderRadius: STREAM_RADIUS.bubble,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  text: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  username: {
    fontFamily: FONT_FAMILY.semibold,
  },
});
