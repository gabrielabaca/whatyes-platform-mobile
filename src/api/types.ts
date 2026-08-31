/**
 * API Types
 * Tipos TypeScript para las respuestas y requests de la API
 */

export type UserType = 'buyer_user' | 'seller_user';

/** Categoría de interés (p. ej. en GET /auth/me). */
export interface InterestCategoryItem {
  uuid: string;
  slug: string;
  label: string;
  /** Emoji o glifo desde service-platform; vacío → fallback por slug en cliente. */
  icon?: string;
}

export interface UserRole {
  uuid: string;
  name: string;
  description?: string;
}

export interface UserProfile {
  uuid: string;
  phone?: string;
  location?: any;
  timezone?: any;
  /** URL de foto (backend: user_profile.picture) */
  picture?: string;
  avatar?: string;
}

export interface Customer {
  uuid: string;
  name: string;
  created_at: number;
}

export interface User {
  uuid: string;
  /** Handle público (sin @). No es el email ni un id de login. */
  username: string;
  email: string;
  name: string;
  last_name: string;
  user_type: UserType;
  customer_uuid?: string;
  created_at: number;
  is_active: boolean;
  is_verified: boolean;
  reset_password: boolean;
  role?: UserRole;
  profile?: UserProfile;
  customer?: Customer;
}

export interface UserMe extends User {
  customer?: Customer;
  profile?: UserProfile;
  role?: UserRole;
  /** Misma URL que profile.picture; cómodo para UI */
  profile_picture?: string | null;
  interest_categories?: InterestCategoryItem[];
  identity_kyc_verified?: boolean;
  identity_kyc_status?: string | null;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface UserResponse extends ApiResponse<User> {}

export interface UserMeResponse extends ApiResponse<UserMe> {}

export interface TokenResponse extends ApiResponse<Token> {}

// Request Types
export interface LoginRequest {
  username: string; // Email
  password: string;
}

/** Proveedores de login social soportados por el backend (/auth/social_login). */
export type SocialProvider = 'google' | 'apple';

export interface SocialLoginRequest {
  provider: SocialProvider;
  /** id_token (Google) o identityToken (Apple) obtenido del SDK nativo. */
  id_token: string;
  /** Solo Apple (primera autorización): nombre que el SDK entrega fuera del token. */
  name?: string;
  last_name?: string;
}

/** Respuesta de /auth/social_login: tokens + si la cuenta se acaba de crear. */
export interface SocialLoginResponse extends Token {
  is_new_user: boolean;
}

export interface CreateBuyerUserRequest {
  email: string;
  name: string;
  last_name?: string;
  /** Fecha de nacimiento en formato ISO (YYYY-MM-DD); el backend valida mayoría de edad. */
  birth_date: string;
  password: string;
  repeat_password: string;
}

export interface CreateSellerUserRequest {
  // User data
  email: string;
  name: string;
  last_name?: string;
  password: string;
  repeat_password: string;
  // Customer data
  customer_name: string;
  customer_domain?: string;
  customer_owner_data?: Record<string, any>;
  customer_billing_address?: string;
  customer_address_line1?: string;
  customer_address_line2?: string;
  customer_city?: string;
  customer_state?: string;
  customer_postal_code?: string;
  customer_country?: string;
  customer_contact_phone?: string;
  customer_tax_id?: string;
  customer_fiscal_data?: Record<string, any>;
}

export interface ForgotPasswordRequestRequest {
  username: string;
}

export interface ForgotPasswordRequest {
  username: string;
  code: string;
}

export interface ResetPasswordRequest {
  username: string;
  new_password: string;
  hash_code: string;
}

export interface VerifyUserRequest {
  email: string;
  hash_code: string;
  user_uuid: string;
}

/** Respuesta de POST /auth/verify_user (incluye sesión tras verificación). */
export interface VerifyUserResponse {
  message?: string;
  status?: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
}

export interface ResendVerificationCodeRequest {
  email: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export type LiveSaleMode = 'buy_now' | 'auction' | 'raffle';
export type RaffleParticipationMode = 'followers_only' | 'everyone' | 'buyers';
export type ProductStatus = 'draft' | 'published';
export type ProductListScope = 'global' | 'room_exclusive';
