/**
 * Máquina de estados del asistente FAB para iniciar subasta (vendedor).
 *
 * Flujo optimizado: el wizard solo interviene en el setup inicial.
 *  - 'intro': bienvenida + experiencia + términos (una vez en la vida).
 *  - 'setup': facturación + banco en un solo formulario (hasta completarlo).
 *  - 'launch': todo listo → StartLiveWizardHost dispara el PreLive directamente.
 * Un vendedor ya configurado va de tap a PreLive sin pantallas intermedias.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getPayoutAccount, upsertPayoutAccount } from '../api/paymentsApi';
import {
  getSellerOnboardingStatus,
  submitLiveSetupSurvey,
  upgradeToSeller,
  type SellerOnboardingStatus,
  type UpgradeToSellerPayload,
} from '../api/sellerOnboardingApi';
import { getShippingAddress } from '../api/shippingAddressApi';
import type { StreamConfig } from '../components/organisms/startLive/types';
import type { StartLiveSetupPayload } from '../components/organisms/startLive/StartLiveSetupDrawer';
import { storage } from '../utils/storage';
import { withTimeout } from '../utils/withTimeout';
import { useAuth } from './useAuth';

/** Tope de espera del estado remoto al abrir el wizard (ver `open`). */
const OPEN_TIMEOUT_MS = 15000;

export type StartLiveWizardStep = 'closed' | 'intro' | 'setup' | 'launch';

export interface StartLiveWizardContextValue {
  step: StartLiveWizardStep;
  isOpen: boolean;
  categoryUuids: string[];
  onboarding: SellerOnboardingStatus | null;
  hasPayoutAccount: boolean;
  /** Secciones pendientes del formulario de setup. */
  setupNeeds: { customer: boolean; payout: boolean };
  /** CUIT ya guardado (tienda o cuenta de cobro) para precargar el formulario. */
  knownTaxId: string;
  busy: boolean;
  open: () => Promise<void>;
  close: () => void;
  completeIntro: (isFirstAuction: boolean) => Promise<void>;
  completeSetup: (payload: StartLiveSetupPayload) => Promise<void>;
  finishAndStartLive: () => StreamConfig | null;
}

const StartLiveWizardContext = createContext<StartLiveWizardContextValue | null>(null);

function needsCustomer(status: SellerOnboardingStatus): boolean {
  return status.user_type === 'buyer_user' || !status.customer_uuid;
}

export const StartLiveWizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, reloadUser } = useAuth();
  const [step, setStep] = useState<StartLiveWizardStep>('closed');
  const [categoryUuids, setCategoryUuids] = useState<string[]>([]);
  const [onboarding, setOnboarding] = useState<SellerOnboardingStatus | null>(null);
  const [hasPayoutAccount, setHasPayoutAccount] = useState(false);
  const [setupNeeds, setSetupNeeds] = useState<{ customer: boolean; payout: boolean }>({
    customer: false,
    payout: false,
  });
  const [knownTaxId, setKnownTaxId] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshRemoteState = useCallback(async () => {
    const [status, payout] = await Promise.all([
      getSellerOnboardingStatus(),
      getPayoutAccount(),
    ]);
    setOnboarding(status);
    setHasPayoutAccount(!!payout);
    // El CUIT ya vive en la tienda y/o en la cuenta de cobro: se reutiliza.
    setKnownTaxId((status.customer_tax_id ?? payout?.tax_id ?? '').trim());
    return { status, hasPayout: !!payout };
  }, []);

  /** Decide el paso según lo que falte; 'launch' cuando no falta nada. */
  const resolveNextStep = useCallback(
    async (status: SellerOnboardingStatus, hasPayout: boolean): Promise<StartLiveWizardStep> => {
      const customerPending = needsCustomer(status);
      const payoutSkipped = await storage.getPayoutSetupSkipped();
      const payoutPending = !hasPayout && !payoutSkipped;
      setSetupNeeds({ customer: customerPending, payout: payoutPending });
      if (customerPending || payoutPending) {
        return 'setup';
      }
      return 'launch';
    },
    []
  );

  const open = useCallback(async () => {
    setBusy(true);
    try {
      /**
       * Con timeout: el tile "Hacer un live" no muestra el `busy`, así que una promesa
       * que nunca vuelve (backend sin responder, AsyncStorage trabado) se ve como un
       * botón muerto. Al vencer, cae en el catch de abajo y el wizard igual abre.
       */
      const [{ status, hasPayout }, lastCategories, step1Seen, termsSeen] = await withTimeout(
        Promise.all([
          refreshRemoteState(),
          storage.getLastLiveCategoryUuids(),
          storage.getSellerLiveWelcomeStep1Seen(),
          storage.getSellerLiveWelcomeTermsSeen(),
        ]),
        OPEN_TIMEOUT_MS,
        'startLiveWizard.open'
      );
      setCategoryUuids(lastCategories);
      /**
       * La BD manda: si el vendedor ya aceptó los términos / completó la encuesta,
       * el intro no vuelve a aparecer aunque cambie de dispositivo o reinstale.
       * El flag local solo sirve de respaldo (backend viejo o sin red).
       */
      const introDoneRemote =
        !!status.seller_terms_accepted || !!status.live_setup_survey_completed;
      const introDoneLocal = step1Seen && termsSeen;
      if (!introDoneRemote && !introDoneLocal) {
        setStep('intro');
        return;
      }
      setStep(await resolveNextStep(status, hasPayout));
    } catch {
      setStep('intro');
    } finally {
      setBusy(false);
    }
  }, [refreshRemoteState, resolveNextStep]);

  const close = useCallback(() => {
    setStep('closed');
  }, []);

  const completeIntro = useCallback(
    async (isFirstAuction: boolean) => {
      setBusy(true);
      try {
        await storage.setSellerLiveWelcomeStep1Seen(true);
        await storage.setSellerLiveWelcomeTermsSeen(true);
        // terms_accepted: el CTA del intro solo se habilita con el checkbox tildado.
        const status = await submitLiveSetupSurvey(isFirstAuction, true);
        setOnboarding(status);
        const payout = await getPayoutAccount();
        setHasPayoutAccount(!!payout);
        setStep(await resolveNextStep(status, !!payout));
      } finally {
        setBusy(false);
      }
    },
    [resolveNextStep]
  );

  /** Dirección fiscal desde la dirección de envío guardada (sin volver a pedirla). */
  const fiscalAddressFromShipping = useCallback(async (): Promise<
    Partial<UpgradeToSellerPayload>
  > => {
    try {
      const addr = await getShippingAddress();
      return {
        customer_address_line1: addr.address_line1?.trim() || undefined,
        customer_city: addr.city?.trim() || undefined,
        customer_state: addr.state?.trim() || undefined,
        customer_postal_code: addr.postal_code?.trim() || undefined,
        customer_country: addr.country?.trim() || undefined,
      };
    } catch {
      return {};
    }
  }, []);

  const completeSetup = useCallback(
    async (payload: StartLiveSetupPayload) => {
      setBusy(true);
      try {
        if (setupNeeds.customer) {
          const fiscalAddress = await fiscalAddressFromShipping();
          await upgradeToSeller({
            customer_name: payload.customer_name,
            customer_tax_id: payload.customer_tax_id || undefined,
            customer_contact_phone: payload.customer_contact_phone,
            ...fiscalAddress,
          });
          await reloadUser();
        }
        if (payload.bank) {
          await upsertPayoutAccount({
            account_holder: payload.customer_name,
            tax_id: payload.customer_tax_id,
            alias: payload.bank.alias ?? null,
            bank_name: null,
            cbu: payload.bank.cbu,
          });
          setHasPayoutAccount(true);
          await storage.setPayoutSetupSkipped(false);
        } else if (setupNeeds.payout) {
          await storage.setPayoutSetupSkipped(true);
        }
        const status = await getSellerOnboardingStatus();
        setOnboarding(status);
        setSetupNeeds({ customer: false, payout: false });
        setStep('launch');
      } finally {
        setBusy(false);
      }
    },
    [setupNeeds, fiscalAddressFromShipping, reloadUser]
  );

  const finishAndStartLive = useCallback((): StreamConfig | null => {
    const displayName =
      user?.name?.trim() ||
      [user?.name, user?.last_name].filter(Boolean).join(' ').trim() ||
      'Mi show';
    const config: StreamConfig = {
      title: displayName,
      description: '',
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
      onboarding,
      hasPayoutAccount,
      setupNeeds,
      knownTaxId,
      busy,
      open,
      close,
      completeIntro,
      completeSetup,
      finishAndStartLive,
    }),
    [
      step,
      categoryUuids,
      onboarding,
      hasPayoutAccount,
      setupNeeds,
      knownTaxId,
      busy,
      open,
      close,
      completeIntro,
      completeSetup,
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
