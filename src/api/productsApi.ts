/**
 * API de productos del vendedor (service-platform).
 */
import { PLATFORM_HTTP_URL } from './config';
import { ApiError } from './authApi';
import { storage } from '../utils/storage';
import type { PackageTierId, ProductConditionId, SaleFormatId } from '../constants/productWeightPresets';
import type {
  LiveSaleMode,
  ProductStatus,
  RaffleParticipationMode,
} from './types';

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
  live_sale_mode?: LiveSaleMode;
  auction_duration_seconds?: number;
  raffle_participation_mode?: RaffleParticipationMode;
  status?: ProductStatus;
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
  /** Talles disponibles (e.g. ["36","37","38"]). Vacío = no aplica. */
  sizes: string[];
  /** Colores en formato "Nombre|#RRGGBB" (e.g. "Blanco|#FFFFFF"). */
  colors: string[];
  quantity_on_hand: number;
  status?: string;
  created_at: number;
}

/** Color parseado para la UI. */
export interface ProductColor {
  name: string;
  hex: string;
}

export function parseProductColors(colors: string[]): ProductColor[] {
  return colors.flatMap((c) => {
    const idx = c.lastIndexOf('|');
    if (idx < 1) return [];
    return [{ name: c.slice(0, idx), hex: c.slice(idx + 1) }];
  });
}

export interface PublicProductDetail {
  uuid: string;
  title: string;
  description: string | null;
  currency: string;
  base_price_cents: number;
  image_urls: string[];
  sizes: string[];
  colors: string[];
  quantity_on_hand: number;
  seller_user_id: string;
  seller_name: string;
  seller_avatar_url: string | null;
  seller_rating_general: number | null;
  seller_rating_shipping: number | null;
  seller_rating_product: number | null;
}

export interface UpdateProductPayload {
  title?: string;
  description?: string | null;
  base_price_cents?: number;
  image_urls?: string[];
  sizes?: string[];
  colors?: string[];
  quantity_on_hand?: number;
  sku?: string | null;
  status?: string;
}

export interface SellerProductListItem {
  uuid: string;
  title: string;
  image_url: string | null;
  base_price_cents: number;
  currency: string;
  quantity_on_hand: number;
  status: string;
  in_current_room: boolean;
}

export async function listMyProducts(options?: {
  roomId?: string;
  limit?: number;
  offset?: number;
}): Promise<SellerProductListItem[]> {
  const params = new URLSearchParams();
  if (options?.roomId) params.set('room_id', options.roomId);
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  const q = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${PLATFORM_HTTP_URL}/me/products${q}`, {
    headers: await authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? 'Error al listar productos', data);
  }
  return Array.isArray(data) ? data : [];
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

export async function updateProduct(
  productId: string,
  payload: UpdateProductPayload,
): Promise<ProductResponse> {
  const response = await fetch(`${PLATFORM_HTTP_URL}/me/products/${productId}`, {
    method: 'PATCH',
    headers: await authHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? 'Error al actualizar producto', data);
  }
  return data as ProductResponse;
}

export async function getPublicProduct(productId: string): Promise<PublicProductDetail> {
  const response = await fetch(`${PLATFORM_HTTP_URL}/products/${productId}`, {
    headers: await authHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? 'Producto no encontrado', data);
  }
  return data as PublicProductDetail;
}
