/**
 * Deep link al finalizar el flujo Didit (debe coincidir con DIDIT_APP_CALLBACK_URL en service-users).
 */
export const BUYER_KYC_RETURN_URL_PREFIX = 'pulpolive://buyer-onboarding/kyc-complete';

export function isBuyerKycReturnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith(BUYER_KYC_RETURN_URL_PREFIX);
}

type ReturnHandler = () => void;

let returnHandler: ReturnHandler | null = null;
let pendingReturn = false;

/** Registra el manejador mientras el usuario está en el flujo KYC (WebView / espera webhook). */
export function subscribeBuyerKycReturn(handler: ReturnHandler): () => void {
  returnHandler = handler;
  if (pendingReturn) {
    pendingReturn = false;
    handler();
  }
  return () => {
    if (returnHandler === handler) {
      returnHandler = null;
    }
  };
}

/** Llamado desde App (Linking) cuando la app recibe el callback Didit. */
export function notifyBuyerKycReturn(): void {
  if (returnHandler) {
    returnHandler();
  } else {
    pendingReturn = true;
  }
}
