/**
 * API Configuration
 * Configuración de la URL base y constantes de la API
 * 
 * Para desarrollo con dispositivos físicos:
 * 1. Ejecuta: ./scripts/get-network-ip.sh para obtener tu IP
 * 2. Crea un archivo .env en la raíz del proyecto con:
 *    API_BASE_URL_DEV=http://TU_IP:8000
 *    Ejemplo: API_BASE_URL_DEV=http://192.168.1.51:8000
 * 
 * Para producción:
 * - Usa la variable de entorno API_BASE_URL
 * - O el valor por defecto https://api.whatyes.com
 */

import Config from 'react-native-config';

/**
 * Obtiene la URL base de la API según el entorno
 */
const getApiBaseUrl = (): string => {
  if (__DEV__) {
    // Desarrollo: usar IP de red para permitir conexión desde dispositivos físicos
    // Prioridad: Config.API_BASE_URL_DEV > process.env.API_BASE_URL_DEV > IP por defecto
    const devIP = Config.API_BASE_URL_DEV;
    
    if (devIP) {
      // Si ya incluye http:// o https://, usarlo tal cual
      if (devIP.startsWith('http://') || devIP.startsWith('https://')) {
        return devIP;
      }
      // Si no, agregar http://
      return `http://${devIP}`;
    }
    
    // IP por defecto (se detecta automáticamente o se puede configurar en .env)
    // Para obtener tu IP: ejecuta ./scripts/get-network-ip.sh
    // La IP detectada es: 192.168.1.51 (actualiza si cambia tu red)
    const defaultNetworkIP = '192.168.1.51';
    return `http://${defaultNetworkIP}:8000`;
  }
  
  // Producción: usar variable de entorno o valor por defecto
  return Config.API_BASE_URL || 'https://api.whatyes.com';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * URL base del servidor de livestream (WebRTC SFU).
 * En desarrollo: LIVESTREAM_HTTP_URL en .env (ej. http://192.168.1.51:8080) o mismo host que API con puerto 8080.
 */
const getLivestreamBaseUrl = (): string => {
  if (__DEV__) {
    const dev = Config.LIVESTREAM_HTTP_URL_DEV;
    if (dev && (dev.startsWith('http://') || dev.startsWith('https://'))) {
      return dev.replace(/\/$/, '');
    }
    if (dev) return `http://${dev}`;
    const apiUrl = getApiBaseUrl();
    const match = apiUrl.match(/^(https?):\/\/([^:/]+)(:\d+)?/);
    if (match) return `${match[1]}://${match[2]}:8080`;
    return 'http://192.168.1.51:8080';
  }
  return Config.LIVESTREAM_HTTP_URL || 'https://live.whatyes.com';
};

export const LIVESTREAM_HTTP_URL = getLivestreamBaseUrl();

export const LIVESTREAM_WS_URL = (() => {
  const base = LIVESTREAM_HTTP_URL;
  return base.replace(/^http/, 'ws');
})();

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
  },
} as const;
