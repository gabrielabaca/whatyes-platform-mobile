/**
 * Onboarding vendedor / asistente FAB (service-users).
 */
import { API_BASE_URL } from './config';
import { ApiError } from './authApi';
import { storage } from '../utils/storage';

export interface SellerOnboardingStatus {
  user_type: string;
  live_setup_survey_completed: boolean;
  is_first_live_auction: boolean | null;
  /** Tienda asociada; null/ausente hasta completar el paso de datos fiscales. */
  customer_uuid?: string | null;
  /** CUIT ya guardado en la tienda (para precargarlo y no volver a pedirlo). */
  customer_tax_id?: string | null;
}

export interface UpgradeToSellerPayload {
  customer_name: string;
  customer_tax_id?: string;
  customer_contact_phone?: string;
  /** Dirección fiscal opcional (se adjunta desde la dirección de envío guardada). */
  customer_address_line1?: string;
  customer_city?: string;
  customer_state?: string;
  customer_postal_code?: string;
  customer_country?: string;
}

export interface UpgradeToSellerResponse {
  user_type: string;
  customer_uuid?: string | null;
  message: string;
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await storage.getAccessToken();
  if (!token) {
    throw new ApiError(401, 'No autenticado');
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail ?? data.message ?? 'Error de API', data);
  }
  return data as T;
}

export function getSellerOnboardingStatus(): Promise<SellerOnboardingStatus> {
  return authFetch<SellerOnboardingStatus>('/auth/seller/onboarding-status');
}

export function upgradeToSeller(
  payload: UpgradeToSellerPayload
): Promise<UpgradeToSellerResponse> {
  return authFetch<UpgradeToSellerResponse>('/auth/seller/upgrade', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitLiveSetupSurvey(
  isFirstLiveAuction: boolean
): Promise<SellerOnboardingStatus> {
  return authFetch<SellerOnboardingStatus>('/auth/seller/live-setup-survey', {
    method: 'POST',
    body: JSON.stringify({ is_first_live_auction: isFirstLiveAuction }),
  });
}
