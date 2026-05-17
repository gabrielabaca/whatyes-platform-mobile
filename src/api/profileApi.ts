/**
 * Perfil público de usuario (service-users).
 */
import { API_BASE_URL } from './config';
import { ApiError } from './authApi';
import { storage } from '../utils/storage';

export interface UserPublicProfile {
  uuid: string;
  user_type: 'buyer_user' | 'seller_user' | string;
  name: string;
  last_name: string;
  display_name: string;
  subtitle?: string | null;
  bio?: string | null;
  cover_picture?: string | null;
  profile_picture?: string | null;
  followers_count: number;
  following_count: number;
  reviews_avg?: number | null;
  reviews_count: number;
  sold_count?: number | null;
  purchase_count?: number | null;
  is_own_profile: boolean;
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

export async function getUserPublicProfile(
  userUuid: string,
  accessToken?: string
): Promise<UserPublicProfile> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/profile/${encodeURIComponent(userUuid)}`, {
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || data.message || 'Error al cargar perfil', data);
  }
  return data as UserPublicProfile;
}

export interface UpdateOwnProfilePayload {
  name: string;
  bio?: string | null;
}

export async function updateOwnProfile(
  payload: UpdateOwnProfilePayload,
  accessToken?: string
): Promise<UserPublicProfile> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || data.message || 'Error al guardar perfil', data);
  }
  return data as UserPublicProfile;
}
