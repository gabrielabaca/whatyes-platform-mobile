/**
 * Catálogo de categorías de interés (service-platform): una carga exitosa por sesión.
 * Se limpia al cerrar sesión (transición autenticado → no autenticado).
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { getInterestCategories } from '../api/platformApi';
import type { InterestCategoryItem } from '../api/types';
import { ApiError } from '../api';
import { useAuth } from './AuthContext';

export interface InterestCategoriesContextValue {
  categories: InterestCategoryItem[];
  /** Idempotente: solo llama al API hasta el primer éxito en la sesión. */
  loadOnce: () => Promise<void>;
  isLoading: boolean;
  isLoaded: boolean;
  loadError: string | null;
}

const InterestCategoriesContext = createContext<InterestCategoriesContextValue | undefined>(
  undefined
);

export const InterestCategoriesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<InterestCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const inflightRef = useRef<Promise<void> | null>(null);
  const { isAuthenticated } = useAuth();
  const prevAuthRef = useRef<boolean | null>(null);

  const reset = useCallback(() => {
    loadedRef.current = false;
    inflightRef.current = null;
    setCategories([]);
    setLoadError(null);
    setIsLoaded(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const was = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;
    if (was === true && isAuthenticated === false) {
      reset();
    }
  }, [isAuthenticated, reset]);

  const loadOnce = useCallback(async () => {
    if (loadedRef.current) return;
    if (inflightRef.current) {
      await inflightRef.current;
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    const p = (async () => {
      try {
        const list = await getInterestCategories();
        setCategories(list);
        loadedRef.current = true;
        setIsLoaded(true);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Error al cargar categorías';
        setLoadError(msg);
        console.warn('[InterestCategories] load failed:', e);
      } finally {
        setIsLoading(false);
        inflightRef.current = null;
      }
    })();
    inflightRef.current = p;
    await p;
  }, []);

  const value: InterestCategoriesContextValue = {
    categories,
    loadOnce,
    isLoading,
    isLoaded,
    loadError,
  };

  return (
    <InterestCategoriesContext.Provider value={value}>{children}</InterestCategoriesContext.Provider>
  );
};

export function useInterestCategories(): InterestCategoriesContextValue {
  const ctx = useContext(InterestCategoriesContext);
  if (ctx === undefined) {
    throw new Error('useInterestCategories debe usarse dentro de InterestCategoriesProvider');
  }
  return ctx;
}
