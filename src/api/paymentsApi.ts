/**
 * Cliente HTTP service-payments (tarjetas vault, config Mercado Pago).
 */
import { PAYMENTS_HTTP_URL } from './config';
import { ApiError } from './authApi';
import { storage } from '../utils/storage';

export interface PublicPaymentsConfig {
  public_key: string;
  environment_hint: string;
}

export interface SavedCard {
  uuid: string;
  payment_method_id: string;
  issuer_id: string | null;
  last_four: string | null;
  expiration_month: number | null;
  expiration_year: number | null;
  cardholder_name: string | null;
  is_default: boolean;
}

export interface CardCreatePayload {
  token: string;
  payment_method_id: string;
  issuer_id?: string | null;
  payer_email?: string | null;
  cardholder_name?: string | null;
  expiration_month?: number | null;
  expiration_year?: number | null;
  last_four?: string | null;
  set_default?: boolean;
}

async function authHeaders(accessToken?: string): Promise<HeadersInit> {
  const token = accessToken ?? (await storage.getAccessToken());
  if (!token) {
    throw new ApiError(401, 'No autenticado');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getPublicPaymentsConfig(): Promise<PublicPaymentsConfig> {
  const res = await fetch(`${PAYMENTS_HTTP_URL}/api/config/public`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al cargar configuración de pagos',
      data
    );
  }
  return data as PublicPaymentsConfig;
}

export async function listSavedCards(accessToken?: string): Promise<SavedCard[]> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${PAYMENTS_HTTP_URL}/api/me/cards`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al cargar tarjetas',
      data
    );
  }
  return Array.isArray(data) ? (data as SavedCard[]) : [];
}

export async function createSavedCard(
  payload: CardCreatePayload,
  accessToken?: string
): Promise<SavedCard> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${PAYMENTS_HTTP_URL}/api/me/cards`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al guardar tarjeta',
      data
    );
  }
  return data as SavedCard;
}

export interface MpWalletConnectSession {
  preference_id: string;
  public_key: string;
  init_point: string | null;
  sandbox_init_point: string | null;
  checkout_url?: string | null;
  environment_hint: string;
  link_mode?: 'checkout_webview' | 'checkout_redirect' | 'wallet_brick' | 'test_ack';
  test_ack_only?: boolean;
  requires_test_buyer?: boolean;
}

export interface MpWalletConnectPayload {
  payer_email?: string;
  success_url?: string;
  failure_url?: string;
  pending_url?: string;
}

export async function createMpWalletConnectSession(
  payload: MpWalletConnectPayload = {},
  accessToken?: string
): Promise<MpWalletConnectSession> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${PAYMENTS_HTTP_URL}/api/me/wallet/mp/connect`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al vincular Mercado Pago',
      data
    );
  }
  return data as MpWalletConnectSession;
}

export interface PayoutAccount {
  uuid: string;
  account_holder: string;
  tax_id: string;
  bank_name: string | null;
  cbu: string;
  created_at: number;
  updated_at: number;
}

export interface PayoutAccountUpsertPayload {
  account_holder: string;
  tax_id: string;
  bank_name?: string | null;
  cbu: string;
}

export async function getPayoutAccount(accessToken?: string): Promise<PayoutAccount | null> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${PAYMENTS_HTTP_URL}/api/me/payout-account`, { headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { detail?: string })?.detail ||
        (data as { message?: string })?.message ||
        'Error al cargar cuenta bancaria',
      data
    );
  }
  if (data == null) {
    return null;
  }
  return data as PayoutAccount;
}

export async function upsertPayoutAccount(
  payload: PayoutAccountUpsertPayload,
  accessToken?: string
): Promise<PayoutAccount> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${PAYMENTS_HTTP_URL}/api/me/payout-account`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al guardar cuenta bancaria',
      data
    );
  }
  return data as PayoutAccount;
}

export async function deleteSavedCard(
  cardUuid: string,
  accessToken?: string
): Promise<void> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${PAYMENTS_HTTP_URL}/api/me/cards/${encodeURIComponent(cardUuid)}`, {
    method: 'DELETE',
    headers,
  });
  if (res.status === 204) {
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al eliminar tarjeta',
      data
    );
  }
}
