/**
 * Modal notificaciones — Figma 536-23077
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Switch,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { FONT_FAMILY } from '../../../theme/typography';
import {
  getNotificationPreferences,
  persistNotificationPreferences,
  type NotificationPreferences,
} from '../../../utils/notificationPreferences';

const PRIMARY = '#685CF0';
const CANCEL_GOLD = '#FDC700';

export interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);

  const [draft, setDraft] = useState<NotificationPreferences>({
    all: true,
    shippingTracking: true,
    purchaseNotify: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const prefs = await getNotificationPreferences();
        if (!cancelled) {
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
    await persistNotificationPreferences(draft);
    handleClose();
  };

  const setAll = (value: boolean) => {
    setDraft({
      all: value,
      shippingTracking: value,
      purchaseNotify: value,
    });
  };

  const setShippingTracking = (value: boolean) => {
    setDraft((prev) => {
      const next = { ...prev, shippingTracking: value };
      next.all = next.shippingTracking && next.purchaseNotify;
      return next;
    });
  };

  const setPurchaseNotify = (value: boolean) => {
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
      header={
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <RNText style={styles.title}>{t('account.notificationsModal.title')}</RNText>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('account.notificationsModal.close')}
          >
            <X size={22} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      }
      footer={
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.saveBtn}
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
    >
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
      trackColor={{ false: '#767577', true: '#FFFFFF' }}
      thumbColor={PRIMARY}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    flex: 1,
    includeFontPadding: false,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggles: {
    gap: 12,
    width: '100%',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 12,
    minHeight: 56,
  },
  pillLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
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
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  saveBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  cancelText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: CANCEL_GOLD,
    includeFontPadding: false,
  },
});
