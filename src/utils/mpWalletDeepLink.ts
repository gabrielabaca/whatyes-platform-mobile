/**
 * Deep links al volver del checkout Mercado Pago (wallet_purchase / vincular cuenta).
 */
export const MP_WALLET_RETURN_URL_PREFIX = 'pulpolive://wallet/mp-complete';

export type MpWalletReturnStatus = 'success' | 'failure' | 'pending';

export function parseMpWalletReturnUrl(url: string | null | undefined): MpWalletReturnStatus | null {
  if (!url || !url.startsWith(MP_WALLET_RETURN_URL_PREFIX)) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const status = parsed.searchParams.get('status');
    if (status === 'success' || status === 'failure' || status === 'pending') {
      return status;
    }
  } catch {
    if (url.includes('status=success')) return 'success';
    if (url.includes('status=failure')) return 'failure';
    if (url.includes('status=pending')) return 'pending';
  }
  return null;
}

export function isMpWalletReturnUrl(url: string | null | undefined): boolean {
  return parseMpWalletReturnUrl(url) !== null;
}

export const MP_WALLET_LINK_SUCCESS_URL = `${MP_WALLET_RETURN_URL_PREFIX}?status=success`;
export const MP_WALLET_LINK_FAILURE_URL = `${MP_WALLET_RETURN_URL_PREFIX}?status=failure`;
export const MP_WALLET_LINK_PENDING_URL = `${MP_WALLET_RETURN_URL_PREFIX}?status=pending`;

type ReturnHandler = (status: MpWalletReturnStatus) => void;

let returnHandler: ReturnHandler | null = null;
let pendingReturn: MpWalletReturnStatus | null = null;

export function subscribeMpWalletReturn(handler: ReturnHandler): () => void {
  returnHandler = handler;
  if (pendingReturn) {
    const status = pendingReturn;
    pendingReturn = null;
    handler(status);
  }
  return () => {
    if (returnHandler === handler) {
      returnHandler = null;
    }
  };
}

export function notifyMpWalletReturn(url: string): void {
  const status = parseMpWalletReturnUrl(url);
  if (!status) return;
  if (returnHandler) {
    returnHandler(status);
  } else {
    pendingReturn = status;
  }
}

const SANDBOX_CHECKOUT_BASE = 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect';

export function resolveMpWalletCheckoutUrl(session: {
  preference_id?: string;
  checkout_url?: string | null;
  init_point?: string | null;
  sandbox_init_point?: string | null;
  environment_hint?: string;
  public_key?: string;
}): string | null {
  const useSandbox =
    session.environment_hint === 'sandbox' ||
    session.environment_hint === 'development' ||
    (session.public_key?.startsWith('TEST-') ?? false);

  if (session.checkout_url?.trim()) {
    const url = session.checkout_url.trim();
    if (!useSandbox || url.includes('sandbox.mercadopago')) {
      return url;
    }
  }

  if (useSandbox) {
    const sandbox = session.sandbox_init_point?.trim();
    if (sandbox?.includes('sandbox.mercadopago')) {
      return sandbox;
    }
    if (session.preference_id?.trim()) {
      return `${SANDBOX_CHECKOUT_BASE}?pref_id=${encodeURIComponent(session.preference_id.trim())}`;
    }
    return null;
  }

  return session.init_point ?? session.sandbox_init_point ?? null;
}
