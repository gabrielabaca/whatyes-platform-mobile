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
  is_following?: boolean;
  is_verified?: boolean;
}

export interface FollowActionResponse {
  user_uuid: string;
  following: boolean;
  followers_count: number;
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

export async function followUser(
  userUuid: string,
  accessToken?: string
): Promise<FollowActionResponse> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(
    `${API_BASE_URL}/auth/profile/${encodeURIComponent(userUuid)}/follow`,
    { method: 'POST', headers }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || data.message || 'Error al seguir', data);
  }
  return data as FollowActionResponse;
}

export interface ReviewCategoryAverages {
  general: number;
  shipping: number;
  product: number;
}

export interface UserReviewListItem {
  uuid: string;
  reviewer_name: string;
  reviewer_avatar_url?: string | null;
  rating: number;
  rating_general: number;
  rating_shipping?: number | null;
  rating_product?: number | null;
  comment?: string | null;
  created_at: number;
  product_label?: string | null;
  product_image_url?: string | null;
}

export interface UserReviewsListResponse {
  items: UserReviewListItem[];
  total: number;
  overall_avg?: number | null;
  category_averages: ReviewCategoryAverages;
}

export interface CreateUserReviewPayload {
  rating_general: number;
  /** Categorías opcionales: sin calificar viajan ausentes y quedan sin dato. */
  rating_shipping?: number | null;
  rating_product?: number | null;
  comment?: string | null;
  product_label?: string | null;
  product_image_url?: string | null;
}

export async function getUserReviews(
  userUuid: string,
  accessToken?: string,
  options?: { limit?: number; offset?: number }
): Promise<UserReviewsListResponse> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  const q = params.toString() ? `?${params.toString()}` : '';
  const headers = await authHeaders(accessToken);
  const res = await fetch(
    `${API_BASE_URL}/auth/profile/${encodeURIComponent(userUuid)}/reviews${q}`,
    { headers }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || data.message || 'Error al cargar reviews', data);
  }
  return data as UserReviewsListResponse;
}

export async function createUserReview(
  userUuid: string,
  payload: CreateUserReviewPayload,
  accessToken?: string
): Promise<UserReviewListItem> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(
    `${API_BASE_URL}/auth/profile/${encodeURIComponent(userUuid)}/reviews`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.detail || data.message || 'Error al publicar review', data);
  }
  return (data as { review: UserReviewListItem }).review;
}

export async function unfollowUser(
  userUuid: string,
  accessToken?: string
): Promise<FollowActionResponse> {
  const headers = await authHeaders(accessToken);
  const res = await fetch(
    `${API_BASE_URL}/auth/profile/${encodeURIComponent(userUuid)}/follow`,
    { method: 'DELETE', headers }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.detail || data.message || 'Error al dejar de seguir',
      data
    );
  }
  return data as FollowActionResponse;
}
