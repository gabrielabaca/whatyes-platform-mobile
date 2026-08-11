/**
 * Diálogo modal centrado con el look & feel de PulpoLive.
 * Reemplaza visualmente a `Alert.alert` nativo (iOS/Android).
 */
import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text as RNText,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { themeColors } from '../theme/colors';
import { FONT_FAMILY } from '../theme/typography';
import { LAYERS } from '../theme/layers';
import type { AppAlertButton, AppAlertRequest, AppAlertVariant } from './types';

const VARIANT_META: Record<
  AppAlertVariant,
  { color: string; Icon: typeof Info }
> = {
  info: { color: themeColors.primary, Icon: Info },
  success: { color: themeColors.success, Icon: CircleCheck },
  error: { color: themeColors.danger, Icon: CircleAlert },
  warning: { color: themeColors.gold, Icon: TriangleAlert },
};

export interface AppAlertDialogProps {
  request: AppAlertRequest | null;
  onDismiss: () => void;
  onButtonPress: (button: AppAlertButton) => void;
}

export const AppAlertDialog: React.FC<AppAlertDialogProps> = ({
  request,
  onDismiss,
  onButtonPress,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const palette = isDark ? themeColors.dark : themeColors.light;
  const visible = request != null;

  const variant = request?.options.variant ?? 'info';
  const meta = VARIANT_META[variant];
  const cancelable = request?.options.cancelable ?? true;

  const orderedButtons = useMemo(() => {
    if (!request) return [];
    // Cancel a la izquierda / abajo; acción principal a la derecha / arriba en columna.
    const buttons = [...request.buttons];
    buttons.sort((a, b) => {
      const rank = (s?: string) => (s === 'cancel' ? 0 : s === 'destructive' ? 2 : 1);
      return rank(a.style) - rank(b.style);
    });
    return buttons;
  }, [request]);

  const stacked = orderedButtons.length > 2;

  const handleRequestClose = () => {
    if (!request) return;
    if (cancelable) {
      onDismiss();
      return;
    }
    const cancelBtn = request.buttons.find((b) => b.style === 'cancel');
    if (cancelBtn) onButtonPress(cancelBtn);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      {request ? (
        <View
          style={[styles.host, { backgroundColor: palette.overlay }]}
          accessibilityViewIsModal
        >
          {cancelable ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            />
          ) : (
            <View style={StyleSheet.absoluteFill} pointerEvents="none" />
          )}

          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.borderSubtle,
              },
            ]}
            accessibilityRole="alert"
            accessibilityLabel={[request.title, request.message].filter(Boolean).join('. ')}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${meta.color}22` },
              ]}
            >
              <meta.Icon size={22} color={meta.color} strokeWidth={2.2} />
            </View>

            <RNText style={[styles.title, { color: palette.text }]}>{request.title}</RNText>

            {request.message ? (
              <RNText style={[styles.message, { color: palette.textSecondary }]}>
                {request.message}
              </RNText>
            ) : null}

            <View style={[styles.actions, stacked && styles.actionsStacked]}>
              {orderedButtons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';
                const isPrimary = !isCancel && !isDestructive && (
                  orderedButtons.length === 1 ||
                  index === orderedButtons.length - 1
                );

                let bg: string = 'transparent';
                let textColor: string = palette.text;
                let borderColor: string = palette.borderSubtle;

                if (isDestructive) {
                  bg = themeColors.danger;
                  textColor = themeColors.glass.text;
                  borderColor = themeColors.danger;
                } else if (isPrimary) {
                  bg = themeColors.primary;
                  textColor = themeColors.glass.text;
                  borderColor = themeColors.primary;
                } else if (isCancel) {
                  bg = palette.surfaceAlt;
                  textColor = palette.textSecondary;
                  borderColor = palette.borderSubtle;
                }

                return (
                  <Pressable
                    key={`${button.text}-${index}`}
                    onPress={() => onButtonPress(button)}
                    style={({ pressed }) => [
                      styles.btn,
                      stacked ? styles.btnStacked : styles.btnRow,
                      {
                        backgroundColor: bg,
                        borderColor,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={button.text}
                  >
                    <RNText
                      style={[styles.btnText, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {button.text}
                    </RNText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: LAYERS.portal + 100,
    elevation: LAYERS.portal + 100,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.28,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 12 },
    }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    includeFontPadding: false,
  },
  message: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    includeFontPadding: false,
  },
  actions: {
    marginTop: 20,
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  actionsStacked: {
    flexDirection: 'column-reverse',
  },
  btn: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnRow: {
    flex: 1,
  },
  btnStacked: {
    width: '100%',
  },
  btnText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
  },
});
