/**
 * Auth Context
 * Contexto de autenticación para gestionar el estado del usuario
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  login as loginApi,
  socialLogin as socialLoginApi,
  getCurrentUser,
  logout as logoutApi,
  refreshSession,
  ensureFreshAccessToken,
  ApiError,
} from '../api';
import { unregisterCurrentPushToken, usePushNotifications } from '../hooks/usePushNotifications';
import {
  signInWithGoogle,
  signInWithApple,
  SocialAuthCancelledError,
} from '../services/socialAuth';
import { storage } from '../utils/storage';
import { getJwtExpMs } from '../utils/jwt';
import type { User, LoginRequest, SocialProvider } from '../api/types';

/** Refrescar este margen antes de que venza el access token. */
const PROACTIVE_REFRESH_SKEW_MS = 60_000;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  /**
   * Login/registro con proveedor social (Google/Apple). Lanza el SDK nativo,
   * envía el id_token al backend y activa la sesión. Devuelve `true` si el flujo
   * se completó, o `false` si el usuario canceló el diálogo del proveedor.
   */
  socialLogin: (provider: SocialProvider) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  /** Recarga /auth/me sin rotar tokens ni cerrar sesión (p. ej. tras upgrade a vendedor). */
  reloadUser: () => Promise<void>;
  /** Carga el usuario en contexto desde tokens ya guardados (p. ej. tras onboarding comprador). */
  activateSessionFromTokens: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Verificar si hay sesión al iniciar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Refresh proactivo: mantiene vigente el access token mientras hay sesión y al
  // volver del background (los timers de JS se congelan mientras la app está en background).
  const hasSession = !!user;

  /**
   * Push al entrar autenticado: registra el token FCM en silencio si el permiso
   * YA está concedido (aceptado antes, o cuenta vieja que nunca vio la pantalla)
   * y cuelga los listeners de refresh de token y tap en la notificación. No pide
   * permiso —eso es de la pantalla "Activar Notificaciones"— y es best-effort,
   * igual que la baja del token en el logout. Espera al fin del bootstrap para
   * que el PUT salga con el access token ya refrescado y no con uno vencido.
   */
  usePushNotifications(hasSession && !isBootstrapping);

  useEffect(() => {
    if (!hasSession) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const forceLogoutLocal = async () => {
      await storage.clearAll();
      if (!cancelled) setUser(null);
    };

    const shouldForceLogout = async (): Promise<boolean> => {
      const rt = await storage.getRefreshToken();
      if (!rt) return true;
      // Si hay refresh token pero el refresh falló, solo forzar logout cuando
      // el access token ya venció (sesión irrecuperable). Si aún es válido,
      // es un error de red transitorio → mantener sesión y reintentar.
      const access = await storage.getAccessToken();
      const expMs = access ? getJwtExpMs(access) : null;
      return !access || expMs === null || expMs <= Date.now();
    };

    const schedule = async () => {
      if (cancelled) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const access = await storage.getAccessToken();
      if (!access) {
        await forceLogoutLocal();
        return;
      }
      const expMs = getJwtExpMs(access);
      if (expMs == null) return; // sin exp legible: no se programa refresh proactivo
      const delay = Math.max(0, expMs - Date.now() - PROACTIVE_REFRESH_SKEW_MS);
      timer = setTimeout(async () => {
        const tok = await refreshSession();
        if (cancelled) return;
        if (tok) {
          schedule();
        } else {
          if (!cancelled && (await shouldForceLogout())) await forceLogoutLocal();
          // Si el access token aún es válido: error de red, se reintenta en el próximo foreground.
        }
      }, delay);
    };

    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;
      ensureFreshAccessToken().then(async (tok) => {
        if (cancelled) return;
        if (tok) {
          schedule();
        } else {
          if (!cancelled && (await shouldForceLogout())) await forceLogoutLocal();
          // Si el access token aún es válido: error de red, se reintenta la próxima vez.
        }
      });
    };

    schedule();
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [hasSession]);

  const checkAuthStatus = async () => {
    try {
      const token = await storage.getAccessToken();
      if (token) {
        const pendingBuyerOnboarding = await storage.getPendingBuyerOnboarding();
        if (pendingBuyerOnboarding) {
          // JWT ya guardado (post-verify) pero el flujo comprador no terminó:
          // no marcar sesión en contexto para que App no muestre Home y desmonte Register.
          setUser(null);
          setIsBootstrapping(false);
          return;
        }

        // Cargar datos del usuario desde el storage primero (para tener datos inmediatos)
        const storedUserData = await storage.getUserData();
        if (storedUserData) {
          setUser(storedUserData);
        }

        // Asegurar un access token válido antes de llamar a la API:
        // si el guardado está vencido, se refresca con el refresh token (7 días).
        const freshToken = await ensureFreshAccessToken();
        if (!freshToken) {
          const stillHasSession = await storage.getRefreshToken();
          if (!stillHasSession) {
            // Refresh token inválido/expirado/revocado → cerrar sesión.
            await storage.clearAll();
            setUser(null);
          } else {
            // Hay refresh token pero el refresh falló (error de red u otro).
            // Si el access token original ya venció, la sesión está irrecuperable
            // en este momento → forzar login. Solo mantener sesión offline cuando
            // el access token aún es válido (refresh proactivo fallido por red).
            const expMs = getJwtExpMs(token);
            const accessExpired = expMs === null || expMs <= Date.now();
            if (accessExpired) {
              await storage.clearAll();
              setUser(null);
            } else if (!storedUserData) {
              setUser(null);
            }
            // Access token aún válido + error de red: modo offline, se reintenta.
          }
          return;
        }

        // Token válido → actualizar usuario desde la API.
        try {
          const userData = await getCurrentUser();
          if (userData.data) {
            setUser(userData.data);
            await storage.setUserData(userData.data);
          }
        } catch (apiError) {
          if (apiError instanceof ApiError && apiError.status === 401) {
            // Vencido entre medio: refrescar y reintentar una vez.
            const retried = await refreshSession();
            if (retried) {
              try {
                const userData = await getCurrentUser();
                if (userData.data) {
                  setUser(userData.data);
                  await storage.setUserData(userData.data);
                }
              } catch {
                if (!storedUserData) setUser(null);
              }
            } else {
              const stillHasSession = await storage.getRefreshToken();
              if (!stillHasSession) {
                await storage.clearAll();
                setUser(null);
              }
            }
          } else if (!storedUserData) {
            // Error de red sin usuario cacheado → limpiar.
            try {
              await storage.clearAll();
            } catch (storageError) {
              console.warn('No se pudo limpiar el almacenamiento:', storageError);
            }
            setUser(null);
          }
          // Con usuario cacheado y error de red: mantener datos.
        }
      } else {
        // No hay token, limpiar datos del usuario
        setUser(null);
        await storage.clearAll();
      }
    } catch (error) {
      // Error al acceder al almacenamiento o token inválido
      console.warn('Error al verificar estado de autenticación:', error);
      try {
        await storage.clearAll();
      } catch (clearError) {
        console.warn('No se pudo limpiar el almacenamiento:', clearError);
      }
      setUser(null);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      console.log('🔐 Iniciando login...');
      const response = await loginApi(credentials);
      console.log('✅ Login exitoso, tokens recibidos');
      console.log('📦 Estructura de respuesta:', JSON.stringify(response, null, 2));
      
      // Obtener el token de acceso de la respuesta
      // La respuesta puede tener los tokens en response.data o directamente en response
      const accessToken = response.data?.access_token || (response as any).access_token;
      
      console.log('📦 accessToken:', accessToken ? 'Token encontrado' : 'Token no encontrado');
      
      if (accessToken) {
        // Los tokens ya están guardados en loginApi
        // Obtener datos del usuario después del login usando el token directamente
        console.log('👤 Obteniendo datos del usuario con token...', accessToken ? 'Token presente' : 'Token ausente');
        try {
          const userData = await getCurrentUser(accessToken);
          console.log('✅ Datos del usuario obtenidos:', userData.data?.email);
          if (userData.data) {
            setUser(userData.data);
            await storage.setUserData(userData.data);
            console.log('💾 Datos del usuario guardados en storage');
          } else {
            console.warn('⚠️ userData.data es null o undefined');
          }
        } catch (userError) {
          console.error('❌ Error al obtener datos del usuario después del login:', userError);
          // Si falla obtener el usuario pero el login fue exitoso, 
          // intentar obtenerlo del storage después de un pequeño delay
          setTimeout(async () => {
            try {
              console.log('🔄 Reintentando obtener usuario desde storage...');
              const userData = await getCurrentUser();
              if (userData.data) {
                setUser(userData.data);
                await storage.setUserData(userData.data);
                console.log('✅ Usuario obtenido en reintento');
              }
            } catch (retryError) {
              console.error('❌ Error al obtener usuario en reintento:', retryError);
            }
          }, 500);
        }
      } else {
        console.error('❌ No se encontró access_token en la respuesta:', response);
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: SocialProvider): Promise<boolean> => {
    try {
      setIsLoading(true);
      // 1. SDK nativo del proveedor → idToken (+ nombre en Apple, primera vez).
      const credential =
        provider === 'apple'
          ? await signInWithApple()
          : await signInWithGoogle();

      // 2. Verificación + sesión en el backend (tokens guardados en storage).
      const res = await socialLoginApi({
        provider,
        id_token: credential.idToken,
        name: credential.name,
        last_name: credential.lastName,
      });

      // 3. Cargar el usuario en contexto → App muestra Home.
      const accessToken = res.access_token;
      if (accessToken) {
        const userData = await getCurrentUser(accessToken);
        if (userData.data) {
          setUser(userData.data);
          await storage.setUserData(userData.data);
        }
      }
      return true;
    } catch (error) {
      if (error instanceof SocialAuthCancelledError) {
        // El usuario cerró el diálogo: no es un error a mostrar.
        return false;
      }
      console.error('❌ Error en social login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      // Baja el token FCM mientras el access token todavía sirve. Si no, el
      // teléfono sigue recibiendo avisos de esta cuenta.
      await unregisterCurrentPushToken().catch(() => {});
      const refreshTokenValue = await storage.getRefreshToken();
      if (refreshTokenValue) {
        try {
          await logoutApi(refreshTokenValue);
        } catch (error) {
          // Si falla el logout en el servidor, continuar con el logout local
          console.warn('Error al cerrar sesión en el servidor:', error);
        }
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      await storage.clearAll();
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const newToken = await refreshSession();
      if (!newToken) {
        await logout();
        return;
      }
      const userData = await getCurrentUser();
      if (userData.data) {
        setUser(userData.data);
        await storage.setUserData(userData.data);
      }
    } catch {
      // Si falla el refresh, hacer logout
      await logout();
    }
  };

  const reloadUser = async () => {
    const token = await storage.getAccessToken();
    if (!token) {
      return;
    }
    const userData = await getCurrentUser();
    if (userData.data) {
      setUser(userData.data);
      await storage.setUserData(userData.data);
    }
  };

  const activateSessionFromTokens = async () => {
    const accessToken = await storage.getAccessToken();
    if (!accessToken) {
      return;
    }
    const userData = await getCurrentUser(accessToken);
    if (userData.data) {
      setUser(userData.data);
      await storage.setUserData(userData.data);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isBootstrapping,
        isAuthenticated: !!user,
        login,
        socialLogin,
        logout,
        refreshAuth,
        reloadUser,
        activateSessionFromTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
