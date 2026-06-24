/**
 * Modal dirección de envío — Figma 536-22836
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Text as RNText,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { X, ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { FONT_FAMILY } from '../../../theme/typography';
import { COUNTRIES, type Country } from '../../molecules/CountrySelect/CountrySelect';
import {
  getShippingAddress,
  updateShippingAddress,
} from '../../../api/shippingAddressApi';

const PRIMARY = '#685CF0';
const CANCEL_GOLD = '#FDC700';
const LOCATION_LINK = '#FDC700';

export interface ShippingAddressModalProps {
  visible: boolean;
  defaultFullName?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export const ShippingAddressModal: React.FC<ShippingAddressModalProps> = ({
  visible,
  defaultFullName = '',
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);

  const [fullName, setFullName] = useState(defaultFullName);
  const [country, setCountry] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setConfirmed(false);
      try {
        const data = await getShippingAddress();
        if (cancelled) {
          return;
        }
        setFullName(data.full_name?.trim() || defaultFullName);
        setCountry(data.country?.trim() || '');
        setAddressLine1(data.address_line1?.trim() || '');
        setCity(data.city?.trim() || '');
        setState(data.state?.trim() || '');
        setPostalCode(data.postal_code?.trim() || '');
      } catch {
        if (!cancelled) {
          setFullName(defaultFullName);
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
  }, [visible, defaultFullName]);

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  const handleUseLocation = () => {
    Alert.alert(t('common.appName'), t('account.shippingAddress.locationComingSoon'));
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
      Alert.alert(t('common.appName'), t('account.shippingAddress.fullNameRequired'));
      return;
    }
    if (!trimmed.country) {
      Alert.alert(t('common.appName'), t('account.shippingAddress.countryRequired'));
      return;
    }
    if (!trimmed.address_line1) {
      Alert.alert(t('common.appName'), t('account.shippingAddress.addressRequired'));
      return;
    }
    if (!trimmed.city) {
      Alert.alert(t('common.appName'), t('account.shippingAddress.cityRequired'));
      return;
    }
    if (!trimmed.state) {
      Alert.alert(t('common.appName'), t('account.shippingAddress.stateRequired'));
      return;
    }
    if (!trimmed.postal_code) {
      Alert.alert(t('common.appName'), t('account.shippingAddress.postalCodeRequired'));
      return;
    }
    if (!confirmed) {
      Alert.alert(t('common.appName'), t('account.shippingAddress.confirmRequired'));
      return;
    }

    setSaving(true);
    try {
      await updateShippingAddress(trimmed);
      onSaved?.();
      handleClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('account.shippingAddress.saveError');
      Alert.alert(t('common.appName'), msg);
    } finally {
      setSaving(false);
    }
  };

  const selectedCountry = COUNTRIES.find((c) => c.name === country || c.code === country);
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <>
      <GlassFullScreenModal
        ref={modalRef}
        visible={visible}
        onClose={onClose}
        backdropAccessibilityLabel={t('account.shippingAddress.cancel')}
        header={
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <RNText style={styles.title}>{t('account.shippingAddress.title')}</RNText>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('account.shippingAddress.close')}
            >
              <X size={22} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
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
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <RNText style={styles.saveBtnText}>{t('account.shippingAddress.save')}</RNText>
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
        <TouchableOpacity onPress={handleUseLocation} activeOpacity={0.75} style={styles.locationLinkWrap}>
          <RNText style={styles.locationLink}>{t('account.shippingAddress.useLocation')}</RNText>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color="#FFFFFF" style={styles.loader} />
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
              placeholder={t('account.shippingAddress.selectPlaceholder')}
            />
            <FormField
              label={t('account.shippingAddress.state')}
              value={state}
              onChangeText={setState}
              placeholder={t('account.shippingAddress.selectPlaceholder')}
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

      <Modal
        visible={countryPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCountryPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <RNText style={styles.pickerTitle}>{t('account.shippingAddress.country')}</RNText>
              <TouchableOpacity
                onPress={() => {
                  setCountryPickerVisible(false);
                  setCountrySearch('');
                }}
                hitSlop={12}
              >
                <X size={22} color="#18181B" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.pickerSearch}
              placeholder={t('register.selectCountry')}
              placeholderTextColor="#9CA3AF"
              value={countrySearch}
              onChangeText={setCountrySearch}
              autoCapitalize="none"
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item: Country) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setCountry(item.name);
                    setCountryPickerVisible(false);
                    setCountrySearch('');
                  }}
                >
                  <RNText style={styles.pickerFlag}>{item.flag}</RNText>
                  <RNText style={styles.pickerName}>{item.name}</RNText>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
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
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.5)"
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
      <ChevronDown size={18} color="rgba(255,255,255,0.7)" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
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
  locationLinkWrap: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  locationLink: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: LOCATION_LINK,
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
    color: '#FFFFFF',
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  fieldInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: '#FFFFFF',
    letterSpacing: 0.06,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  fieldPlaceholder: {
    color: 'rgba(255,255,255,0.5)',
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
    borderColor: '#DDDDDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.9)',
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
  saveBtnDisabled: {
    opacity: 0.45,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#18181B',
  },
  pickerSearch: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  pickerName: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    color: '#111827',
  },
});
