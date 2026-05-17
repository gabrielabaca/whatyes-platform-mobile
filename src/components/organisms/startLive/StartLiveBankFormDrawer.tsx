import React, { useState } from 'react';
import { ScrollView, Text as RNText, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { upsertPayoutAccount } from '../../../api/paymentsApi';
import { ApiError } from '../../../api/authApi';
import { startLiveFullSheetProps, startLiveStyles } from './startLiveStyles';
import {
  StartLiveConsentNote,
  StartLiveCountryField,
  StartLivePillField,
  StartLivePrimaryButton,
} from './StartLivePrimitives';

export interface StartLiveBankFormDrawerProps {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function normalizeCbu(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Figma 536-26015 */
export const StartLiveBankFormDrawer: React.FC<StartLiveBankFormDrawerProps> = ({
  visible,
  busy,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [holder, setHolder] = useState('');
  const [cbu, setCbu] = useState('');
  const [alias, setAlias] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [taxId, setTaxId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cbuDigits = normalizeCbu(cbu);
  const canSave =
    holder.trim().length >= 2 &&
    taxId.trim().length >= 8 &&
    cbuDigits.length === 22 &&
    !saving &&
    !busy;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await upsertPayoutAccount({
        account_holder: holder.trim(),
        tax_id: taxId.trim(),
        bank_name: alias.trim() || null,
        cbu: cbuDigits,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('startLive.bankFormError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.bankFormTitle')}
      onClose={onClose}
      {...startLiveFullSheetProps}
      contentContainerStyle={startLiveStyles.sheetContent}
      scrollEnabled
    >
      <ScrollView
        style={startLiveStyles.scrollBody}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <RNText style={startLiveStyles.subtitle}>{t('startLive.bankFormIntro')}</RNText>

        <StartLivePillField
          label={t('startLive.bankHolder')}
          value={holder}
          onChangeText={setHolder}
          placeholder={t('startLive.addressFullNamePlaceholder')}
        />
        <StartLivePillField
          label={t('startLive.bankCbu')}
          value={cbu}
          onChangeText={setCbu}
          placeholder={t('startLive.bankCbuPlaceholder')}
          keyboardType="number-pad"
          maxLength={26}
        />
        <StartLivePillField
          label={t('startLive.bankAlias')}
          value={alias}
          onChangeText={setAlias}
          placeholder={t('startLive.bankAliasPlaceholder')}
        />

        <View style={startLiveStyles.divider} />

        <RNText style={startLiveStyles.sectionTitle}>{t('startLive.bankPaymentAddress')}</RNText>
        <StartLiveCountryField
          label={t('startLive.addressCountry')}
          value={country}
          onValueChange={setCountry}
          placeholder={t('register.selectCountry')}
        />
        <StartLivePillField
          label={t('startLive.bankTaxId')}
          value={taxId}
          onChangeText={setTaxId}
          placeholder={t('startLive.upgradeTaxIdPlaceholder')}
          keyboardType="number-pad"
        />
        <StartLivePillField
          label={t('startLive.addressPostal')}
          value={postalCode}
          onChangeText={setPostalCode}
          placeholder={t('startLive.addressPostalPlaceholder')}
          keyboardType="number-pad"
        />

        <StartLiveConsentNote text={t('startLive.bankConsent')} />

        {error ? <RNText style={startLiveStyles.error}>{error}</RNText> : null}
      </ScrollView>

      <StartLivePrimaryButton
        label={t('startLive.bankFormCta')}
        onPress={() => void handleSave()}
        disabled={!canSave}
        loading={saving || busy}
      />
    </StreamBottomSheet>
  );
};
