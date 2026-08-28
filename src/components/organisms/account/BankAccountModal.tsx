/**
 * Cuenta bancaria de cobro (CBU) — referencia visual: StartLiveSetupDrawer
 * (needsPayout). El nodo Figma 1198:10443 es un duplicado del alta de tarjeta
 * y no se implementa.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  GlassFullScreenModal,
  type GlassFullScreenModalHandle,
} from '../profile/GlassFullScreenModal';
import { GlassModalHeader } from '../profile/GlassModalHeader';
import { StartLiveConsentNote, StartLivePillField } from '../startLive/StartLivePrimitives';
import { startLiveStyles } from '../startLive/startLiveStyles';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../../../api/authApi';
import { getPayoutAccount, upsertPayoutAccount } from '../../../api/paymentsApi';
import { getSellerOnboardingStatus } from '../../../api/sellerOnboardingApi';
import { CBU_LENGTH, normalizeCbu } from '../../../utils/cbu';
import { appAlert } from '../../../alerts';

export interface BankAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const BankAccountModal: React.FC<BankAccountModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const modalRef = useRef<GlassFullScreenModalHandle>(null);
  const { user } = useAuth();

  const knownFullName = `${user?.name ?? ''} ${user?.last_name ?? ''}`.trim();

  const [holder, setHolder] = useState(knownFullName);
  const [taxId, setTaxId] = useState('');
  const [alias, setAlias] = useState('');
  const [bankName, setBankName] = useState('');
  const [cbu, setCbu] = useState('');
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSubmitError(null);
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [account, onboarding] = await Promise.all([
          getPayoutAccount(),
          getSellerOnboardingStatus().catch(() => null),
        ]);
        if (cancelled) {
          return;
        }
        if (account) {
          setHolder(account.account_holder);
          setTaxId(account.tax_id);
          setAlias(account.alias ?? '');
          setBankName(account.bank_name ?? '');
          setCbu(account.cbu);
          setExists(true);
        } else {
          setHolder(knownFullName);
          setTaxId((onboarding?.customer_tax_id ?? '').trim());
          setAlias('');
          setBankName('');
          setCbu('');
          setExists(false);
        }
      } catch {
        if (!cancelled) {
          setHolder(knownFullName);
          setTaxId('');
          setAlias('');
          setBankName('');
          setCbu('');
          setExists(false);
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
  }, [visible, knownFullName]);

  const cbuDigits = normalizeCbu(cbu);
  const cbuOk = cbuDigits.length === CBU_LENGTH;
  const showCbuHint = cbu.trim().length > 0 && !cbuOk;
  const canSubmit =
    holder.trim().length > 0 && taxId.trim().length >= 8 && cbuOk && !saving && !loading;

  const handleClose = () => {
    modalRef.current?.dismiss();
  };

  const handleSave = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitError(null);
    setSaving(true);
    try {
      await upsertPayoutAccount({
        account_holder: holder.trim(),
        tax_id: taxId.trim(),
        alias: alias.trim() || null,
        bank_name: bankName.trim() || null,
        cbu: cbuDigits,
      });
      onSaved?.();
      handleClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('account.bankAccount.saveError');
      setSubmitError(msg);
      appAlert(t('common.appName'), msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassFullScreenModal
      ref={modalRef}
      visible={visible}
      onClose={onClose}
      backdropAccessibilityLabel={t('account.bankAccount.cancel')}
      dismissOnBackdropPress={false}
      hideFooterOnKeyboard
      header={
        <GlassModalHeader
          title={t('account.bankAccount.title')}
          onClose={handleClose}
          closeDisabled={saving}
        />
      }
      footer={
        !loading ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.saveBtn, (!canSubmit || saving) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSubmit || saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color={themeColors.glass.text} />
              ) : (
                <RNText style={styles.saveBtnText}>
                  {t(exists ? 'account.bankAccount.save' : 'account.bankAccount.add')}
                </RNText>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <RNText style={styles.cancelText}>{t('account.bankAccount.cancel')}</RNText>
            </TouchableOpacity>
          </View>
        ) : null
      }
      contentContainerStyle={styles.scrollContent}
    >
      {loading ? (
        <ActivityIndicator color={themeColors.glass.text} style={styles.loader} />
      ) : (
        <View style={styles.form}>
          <StartLivePillField
            label={t('account.bankAccount.holder')}
            value={holder}
            onChangeText={setHolder}
            placeholder={t('startLive.addressFullNamePlaceholder')}
          />
          <StartLivePillField
            label={t('account.bankAccount.taxId')}
            value={taxId}
            onChangeText={setTaxId}
            placeholder={t('startLive.upgradeTaxIdPlaceholder')}
            keyboardType="number-pad"
          />
          <StartLivePillField
            label={t('account.bankAccount.alias')}
            value={alias}
            onChangeText={setAlias}
            placeholder={t('account.bankAccount.aliasPlaceholder')}
            autoCapitalize="none"
          />
          <StartLivePillField
            label={t('account.bankAccount.bankName')}
            value={bankName}
            onChangeText={setBankName}
            placeholder={t('account.bankAccount.bankNamePlaceholder')}
          />
          <StartLivePillField
            label={t('startLive.bankCbu')}
            value={cbu}
            onChangeText={(v) => {
              setCbu(v);
              setSubmitError(null);
            }}
            placeholder={t('startLive.bankCbuPlaceholder')}
            keyboardType="number-pad"
            maxLength={30}
          />
          {showCbuHint ? (
            <RNText style={startLiveStyles.error}>{t('account.bankAccount.cbuHint')}</RNText>
          ) : null}
          {submitError ? <RNText style={startLiveStyles.error}>{submitError}</RNText> : null}
          <StartLiveConsentNote text={t('account.bankAccount.consent')} />
        </View>
      )}
    </GlassFullScreenModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  loader: {
    marginVertical: 32,
  },
  form: {
    paddingHorizontal: 24,
    gap: 12,
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
