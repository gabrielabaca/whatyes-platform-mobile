/**
 * Modal notificaciones — Figma 536-23077
 *
 * Además de las preferencias, es la segunda entrada a la pantalla "Activar
 * Notificaciones" (1115:3279): las cuentas existentes nunca pasan por el
 * onboarding, y acá es donde el usuario se entera de que el permiso del SO le
 * bloquea los avisos que está prendiendo.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Switch,
  AppState,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { appAlert } from '../../../alerts';
import { EnableNotificationsScreen } from '../../pages/EnableNotificationsScreen';
import {
  getPushPermissionStatus,
  type PushPermissionStatus,
} from '../../../hooks/usePushNotifications';
import {
  getNotificationPreferences,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../../../utils/notificationPreferences';

export interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);

  const [draft, setDraft] = useState<NotificationPreferences>({
    all: true,
    shippingTracking: true,
    purchaseNotify: true,
    // Deuda: notifyAnyLive se activa desde el CTA vacío de Home y este modal
    // no tiene control para apagarlo. La UI de opt-out queda pendiente de diseño.
    notifyAnyLive: false,
  });
  const [loading, setLoading] = useState(false);
  const dirtyRef = useRef(false);

  /** Permiso del SO. `null` mientras se consulta; sin fila si está concedido o no hay nativo. */
  const [permission, setPermission] = useState<PushPermissionStatus | null>(null);
  const [permissionScreenVisible, setPermissionScreenVisible] = useState(false);
  const permissionBlocked = permission === 'denied' || permission === 'undetermined';

  const refreshPermission = useCallback(async () => {
    const status = await getPushPermissionStatus();
    setPermission(status);
  }, []);

  useEffect(() => {
    if (!visible) {
      setPermissionScreenVisible(false);
      return;
    }
    void refreshPermission();
    // El usuario puede ir a Ajustes desde acá y volver: releer al pasar a foreground.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermission();
    });
    return () => sub.remove();
  }, [visible, refreshPermission]);

  const closePermissionScreen = () => {
    setPermissionScreenVisible(false);
    void refreshPermission();
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    dirtyRef.current = false;
    (async () => {
      setLoading(true);
      try {
        const cached = await getNotificationPreferences();
        if (!cancelled) {
          setDraft(cached);
        }
        const prefs = await loadNotificationPreferences();
        if (!cancelled && !dirtyRef.current) {
          setDraft(prefs);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  const handleSave = async () => {
    try {
      await saveNotificationPreferences(draft);
      handleClose();
    } catch {
      appAlert(t('common.appName'), t('account.notificationsModal.saveError'));
    }
  };

  const setAll = (value: boolean) => {
    dirtyRef.current = true;
    setDraft((prev) => ({
      ...prev,
      all: value,
      shippingTracking: value,
      purchaseNotify: value,
    }));
  };

  const setShippingTracking = (value: boolean) => {
    dirtyRef.current = true;
    setDraft((prev) => {
      const next = { ...prev, shippingTracking: value };
      next.all = next.shippingTracking && next.purchaseNotify;
      return next;
    });
  };

  const setPurchaseNotify = (value: boolean) => {
    dirtyRef.current = true;
    setDraft((prev) => {
      const next = { ...prev, purchaseNotify: value };
      next.all = next.shippingTracking && next.purchaseNotify;
      return next;
    });
  };

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      backdropAccessibilityLabel={t('account.notificationsModal.cancel')}
      dismissOnBackdropPress={false}
      header={
        <GlassModalHeader
          title={t('account.notificationsModal.title')}
          onClose={handleClose}
        />
      }
      footer={
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.88}
          >
            <RNText style={styles.saveBtnText}>{t('account.notificationsModal.save')}</RNText>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <RNText style={styles.cancelText}>{t('account.notificationsModal.cancel')}</RNText>
          </TouchableOpacity>
        </View>
      }
      contentContainerStyle={styles.scrollContent}
      /**
       * La pantalla va en `overlay` (misma ventana nativa) y no como Modal hermano:
       * en iOS un segundo Modal no se presenta mientras este está abierto.
       */
      overlay={
        permissionScreenVisible ? (
          <View style={StyleSheet.absoluteFill}>
            <EnableNotificationsScreen
              onBack={closePermissionScreen}
              onSkip={closePermissionScreen}
              onContinue={closePermissionScreen}
            />
          </View>
        ) : null
      }
    >
      {permissionBlocked ? (
        <TouchableOpacity
          style={styles.permissionRow}
          onPress={() => setPermissionScreenVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('account.notificationsModal.systemDisabledCta')}
        >
          <RNText style={styles.permissionText}>
            {t('account.notificationsModal.systemDisabled')}
          </RNText>
          <RNText style={styles.permissionCta}>
            {t('account.notificationsModal.systemDisabledCta')}
          </RNText>
        </TouchableOpacity>
      ) : null}
      <View style={styles.toggles}>
        <ToggleRow
          label={t('account.notificationsModal.all')}
          value={draft.all}
          onValueChange={setAll}
          disabled={loading}
        />
        <ToggleRow
          label={t('account.notificationsModal.shippingTracking')}
          value={draft.shippingTracking}
          onValueChange={setShippingTracking}
          disabled={loading}
        />
        <ToggleRow
          label={t('account.notificationsModal.purchaseNotify')}
          value={draft.purchaseNotify}
          onValueChange={setPurchaseNotify}
          disabled={loading}
        />
      </View>
    </GlassFullScreenModal>
  );
};

const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ label, value, onValueChange, disabled }) => (
  <View style={styles.pillRow}>
    <RNText style={styles.pillLabel}>{label}</RNText>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: '#767577', true: themeColors.glass.text }}
      thumbColor={themeColors.primary}
      ios_backgroundColor="#767577"
    />
  </View>
);

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 24,
  },
  toggles: {
    gap: 12,
    width: '100%',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.gold,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: themeColors.glass.rowBg,
    gap: 12,
  },
  permissionText: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  permissionCta: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.gold,
    includeFontPadding: false,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: themeColors.glass.inputBg,
    gap: 12,
    minHeight: 56,
  },
  pillLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    letterSpacing: 0.07,
    includeFontPadding: false,
  },
  actions: {
    gap: 24,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  saveBtn: {
    width: '100%',
    height: 40,
    borderRadius: 1000,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  saveBtnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.gold,
    includeFontPadding: false,
  },
});
