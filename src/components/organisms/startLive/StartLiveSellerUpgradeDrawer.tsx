import React, { useState } from 'react';
import { ScrollView, View, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { ApiError } from '../../../api/authApi';
import { startLiveFullSheetProps, startLiveStyles } from './startLiveStyles';
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
  const [fullName, setFullName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    >
      <RNText style={startLiveStyles.subtitle}>{t('startLive.addressSubtitle')}</RNText>

      <ScrollView
        style={startLiveStyles.scrollBody}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
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
