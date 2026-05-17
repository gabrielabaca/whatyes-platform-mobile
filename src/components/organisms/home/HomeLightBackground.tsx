import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { themeColors } from '../../../theme/colors';

/** Figma 566-3737 — gradiente vertical del home (comprador y vendedor). */
export const HomeLightBackground: React.FC = () => (
  <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Defs>
      <LinearGradient id="home-light-bg" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={themeColors.home.gradientTop} />
        <Stop offset="1" stopColor={themeColors.home.gradientBottom} />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#home-light-bg)" />
  </Svg>
);
