import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { AppTextInput } from '../../../atoms/AppTextInput';
import { useTranslation } from 'react-i18next';
import { Check, Eye, EyeOff } from 'lucide-react-native';
import { StreamBottomSheet, streamSheetStyles } from '../StreamBottomSheet';
import { cardBrandLabel } from './StreamPaymentMethodsDrawer';
import { CountrySelect } from '../../../molecules/CountrySelect/CountrySelect';
import { FONT_FAMILY } from '../../../../theme/typography';
import { themeColors } from '../../../../theme/colors';
import {
  createMpCardToken,
  detectPaymentMethod,
  MpCardTokenError,
} from '../../../../utils/mpCardTokenizer';
import {
  createSavedCard,
  getPublicPaymentsConfig,
  type CardCreatePayload,
} from '../../../../api/paymentsApi';
import { ApiError } from '../../../../api';
import { appAlert } from '../../../../alerts';

export interface StreamAddCardDrawerProps {
  visible: boolean;
  onClose: () => void;
  payerEmail?: string;
  setAsDefault?: boolean;
  onSaved: (card: import('../../../../api/paymentsApi').SavedCard) => void;
}


/** "5031755734530604" → "5031 7557 3453 0604" (hasta 19 dígitos). */
function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

/** Dígitos → "MM/AA" con la barra automática. */
function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** "MM/AA" | "MM/AAAA" → {month, year(4 dígitos)} o null si no es válida. */
function parseExpiry(value: string): { month: number; year: number } | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 4 && digits.length !== 6) return null;
  const month = parseInt(digits.slice(0, 2), 10);
  const year =
    digits.length === 4 ? 2000 + parseInt(digits.slice(2), 10) : parseInt(digits.slice(2), 10);
  if (!month || month < 1 || month > 12) return null;
  return { month, year };
}

export const StreamAddCardDrawer: React.FC<StreamAddCardDrawerProps> = ({
  visible,
  onClose,
  payerEmail,
  setAsDefault = true,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Argentina');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cvcVisible, setCvcVisible] = useState(false);
  const [detectedBrand, setDetectedBrand] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setLoadingConfig(true);
      setPublicKey(null);
      setCardholderName('');
      setIdentificationNumber('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setPostalCode('');
      setTermsAccepted(false);
      setCvcVisible(false);
      setDetectedBrand(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getPublicPaymentsConfig();
        if (cancelled) return;
        if (!cfg.public_key?.trim()) {
          appAlert(t('common.appName'), t('stream.wallet.mpNotConfigured'));
          onClose();
          return;
        }
        setPublicKey(cfg.public_key);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : t('stream.wallet.loadConfigError');
          appAlert(t('common.appName'), msg);
          onClose();
        }
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, onClose, t]);

  /**
   * Marca en vivo dentro del input del número (Figma 1196-10085). Se consulta una vez
   * por BIN (6 dígitos): la misma API que valida al enviar, sin repetir por tecla.
   */
  const bin = cardNumber.replace(/\D/g, '').slice(0, 6);
  useEffect(() => {
    if (!publicKey || bin.length < 6) {
      setDetectedBrand(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const method = await detectPaymentMethod(publicKey, bin);
        if (!cancelled) {
          setDetectedBrand(method ? cardBrandLabel(method.id) : null);
        }
      } catch {
        if (!cancelled) setDetectedBrand(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey, bin]);

  /** Códigos de `cause` de la API de tokenización → mensaje accionable. */
  const mpCauseMessage = useCallback(
    (codes: string[]): string | null => {
      for (const code of codes) {
        switch (code) {
          case 'E301':
            return t('stream.wallet.cardErrorNumber');
          case 'E302':
            return t('stream.wallet.cardErrorCvc');
          case '316':
            return t('stream.wallet.cardErrorName');
          case '324':
            return t('stream.wallet.cardErrorDoc');
          case '325':
          case '326':
            return t('stream.wallet.cardErrorExpiry');
          default:
            break;
        }
      }
      return null;
    },
    [t]
  );

  const handleSubmit = useCallback(async () => {
    if (saving || loadingConfig || !publicKey) return;
    if (!cardholderName.trim()) {
      appAlert(t('common.appName'), t('stream.wallet.cardholderRequired'));
      return;
    }
    if (!identificationNumber.trim()) {
      appAlert(t('common.appName'), t('stream.wallet.docNumberRequired'));
      return;
    }
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13) {
      appAlert(t('common.appName'), t('stream.wallet.cardNumberInvalid'));
      return;
    }
    const expiry = parseExpiry(cardExpiry);
    if (!expiry) {
      appAlert(t('common.appName'), t('stream.wallet.cardExpiryInvalid'));
      return;
    }
    const cvc = cardCvc.replace(/\D/g, '');
    if (cvc.length < 3) {
      appAlert(t('common.appName'), t('stream.wallet.cardCvcInvalid'));
      return;
    }
    if (!termsAccepted) {
      appAlert(t('common.appName'), t('stream.wallet.termsRequired'));
      return;
    }

    setSaving(true);
    try {
      const paymentMethod = await detectPaymentMethod(publicKey, digits.slice(0, 6));
      if (!paymentMethod) {
        appAlert(t('common.appName'), t('stream.wallet.cardBinUnknown'));
        return;
      }
      const mpToken = await createMpCardToken(publicKey, {
        cardNumber: digits,
        cardholderName: cardholderName.trim(),
        expirationMonth: expiry.month,
        expirationYear: expiry.year,
        securityCode: cvc,
        identificationType: 'DNI',
        identificationNumber: identificationNumber.trim(),
      });
      const payload: CardCreatePayload = {
        token: mpToken.id,
        payment_method_id: paymentMethod.id,
        issuer_id: paymentMethod.issuerId ?? undefined,
        payer_email: payerEmail ?? undefined,
        cardholder_name: cardholderName.trim(),
        expiration_month: expiry.month,
        expiration_year: expiry.year,
        last_four: mpToken.lastFour ?? digits.slice(-4),
        set_default: setAsDefault,
      };
      const saved = await createSavedCard(payload);
      onSaved(saved);
    } catch (e) {
      if (e instanceof MpCardTokenError) {
        appAlert(t('common.appName'), mpCauseMessage(e.codes) ?? e.message);
      } else if (e instanceof ApiError) {
        appAlert(t('common.appName'), e.message);
      } else {
        appAlert(t('common.appName'), t('stream.wallet.saveCardError'));
      }
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    loadingConfig,
    publicKey,
    cardholderName,
    identificationNumber,
    cardNumber,
    cardExpiry,
    cardCvc,
    termsAccepted,
    payerEmail,
    setAsDefault,
    onSaved,
    mpCauseMessage,
    t,
  ]);

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.wallet.cardFormTitle')}
      onClose={onClose}
      dismissOnBackdropPress={false}
      bottomPanel={false}
      fullHeight
      /**
       * Sin Modal RN: dentro de un Modal el BlurView del GlassBackdrop no tiene la
       * pantalla detrás para difuminar y el fondo queda plano, distinto del resto de
       * los drawers. Montado en el portal raíz el glass difumina de verdad.
       */
      nativeModal={false}
      cancelLabel={t('common.cancel')}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            style={[streamSheetStyles.primaryBtn, (saving || loadingConfig) && styles.btnDisabled]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={saving || loadingConfig}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={themeColors.glass.text} />
            ) : (
              <RNText style={streamSheetStyles.primaryBtnText}>
                {t('stream.wallet.addCardSubmit')}
              </RNText>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <RNText style={streamSheetStyles.sectionLabel}>
        {t('stream.wallet.cardInfoSection')}
      </RNText>

      <Field label={t('stream.wallet.cardholderLabel')}>
        <AppTextInput
          style={styles.input}
          value={cardholderName}
          onChangeText={setCardholderName}
          placeholderTextColor={themeColors.glass.placeholder}
          placeholder={t('stream.wallet.cardholderPlaceholder')}
        />
      </Field>

      <Field label={t('stream.wallet.docNumberLabel')}>
        <AppTextInput
          style={styles.input}
          value={identificationNumber}
          onChangeText={setIdentificationNumber}
          keyboardType="number-pad"
          placeholderTextColor={themeColors.glass.placeholder}
          placeholder={t('stream.wallet.docNumberPlaceholder')}
        />
      </Field>

      <Field label={t('stream.wallet.cardNumberLabel')}>
        <View style={styles.inputRow}>
          <AppTextInput
            style={styles.inputBare}
            value={cardNumber}
            onChangeText={(v) => setCardNumber(formatCardNumber(v))}
            keyboardType="number-pad"
            autoComplete="cc-number"
            maxLength={23}
            placeholderTextColor={themeColors.glass.placeholder}
            placeholder={t('stream.wallet.cardNumberPlaceholder')}
          />
          {/* El Figma pone el isologo de la marca (148-1738); el proyecto no tiene esos
             assets y no se descargan de terceros: se muestra la marca como texto. */}
          {detectedBrand ? (
            <View style={styles.brandBadge}>
              <RNText style={styles.brandBadgeText}>{detectedBrand}</RNText>
            </View>
          ) : null}
        </View>
      </Field>

      <Field label={t('stream.wallet.cardExpiryLabel')}>
        <AppTextInput
          style={styles.input}
          value={cardExpiry}
          onChangeText={(v) => setCardExpiry(formatExpiry(v))}
          keyboardType="number-pad"
          maxLength={5}
          placeholderTextColor={themeColors.glass.placeholder}
          placeholder="00/00"
        />
      </Field>

      <Field label={t('stream.wallet.cardCvcLabel')}>
        <View style={styles.inputRow}>
          <AppTextInput
            style={styles.inputBare}
            value={cardCvc}
            onChangeText={(v) => setCardCvc(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry={!cvcVisible}
            placeholderTextColor={themeColors.glass.placeholder}
            placeholder="000"
          />
          <TouchableOpacity
            onPress={() => setCvcVisible((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t(
              cvcVisible ? 'stream.wallet.cardCvcHideA11y' : 'stream.wallet.cardCvcShowA11y'
            )}
          >
            {cvcVisible ? (
              <Eye size={18} color={themeColors.glass.text} strokeWidth={2} />
            ) : (
              <EyeOff size={18} color={themeColors.glass.text} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </Field>

      <RNText style={streamSheetStyles.sectionLabel}>
        {t('stream.wallet.billingSection')}
      </RNText>

      <Field label={t('stream.wallet.countryLabel')}>
        <CountrySelect
          value={country}
          onValueChange={setCountry}
          variant="pillDark"
          hideLabel
          modalTitle={t('account.shippingAddress.country')}
          searchPlaceholder={t('account.shippingAddress.countrySearch')}
          /* Este drawer ya está en el portal raíz: el picker acompaña para no abrir una
             ventana nativa aparte, donde su glass no tendría nada que difuminar. */
          nativeModal={false}
        />
      </Field>

      <Field label={t('stream.wallet.postalLabel')}>
        <AppTextInput
          style={styles.input}
          value={postalCode}
          onChangeText={setPostalCode}
          keyboardType="number-pad"
          placeholderTextColor={themeColors.glass.placeholder}
          placeholder="000000"
        />
      </Field>

      <TouchableOpacity
        style={styles.termsRow}
        onPress={() => setTermsAccepted((v) => !v)}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityLabel={t('stream.wallet.termsText')}
        accessibilityState={{ checked: termsAccepted }}
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
          {termsAccepted ? <Check size={12} color={themeColors.glass.text} /> : null}
        </View>
        <RNText style={styles.termsText}>{t('stream.wallet.termsText')}</RNText>
      </TouchableOpacity>
    </StreamBottomSheet>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <RNText style={styles.fieldLabel}>{label}</RNText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  input: {
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: themeColors.glass.text,
    backgroundColor: themeColors.glass.inputBg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    backgroundColor: themeColors.glass.inputBg,
  },
  inputBare: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: themeColors.glass.text,
  },
  brandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: themeColors.glass.inputBg,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
  },
  brandBadgeText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    lineHeight: 14,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: themeColors.success,
    borderColor: themeColors.success,
  },
  termsText: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  footer: {
    paddingBottom: 8,
    // `footerArea` centra a sus hijos: sin ancho propio este View se encoge al texto
    // y el botón (width 100%) sale angosto en vez de ocupar el drawer.
    width: '100%',
  },
  btnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
});
