/**
 * Contenido del selector de direcciones (Figma 1210:3409 / 698:7347).
 *
 * La misma lista vive en Cuenta (modal full-screen) y en el vivo (bottom sheet):
 * radios y borrado. El CTA y el formulario de alta los monta cada contenedor.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SelectablePillRow, PillRadio } from '../../molecules/stream';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import {
  deleteShippingAddress,
  listShippingAddresses,
  setDefaultShippingAddress,
  type ShippingAddress,
} from '../../../api/shippingAddressApi';
import { ApiError } from '../../../api/authApi';
import {
  formatShippingAddressLine,
} from '../../../utils/shippingAddress';
import { appAlert } from '../../../alerts';

export interface ShippingAddressPickerProps {
  visible: boolean;
  /** Se incrementa para recargar (p. ej. después de crear una dirección). */
  reloadToken?: number;
  /** Tras elegir, borrar o cualquier cambio que deba recotizar el vivo. */
  onChanged?: () => void;
}

export const ShippingAddressPicker: React.FC<ShippingAddressPickerProps> = ({
  visible,
  reloadToken = 0,
  onChanged,
}) => {
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyUuid, setBusyUuid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listShippingAddresses();
      setAddresses(rows);
    } catch {
      appAlert(t('common.appName'), t('account.shippingAddress.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    void load();
  }, [visible, reloadToken, load]);

  const handleSelect = async (uuid: string) => {
    if (!uuid || busyUuid) return;
    const current = addresses.find((a) => a.uuid === uuid);
    if (current?.is_default) return;
    setBusyUuid(uuid);
    try {
      await setDefaultShippingAddress(uuid);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.uuid === uuid }))
      );
      onChanged?.();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : t('account.shippingAddress.saveError');
      appAlert(t('common.appName'), msg);
    } finally {
      setBusyUuid(null);
    }
  };

  const handleDelete = (address: ShippingAddress) => {
    const uuid = address.uuid;
    if (!uuid || busyUuid) return;
    appAlert.confirm({
      title: t('account.shippingAddress.deleteConfirmTitle'),
      message: t('account.shippingAddress.deleteConfirmMessage'),
      cancelText: t('common.cancel'),
      confirmText: t('account.shippingAddress.deleteConfirm'),
      destructive: true,
      onConfirm: () => {
        void (async () => {
          setBusyUuid(uuid);
          try {
            const remaining = await deleteShippingAddress(uuid);
            setAddresses(remaining);
            onChanged?.();
          } catch (e) {
            const isLast = e instanceof ApiError && e.status === 409;
            appAlert(
              t('common.appName'),
              isLast
                ? t('account.shippingAddress.deleteLastError')
                : e instanceof ApiError
                  ? e.message
                  : t('account.shippingAddress.deleteError')
            );
          } finally {
            setBusyUuid(null);
          }
        })();
      },
    });
  };

  return (
    <View style={styles.wrap}>
      <RNText style={styles.subtitle}>
        {t('account.shippingAddress.selectSubtitle')}
      </RNText>

      {loading ? (
        <ActivityIndicator color={themeColors.glass.text} style={styles.loader} />
      ) : addresses.length === 0 ? (
        <RNText style={styles.empty}>{t('account.shippingAddress.empty')}</RNText>
      ) : (
        <View style={styles.list}>
          {addresses.map((address, index) => {
            const uuid = address.uuid ?? `row-${index}`;
            const selected = Boolean(address.is_default);
            return (
              <SelectablePillRow
                key={uuid}
                leading={<PillRadio selected={selected} />}
                title={formatShippingAddressLine(address) || '—'}
                selected={selected}
                showCheck={false}
                titleLines={2}
                onPress={() => {
                  if (address.uuid) void handleSelect(address.uuid);
                }}
                onDelete={
                  address.uuid
                    ? () => handleDelete(address)
                    : undefined
                }
                deleteAccessibilityLabel={t('account.shippingAddress.deleteConfirm')}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export const ShippingAddressAddButton: React.FC<{
  onPress: () => void;
  disabled?: boolean;
}> = ({ onPress, disabled }) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={[styles.addBtn, disabled ? styles.addBtnDisabled : null]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
      accessibilityRole="button"
    >
      <RNText style={styles.addBtnText}>
        {t('account.shippingAddress.addAddress')}
      </RNText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 16,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
    includeFontPadding: false,
  },
  loader: {
    marginVertical: 24,
  },
  empty: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    color: themeColors.glass.textSoft,
    paddingHorizontal: 8,
    includeFontPadding: false,
  },
  list: {
    width: '100%',
    gap: 16,
  },
  addBtn: {
    width: '100%',
    height: 40,
    borderRadius: 1000,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  addBtnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  addBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
});
