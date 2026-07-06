import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StreamChatBubble } from '../../atoms/stream/StreamChatBubble';
import type { ChatMessage } from '../../../hooks/useStreamChat';

const VISIBLE_MESSAGES = 3;

export interface StreamChatOverlayProps {
  messages: ChatMessage[];
}

export const StreamChatOverlay: React.FC<StreamChatOverlayProps> = ({ messages }) => {
  const visible = messages.slice(-VISIBLE_MESSAGES);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {visible.map((msg) => (
        <StreamChatBubble key={msg.id} username={msg.username} message={msg.message} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
});
