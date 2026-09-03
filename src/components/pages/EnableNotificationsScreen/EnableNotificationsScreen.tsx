/**
 * Activar Notificaciones — Figma 1115:3279.
 *
 * Pide el permiso de push con contexto (título, subtítulo y una tarjeta de
 * ejemplo de un vivo). Se usa en dos entradas: como paso del onboarding
 * comprador (RegisterScreen, entre intereses y KYC) y desde NotificationsModal
 * para las cuentas existentes que nunca pasaron por el onboarding.
 *
 * Tres resultados del CTA, que NO se confunden:
 * - permiso concedido y token registrado → `onContinue`.
 * - permiso concedido pero registro fallido (503 con la migración de push sin
 *   aplicar, sin red, Firebase sin linkear) → `onContinue` igual, en silencio:
 *   para el usuario el permiso quedó activo y el token se reintenta en el
 *   próximo arranque (`registerPushTokenIfGranted` en AuthContext).
 * - permiso denegado (iOS solo lo pregunta una vez; Android tras dos negativas)
 *   → el CTA pasa a abrir Ajustes y se explica por qué.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, StyleSheet, Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { AuthHeader } from '../../molecules/auth';
import {
  getPushPermissionStatus,
  registerPushTokenIfGranted,
  usePushNotifications,
} from '../../../hooks/usePushNotifications';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import NotificationsActiveIcon from '../../../../assets/icons/notifications-active.svg';
import StarFilledIcon from '../../../../assets/icons/star-filled.svg';

const PREVIEW_IMAGE = require('../../../../assets/images/notifications/live-preview.jpg');
const PREVIEW_AVATAR = require('../../../../assets/images/notifications/live-preview-avatar.jpg');

interface EnableNotificationsScreenProps {
  onBack?: () => void;
  /** "No por ahora": sigue el flujo sin pedir nada. */
  onSkip: () => void | Promise<void>;
  /** Salta todo el onboarding restante y entra directo a la app. */
  onSkipAll?: () => void;
  /**
   * El permiso quedó resuelto a favor: concedido con token registrado, o concedido
   * con el registro pendiente de reintento. Nunca se llama con el permiso denegado.
   */
  onContinue: () => void | Promise<void>;
}

type Mode = 'ask' | 'settings';

export const EnableNotificationsScreen: React.FC<EnableNotificationsScreenProps> = ({
  onBack,
  onSkip,
  onSkipAll,
  onContinue,
}) => {
  const { t } = useTranslation();
  // `enabled=false`: los listeners y el registro silencioso ya viven en AuthContext.
  const { requestPermissionAndRegister, openSettings } = usePushNotifications(false);
  const [mode, setMode] = useState<Mode>('ask');
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);
  const doneRef = useRef(false);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const finish = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    await onContinueRef.current();
  }, []);

  /**
   * Al volver de Ajustes: si el usuario activó el permiso, registrar el token en
   * silencio y seguir. Sin esto la pantalla quedaría ofreciendo Ajustes con el
   * permiso ya concedido.
   */
  useEffect(() => {
    if (mode !== 'settings') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void (async () => {
        if ((await getPushPermissionStatus()) !== 'granted') return;
        await registerPushTokenIfGranted();
        if (mountedRef.current) await finish();
      })();
    });
    return () => sub.remove();
  }, [mode, finish]);

  const handlePrimary = async () => {
    if (mode === 'settings') {
      await openSettings().catch(() => {});
      return;
    }
    setBusy(true);
    try {
      const registered = await requestPermissionAndRegister();
      if (registered) {
        await finish();
        return;
      }
      const status = await getPushPermissionStatus();
      if (status === 'denied') {
        setMode('settings');
        return;
      }
      // 'granted' con registro fallido, 'unavailable' (sin nativo) o 'undetermined'
      // (Android: cerró el diálogo sin elegir): no es un error para el usuario.
      await finish();
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FEFEFE] dark:bg-night-950">
      <View className="flex-1 px-8 pt-4 pb-8" style={styles.column}>
        <View style={styles.headerBlock}>
          <AuthHeader title={t('buyerOnboarding.notificationsTitle')} onBack={onBack} />
          <Text className="text-center text-[#303030] dark:text-night-muted text-[14px] leading-[22px] tracking-[0.07px]">
            {t('buyerOnboarding.notificationsSubtitle')}
          </Text>
          {mode === 'settings' ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-center text-primary-600 dark:text-primary-300 text-[12px] leading-[18px]"
            >
              {t('buyerOnboarding.notificationsDeniedHint')}
            </Text>
          ) : null}
        </View>

        <LivePreviewCard />

        <View style={styles.actions}>
          <Button
            title={
              mode === 'settings'
                ? t('buyerOnboarding.notificationsOpenSettings')
                : t('buyerOnboarding.notificationsCta')
            }
            variant="primary"
            size="large"
            loading={busy}
            disabled={busy}
            onPress={() => void handlePrimary()}
            className="w-full min-h-[52px] rounded-full"
          />
          <Button
            title={t('buyerOnboarding.notificationsSkip')}
            variant="ghost"
            size="large"
            disabled={busy}
            onPress={() => void onSkip()}
            className="self-center min-h-[44px]"
          />
          {onSkipAll ? (
            <Button
              title={t('buyerOnboarding.skipAll')}
              variant="ghost"
              size="medium"
              disabled={busy}
              onPress={onSkipAll}
              titleClassName="text-[14px] font-normal text-[#4C4E55] dark:text-night-muted"
              className="self-center min-h-[44px]"
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

/**
 * Tarjeta de ejemplo del Figma (vivo ficticio con fecha, campana, vendedor y
 * rating). Es ilustrativa: no toca la API ni el feed.
 */
const LivePreviewCard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.card} accessible accessibilityRole="image">
      <Image source={PREVIEW_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="notif-preview-shade" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#000000" stopOpacity={0.2} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.9} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#notif-preview-shade)" />
      </Svg>
      <View style={styles.cardInner}>
        <View style={styles.cardTopRow}>
          <View style={styles.dateChip}>
            <RNText style={styles.dateChipText}>{t('buyerOnboarding.notificationsPreviewDate')}</RNText>
          </View>
          <View style={styles.bellBadge}>
            <NotificationsActiveIcon width={20} height={20} />
          </View>
        </View>
        <View style={styles.cardBottomRow}>
          <Image source={PREVIEW_AVATAR} style={styles.avatar} />
          <View style={styles.sellerBlock}>
            <View style={styles.sellerRow}>
              <RNText style={styles.sellerName} numberOfLines={1}>
                {t('buyerOnboarding.notificationsPreviewSeller')}
              </RNText>
              <View style={styles.ratingRow}>
                <StarFilledIcon width={12} height={12} />
                <RNText style={styles.ratingText}>
                  {t('buyerOnboarding.notificationsPreviewRating')}
                </RNText>
              </View>
            </View>
            <RNText style={styles.liveTitle} numberOfLines={1}>
              {t('buyerOnboarding.notificationsPreviewTitle')}
            </RNText>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    gap: 24,
  },
  headerBlock: {
    gap: 16,
    width: '100%',
  },
  actions: {
    gap: 16,
    alignItems: 'center',
    width: '100%',
  },
  card: {
    flex: 1,
    minHeight: 200,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#18181B',
  },
  cardInner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dateChip: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 1000,
    backgroundColor: 'rgba(217,217,217,0.2)',
    justifyContent: 'center',
  },
  dateChipText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  bellBadge: {
    width: 28,
    height: 24,
    borderRadius: 1000,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.4,
    borderColor: '#3F3F47',
  },
  sellerBlock: {
    flex: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sellerName: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 16,
  },
  ratingText: {
    // Figma: Mulish Medium; la app solo carga Regular/SemiBold/Bold.
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: '#D4D4D8',
    includeFontPadding: false,
  },
  liveTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 14,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
