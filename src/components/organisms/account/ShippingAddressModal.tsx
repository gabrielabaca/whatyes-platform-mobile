/**
 * Modal dirección de envío — Figma 536-22836
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { AppOptionPickerSheet } from '../../molecules/AppOptionPickerSheet';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { COUNTRIES } from '../../molecules/CountrySelect/CountrySelect';
import { useAuth } from '../../../hooks/useAuth';
import {
  createShippingAddress,
  getShippingAddress,
  updateShippingAddress,
} from '../../../api/shippingAddressApi';
import {
  detectCurrentAddress,
  LocationPermissionDeniedError,
} from '../../../services/locationAddress';
import { appAlert } from '../../../alerts';

export interface ShippingAddressModalProps {
  visible: boolean;
  /** Alta (selector) o edición de la default (hub wallet / wizard vendedor). */
  mode?: 'create' | 'edit';
  defaultFullName?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export const ShippingAddressModal: React.FC<ShippingAddressModalProps> = ({
  visible,
  mode = 'create',
  defaultFullName = '',
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);
  const { user } = useAuth();

  // Nombre ya conocido del usuario: prop explícita > nombre del usuario logueado.
  const knownFullName =
    defaultFullName.trim() ||
    `${user?.name ?? ''} ${user?.last_name ?? ''}`.trim();

  const [fullName, setFullName] = useState(knownFullName);
  const [country, setCountry] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setConfirmed(false);

    if (mode === 'create') {
      setFullName(knownFullName);
      setCountry('');
      setAddressLine1('');
      setCity('');
      setState('');
      setPostalCode('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getShippingAddress();
        if (cancelled) {
          return;
        }
        setFullName(data.full_name?.trim() || knownFullName);
        setCountry(data.country?.trim() || '');
        setAddressLine1(data.address_line1?.trim() || '');
        setCity(data.city?.trim() || '');
        setState(data.state?.trim() || '');
        setPostalCode(data.postal_code?.trim() || '');
      } catch {
        if (!cancelled) {
          setFullName(knownFullName);
          setCountry('');
          setAddressLine1('');
          setCity('');
          setState('');
          setPostalCode('');
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
  }, [visible, knownFullName, mode]);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  const handleUseLocation = async () => {
    if (detectingLocation) return;
    setDetectingLocation(true);
    try {
      const detected = await detectCurrentAddress();
      if (detected.country) setCountry(detected.country);
      if (detected.addressLine) setAddressLine1(detected.addressLine);
      if (detected.city) setCity(detected.city);
      if (detected.state) setState(detected.state);
      if (detected.postalCode) setPostalCode(detected.postalCode);
    } catch (e) {
      const key =
        e instanceof LocationPermissionDeniedError
          ? 'account.shippingAddress.locationPermissionDenied'
          : 'account.shippingAddress.locationFailed';
      appAlert(t('common.appName'), t(key));
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSave = async () => {
    const trimmed = {
      full_name: fullName.trim(),
      country: country.trim(),
      address_line1: addressLine1.trim(),
      city: city.trim(),
      state: state.trim(),
      postal_code: postalCode.trim(),
    };

    if (!trimmed.full_name) {
      appAlert(t('common.appName'), t('account.shippingAddress.fullNameRequired'));
      return;
    }
    if (!trimmed.country) {
      appAlert(t('common.appName'), t('account.shippingAddress.countryRequired'));
      return;
    }
    if (!trimmed.address_line1) {
      appAlert(t('common.appName'), t('account.shippingAddress.addressRequired'));
      return;
    }
    if (!trimmed.city) {
      appAlert(t('common.appName'), t('account.shippingAddress.cityRequired'));
      return;
    }
    if (!trimmed.state) {
      appAlert(t('common.appName'), t('account.shippingAddress.stateRequired'));
      return;
    }
    if (!trimmed.postal_code) {
      appAlert(t('common.appName'), t('account.shippingAddress.postalCodeRequired'));
      return;
    }
    if (!confirmed) {
      appAlert(t('common.appName'), t('account.shippingAddress.confirmRequired'));
      return;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await createShippingAddress(trimmed);
      } else {
        await updateShippingAddress(trimmed);
      }
      onSaved?.();
      handleClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('account.shippingAddress.saveError');
      appAlert(t('common.appName'), msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedCountry = COUNTRIES.find((c) => c.name === country || c.code === country);

  return (
      <GlassFullScreenModal
        ref={modalRef}
        visible={visible}
        onClose={onClose}
        backdropAccessibilityLabel={t('account.shippingAddress.cancel')}
        dismissOnBackdropPress={false}
        /**
         * El picker va acá y no como hermano del modal: en iOS un Modal hermano no se
         * presenta mientras este ya está presentado, y el desplegable no abriría.
         */
        overlay={
          <AppOptionPickerSheet
            visible={countryPickerVisible}
            nativeModal={false}
            title={t('account.shippingAddress.country')}
            searchPlaceholder={t('account.shippingAddress.countrySearch')}
            emptyLabel={t('common.noResults')}
            options={COUNTRIES.map((c) => ({
              key: c.code,
              label: `${c.flag}  ${c.name}`,
              selected: selectedCountry?.code === c.code,
            }))}
            onSelect={(key) => {
              const picked = COUNTRIES.find((c) => c.code === key);
              if (picked) {
                setCountry(picked.name);
              }
              setCountryPickerVisible(false);
            }}
            onClose={() => setCountryPickerVisible(false)}
          />
        }
        header={
          <GlassModalHeader
            title={t('account.shippingAddress.title')}
            onClose={handleClose}
            closeDisabled={saving}
          />
        }
        footer={
          !loading ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.saveBtn, (!confirmed || saving) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!confirmed || saving}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator color={themeColors.glass.text} />
                ) : (
                  <RNText style={styles.saveBtnText}>
                    {t(
                      mode === 'create'
                        ? 'account.shippingAddress.add'
                        : 'account.shippingAddress.save'
                    )}
                  </RNText>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <RNText style={styles.cancelText}>{t('account.shippingAddress.cancel')}</RNText>
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          onPress={() => void handleUseLocation()}
          activeOpacity={0.75}
          style={styles.locationLinkWrap}
          disabled={detectingLocation}
        >
          <View style={styles.locationLinkRow}>
            <RNText style={styles.locationLink}>
              {detectingLocation
                ? t('account.shippingAddress.locationDetecting')
                : t('account.shippingAddress.useLocation')}
            </RNText>
            {detectingLocation ? (
              <ActivityIndicator size="small" color={themeColors.gold} />
            ) : null}
          </View>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={themeColors.glass.text} style={styles.loader} />
        ) : (
          <View style={styles.form}>
            <FormField
              label={t('account.shippingAddress.fullName')}
              value={fullName}
              onChangeText={setFullName}
            />
            <SelectField
              label={t('account.shippingAddress.country')}
              value={selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : ''}
              placeholder={t('account.shippingAddress.selectPlaceholder')}
              onPress={() => setCountryPickerVisible(true)}
            />
            <FormField
              label={t('account.shippingAddress.address')}
              value={addressLine1}
              onChangeText={setAddressLine1}
            />
            <FormField
              label={t('account.shippingAddress.city')}
              value={city}
              onChangeText={setCity}
              placeholder={t('account.shippingAddress.cityPlaceholder')}
            />
            <FormField
              label={t('account.shippingAddress.state')}
              value={state}
              onChangeText={setState}
              placeholder={t('account.shippingAddress.statePlaceholder')}
            />
            <FormField
              label={t('account.shippingAddress.postalCode')}
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="default"
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setConfirmed((v) => !v)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
            >
              <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                {confirmed ? <RNText style={styles.checkmark}>✓</RNText> : null}
              </View>
              <RNText style={styles.checkboxLabel}>
                {t('account.shippingAddress.confirmData')}
              </RNText>
            </TouchableOpacity>
          </View>
        )}
      </GlassFullScreenModal>
  );
};

const FormField: React.FC<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}> = ({ label, value, onChangeText, placeholder, keyboardType }) => (
  <View style={styles.field}>
    <RNText style={styles.fieldLabel}>{label}</RNText>
    <View style={styles.fieldInputWrap}>
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={themeColors.glass.placeholder}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}> = ({ label, value, placeholder, onPress }) => (
  <View style={styles.field}>
    <RNText style={styles.fieldLabel}>{label}</RNText>
    <TouchableOpacity style={styles.fieldInputWrap} onPress={onPress} activeOpacity={0.85}>
      <RNText
        style={[styles.fieldInput, !value && styles.fieldPlaceholder]}
        numberOfLines={1}
      >
        {value || placeholder}
      </RNText>
      <ChevronDown size={18} color={themeColors.glass.textSoft} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  locationLinkWrap: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  locationLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLink: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.gold,
    includeFontPadding: false,
  },
  loader: {
    marginVertical: 32,
  },
  form: {
    paddingHorizontal: 24,
    gap: 16,
  },
  field: {
    gap: 8,
    width: '100%',
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.text,
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: themeColors.glass.inputBg,
    gap: 8,
  },
  fieldInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: themeColors.glass.text,
    letterSpacing: 0.06,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  fieldPlaceholder: {
    color: themeColors.glass.placeholder,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: themeColors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  checkmark: {
    color: themeColors.glass.text,
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
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
