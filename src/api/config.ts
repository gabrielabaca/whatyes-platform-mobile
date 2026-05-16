/**
 * API Configuration
 * Configuración de la URL base y constantes de la API
 * 
 * Para desarrollo con dispositivos físicos:
 * 1. Ejecuta: ./scripts/get-network-ip.sh para obtener tu IP
 * 2. Crea un archivo .env en la raíz del proyecto con:
 *    API_BASE_URL_DEV=http://TU_IP:8000/users
 *    (Si omites el path, se añade /users automáticamente.)
 * 
 * Para producción:
 * - Usa la variable de entorno API_BASE_URL
 * - O el valor por defecto https://api.whatyes.com
 */

import Config from 'react-native-config';

/**
 * service-users monta las rutas bajo `/users` (auth, buyer, etc.).
 * Si la URL es solo esquema + host + puerto sin path, añade `/users`.
 */
function ensureUsersServiceBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '');
  try {
    const u = new URL(trimmed);
    if (u.pathname === '/' || u.pathname === '') {
      return `${trimmed}/users`;
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

/**
 * Obtiene la URL base de la API según el entorno
 */
const getApiBaseUrl = (): string => {
  if (__DEV__) {
    // Desarrollo: usar IP de red para permitir conexión desde dispositivos físicos
    // Prioridad: Config.API_BASE_URL_DEV > process.env.API_BASE_URL_DEV > IP por defecto
    const devIP = Config.API_BASE_URL_DEV;

    if (devIP) {
      const full =
        devIP.startsWith('http://') || devIP.startsWith('https://')
          ? devIP
          : `http://${devIP}`;
      return ensureUsersServiceBaseUrl(full);
    }

    // IP por defecto (ajusta en .env si cambia tu red). Incluye /users como en service-users.
    const defaultNetworkIP = '192.168.1.51';
    return ensureUsersServiceBaseUrl(`http://${defaultNetworkIP}:8000`);
  }

  // Producción: usar variable de entorno o valor por defecto
  const prod = Config.API_BASE_URL || 'https://api.pulpolive.com/users';
  return ensureUsersServiceBaseUrl(prod);
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * URL base de service-platform (rooms + Kinesis, URL firmada HLS).
 * En desarrollo: PLATFORM_HTTP_URL_DEV en .env (ej. http://192.168.1.51:8001).
 */
const getPlatformBaseUrl = (): string => {
  if (__DEV__) {
    const dev = Config.PLATFORM_HTTP_URL_DEV;
    if (dev && (dev.startsWith('http://') || dev.startsWith('https://'))) {
      return dev.replace(/\/$/, '');
    }
    if (dev) return `http://${dev}`;
    const apiUrl = getApiBaseUrl();
    const match = apiUrl.match(/^(https?):\/\/([^:/]+)(:\d+)?/);
    if (match) return `${match[1]}://${match[2]}:8001`;
    return 'http://192.168.1.51:8001';
  }
  return Config.PLATFORM_HTTP_URL || 'https://api.pulpolive.com/platform';
};

export const PLATFORM_HTTP_URL = getPlatformBaseUrl();

/**
 * URL base WebSocket de service-platform.
 */
const getPlatformWsUrl = (): string => {
  const httpUrl = getPlatformBaseUrl();
  if (httpUrl.startsWith('https://')) return httpUrl.replace('https://', 'wss://');
  if (httpUrl.startsWith('http://')) return httpUrl.replace('http://', 'ws://');
  return httpUrl;
};

export const PLATFORM_WS_URL = getPlatformWsUrl();

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH_TOKEN: '/auth/refresh_token',
    CREATE_USER: '/auth/create_user',
    CREATE_SELLER_USER: '/auth/create_seller_user',
    GET_USER_BY_UUID: '/auth',
    FORGOT_PASSWORD_REQUEST: '/auth/forgot_password_request',
    FORGOT_PASSWORD: '/auth/forgot_password',
    RESET_PASSWORD: '/auth/reset_password',
    VERIFY_USER: '/auth/verify_user',
    RESEND_VERIFICATION_CODE: '/auth/resend_verification_code',
    BUYER_ONBOARDING_PROFILE: '/auth/buyer/onboarding/profile',
    BUYER_ONBOARDING_INTERESTS: '/auth/buyer/onboarding/interests',
    BUYER_KYC_SESSION: '/auth/buyer/kyc/session',
    BUYER_KYC_STATUS: '/auth/buyer/kyc/status',
  },
} as const;
