import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { StreamBottomSheet, streamSheetStyles } from '../StreamBottomSheet';
import { FONT_FAMILY } from '../../../../theme/typography';
import { getMercadoPagoCardFormHtml } from '../../../../utils/mercadoPagoCardFormHtml';
import {
  createSavedCard,
  getPublicPaymentsConfig,
  type CardCreatePayload,
} from '../../../../api/paymentsApi';
import { ApiError } from '../../../../api';

export interface StreamAddCardDrawerProps {
  visible: boolean;
  onClose: () => void;
  payerEmail?: string;
  setAsDefault?: boolean;
  onSaved: (card: import('../../../../api/paymentsApi').SavedCard) => void;
}

type MpTokenMessage = {
  type: string;
  token?: string;
  paymentMethodId?: string;
  issuerId?: string | null;
  cardholderName?: string | null;
  expirationMonth?: number | null;
  expirationYear?: number | null;
  lastFour?: string | null;
  message?: string;
};

export const StreamAddCardDrawer: React.FC<StreamAddCardDrawerProps> = ({
  visible,
  onClose,
  payerEmail,
  setAsDefault = true,
  onSaved,
}) => {
  const { t } = useTranslation();
  const webRef = useRef<WebView>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [mpReady, setMpReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Argentina');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [webViewActive, setWebViewActive] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLoadingConfig(true);
      setMpReady(false);
      setPublicKey(null);
      setCardholderName('');
      setIdentificationNumber('');
      setPostalCode('');
      setTermsAccepted(false);
      setWebViewActive(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getPublicPaymentsConfig();
        if (cancelled) return;
        if (!cfg.public_key?.trim()) {
          Alert.alert(t('common.appName'), t('stream.wallet.mpNotConfigured'));
          onClose();
          return;
        }
        setPublicKey(cfg.public_key);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : t('stream.wallet.loadConfigError');
          Alert.alert(t('common.appName'), msg);
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

  const saveCard = useCallback(
    async (mp: MpTokenMessage) => {
      if (!mp.token || !mp.paymentMethodId) {
        Alert.alert(t('common.appName'), t('stream.wallet.tokenError'));
        return;
      }
      const payload: CardCreatePayload = {
        token: mp.token,
        payment_method_id: mp.paymentMethodId,
        issuer_id: mp.issuerId ?? undefined,
        payer_email: payerEmail ?? undefined,
        cardholder_name: cardholderName.trim() || mp.cardholderName || undefined,
        expiration_month: mp.expirationMonth ?? undefined,
        expiration_year: mp.expirationYear ?? undefined,
        last_four: mp.lastFour ?? undefined,
        set_default: setAsDefault,
      };
      setSaving(true);
      try {
        const saved = await createSavedCard(payload);
        onSaved(saved);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : t('stream.wallet.saveCardError');
        Alert.alert(t('common.appName'), msg);
      } finally {
        setSaving(false);
      }
    },
    [cardholderName, onSaved, payerEmail, setAsDefault, t]
  );

  const onWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as MpTokenMessage;
        if (data.type === 'ready') {
          setMpReady(true);
          return;
        }
        if (data.type === 'error') {
          Alert.alert(t('common.appName'), data.message || t('stream.wallet.tokenError'));
          return;
        }
        if (data.type === 'token') {
          void saveCard(data);
        }
      } catch {
        // ignore parse errors
      }
    },
    [saveCard, t]
  );

  const handleSubmit = () => {
    if (!cardholderName.trim()) {
      Alert.alert(t('common.appName'), t('stream.wallet.cardholderRequired'));
      return;
    }
    if (!termsAccepted) {
      Alert.alert(t('common.appName'), t('stream.wallet.termsRequired'));
      return;
    }
    if (!identificationNumber.trim()) {
      Alert.alert(t('common.appName'), t('stream.wallet.docNumberRequired'));
      return;
    }
    if (!mpReady) {
      Alert.alert(t('common.appName'), t('stream.wallet.mpNotReady'));
      return;
    }
    const submitOpts = JSON.stringify({
      cardholderName: cardholderName.trim(),
      identificationNumber: identificationNumber.trim(),
    });
    webRef.current?.injectJavaScript(
      `window.submitMpCardForm && window.submitMpCardForm(${submitOpts}); true;`
    );
  };

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.wallet.cardFormTitle')}
      onClose={onClose}
      bottomPanel={false}
      scrollEnabled={!webViewActive}
      cancelLabel={t('common.cancel')}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            style={[streamSheetStyles.primaryBtn, (saving || loadingConfig) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={saving || loadingConfig}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
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
        <TextInput
          style={styles.input}
          value={cardholderName}
          onChangeText={setCardholderName}
          placeholderTextColor="rgba(255,255,255,0.45)"
          placeholder={t('stream.wallet.cardholderPlaceholder')}
        />
      </Field>

      <Field label={t('stream.wallet.docNumberLabel')}>
        <TextInput
          style={styles.input}
          value={identificationNumber}
          onChangeText={setIdentificationNumber}
          keyboardType="number-pad"
          placeholderTextColor="rgba(255,255,255,0.45)"
          placeholder={t('stream.wallet.docNumberPlaceholder')}
        />
      </Field>

      {loadingConfig || !publicKey ? (
        <ActivityIndicator color="#FFFFFF" style={styles.loader} />
      ) : (
        <View
          style={styles.webviewWrap}
          collapsable={false}
          onTouchStart={() => setWebViewActive(true)}
          onTouchEnd={() => setWebViewActive(false)}
          onTouchCancel={() => setWebViewActive(false)}
        >
          <WebView
            ref={webRef}
            source={{ html: getMercadoPagoCardFormHtml(publicKey) }}
            onMessage={onWebMessage}
            scrollEnabled={false}
            nestedScrollEnabled
            collapsable={false}
            overScrollMode="never"
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            allowsInlineMediaPlayback
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView={false}
          />
          {!mpReady ? (
            <View style={styles.webviewLoading} pointerEvents="none">
              <ActivityIndicator color="#FFFFFF" size="small" />
            </View>
          ) : null}
        </View>
      )}

      <RNText style={streamSheetStyles.sectionLabel}>
        {t('stream.wallet.billingSection')}
      </RNText>

      <Field label={t('stream.wallet.countryLabel')}>
        <TextInput
          style={styles.input}
          value={country}
          onChangeText={setCountry}
          placeholderTextColor="rgba(255,255,255,0.45)"
        />
      </Field>

      <Field label={t('stream.wallet.postalLabel')}>
        <TextInput
          style={styles.input}
          value={postalCode}
          onChangeText={setPostalCode}
          keyboardType="number-pad"
          placeholderTextColor="rgba(255,255,255,0.45)"
        />
      </Field>

      <TouchableOpacity
        style={styles.termsRow}
        onPress={() => setTermsAccepted((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
          {termsAccepted ? <Check size={12} color="#FFFFFF" /> : null}
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
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  webviewWrap: {
    height: 260,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  loader: {
    marginVertical: 16,
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
    borderColor: '#DDDDDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: '#00C566',
    borderColor: '#00C566',
  },
  termsText: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
