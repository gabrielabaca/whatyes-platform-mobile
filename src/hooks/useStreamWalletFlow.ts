import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getShippingAddress } from '../api/shippingAddressApi';
import {
  createMpWalletConnectSession,
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

export type WalletStep =
  | 'closed'
  | 'intro'
  | 'hub'
  | 'shipping'
  | 'kyc'
  | 'methods'
  | 'cardForm'
  | 'success';

function hasShippingData(addr: {
  full_name?: string | null;
  address_line1?: string | null;
  country?: string | null;
}): boolean {
  return Boolean(
    addr.full_name?.trim() && addr.address_line1?.trim() && addr.country?.trim()
  );
}

export function useStreamWalletFlow() {
  const { t } = useTranslation();
  const { user, refreshAuth } = useAuth();
  const [step, setStep] = useState<WalletStep>('closed');
  const [hubLoading, setHubLoading] = useState(false);
  const [hasShipping, setHasShipping] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [preferredOrigin, setPreferredOrigin] = useState<PreferredPaymentOrigin | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [successPaymentMethod, setSuccessPaymentMethod] = useState<SuccessPaymentMethod | null>(null);
  const [mpConnectVisible, setMpConnectVisible] = useState(false);
  const [mpConnectSession, setMpConnectSession] = useState<MpWalletConnectSession | null>(null);
  const [mpConnectLoading, setMpConnectLoading] = useState(false);

  const refreshHubState = useCallback(async () => {
    setHubLoading(true);
    try {
      const [shipping, cardList, pref] = await Promise.all([
        getShippingAddress().catch(() => ({})),
        listSavedCards().catch(() => [] as SavedCard[]),
        storage.getPreferredPaymentOrigin(),
      ]);
      setHasShipping(hasShippingData(shipping));
      setHasPayment(cardList.length > 0 || pref === 'MP_WALLET');
      setCards(cardList);
      setPreferredOrigin(pref);
    } finally {
      setHubLoading(false);
    }
  }, []);

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

  const openPayment = useCallback(async () => {
    const verified = await isKycVerified();
    if (!verified) {
      setStep('kyc');
      return;
    }
    setStep('methods');
    await refreshHubState();
  }, [isKycVerified, refreshHubState]);

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

  const selectMpWallet = useCallback(async () => {
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
      Alert.alert(t('common.appName'), msg);
    } finally {
      setMpConnectLoading(false);
    }
  }, [t, user?.email]);

  const onMpWalletConnectReturn = useCallback(
    (status: MpWalletReturnStatus) => {
      setMpConnectVisible(false);
      setMpConnectSession(null);
      if (status === 'success') {
        void finishMpWalletLink();
        return;
      }
      if (status === 'pending') {
        Alert.alert(t('common.appName'), t('stream.wallet.mpConnectPending'));
        setStep('methods');
        return;
      }
      Alert.alert(t('common.appName'), t('stream.wallet.mpConnectFailure'));
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
    cards,
    preferredOrigin,
    successMessage,
    shippingActionLabel,
    paymentActionLabel,
    openWallet,
    closeAll,
    goToHub,
    returnToHub,
    openShipping,
    onShippingSaved,
    openPayment,
    onKycVerified,
    openCardForm,
    onCardSaved,
    selectMpWallet,
    selectCard,
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
