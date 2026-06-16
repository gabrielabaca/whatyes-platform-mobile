/**
 * Auth API
 * Endpoints de autenticación del servicio de usuarios
 */

import { API_BASE_URL, API_ENDPOINTS } from './config';
import { formatApiErrorMessage } from '../utils/formatApiErrorMessage';
import { getJwtExpMs } from '../utils/jwt';
import type {
  LoginRequest,
  TokenResponse,
  UserMeResponse,
  UserResponse,
  CreateBuyerUserRequest,
  CreateSellerUserRequest,
  ForgotPasswordRequestRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyUserRequest,
  VerifyUserResponse,
  ResendVerificationCodeRequest,
  LogoutRequest,
  RefreshTokenRequest,
} from './types';

/**
 * Clase de error personalizada para errores de API
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string | unknown,
    public data?: unknown
  ) {
    super(formatApiErrorMessage(message));
    this.name = 'ApiError';
  }
}

/**
 * Función helper para realizar peticiones HTTP
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Agregar token de autorización si existe
  const token = await getStoredToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.detail ?? data.message,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Error de conexión', error);
  }
}

import { storage } from '../utils/storage';

/**
 * Función helper para obtener el token almacenado
 */
async function getStoredToken(): Promise<string | null> {
  return await storage.getAccessToken();
}

/**
 * Función helper para almacenar tokens
 */
async function storeTokens(tokens: { access_token: string; refresh_token: string }): Promise<void> {
  await storage.setTokens(tokens.access_token, tokens.refresh_token);
}

/**
 * Login - Iniciar sesión
 * @param credentials Credenciales de usuario (email y contraseña)
 */
export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  // El endpoint espera FormData según el controlador
  const formData = new FormData();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
    method: 'POST',
    body: formData,
    // En React Native, no incluir Content-Type header para FormData
    // El sistema lo establece automáticamente con el boundary correcto
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.detail ?? data.message ?? 'Error al iniciar sesión',
      data
    );
  }

  // La respuesta del backend devuelve los tokens directamente en la raíz
  // Estructura: { access_token, refresh_token, token_type }
  if (data.access_token && data.refresh_token) {
    await storeTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    
    // Envolver en la estructura esperada por TokenResponse
    return {
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || 'bearer',
      },
    } as TokenResponse;
  }

  // Si la estructura es diferente, retornar como está
  return data as TokenResponse;
}

/**
 * Get Current User - Obtener usuario actual
 * Requiere autenticación
 * @param accessToken Token de acceso opcional (si no se proporciona, se obtiene del storage)
 */
export async function getCurrentUser(accessToken?: string): Promise<UserMeResponse> {
  // Si se proporciona un token, usarlo directamente
  if (accessToken) {
    const url = `${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`;
    console.log('📡 Llamando a /auth/me con token proporcionado');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error en respuesta de /auth/me:', response.status, data);
      throw new ApiError(
        response.status,
        data.detail || data.message || 'Error al obtener usuario',
        data
      );
    }

    console.log('✅ Respuesta de /auth/me exitosa');
    
    // La respuesta del backend viene directamente con los datos del usuario en la raíz
    // Envolver en la estructura esperada por UserMeResponse
    if (data.uuid) {
      // Si ya tiene la estructura correcta con data, retornar como está
      if (data.data) {
        return data as UserMeResponse;
      }
      // Si viene directamente, envolver en data
      return {
        data: data,
      } as UserMeResponse;
    }
    
    return data as UserMeResponse;
  }

  // Si no se proporciona token, usar fetchApi que lo obtiene del storage
  console.log('📡 Llamando a /auth/me con token del storage');
  const response = await fetchApi<UserMeResponse>(API_ENDPOINTS.AUTH.ME);
  
  // Asegurar que la respuesta tenga la estructura correcta
  if (response.data) {
    return response;
  }
  
  // Si la respuesta viene directamente sin data, envolverla
  if ((response as any).uuid) {
    return {
      data: response as any,
    } as UserMeResponse;
  }
  
  return response;
}

/**
 * Logout - Cerrar sesión
 * @param refreshToken Token de refresco
 */
export async function logout(refreshToken: string): Promise<{ message?: string }> {
  const request: LogoutRequest = { refresh_token: refreshToken };
  return fetchApi<{ message?: string }>(API_ENDPOINTS.AUTH.LOGOUT, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Elimina la cuenta del usuario autenticado (soft delete: is_deleted=true).
 */
export async function deleteOwnAccount(): Promise<{ status: string; message: string }> {
  return fetchApi<{ status: string; message: string }>(API_ENDPOINTS.AUTH.DELETE_ACCOUNT, {
    method: 'DELETE',
  });
}

/** Envía código FORGOT_PASSWORD al email del usuario autenticado. */
export async function changePasswordRequestCode(): Promise<{ message?: string }> {
  return fetchApi<{ message?: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD_REQUEST, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Valida el código sin consumirlo (paso 2 del drawer). */
export async function changePasswordVerifyCode(
  code: string
): Promise<{ valid: boolean; message: string }> {
  return fetchApi<{ valid: boolean; message: string }>(
    API_ENDPOINTS.AUTH.CHANGE_PASSWORD_VERIFY,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    }
  );
}

/** Confirma nueva contraseña tras verificación por email. */
export async function changePasswordConfirm(params: {
  code: string;
  new_password: string;
}): Promise<{ message?: string }> {
  return fetchApi<{ message?: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD_CONFIRM, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Refresh Token - Refrescar token de acceso
 * @param refreshToken Token de refresco
 */
export async function refreshToken(refreshTokenValue: string): Promise<TokenResponse> {
  const request: RefreshTokenRequest = { refresh_token: refreshTokenValue };
  // El backend devuelve los tokens en la raíz: { access_token, refresh_token, token_type }.
  const data = await fetchApi<Record<string, any>>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
    method: 'POST',
    body: JSON.stringify(request),
  });

  const access = data?.data?.access_token ?? data?.access_token;
  const refresh = data?.data?.refresh_token ?? data?.refresh_token;
  if (access && refresh) {
    await storeTokens({ access_token: access, refresh_token: refresh });
  }

  return {
    data: {
      access_token: access,
      refresh_token: refresh,
      token_type: data?.token_type ?? data?.data?.token_type ?? 'bearer',
    },
  } as TokenResponse;
}

/**
 * Refresca la sesión usando el refresh token guardado. Single-flight: llamadas
 * concurrentes comparten la misma promesa.
 * - Devuelve el nuevo access token, o null si no se pudo refrescar.
 * - Si el refresh token es rechazado (401/403), limpia el storage para forzar re-login.
 */
let refreshSessionPromise: Promise<string | null> | null = null;

export async function refreshSession(): Promise<string | null> {
  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }
  refreshSessionPromise = (async () => {
    try {
      const rt = await storage.getRefreshToken();
      if (!rt) {
        return null;
      }
      const res = await refreshToken(rt);
      return res.data?.access_token ?? (await storage.getAccessToken());
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        // Refresh token inválido/expirado/revocado → forzar re-login.
        await storage.clearAll();
      }
      // Errores de red u otros: no limpiar; se reintenta más tarde.
      return null;
    } finally {
      refreshSessionPromise = null;
    }
  })();
  return refreshSessionPromise;
}

/** Margen para refrescar antes de que venza el access token. */
const TOKEN_REFRESH_SKEW_MS = 60_000;

/**
 * Devuelve un access token válido: si el guardado está vencido o por vencer,
 * lo refresca primero. Null si no hay sesión o no se pudo refrescar.
 */
export async function ensureFreshAccessToken(): Promise<string | null> {
  const access = await storage.getAccessToken();
  if (!access) {
    return null;
  }
  const expMs = getJwtExpMs(access);
  if (expMs == null || expMs - Date.now() > TOKEN_REFRESH_SKEW_MS) {
    return access;
  }
  return refreshSession();
}

/**
 * Create User - Crear usuario comprador (BUYER_USER)
 * @param userData Datos del usuario comprador
 */
export async function createBuyerUser(
  userData: CreateBuyerUserRequest
): Promise<UserResponse> {
  return fetchApi<UserResponse>(API_ENDPOINTS.AUTH.CREATE_USER, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Create Seller User - Crear usuario vendedor (SELLER_USER)
 * @param userData Datos del usuario vendedor y cliente
 */
export async function createSellerUser(
  userData: CreateSellerUserRequest
): Promise<UserResponse> {
  return fetchApi<UserResponse>(API_ENDPOINTS.AUTH.CREATE_SELLER_USER, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Get User By UUID - Obtener usuario por UUID
 * @param uuid UUID del usuario
 */
export async function getUserByUuid(uuid: string): Promise<UserResponse> {
  return fetchApi<UserResponse>(`${API_ENDPOINTS.AUTH.GET_USER_BY_UUID}/${uuid}`);
}

/**
 * Forgot Password Request - Solicitar código de recuperación de contraseña
 * @param username Email del usuario
 */
export async function forgotPasswordRequest(
  username: string
): Promise<{ message?: string }> {
  const request: ForgotPasswordRequestRequest = { username };
  return fetchApi<{ message?: string }>(
    API_ENDPOINTS.AUTH.FORGOT_PASSWORD_REQUEST,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

/**
 * Forgot Password - Verificar código de recuperación
 * @param request Datos de verificación del código
 */
export async function forgotPassword(
  request: ForgotPasswordRequest
): Promise<{ message?: string; hash_code?: string }> {
  return fetchApi<{ message?: string; hash_code?: string }>(
    API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

/**
 * Reset Password - Restablecer contraseña
 * @param request Datos para restablecer la contraseña
 */
export async function resetPassword(
  request: ResetPasswordRequest
): Promise<{ message?: string }> {
  return fetchApi<{ message?: string }>(
    API_ENDPOINTS.AUTH.RESET_PASSWORD,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

/**
 * Verify User - Verificar usuario con código.
 * Si el backend devuelve tokens, se guardan en storage (flujo onboarding comprador).
 */
export async function verifyUser(request: VerifyUserRequest): Promise<VerifyUserResponse> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.AUTH.VERIFY_USER}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const data = await response.json();
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((x: any) => x?.msg ?? JSON.stringify(x)).join(', ')
          : data?.message || 'Error en la verificación';
    throw new ApiError(response.status, message, data);
  }
  if (data.access_token && data.refresh_token) {
    await storage.clearUserData();
    await storeTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
  }
  return data as VerifyUserResponse;
}

/**
 * Guarda nombre, apellido y foto opcional (multipart).
 */
export async function uploadBuyerProfile(params: {
  name?: string;
  lastName?: string;
  photo?: { uri: string; type?: string; name?: string };
}): Promise<{ message?: string; status?: string }> {
  const token = await storage.getAccessToken();
  const form = new FormData();
  if (params.name?.trim()) {
    form.append('name', params.name.trim());
  }
  if (params.lastName?.trim()) {
    form.append('last_name', params.lastName.trim());
  }
  if (params.photo) {
    form.append('photo', {
      uri: params.photo.uri,
      type: params.photo.type || 'image/jpeg',
      name: params.photo.name || 'photo.jpg',
    } as any);
  }
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.AUTH.BUYER_ONBOARDING_PROFILE}`,
    {
      method: 'POST',
      headers,
      body: form,
    }
  );
  const data = await response.json();
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((x: any) => x?.msg ?? JSON.stringify(x)).join(', ')
          : data?.message || 'Error al guardar el perfil';
    throw new ApiError(response.status, message, data);
  }
  return data;
}

/**
 * Reemplaza la selección de categorías de interés del comprador.
 */
export async function saveBuyerInterests(
  categoryUuids: string[]
): Promise<{ message?: string; status?: string }> {
  return fetchApi(API_ENDPOINTS.AUTH.BUYER_ONBOARDING_INTERESTS, {
    method: 'POST',
    body: JSON.stringify({ category_uuids: categoryUuids }),
  });
}

/** Crea sesión Didit KYC (JWT comprador). */
export async function createBuyerKycSession(): Promise<{
  verification_url: string;
  session_id: string;
  status: string;
}> {
  return fetchApi(API_ENDPOINTS.AUTH.BUYER_KYC_SESSION, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** Estado KYC del usuario autenticado. */
export async function getBuyerKycStatus(): Promise<{
  status: string | null;
  verified: boolean;
  session_id: string | null;
  provider: string | null;
}> {
  return fetchApi(API_ENDPOINTS.AUTH.BUYER_KYC_STATUS, {
    method: 'GET',
  });
}

/**
 * Resend Verification Code - Reenviar código de verificación
 * @param email Email del usuario
 */
export async function resendVerificationCode(
  email: string
): Promise<{ message?: string }> {
  const request: ResendVerificationCodeRequest = { email };
  return fetchApi<{ message?: string }>(
    API_ENDPOINTS.AUTH.RESEND_VERIFICATION_CODE,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}
