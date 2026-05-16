/**
 * Tema: claro, oscuro o automático (sigue al sistema).
 *
 * Importante (Android): no usar `setColorScheme('system')` en NativeWind — internamente llama a
 * `Appearance.setColorScheme(null)` y en RN/Android eso puede lanzar error de parámetro no nulo.
 * En modo "automático" aplicamos siempre `light` o `dark` según `useColorScheme()` del dispositivo.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nwColorScheme } from 'react-native-css-interop';

const STORAGE_KEY = '@pulpolive/color-scheme';

/** Preferencia guardada del usuario */
export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  themePreference: ThemePreference;
  resolvedScheme: 'light' | 'dark';
  isDark: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  /** Ciclo: sistema → claro → oscuro → sistema */
  cycleThemePreference: () => void;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Tema efectivo para NativeWind y UI (nunca 'system' en la capa nativa) */
function resolveScheme(
  preference: ThemePreference,
  deviceScheme: string | null | undefined
): 'light' | 'dark' {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return (deviceScheme ?? 'light') === 'dark' ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceScheme = useDeviceColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemePreferenceState(saved);
        } else {
          setThemePreferenceState('system');
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Aplicar solo 'light' | 'dark' a NativeWind (evita Appearance.setColorScheme(null) en Android).
   * Usamos `colorScheme` de react-native-css-interop (referencia estable), no el objeto que devuelve
   * `useColorScheme()` de NativeWind: ese objeto es nuevo en cada render y si se pone en deps de un
   * effect, se llama setColorScheme en cada frame → puede cerrar la app al cambiar tema (crash nativo).
   */
  useEffect(() => {
    if (!isReady) return;
    const resolved = resolveScheme(themePreference, deviceScheme);
    nwColorScheme.set(resolved);
  }, [isReady, themePreference, deviceScheme]);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    void AsyncStorage.setItem(STORAGE_KEY, preference);
  }, []);

  const cycleThemePreference = useCallback(() => {
    setThemePreferenceState((prev) => {
      const order: ThemePreference[] = ['system', 'light', 'dark'];
      const idx = order.indexOf(prev);
      const next = order[(idx + 1) % order.length] ?? 'system';
      void AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const resolvedScheme = resolveScheme(themePreference, deviceScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      resolvedScheme,
      isDark: resolvedScheme === 'dark',
      setThemePreference,
      cycleThemePreference,
      isReady,
    }),
    [themePreference, resolvedScheme, setThemePreference, cycleThemePreference, isReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return ctx;
}
