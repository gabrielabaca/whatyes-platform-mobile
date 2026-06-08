/**
 * API de productos del vendedor (service-platform).
 */
import { PLATFORM_HTTP_URL } from './config';
import { ApiError } from './authApi';
import { storage } from '../utils/storage';
import type { PackageTierId, ProductConditionId, SaleFormatId } from '../constants/productWeightPresets';

export interface CreateProductPayload {
  title: string;
  description?: string | null;
  base_price_cents: number;
  currency?: string;
  image_urls: string[];
  interest_category_uuid: string;
  sale_format: SaleFormatId;
  package_tier: PackageTierId;
  weight_kg?: number | null;
  condition: ProductConditionId;
  sku?: string | null;
  scope?: 'global' | 'room_exclusive';
  quantity_on_hand?: number;
  /** Asocia el producto al catálogo del vivo activo. */
  room_id?: string;
}

export interface ProductResponse {
  uuid: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  currency: string;
  base_price_cents: number;
  image_urls: string[];
  scope: string;
  interest_category_uuid: string | null;
  sale_format: string | null;
  package_tier: string | null;
  weight_kg: number | null;
  condition: string | null;
  sku: string | null;
  quantity_on_hand: number;
  created_at: number;
}

async function authHeaders(json = false): Promise<Record<string, string>> {
  const token = await storage.getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (json) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export async function uploadProductImages(
  photos: { uri: string; type?: string; name?: string }[]
): Promise<string[]> {
  const form = new FormData();
  photos.forEach((photo, index) => {
    form.append('images', {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || `product-${index}.jpg`,
    } as unknown as Blob);
  });

  const response = await fetch(`${PLATFORM_HTTP_URL}/me/products/images`, {
    method: 'POST',
    headers: await authHeaders(),
    body: form,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? 'Error al subir imágenes', data);
  }
  return data.image_urls as string[];
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductResponse> {
  const response = await fetch(`${PLATFORM_HTTP_URL}/me/products`, {
    method: 'POST',
    headers: await authHeaders(true),
    body: JSON.stringify({
      ...payload,
      currency: payload.currency ?? 'ARS',
      scope: payload.scope ?? 'global',
      quantity_on_hand: payload.quantity_on_hand ?? 1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? 'Error al crear producto', data);
  }
  return data as ProductResponse;
}
