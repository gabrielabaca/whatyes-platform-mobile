/**
 * Storage Utilities
 * Utilidades para almacenamiento persistente usando AsyncStorage
 */

// Importación estática - el error se manejará en cada función
let AsyncStorage: any = null;
let asyncStorageInitialized = false;
let asyncStorageFailed = false;
let warningShown = false;

// Intentar importar AsyncStorage de forma estática
try {
  const AsyncStorageModule = require('@react-native-async-storage/async-storage');
  AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;
  
  // Verificar que tiene los métodos necesarios
  if (AsyncStorage && typeof AsyncStorage.getItem === 'function' && typeof AsyncStorage.setItem === 'function') {
    asyncStorageInitialized = true;
  } else {
    AsyncStorage = null;
    asyncStorageFailed = true;
  }
} catch (e: any) {
  // El módulo no está disponible o no está vinculado
  AsyncStorage = null;
  asyncStorageFailed = true;
  const errorMsg = e?.message || String(e) || '';
  if (errorMsg.includes('NativeModule') || errorMsg.includes('null')) {
    warningShown = true;
    // Mostrar warning después de un delay para no interferir con el render
    setTimeout(() => {
      console.warn('⚠️ AsyncStorage no está vinculado. El módulo nativo no está disponible.');
      console.warn('📋 Para solucionarlo:');
      console.warn('   iOS: cd ios && pod install && cd ..');
      console.warn('   Android: Limpia y rebuild el proyecto');
      console.warn('   Luego: npm start -- --reset-cache');
    }, 500);
  }
}

const getAsyncStorage = (): any => {
  if (asyncStorageFailed || !AsyncStorage) {
    return null;
  }
  return AsyncStorage;
};

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  STREAM_DRAFT: 'stream_draft',
} as const;

/**
 * Verificar si AsyncStorage está disponible
 * Maneja el caso cuando el módulo nativo no está vinculado
 */
const isAsyncStorageAvailable = (): boolean => {
  return getAsyncStorage() !== null;
};

export const storage = {
  /**
   * Obtener token de acceso
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return null;
      }
      return await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error: any) {
      // Silenciar errores relacionados con AsyncStorage no vinculado
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al obtener access token:', error);
      }
      return null;
    }
  },

  /**
   * Obtener token de refresco
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return null;
      }
      return await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error: any) {
      // Silenciar errores relacionados con AsyncStorage no vinculado
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al obtener refresh token:', error);
      }
      return null;
    }
  },

  /**
   * Guardar tokens de acceso y refresco
   */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      await storage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ]);
    } catch (error: any) {
      // Silenciar errores relacionados con AsyncStorage no vinculado
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al guardar tokens:', error);
      }
      // No lanzar error para evitar crashes
    }
  },

  /**
   * Obtener datos del usuario almacenados
   */
  async getUserData(): Promise<any | null> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return null;
      }
      const data = await storage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error: any) {
      // Silenciar errores relacionados con AsyncStorage no vinculado
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al obtener datos del usuario:', error);
      }
      return null;
    }
  },

  /**
   * Guardar datos del usuario
   */
  async setUserData(user: any): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch (error: any) {
      // Silenciar errores relacionados con AsyncStorage no vinculado
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al guardar datos del usuario:', error);
      }
      // No lanzar error para evitar crashes
    }
  },

  /**
   * Limpiar todos los datos de autenticación
   */
  async clearAll(): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      await storage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    } catch (error: any) {
      // Silenciar errores relacionados con AsyncStorage no vinculado
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al limpiar datos:', error);
      }
      // No lanzar error para evitar crashes
    }
  },

  /**
   * Guardar borrador de stream
   */
  async saveStreamDraft(draft: any): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      await storage.setItem(STORAGE_KEYS.STREAM_DRAFT, JSON.stringify(draft));
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al guardar borrador de stream:', error);
      }
    }
  },

  /**
   * Obtener borrador de stream
   */
  async getStreamDraft(): Promise<any | null> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return null;
      }
      const data = await storage.getItem(STORAGE_KEYS.STREAM_DRAFT);
      return data ? JSON.parse(data) : null;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al obtener borrador de stream:', error);
      }
      return null;
    }
  },

  /**
   * Eliminar borrador de stream
   */
  async deleteStreamDraft(): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      await storage.removeItem(STORAGE_KEYS.STREAM_DRAFT);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al eliminar borrador de stream:', error);
      }
    }
  },
};
