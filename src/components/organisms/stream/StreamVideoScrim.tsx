import React from 'react';
import { View, StyleSheet } from 'react-native';

/** Oscurece levemente el video para legibilidad del UI */
export const StreamVideoScrim: React.FC = () => (
  <View style={styles.scrim} pointerEvents="none" />
);

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 2,
    elevation: 2,
  },
});
