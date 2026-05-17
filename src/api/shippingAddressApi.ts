/**
 * Dirección de envío del usuario (service-users).
 */
import { API_BASE_URL } from './config';
import { ApiError } from './authApi';
import { storage } from '../utils/storage';

export interface ShippingAddress {
  full_name?: string | null;
  country?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}

export interface UpdateShippingAddressPayload {
  full_name: string;
  country: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
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

export async function getShippingAddress(accessToken?: string): Promise<ShippingAddress> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/addresses/shipping`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al cargar dirección',
      data
    );
  }
  return data as ShippingAddress;
}

export async function updateShippingAddress(
  payload: UpdateShippingAddressPayload,
  accessToken?: string
): Promise<ShippingAddress> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/addresses/shipping`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al guardar dirección',
      data
    );
  }
  return data as ShippingAddress;
}
