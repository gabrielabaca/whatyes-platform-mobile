/**
 * Splash / Loading Screen animado.
 *
 * El primer frame calca el launch screen nativo (LaunchScreen.storyboard /
 * activity_splash.xml): fondo plano #685CF0, el mismo PNG del pulpo + wordmark
 * a 200dp centrado y la versión abajo. Así la transición nativo → JS es
 * invisible, y desde ese estado arrancan las animaciones: burbujas subiendo y
 * "nado" continuo del logo. Usa Animated con native driver (sin dependencias).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Platform,
  useWindowDimensions,
  Text as RNText,
} from 'react-native';
import { version as appVersion } from '../../../../package.json';
import PulpoLogo from '../../../../assets/images/pulpo.svg';

const PRIMARY = '#685CF0';
const WHITE = '#FEFEFE';
const BUBBLE_COUNT = 26;
/** Tamaño del pulpo calcado del splash nativo (172×157px del PNG a escala 200dp). */
const OCTOPUS_WIDTH = 122;
const OCTOPUS_HEIGHT = 112;
/** Separación pulpo → wordmark en el splash nativo (31px ≈ 22dp). */
const LOGO_TEXT_GAP = 22;
/** Alto aproximado de la fila de versión del splash nativo de Android
 * (paddingTop 16 + texto + paddingBottom 40): compensa el centrado del logo. */
const ANDROID_VERSION_ROW_H = 75;

interface BubbleConfig {
  size: number;
  /** Posición horizontal (0..1 del ancho de pantalla). */
  x: number;
  /** Vaivén horizontal en px (positivo o negativo). */
  sway: number;
  durationMs: number;
  delayMs: number;
  maxOpacity: number;
}

function makeBubbles(count: number): BubbleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    size: 10 + Math.random() * 44,
    x: (i + Math.random()) / count,
    sway: (Math.random() - 0.5) * 60,
    durationMs: 2600 + Math.random() * 3000,
    delayMs: Math.random() * 2200,
    maxOpacity: 0.18 + Math.random() * 0.3,
  }));
}

const Bubble: React.FC<{ config: BubbleConfig; screenHeight: number; screenWidth: number }> = ({
  config,
  screenHeight,
  screenWidth,
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delayMs),
        Animated.timing(progress, {
          toValue: 1,
          duration: config.durationMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Reinicia instantáneamente para volver a subir desde abajo.
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, config.delayMs, config.durationMs]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight + config.size, -config.size * 2],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, config.sway, 0, -config.sway, 0],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.75, 1],
    outputRange: [0, config.maxOpacity, config.maxOpacity * 0.8, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          left: config.x * screenWidth - config.size / 2,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    />
  );
};

export const LoadingScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const bubbles = useMemo(() => makeBubbles(BUBBLE_COUNT), []);

  // Pulpo y wordmark arrancan visibles y quietos (idéntico al splash nativo) y
  // desde ahí cada uno "nada" por separado: siempre partiendo de 0 para que la
  // transición nativo → JS no salte.
  const logoFloat = useRef(new Animated.Value(0)).current;
  const textFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeFloatLoop = (value: Animated.Value, halfCycleMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: halfCycleMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: -1,
            duration: halfCycleMs * 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: halfCycleMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    // Ciclos distintos: el texto flota más lento y desfasado respecto al pulpo,
    // así se perciben como piezas independientes.
    const logoLoop = makeFloatLoop(logoFloat, 1600);
    const textLoop = makeFloatLoop(textFloat, 2300);
    logoLoop.start();
    textLoop.start();
    return () => {
      logoLoop.stop();
      textLoop.stop();
    };
  }, [logoFloat, textFloat]);

  const logoTranslateY = logoFloat.interpolate({
    inputRange: [-1, 1],
    outputRange: [10, -12],
  });
  const logoRotate = logoFloat.interpolate({
    inputRange: [-1, 1],
    outputRange: ['3deg', '-3deg'],
  });
  const logoScale = logoFloat.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.98, 1, 1.03],
  });

  // El wordmark se mueve menos y sin rotación: flota "a contracorriente".
  const textTranslateY = textFloat.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6],
  });
  const textScale = textFloat.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1.01, 1, 0.99],
  });

  return (
    <View style={styles.root}>
      {bubbles.map((config, idx) => (
        <Bubble key={idx} config={config} screenHeight={height} screenWidth={width} />
      ))}

      <View style={styles.center} pointerEvents="none">
        <View style={styles.logoBlock}>
          <Animated.View
            style={{
              transform: [
                { translateY: logoTranslateY },
                { rotate: logoRotate },
                { scale: logoScale },
              ],
            }}
          >
            <PulpoLogo width={OCTOPUS_WIDTH} height={OCTOPUS_HEIGHT} />
          </Animated.View>
          <Animated.View
            style={{
              transform: [{ translateY: textTranslateY }, { scale: textScale }],
            }}
          >
            <RNText style={styles.wordmark}>PulpoLive</RNText>
          </Animated.View>
        </View>
      </View>

      <RNText style={styles.version}>{`V${appVersion}`}</RNText>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PRIMARY,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
    gap: LOGO_TEXT_GAP,
    // Android centra el logo en (pantalla - fila de versión); iOS lo centra
    // en pantalla completa. Compensar para calcar cada plataforma.
    ...(Platform.OS === 'android' ? { marginBottom: ANDROID_VERSION_ROW_H } : null),
  },
  wordmark: {
    // Spec Figma: Plus Jakarta Sans Bold 29.387px, Additional-Colors-White.
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 29.387,
    color: WHITE,
    includeFontPadding: false,
  },
  version: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
