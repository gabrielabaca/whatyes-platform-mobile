/**
 * Utilidad para obtener la IP de red local
 * Útil para desarrollo cuando se usa un dispositivo físico
 */

import { Platform } from 'react-native';

/**
 * Obtiene la IP de red local del dispositivo/host
 * En desarrollo, esto permite que dispositivos físicos se conecten al servidor local
 */
export const getNetworkIP = (): string | null => {
  // En React Native, no podemos obtener la IP directamente desde el dispositivo
  // Esta función debe ser configurada manualmente o mediante variables de entorno
  // Por ahora, retornamos null para que se use la configuración manual
  return null;
};

/**
 * Obtiene la IP de red desde las variables de entorno o configuración
 * Si no está configurada, intenta detectarla automáticamente (solo en desarrollo)
 */
export const getDevServerIP = (): string => {
  // Prioridad 1: Variable de entorno explícita
  // En React Native, podemos usar process.env si está configurado
  const envIP = process.env.API_BASE_URL_DEV || process.env.DEV_SERVER_IP;
  
  if (envIP) {
    // Remover http:// o https:// si está presente
    return envIP.replace(/^https?:\/\//, '');
  }

  // Prioridad 2: IP común en desarrollo (debe ser configurada manualmente)
  // Por defecto, usamos localhost (solo funciona en emulador)
  return 'localhost';
};
