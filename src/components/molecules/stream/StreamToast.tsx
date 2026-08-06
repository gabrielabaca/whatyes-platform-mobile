/**
 * Avisos del vivo con el lenguaje visual de la app, en lugar del diálogo nativo
 * de `Alert.alert` (que corta el vivo, se ve como sistema operativo y obliga a
 * tocar "OK" para volver).
 *
 * Misma píldora oscura sobre el video que el banner de ganador
 * (`AuctionWinnerOverlay`), con el color de borde/ícono según el tono del aviso.
 * Se descarta solo y también al tocarlo.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text as RNText, StyleSheet, Animated, Pressable } from 'react-native';
import { CircleAlert, CircleCheck, Info, Zap } from 'lucide-react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from './streamTokens';

/** `race` = perdiste la carrera por un producto (compra directa). */
export type StreamToastTone = 'info' | 'success' | 'error' | 'race';

export interface StreamToastMessage {
  id: string;
  text: string;
  tone: StreamToastTone;
}

/** Cuánto queda en pantalla antes de irse solo. */
const VISIBLE_MS = 3200;
const FADE_MS = 220;

const TONE_STYLE: Record<
  StreamToastTone,
  { accent: string; Icon: typeof Info }
> = {
  info: { accent: STREAM_COLORS.primary, Icon: Info },
  success: { accent: STREAM_COLORS.timeExtension, Icon: CircleCheck },
  error: { accent: STREAM_COLORS.liveStop, Icon: CircleAlert },
  race: { accent: STREAM_COLORS.priceGold, Icon: Zap },
};

export interface StreamToastProps {
  message: StreamToastMessage | null;
  onDismiss: () => void;
  /** Separación desde arriba: deja el aviso bajo el header del vendedor. */
  topOffset?: number;
}

export const StreamToast: React.FC<StreamToastProps> = ({
  message,
  onDismiss,
  topOffset = 0,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, VISIBLE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [message?.id, anim, onDismiss]);

  if (!message) return null;

  const { accent, Icon } = TONE_STYLE[message.tone] ?? TONE_STYLE.info;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });

  return (
    <View style={[styles.layer, { top: topOffset }]} pointerEvents="box-none">
      <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
        <Pressable
          onPress={onDismiss}
          style={[styles.pill, { borderColor: accent }]}
          accessibilityRole="alert"
          accessibilityLabel={message.text}
          accessibilityLiveRegion="polite"
        >
          <Icon size={18} color={accent} />
          <RNText style={styles.text}>{message.text}</RNText>
        </Pressable>
      </Animated.View>
    </View>
  );
};

/**
 * Estado del aviso: reemplaza a `Alert.alert` en las pantallas del vivo.
 * Un solo aviso a la vez — el nuevo pisa al anterior, que es lo correcto acá:
 * el último es siempre el relevante (p. ej. el resultado de la compra).
 */
export function useStreamToast() {
  const [toast, setToast] = useState<StreamToastMessage | null>(null);
  const seqRef = useRef(0);

  const showToast = useCallback((text: string, tone: StreamToastTone = 'info') => {
    if (!text?.trim()) return;
    setToast({ id: `toast-${seqRef.current++}`, text: text.trim(), tone });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    // Sobre el overlay del vivo (zIndex 10) y bajo el festejo de ganador (100).
    zIndex: 60,
    elevation: 60,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    backgroundColor: 'rgba(6,4,20,0.88)',
    // Píldora exacta en una línea (10+20+10 = 40 de alto) y rectángulo redondeado
    // cuando el texto pasa a dos, donde un radio de 1000 se vería deforme.
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    flexShrink: 1,
    includeFontPadding: false,
  },
});
