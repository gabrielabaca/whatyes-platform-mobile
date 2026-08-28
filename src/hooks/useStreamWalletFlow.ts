import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getShippingAddress } from '../api/shippingAddressApi';
import { hasUsableShippingAddress } from '../utils/shippingAddress';
import {
  createMpWalletConnectSession,
  deleteSavedCard,
  getPublicPaymentsConfig,
  getPayoutAccount,
  listSavedCards,
  type MpWalletConnectSession,
  type SavedCard,
} from '../api/paymentsApi';
import type { SuccessPaymentMethod } from '../components/organisms/stream/wallet/StreamWalletSuccessDrawer';
import { ApiError } from '../api';
import {
  MP_WALLET_LINK_FAILURE_URL,
  MP_WALLET_LINK_PENDING_URL,
  MP_WALLET_LINK_SUCCESS_URL,
  type MpWalletReturnStatus,
} from '../utils/mpWalletDeepLink';
import { getBuyerKycStatus, getCurrentUser } from '../api';
import type { UserMe } from '../api/types';
import { storage, type PreferredPaymentOrigin } from '../utils/storage';
import { useAuth } from './useAuth';
import { appAlert } from '../alerts';

export type WalletStep =
  | 'closed'
  | 'intro'
  | 'hub'
  | 'shipping'
  | 'payout'
  | 'kyc'
  | 'methods'
  | 'cardForm'
  | 'success';

export function useStreamWalletFlow() {
  const { t } = useTranslation();
  const { user, refreshAuth } = useAuth();
  const [step, setStep] = useState<WalletStep>('closed');
  const [hubLoading, setHubLoading] = useState(false);
  const [hasShipping, setHasShipping] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const [hasPayout, setHasPayout] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [preferredOrigin, setPreferredOrigin] = useState<PreferredPaymentOrigin | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [successPaymentMethod, setSuccessPaymentMethod] = useState<SuccessPaymentMethod | null>(null);
  const [mpConnectVisible, setMpConnectVisible] = useState(false);
  const [mpConnectSession, setMpConnectSession] = useState<MpWalletConnectSession | null>(null);
  const [mpConnectLoading, setMpConnectLoading] = useState(false);
  const [walletLinkEnabled, setWalletLinkEnabled] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null);

  /**
   * Vincular MP solo cuenta como método de pago si el backend lo tiene habilitado:
   * mientras esté apagado no deja nada cobrable y el saga rebota con
   * NO_PAYMENT_METHOD (docs/plan-cobro-tarjeta-y-wallet.md, fase 0).
   */
  const resolveWalletLink = useCallback(async (): Promise<boolean> => {
    const enabled = await getPublicPaymentsConfig()
      .then((cfg) => cfg.wallet_link_enabled === true)
      .catch(() => false);
    setWalletLinkEnabled(enabled);
    if (!enabled && (await storage.getPreferredPaymentOrigin()) === 'MP_WALLET') {
      await storage.clearPreferredPaymentOrigin();
      setPreferredOrigin(null);
    }
    return enabled;
  }, []);

  const refreshHubState = useCallback(async () => {
    setHubLoading(true);
    try {
      const mpEnabled = await resolveWalletLink();
      const seller = user?.user_type === 'seller_user';
      const [shipping, cardList, pref, payout] = await Promise.all([
        getShippingAddress().catch(() => ({})),
        listSavedCards().catch(() => [] as SavedCard[]),
        storage.getPreferredPaymentOrigin(),
        seller ? getPayoutAccount().catch(() => null) : Promise.resolve(null),
      ]);
      setHasShipping(hasUsableShippingAddress(shipping));
      setHasPayment(cardList.length > 0 || (mpEnabled && pref === 'MP_WALLET'));
      setHasPayout(!!payout);
      setCards(cardList);
      setPreferredOrigin(pref);
    } finally {
      setHubLoading(false);
    }
  }, [resolveWalletLink, user?.user_type]);

  /**
   * Chequea (sin abrir el hub) si el usuario ya configuró domicilio de envío y
   * método de pago. Actualiza el estado del hub como efecto secundario.
   */
  const isWalletConfigured = useCallback(async (): Promise<boolean> => {
    const mpEnabled = await resolveWalletLink();
    const [shipping, cardList, pref] = await Promise.all([
      getShippingAddress().catch(() => ({})),
      listSavedCards().catch(() => [] as SavedCard[]),
      storage.getPreferredPaymentOrigin(),
    ]);
    const okShipping = hasUsableShippingAddress(shipping);
    const okPayment = cardList.length > 0 || (mpEnabled && pref === 'MP_WALLET');
    setHasShipping(okShipping);
    setHasPayment(okPayment);
    setCards(cardList);
    setPreferredOrigin(pref);
    return okShipping && okPayment;
  }, [resolveWalletLink]);

  const isKycVerified = useCallback(async (): Promise<boolean> => {
    const me = user as UserMe | null;
    if (me?.identity_kyc_verified) {
      return true;
    }
    try {
      const me = await getCurrentUser();
      if (me.data?.identity_kyc_verified) return true;
    } catch {
      // fall through
    }
    try {
      const status = await getBuyerKycStatus();
      return status.verified;
    } catch {
      return false;
    }
  }, [user]);

  const openWallet = useCallback(() => {
    setStep('intro');
  }, []);

  const closeAll = useCallback(() => {
    setStep('closed');
    setSuccessMessage(undefined);
    setMpConnectVisible(false);
    setMpConnectSession(null);
    setMpConnectLoading(false);
    setSuccessPaymentMethod(null);
    setCardToDelete(null);
  }, []);

  const goToHub = useCallback(async () => {
    setStep('hub');
    await refreshHubState();
  }, [refreshHubState]);

  const returnToHub = useCallback(async () => {
    setStep('hub');
    await refreshHubState();
  }, [refreshHubState]);

  const openShipping = useCallback(() => {
    setStep('shipping');
  }, []);

  const onShippingSaved = useCallback(async () => {
    setStep('hub');
    await refreshHubState();
  }, [refreshHubState]);

  const openPayout = useCallback(() => {
    setStep('payout');
  }, []);

  const onPayoutSaved = useCallback(async () => {
    setStep('hub');
    await refreshHubState();
  }, [refreshHubState]);

  /**
   * Entra directo a la lista de métodos (con KYC si falta). Lo usa el menú de
   * Cuenta ("Pagos"). El vivo llega al mismo paso desde el hub (`openPayment`).
   */
  const goToMethods = useCallback(async () => {
    const verified = await isKycVerified();
    if (!verified) {
      setStep('kyc');
      return;
    }
    setStep('methods');
    await refreshHubState();
  }, [isKycVerified, refreshHubState]);

  /** Desde el hub del vivo: mismo camino que `goToMethods`. */
  const openPayment = goToMethods;

  const onKycVerified = useCallback(async () => {
    await refreshAuth();
    setStep('methods');
    await refreshHubState();
  }, [refreshAuth, refreshHubState]);

  const openCardForm = useCallback(() => {
    setStep('cardForm');
  }, []);

  const onCardSaved = useCallback(async (card?: SavedCard) => {
    setSuccessPaymentMethod({
      type: 'card',
      network: card?.payment_method_id ?? null,
      lastFour: card?.last_four ?? null,
      saved: true,
    });
    setSuccessMessage(t('stream.wallet.successCardMessage'));
    setStep('success');
    await refreshHubState();
  }, [refreshHubState, t]);

  const finishMpWalletLink = useCallback(async () => {
    await storage.setPreferredPaymentOrigin('MP_WALLET');
    setPreferredOrigin('MP_WALLET');
    setHasPayment(true);
    setMpConnectVisible(false);
    setMpConnectSession(null);
    setSuccessPaymentMethod({ type: 'mp_wallet' });
    setSuccessMessage(t('stream.wallet.mpWalletLinked'));
    setStep('success');
  }, [t]);

  /**
   * `step` queda en 'methods' a propósito: el WebView de MP se abre encima y al cerrarlo
   * el usuario vuelve a la lista de métodos.
   *
   * Funciona porque el drawer de métodos es un panel inline, no un Modal nativo. Si algún
   * día se lo pasa a Modal (`fullHeight`, `bottomPanel={false}` o `nativeModal`), en iOS
   * el WebView dejaría de aparecer sin error: no se puede presentar un segundo modal desde
   * un VC que ya está presentando. En ese caso hay que cerrar el paso antes de abrir MP.
   */
  const selectMpWallet = useCallback(async () => {
    if (!(await resolveWalletLink())) {
      appAlert(t('common.appName'), t('stream.wallet.mpWalletUnavailable'));
      return;
    }
    setMpConnectLoading(true);
    setMpConnectVisible(true);
    setMpConnectSession(null);
    try {
      const session = await createMpWalletConnectSession({
        payer_email: user?.email ?? undefined,
        success_url: MP_WALLET_LINK_SUCCESS_URL,
        failure_url: MP_WALLET_LINK_FAILURE_URL,
        pending_url: MP_WALLET_LINK_PENDING_URL,
      });
      setMpConnectSession(session);
    } catch (e) {
      setMpConnectVisible(false);
      const msg = e instanceof ApiError ? e.message : t('stream.wallet.mpConnectError');
      appAlert(t('common.appName'), msg);
    } finally {
      setMpConnectLoading(false);
    }
  }, [resolveWalletLink, t, user?.email]);

  const onMpWalletConnectReturn = useCallback(
    (status: MpWalletReturnStatus) => {
      setMpConnectVisible(false);
      setMpConnectSession(null);
      if (status === 'success') {
        void finishMpWalletLink();
        return;
      }
      if (status === 'pending') {
        appAlert(t('common.appName'), t('stream.wallet.mpConnectPending'));
        setStep('methods');
        return;
      }
      appAlert(t('common.appName'), t('stream.wallet.mpConnectFailure'));
      setStep('methods');
    },
    [finishMpWalletLink, t]
  );

  const cancelMpWalletConnect = useCallback(() => {
    setMpConnectVisible(false);
    setMpConnectSession(null);
    setMpConnectLoading(false);
    setStep('methods');
  }, []);

  const confirmMpWalletTestAck = useCallback(() => {
    void finishMpWalletLink();
  }, [finishMpWalletLink]);

  /** Abre la confirmación por texto (Figma 1195:8992); no borra todavía. */
  const deleteCard = useCallback((card: SavedCard) => {
    setCardToDelete(card);
  }, []);

  const cancelDeleteCard = useCallback(() => {
    setCardToDelete(null);
  }, []);

  const confirmDeleteCard = useCallback(async () => {
    const card = cardToDelete;
    if (!card) {
      return;
    }
    try {
      await deleteSavedCard(card.uuid);
      setCardToDelete(null);
      // Si era la predeterminada, el estado de "método configurado" cambia.
      await refreshHubState();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('stream.wallet.deleteCardError');
      appAlert(t('common.appName'), msg);
    }
  }, [cardToDelete, refreshHubState, t]);

  const selectCard = useCallback(async (card: SavedCard) => {
    await storage.setPreferredPaymentOrigin('PLATFORM_CARD');
    setPreferredOrigin('PLATFORM_CARD');
    setHasPayment(true);
    setSuccessPaymentMethod({
      type: 'card',
      network: card.payment_method_id,
      lastFour: card.last_four,
    });
    setStep('success');
  }, []);

  const shippingActionLabel = hasShipping
    ? t('stream.wallet.modify')
    : t('stream.wallet.add');
  const paymentActionLabel = hasPayment
    ? t('stream.wallet.modify')
    : t('stream.wallet.add');
  const payoutActionLabel = hasPayout
    ? t('stream.wallet.modify')
    : t('stream.wallet.add');

  useEffect(() => {
    if (step === 'hub') {
      void refreshHubState();
    }
  }, [step, refreshHubState]);

  return {
    step,
    hubLoading,
    hasShipping,
    hasPayment,
    hasPayout,
    showPayoutRow: user?.user_type === 'seller_user',
    cards,
    preferredOrigin,
    walletLinkEnabled,
    successMessage,
    shippingActionLabel,
    paymentActionLabel,
    payoutActionLabel,
    openWallet,
    isWalletConfigured,
    closeAll,
    goToHub,
    goToMethods,
    returnToHub,
    openShipping,
    onShippingSaved,
    openPayout,
    onPayoutSaved,
    openPayment,
    onKycVerified,
    openCardForm,
    onCardSaved,
    selectMpWallet,
    selectCard,
    deleteCard,
    cardToDelete,
    cancelDeleteCard,
    confirmDeleteCard,
    successPaymentMethod,
    mpConnectVisible,
    mpConnectSession,
    mpConnectLoading,
    onMpWalletConnectReturn,
    cancelMpWalletConnect,
    confirmMpWalletTestAck,
    userEmail: user?.email,
  };
}
