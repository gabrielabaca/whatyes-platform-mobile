/**
 * Aviso emergente dentro de la app: mensaje o notificación que llega mientras el
 * usuario está usando la app.
 *
 * Sin esto lo único que cambiaba era el badge del header, que es fácil de pasar
 * por alto: el usuario se enteraba recién al entrar a Chat o Notificaciones.
 * Acá el aviso aparece arriba, se puede tocar para ir al lugar correspondiente y
 * se va solo.
 *
 * Es el equivalente de `StreamToast` fuera del vivo: mismo rol, pero con la
 * superficie clara/oscura de la app en vez de la píldora sobre el video.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text as RNText,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, MessageCircle } from 'lucide-react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';

export type AppHeadsUpKind = 'chat' | 'notification';

export interface AppHeadsUpMessage {
  id: string;
  kind: AppHeadsUpKind;
  title: string;
  body?: string | null;
}

/** Cuánto queda en pantalla antes de irse solo. */
const VISIBLE_MS = 4000;
const ANIM_MS = 240;

export interface AppHeadsUpProps {
  message: AppHeadsUpMessage | null;
  /** Tocar el aviso: lleva a Chat o a Notificaciones según el tipo. */
  onPress: (message: AppHeadsUpMessage) => void;
  onDismiss: () => void;
}

export const AppHeadsUp: React.FC<AppHeadsUpProps> = ({ message, onPress, onDismiss }) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(
    (after: () => void) => {
      Animated.timing(anim, {
        toValue: 0,
        duration: ANIM_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) after();
      });
    },
    [anim]
  );

  useEffect(() => {
    if (!message) return;
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();

    timerRef.current = setTimeout(() => hide(onDismiss), VISIBLE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [message?.id, anim, hide, onDismiss]);

  if (!message) return null;

  const palette = isDark ? themeColors.dark : themeColors.light;
  const Icon = message.kind === 'chat' ? MessageCircle : Bell;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  return (
    <View
      style={[styles.layer, { top: Math.max(insets.top, 12) + 4 }]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={{ opacity: anim, transform: [{ translateY }] }}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => hide(() => onPress(message))}
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.borderSubtle,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${message.title}. ${message.body ?? ''}`.trim()}
          accessibilityLiveRegion="polite"
        >
          <View style={[styles.iconWrap, { backgroundColor: themeColors.primaryTint }]}>
            <Icon size={20} color={themeColors.primary} />
          </View>
          <View style={styles.texts}>
            <RNText style={[styles.title, { color: palette.text }]} numberOfLines={1}>
              {message.title}
            </RNText>
            {message.body?.trim() ? (
              <RNText
                style={[styles.body, { color: palette.textSecondary }]}
                numberOfLines={2}
              >
                {message.body}
              </RNText>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

/**
 * Estado del aviso. Uno a la vez: el nuevo pisa al anterior, que es lo correcto
 * acá — con varios mensajes seguidos, el último es el que importa.
 */
export function useAppHeadsUp() {
  const [headsUp, setHeadsUp] = useState<AppHeadsUpMessage | null>(null);
  const seqRef = useRef(0);

  const showHeadsUp = useCallback(
    (kind: AppHeadsUpKind, title: string, body?: string | null) => {
      const cleanTitle = title?.trim();
      if (!cleanTitle) return;
      setHeadsUp({
        id: `heads-up-${seqRef.current++}`,
        kind,
        title: cleanTitle,
        body: body?.trim() || null,
      });
    },
    []
  );

  const dismissHeadsUp = useCallback(() => setHeadsUp(null), []);

  return { headsUp, showHeadsUp, dismissHeadsUp };
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    // Por encima del header y del contenido, debajo de modales a pantalla completa.
    zIndex: 90,
    elevation: 90,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
  },
  body: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
});
