/**
 * Auth Context
 * Contexto de autenticación para gestionar el estado del usuario
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as loginApi, getCurrentUser, logout as logoutApi, refreshToken, ApiError } from '../api';
import { storage } from '../utils/storage';
import type { User, LoginRequest } from '../api/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
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

  const checkAuthStatus = async () => {
    try {
      const token = await storage.getAccessToken();
      if (token) {
        // Cargar datos del usuario desde el storage primero (para tener datos inmediatos)
        const storedUserData = await storage.getUserData();
        if (storedUserData) {
          setUser(storedUserData);
        }

        // Luego actualizar desde la API en segundo plano
        try {
          const userData = await getCurrentUser();
          if (userData.data) {
            setUser(userData.data);
            await storage.setUserData(userData.data);
          }
        } catch (apiError) {
          // Si hay error al obtener desde la API pero tenemos datos en storage,
          // mantener los datos del storage pero intentar refrescar el token
          if (!storedUserData) {
            // Si no hay datos en storage y falla la API, limpiar tokens
            try {
              await storage.clearAll();
            } catch (storageError) {
              console.warn('No se pudo limpiar el almacenamiento:', storageError);
            }
            setUser(null);
          }
          // Si hay datos en storage, mantenerlos aunque falle la API
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

  const logout = async () => {
    try {
      setIsLoading(true);
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
      const refreshTokenValue = await storage.getRefreshToken();
      if (refreshTokenValue) {
        await refreshToken(refreshTokenValue);
        const userData = await getCurrentUser();
        if (userData.data) {
          setUser(userData.data);
          await storage.setUserData(userData.data);
        }
      }
    } catch (error) {
      // Si falla el refresh, hacer logout
      await logout();
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
        logout,
        refreshAuth,
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
