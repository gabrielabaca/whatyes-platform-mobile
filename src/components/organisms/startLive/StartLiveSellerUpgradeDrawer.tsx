import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../api/authApi';
import {
  detectCurrentAddress,
  LocationPermissionDeniedError,
} from '../../../services/locationAddress';
import { startLiveFullSheetProps, startLiveStyles } from './startLiveStyles';
import { FONT_FAMILY } from '../../../theme/typography';
import {
  StartLiveCountryField,
  StartLivePillField,
  StartLivePrimaryButton,
} from './StartLivePrimitives';

export interface StartLiveSellerUpgradeDrawerProps {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    customer_name: string;
    customer_tax_id?: string;
    customer_contact_phone?: string;
  }) => Promise<void>;
}

/** Figma 536-25237 — Dirección / datos de facturación del vendedor */
export const StartLiveSellerUpgradeDrawer: React.FC<StartLiveSellerUpgradeDrawerProps> = ({
  visible,
  busy,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const knownFullName = `${user?.name ?? ''} ${user?.last_name ?? ''}`.trim();
  const [fullName, setFullName] = useState(knownFullName);
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Prefill con el nombre ya conocido del usuario si el campo sigue vacío.
  useEffect(() => {
    if (visible && knownFullName) {
      setFullName((prev) => (prev.trim() ? prev : knownFullName));
    }
  }, [visible, knownFullName]);

  const handleUseLocation = async () => {
    if (detectingLocation) return;
    setDetectingLocation(true);
    try {
      const detected = await detectCurrentAddress();
      if (detected.country) setCountry(detected.country);
      if (detected.addressLine) setAddress(detected.addressLine);
      if (detected.city) setCity(detected.city);
      if (detected.state) setState(detected.state);
      if (detected.postalCode) setPostalCode(detected.postalCode);
    } catch (e) {
      const key =
        e instanceof LocationPermissionDeniedError
          ? 'account.shippingAddress.locationPermissionDenied'
          : 'account.shippingAddress.locationFailed';
      Alert.alert(t('common.appName'), t(key));
    } finally {
      setDetectingLocation(false);
    }
  };

  const canSubmit =
    fullName.trim().length >= 2 &&
    taxId.trim().length >= 8 &&
    country.trim().length > 0 &&
    address.trim().length > 0 &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    !busy;

  const handleSubmit = async () => {
    setError(null);
    try {
      await onSubmit({
        customer_name: fullName.trim(),
        customer_tax_id: taxId.trim(),
        customer_contact_phone: phone.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('startLive.upgradeError'));
    }
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.addressTitle')}
      onClose={onClose}
      {...startLiveFullSheetProps}
      contentContainerStyle={startLiveStyles.sheetContent}
      scrollEnabled
      dismissOnBackdropPress={false}
    >
      <RNText style={startLiveStyles.subtitle}>{t('startLive.addressSubtitle')}</RNText>

      <TouchableOpacity
        onPress={() => void handleUseLocation()}
        activeOpacity={0.75}
        disabled={detectingLocation}
        style={localStyles.locationLinkRow}
      >
        <RNText style={localStyles.locationLink}>
          {detectingLocation
            ? t('account.shippingAddress.locationDetecting')
            : t('account.shippingAddress.useLocation')}
        </RNText>
        {detectingLocation ? <ActivityIndicator size="small" color="#FDC700" /> : null}
      </TouchableOpacity>

      <ScrollView
        style={startLiveStyles.scrollBody}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <StartLivePillField
          label={t('startLive.addressFullName')}
          value={fullName}
          onChangeText={setFullName}
          placeholder={t('startLive.addressFullNamePlaceholder')}
        />
        <StartLivePillField
          label={t('startLive.upgradeTaxId')}
          value={taxId}
          onChangeText={setTaxId}
          placeholder={t('startLive.upgradeTaxIdPlaceholder')}
          keyboardType="number-pad"
        />
        <StartLiveCountryField
          label={t('startLive.addressCountry')}
          value={country}
          onValueChange={setCountry}
          placeholder={t('register.selectCountry')}
        />
        <StartLivePillField
          label={t('startLive.addressLine')}
          value={address}
          onChangeText={setAddress}
          placeholder={t('startLive.addressLinePlaceholder')}
        />
        <StartLivePillField
          label={t('startLive.addressCity')}
          value={city}
          onChangeText={setCity}
          placeholder={t('startLive.selectPlaceholder')}
        />
        <StartLivePillField
          label={t('startLive.addressState')}
          value={state}
          onChangeText={setState}
          placeholder={t('startLive.selectPlaceholder')}
        />
        <StartLivePillField
          label={t('startLive.addressPostal')}
          value={postalCode}
          onChangeText={setPostalCode}
          placeholder={t('startLive.addressPostalPlaceholder')}
          keyboardType="number-pad"
        />
        <StartLivePillField
          label={t('startLive.upgradePhone')}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('startLive.upgradePhonePlaceholder')}
          keyboardType="phone-pad"
        />
        {error ? <RNText style={startLiveStyles.error}>{error}</RNText> : null}
      </ScrollView>

      <StartLivePrimaryButton
        label={t('startLive.nextCta')}
        onPress={() => void handleSubmit()}
        disabled={!canSubmit}
        loading={busy}
      />
    </StreamBottomSheet>
  );
};

const localStyles = StyleSheet.create({
  locationLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLink: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FDC700',
    includeFontPadding: false,
  },
});
