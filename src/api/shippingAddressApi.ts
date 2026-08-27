/**
 * Direcciones de envío del usuario (service-users).
 *
 * El usuario puede tener varias: `is_default` marca la elegida, y es la que usan la
 * cotización de envío y la guía de la compra. `getShippingAddress` /
 * `updateShippingAddress` son los endpoints viejos (una por tipo): operan sobre la
 * default y los conserva el wizard de vendedor para la dirección fiscal.
 */
import { API_BASE_URL } from './config';
import { ApiError } from './authApi';
import { storage } from '../utils/storage';

export interface ShippingAddress {
  uuid?: string | null;
  full_name?: string | null;
  country?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  is_default?: boolean;
}

export interface UpdateShippingAddressPayload {
  full_name: string;
  country: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
}

interface ShippingAddressListResponse {
  addresses?: ShippingAddress[];
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

async function parse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || fallbackMessage,
      data
    );
  }
  return data as T;
}

export async function listShippingAddresses(
  accessToken?: string
): Promise<ShippingAddress[]> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/addresses?address_type=shipping`, {
    headers,
  });
  const data = await parse<ShippingAddressListResponse>(
    res,
    'Error al cargar direcciones'
  );
  return Array.isArray(data.addresses) ? data.addresses : [];
}

export async function createShippingAddress(
  payload: UpdateShippingAddressPayload,
  accessToken?: string
): Promise<ShippingAddress> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/addresses/shipping`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parse<ShippingAddress>(res, 'Error al guardar dirección');
}

export async function setDefaultShippingAddress(
  uuid: string,
  accessToken?: string
): Promise<ShippingAddress> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/addresses/${uuid}/default`, {
    method: 'POST',
    headers,
  });
  return parse<ShippingAddress>(res, 'Error al elegir dirección');
}

/** Borrado lógico. 409 si es la última que le queda al usuario. */
export async function deleteShippingAddress(
  uuid: string,
  accessToken?: string
): Promise<ShippingAddress[]> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/addresses/${uuid}`, {
    method: 'DELETE',
    headers,
  });
  const data = await parse<ShippingAddressListResponse>(
    res,
    'Error al borrar dirección'
  );
  return Array.isArray(data.addresses) ? data.addresses : [];
}

/** Dirección ELEGIDA del usuario (endpoint viejo, una por tipo). */
export async function getShippingAddress(accessToken?: string): Promise<ShippingAddress> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/addresses/shipping`, { headers });
  return parse<ShippingAddress>(res, 'Error al cargar dirección');
}

/** Edita la dirección ELEGIDA del usuario (endpoint viejo, upsert por tipo). */
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
  return parse<ShippingAddress>(res, 'Error al guardar dirección');
}
