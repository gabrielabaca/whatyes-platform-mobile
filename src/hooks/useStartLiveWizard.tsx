/**
 * Máquina de estados del asistente FAB para iniciar subasta (vendedor).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getPayoutAccount } from '../api/paymentsApi';
import {
  getSellerOnboardingStatus,
  submitLiveSetupSurvey,
  upgradeToSeller,
  type SellerOnboardingStatus,
} from '../api/sellerOnboardingApi';
import type { StreamConfig } from '../components/pages/StreamConfigScreen';
import { storage } from '../utils/storage';
import { useAuth } from './useAuth';

export type StartLiveWizardStep =
  | 'welcome1'
  | 'welcome2'
  | 'categories'
  | 'firstAuction'
  | 'sellerUpgrade'
  | 'bankPrompt'
  | 'bankForm'
  | 'ready'
  | 'closed';

export interface StartLiveWizardContextValue {
  step: StartLiveWizardStep;
  isOpen: boolean;
  categoryUuids: string[];
  isFirstAuction: boolean | null;
  onboarding: SellerOnboardingStatus | null;
  hasPayoutAccount: boolean;
  busy: boolean;
  open: () => Promise<void>;
  close: () => void;
  setCategoryUuids: (uuids: string[]) => void;
  completeWelcome1: () => Promise<void>;
  completeWelcome2: () => Promise<void>;
  completeCategories: (uuids: string[]) => Promise<void>;
  completeFirstAuction: (isFirst: boolean) => Promise<void>;
  completeSellerUpgrade: (payload: {
    customer_name: string;
    customer_tax_id?: string;
    customer_contact_phone?: string;
  }) => Promise<void>;
  completeBankPrompt: (hasLocalAccount: boolean) => void;
  completeBankForm: () => Promise<void>;
  finishAndStartLive: () => StreamConfig | null;
}

const StartLiveWizardContext = createContext<StartLiveWizardContextValue | null>(null);

function stepAfterSurvey(
  onboarding: SellerOnboardingStatus,
  _isFirst: boolean | null,
  hasPayout: boolean
): StartLiveWizardStep {
  // Nadie puede transmitir sin tienda asociada (datos fiscales del seller upgrade):
  // las cuentas nacen como seller pero sin customer, así que se decide por
  // customer_uuid y no por user_type.
  if (onboarding.user_type === 'buyer_user' || !onboarding.customer_uuid) {
    return 'sellerUpgrade';
  }
  if (!hasPayout) {
    return 'bankPrompt';
  }
  return 'ready';
}

export const StartLiveWizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, reloadUser } = useAuth();
  const [step, setStep] = useState<StartLiveWizardStep>('closed');
  const [categoryUuids, setCategoryUuids] = useState<string[]>([]);
  const [isFirstAuction, setIsFirstAuction] = useState<boolean | null>(null);
  const [onboarding, setOnboarding] = useState<SellerOnboardingStatus | null>(null);
  const [hasPayoutAccount, setHasPayoutAccount] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshRemoteState = useCallback(async () => {
    const [status, payout] = await Promise.all([
      getSellerOnboardingStatus(),
      getPayoutAccount(),
    ]);
    setOnboarding(status);
    setHasPayoutAccount(!!payout);
    if (status.is_first_live_auction != null) {
      setIsFirstAuction(status.is_first_live_auction);
    }
    return { status, hasPayout: !!payout };
  }, []);

  const resolveEntryStep = useCallback(
    async (status: SellerOnboardingStatus, hasPayout: boolean) => {
      const step1 = await storage.getSellerLiveWelcomeStep1Seen();
      if (!step1) {
        setStep('welcome1');
        return;
      }
      const terms = await storage.getSellerLiveWelcomeTermsSeen();
      if (!terms) {
        setStep('welcome2');
        return;
      }
      setStep('categories');
    },
    []
  );

  const open = useCallback(async () => {
    setBusy(true);
    try {
      const { status, hasPayout } = await refreshRemoteState();
      await resolveEntryStep(status, hasPayout);
    } catch {
      setStep('welcome1');
    } finally {
      setBusy(false);
    }
  }, [refreshRemoteState, resolveEntryStep]);

  const close = useCallback(() => {
    setStep('closed');
  }, []);

  const advanceAfterCategories = useCallback(
    async (uuids: string[], status: SellerOnboardingStatus, hasPayout: boolean) => {
      setCategoryUuids(uuids);
      if (!status.live_setup_survey_completed) {
        setStep('firstAuction');
        return;
      }
      const first =
        status.is_first_live_auction ?? isFirstAuction;
      setStep(stepAfterSurvey(status, first, hasPayout));
    },
    [isFirstAuction]
  );

  const completeWelcome1 = useCallback(async () => {
    await storage.setSellerLiveWelcomeStep1Seen(true);
    setStep('welcome2');
  }, []);

  const completeWelcome2 = useCallback(async () => {
    await storage.setSellerLiveWelcomeTermsSeen(true);
    setStep('categories');
  }, []);

  const completeCategories = useCallback(
    async (uuids: string[]) => {
      setBusy(true);
      try {
        const { status, hasPayout } = await refreshRemoteState();
        await advanceAfterCategories(uuids, status, hasPayout);
      } finally {
        setBusy(false);
      }
    },
    [advanceAfterCategories, refreshRemoteState]
  );

  const completeFirstAuction = useCallback(
    async (isFirst: boolean) => {
      setBusy(true);
      try {
        setIsFirstAuction(isFirst);
        const status = await submitLiveSetupSurvey(isFirst);
        setOnboarding(status);
        const payout = await getPayoutAccount();
        setHasPayoutAccount(!!payout);
        setStep(stepAfterSurvey(status, isFirst, !!payout));
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const completeSellerUpgrade = useCallback(
    async (payload: {
      customer_name: string;
      customer_tax_id?: string;
      customer_contact_phone?: string;
    }) => {
      setBusy(true);
      try {
        await upgradeToSeller(payload);
        await reloadUser();
        const payout = await getPayoutAccount();
        setHasPayoutAccount(!!payout);
        const status = await getSellerOnboardingStatus();
        setOnboarding(status);
        if (!payout) {
          setStep('bankPrompt');
        } else {
          setStep('ready');
        }
      } finally {
        setBusy(false);
      }
    },
    [reloadUser]
  );

  const completeBankPrompt = useCallback((hasLocalAccount: boolean) => {
    if (hasLocalAccount) {
      setStep('bankForm');
    } else {
      setStep('ready');
    }
  }, []);

  const completeBankForm = useCallback(async () => {
    const payout = await getPayoutAccount();
    setHasPayoutAccount(!!payout);
    setStep('ready');
  }, []);

  const finishAndStartLive = useCallback((): StreamConfig | null => {
    const displayName =
      user?.name?.trim() ||
      [user?.name, user?.last_name].filter(Boolean).join(' ').trim() ||
      'Mi show';
    const config: StreamConfig = {
      title: displayName,
      description: '',
      products: [],
      interestCategoryUuids: categoryUuids,
    };
    setStep('closed');
    return config;
  }, [categoryUuids, user]);

  const value = useMemo(
    () => ({
      step,
      isOpen: step !== 'closed',
      categoryUuids,
      isFirstAuction,
      onboarding,
      hasPayoutAccount,
      busy,
      open,
      close,
      setCategoryUuids,
      completeWelcome1,
      completeWelcome2,
      completeCategories,
      completeFirstAuction,
      completeSellerUpgrade,
      completeBankPrompt,
      completeBankForm,
      finishAndStartLive,
    }),
    [
      step,
      categoryUuids,
      isFirstAuction,
      onboarding,
      hasPayoutAccount,
      busy,
      open,
      close,
      completeWelcome1,
      completeWelcome2,
      completeCategories,
      completeFirstAuction,
      completeSellerUpgrade,
      completeBankPrompt,
      completeBankForm,
      finishAndStartLive,
    ]
  );

  return (
    <StartLiveWizardContext.Provider value={value}>{children}</StartLiveWizardContext.Provider>
  );
};

export function useStartLiveWizard(): StartLiveWizardContextValue {
  const ctx = useContext(StartLiveWizardContext);
  if (!ctx) {
    throw new Error('useStartLiveWizard must be used within StartLiveWizardProvider');
  }
  return ctx;
}
