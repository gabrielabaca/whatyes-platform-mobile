/**
 * Setup único de vendedor: facturación + cuenta bancaria en un solo formulario.
 * Solo pide lo que el backend realmente usa (nombre, CUIT una vez, teléfono
 * opcional, CBU/alias); la dirección fiscal se adjunta sola desde la dirección
 * de envío guardada. Reemplaza a los antiguos drawers de upgrade + banco.
 */
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../api/authApi';
import { startLiveFullSheetProps, startLiveStyles } from './startLiveStyles';
import {
  StartLiveConsentNote,
  StartLivePillField,
  StartLivePrimaryButton,
  StartLiveTermsCheckbox,
} from './StartLivePrimitives';

export interface StartLiveSetupPayload {
  customer_name: string;
  customer_tax_id: string;
  customer_contact_phone?: string;
  /** null = el usuario eligió cargar la cuenta bancaria más tarde. */
  bank: { cbu: string; alias?: string } | null;
}

export interface StartLiveSetupDrawerProps {
  visible: boolean;
  busy?: boolean;
  /** Falta crear la tienda (nombre/CUIT/teléfono). */
  needsCustomer: boolean;
  /** Falta la cuenta bancaria. */
  needsPayout: boolean;
  /** CUIT ya guardado (tienda o cuenta de cobro): se precarga en vez de re-pedirlo. */
  initialTaxId?: string;
  onClose: () => void;
  onSubmit: (payload: StartLiveSetupPayload) => Promise<void>;
}

function normalizeCbu(raw: string): string {
  return raw.replace(/\D/g, '');
}

export const StartLiveSetupDrawer: React.FC<StartLiveSetupDrawerProps> = ({
  visible,
  busy,
  needsCustomer,
  needsPayout,
  initialTaxId = '',
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const knownFullName = `${user?.name ?? ''} ${user?.last_name ?? ''}`.trim();

  const [fullName, setFullName] = useState(knownFullName);
  const [taxId, setTaxId] = useState(initialTaxId);
  const [phone, setPhone] = useState('');
  const [cbu, setCbu] = useState('');
  const [alias, setAlias] = useState('');
  const [payoutLater, setPayoutLater] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && knownFullName) {
      setFullName((prev) => (prev.trim() ? prev : knownFullName));
    }
  }, [visible, knownFullName]);

  // El CUIT llega asíncrono (status/payout): precargarlo si el campo sigue vacío.
  useEffect(() => {
    if (visible && initialTaxId) {
      setTaxId((prev) => (prev.trim() ? prev : initialTaxId));
    }
  }, [visible, initialTaxId]);

  const cbuDigits = normalizeCbu(cbu);
  const bankOk = payoutLater || !needsPayout || cbuDigits.length === 22;
  const customerOk = !needsCustomer || (fullName.trim().length >= 2 && taxId.trim().length >= 8);
  // El CUIT también hace falta para la cuenta bancaria aunque la tienda ya exista.
  const taxForBankOk = needsCustomer || payoutLater || !needsPayout || taxId.trim().length >= 8;
  const canSubmit = customerOk && bankOk && taxForBankOk && !busy;

  const handleSubmit = async () => {
    setError(null);
    try {
      await onSubmit({
        customer_name: fullName.trim(),
        customer_tax_id: taxId.trim(),
        customer_contact_phone: phone.trim() || undefined,
        bank: payoutLater || !needsPayout ? null : { cbu: cbuDigits, alias: alias.trim() || undefined },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('startLive.upgradeError'));
    }
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('startLive.setupTitle')}
      onClose={onClose}
      {...startLiveFullSheetProps}
      contentContainerStyle={startLiveStyles.sheetContent}
      scrollEnabled
      dismissOnBackdropPress={false}
    >
      <RNText style={startLiveStyles.subtitle}>{t('startLive.setupSubtitle')}</RNText>

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
        {needsCustomer ? (
          <StartLivePillField
            label={t('startLive.upgradePhone')}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('startLive.upgradePhonePlaceholder')}
            keyboardType="phone-pad"
          />
        ) : null}

        {needsPayout ? (
          <>
            <RNText style={[startLiveStyles.subtitle, { marginTop: 12 }]}>
              {t('startLive.setupBankSection')}
            </RNText>
            {!payoutLater ? (
              <>
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
                <StartLiveConsentNote text={t('startLive.bankConsent')} />
              </>
            ) : null}
            <StartLiveTermsCheckbox
              checked={payoutLater}
              label={t('startLive.payoutLater')}
              onToggle={() => setPayoutLater((v) => !v)}
            />
          </>
        ) : null}

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
