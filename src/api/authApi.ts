/**
 * Auth API
 * Endpoints de autenticación del servicio de usuarios
 */

import { API_BASE_URL, API_ENDPOINTS } from './config';
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
    public message: string,
    public data?: any
  ) {
    super(message);
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
        data.detail || data.message || 'Error en la petición',
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
      data.detail || data.message || 'Error al iniciar sesión',
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
 * Refresh Token - Refrescar token de acceso
 * @param refreshToken Token de refresco
 */
export async function refreshToken(refreshToken: string): Promise<TokenResponse> {
  const request: RefreshTokenRequest = { refresh_token: refreshToken };
  const response = await fetchApi<TokenResponse>(
    API_ENDPOINTS.AUTH.REFRESH_TOKEN,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );

  // Almacenar nuevos tokens
  if (response.data) {
    await storeTokens({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    });
  }

  return response;
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
 * Verify User - Verificar usuario con código
 * @param request Datos de verificación
 */
export async function verifyUser(
  request: VerifyUserRequest
): Promise<{ message?: string }> {
  return fetchApi<{ message?: string }>(
    API_ENDPOINTS.AUTH.VERIFY_USER,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
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
