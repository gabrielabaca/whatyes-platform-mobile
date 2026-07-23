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
  /** Registro comprador: hay JWT pero el onboarding (perfil/intereses/pantalla final) aún no terminó */
  PENDING_BUYER_ONBOARDING: 'pending_buyer_onboarding',
  /** Paso UI del onboarding: profile | interests | kyc | complete */
  BUYER_ONBOARDING_UI_STEP: 'buyer_onboarding_ui_step',
  WALLET_INTRO_SEEN: 'wallet_intro_seen',
  /** Carrusel de bienvenida: solo se muestra en el primer arranque tras instalar */
  WELCOME_CAROUSEL_SEEN: 'welcome_carousel_seen',
  PREFERRED_PAYMENT_ORIGIN: 'preferred_payment_origin',
  SELLER_LIVE_WELCOME_STEP1_SEEN: 'seller_live_welcome_step1_seen',
  SELLER_LIVE_WELCOME_TERMS_SEEN: 'seller_live_welcome_terms_seen',
} as const;

export type PreferredPaymentOrigin = 'PLATFORM_CARD' | 'MP_WALLET';

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
   * Elimina solo access y refresh (p. ej. tras verify de vendedor sin iniciar sesión en la app).
   */
  async clearAuthTokens(): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      await storage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.PENDING_BUYER_ONBOARDING,
        STORAGE_KEYS.BUYER_ONBOARDING_UI_STEP,
      ]);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al limpiar tokens:', error);
      }
    }
  },

  /**
   * Limpiar todos los datos de autenticación
   */
  /**
   * Solo datos de perfil en caché (p. ej. antes de verify con nuevos tokens).
   */
  async clearUserData(): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      await storage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al limpiar user_data:', error);
      }
    }
  },

  async setPendingBuyerOnboarding(value: boolean): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      if (value) {
        await storage.setItem(STORAGE_KEYS.PENDING_BUYER_ONBOARDING, '1');
      } else {
        await storage.removeItem(STORAGE_KEYS.PENDING_BUYER_ONBOARDING);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al guardar pending buyer onboarding:', error);
      }
    }
  },

  async getPendingBuyerOnboarding(): Promise<boolean> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return false;
      }
      const v = await storage.getItem(STORAGE_KEYS.PENDING_BUYER_ONBOARDING);
      return v === '1' || v === 'true';
    } catch {
      return false;
    }
  },

  async setBuyerOnboardingUiStep(
    step: 'profile' | 'interests' | 'kyc' | 'complete' | null
  ): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return;
      }
      if (step) {
        await storage.setItem(STORAGE_KEYS.BUYER_ONBOARDING_UI_STEP, step);
      } else {
        await storage.removeItem(STORAGE_KEYS.BUYER_ONBOARDING_UI_STEP);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (!errorMessage.includes('NativeModule') && !errorMessage.includes('null')) {
        console.error('Error al guardar paso onboarding:', error);
      }
    }
  },

  async getBuyerOnboardingUiStep(): Promise<'profile' | 'interests' | 'kyc' | 'complete' | null> {
    try {
      const storage = getAsyncStorage();
      if (!storage) {
        return null;
      }
      const v = await storage.getItem(STORAGE_KEYS.BUYER_ONBOARDING_UI_STEP);
      if (v === 'profile' || v === 'interests' || v === 'kyc' || v === 'complete') {
        return v;
      }
      return null;
    } catch {
      return null;
    }
  },

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
        STORAGE_KEYS.PENDING_BUYER_ONBOARDING,
        STORAGE_KEYS.BUYER_ONBOARDING_UI_STEP,
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
  async getWalletIntroSeen(): Promise<boolean> {
    try {
      const s = getAsyncStorage();
      if (!s) return false;
      const v = await s.getItem(STORAGE_KEYS.WALLET_INTRO_SEEN);
      return v === '1' || v === 'true';
    } catch {
      return false;
    }
  },

  async setWalletIntroSeen(seen: boolean): Promise<void> {
    try {
      const s = getAsyncStorage();
      if (!s) return;
      await s.setItem(STORAGE_KEYS.WALLET_INTRO_SEEN, seen ? '1' : '0');
    } catch {
      // ignore
    }
  },

  async getWelcomeCarouselSeen(): Promise<boolean> {
    try {
      const s = getAsyncStorage();
      if (!s) return false;
      const v = await s.getItem(STORAGE_KEYS.WELCOME_CAROUSEL_SEEN);
      return v === '1';
    } catch {
      return false;
    }
  },

  async setWelcomeCarouselSeen(): Promise<void> {
    try {
      const s = getAsyncStorage();
      if (!s) return;
      await s.setItem(STORAGE_KEYS.WELCOME_CAROUSEL_SEEN, '1');
    } catch {
      // ignore
    }
  },

  async getPreferredPaymentOrigin(): Promise<PreferredPaymentOrigin | null> {
    try {
      const s = getAsyncStorage();
      if (!s) return null;
      const v = await s.getItem(STORAGE_KEYS.PREFERRED_PAYMENT_ORIGIN);
      if (v === 'PLATFORM_CARD' || v === 'MP_WALLET') return v;
      return null;
    } catch {
      return null;
    }
  },

  async setPreferredPaymentOrigin(origin: PreferredPaymentOrigin): Promise<void> {
    try {
      const s = getAsyncStorage();
      if (!s) return;
      await s.setItem(STORAGE_KEYS.PREFERRED_PAYMENT_ORIGIN, origin);
    } catch {
      // ignore
    }
  },

  async getSellerLiveWelcomeStep1Seen(): Promise<boolean> {
    try {
      const s = getAsyncStorage();
      if (!s) return false;
      const v = await s.getItem(STORAGE_KEYS.SELLER_LIVE_WELCOME_STEP1_SEEN);
      return v === '1' || v === 'true';
    } catch {
      return false;
    }
  },

  async setSellerLiveWelcomeStep1Seen(seen: boolean): Promise<void> {
    try {
      const s = getAsyncStorage();
      if (!s) return;
      await s.setItem(STORAGE_KEYS.SELLER_LIVE_WELCOME_STEP1_SEEN, seen ? '1' : '0');
    } catch {
      // ignore
    }
  },

  async getSellerLiveWelcomeTermsSeen(): Promise<boolean> {
    try {
      const s = getAsyncStorage();
      if (!s) return false;
      const v = await s.getItem(STORAGE_KEYS.SELLER_LIVE_WELCOME_TERMS_SEEN);
      return v === '1' || v === 'true';
    } catch {
      return false;
    }
  },

  async setSellerLiveWelcomeTermsSeen(seen: boolean): Promise<void> {
    try {
      const s = getAsyncStorage();
      if (!s) return;
      await s.setItem(STORAGE_KEYS.SELLER_LIVE_WELCOME_TERMS_SEEN, seen ? '1' : '0');
    } catch {
      // ignore
    }
  },

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
