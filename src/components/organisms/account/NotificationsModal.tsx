/**
 * Modal notificaciones — Figma 536-23077
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  Animated,
  ScrollView,
  Switch,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../profile/GlassBackdrop';
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
  const slideAnim = useRef(new Animated.Value(1)).current;

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
    slideAnim.setValue(1);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();

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
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
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

  if (!visible) {
    return null;
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GlassBackdrop />
      <TouchableOpacity
        style={styles.backdropPress}
        activeOpacity={1}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel={t('account.notificationsModal.cancel')}
      />

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom }]}
        pointerEvents="box-none"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.header}>
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

          <View style={styles.spacer} />

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

          <View style={styles.homeIndicator}>
            <View style={styles.homeIndicatorBar} />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
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
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  spacer: {
    flexGrow: 1,
    minHeight: 24,
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
  homeIndicator: {
    height: 31,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#C7C8CA',
  },
});
