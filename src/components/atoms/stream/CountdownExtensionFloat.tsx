import React, { useEffect, useRef, useState } from 'react';
import { View, Text as RNText, StyleSheet, Animated } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from '../../molecules/stream/streamTokens';

/** Duración del vuelo del "+N" (ms). */
const FLOAT_DURATION = 1200;
/** Cuánto sube el globo antes de desvanecerse (px). */
const FLOAT_RISE = 34;
/** Tope de globos simultáneos: una ráfaga de pujas no debe tapar el reloj. */
const MAX_VISIBLE = 3;

export interface CountdownExtension {
  id: string;
  seconds: number;
}

const FloatingExtension: React.FC<{
  item: CountdownExtension & { index: number };
  onDone: (id: string) => void;
}> = ({ item, onDone }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: FLOAT_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone(item.id);
    });
  }, [item.id, onDone, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -FLOAT_RISE],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });
  // Un pequeño empujón inicial hace que el "+3" salte del reloj en vez de aparecer.
  const scale = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.7, 1.15, 1],
  });

  return (
    <Animated.View
      style={[
        styles.float,
        // Las extensiones encimadas se separan apenas para que se lean las dos.
        { right: item.index * 6, opacity, transform: [{ translateY }, { scale }] },
      ]}
      pointerEvents="none"
    >
      <RNText style={styles.text}>+{item.seconds}</RNText>
    </Animated.View>
  );
};

export interface CountdownExtensionFloatProps {
  /** Última extensión recibida. Al cambiar el `id` se dispara un globo nuevo. */
  extension?: CountdownExtension | null;
}

/**
 * "+N" verde que flota sobre la cuenta regresiva cuando una puja estira la
 * subasta. Se monta dentro de la columna del reloj (posición absoluta), así que
 * no mueve el layout del panel.
 *
 * Mantiene su propia cola: dos pujas seguidas muestran dos globos en lugar de
 * cortar la animación en curso.
 */
export const CountdownExtensionFloat: React.FC<CountdownExtensionFloatProps> = ({
  extension,
}) => {
  const [items, setItems] = useState<(CountdownExtension & { index: number })[]>([]);
  const lastIdRef = useRef<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!extension || extension.seconds <= 0) return;
    if (lastIdRef.current === extension.id) return;
    lastIdRef.current = extension.id;
    const index = seqRef.current++ % MAX_VISIBLE;
    setItems((prev) =>
      [...prev, { id: `${extension.id}-${seqRef.current}`, seconds: extension.seconds, index }]
        .slice(-MAX_VISIBLE)
    );
  }, [extension?.id, extension?.seconds]);

  const handleDone = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  if (items.length === 0) return null;

  return (
    <View style={styles.layer} pointerEvents="none">
      {items.map((item) => (
        <FloatingExtension key={item.id} item={item} onDone={handleDone} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    right: 0,
    // El reloj mide 28 de alto: el globo arranca pegado a su borde superior.
    bottom: 24,
    alignItems: 'flex-end',
  },
  float: {
    position: 'absolute',
    bottom: 0,
  },
  text: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: STREAM_COLORS.timeExtension,
    textAlign: 'right',
    includeFontPadding: false,
    // Legible sobre el video, sin caja que compita con el reloj.
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
