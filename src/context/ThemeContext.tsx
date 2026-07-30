/**
 * Tema: claro, oscuro o automático (sigue al sistema).
 *
 * Cómo se aplica en nativo (RN 0.83):
 * - `light` / `dark` → `colorScheme.set()` de NativeWind, que termina en
 *   `Appearance.setColorScheme()` y fija `overrideUserInterfaceStyle` en las ventanas.
 * - `system` → `Appearance.setColorScheme('unspecified')`, el valor multiplataforma para
 *   "seguir al sistema": iOS lo mapea a `UIUserInterfaceStyleUnspecified` (limpia el override)
 *   y Android a `MODE_NIGHT_FOLLOW_SYSTEM`.
 *
 * Nunca pasar `null` — ni usar `colorScheme.set('system')` de NativeWind, que internamente lo
 * hace: el módulo Android declara el parámetro como String no-nulo y lanza.
 *
 * Limpiar el override es lo que hace funcionar el modo automático. Mientras esté fijado,
 * `useColorScheme()` devuelve el override de la propia app en lugar de la preferencia del
 * dispositivo, y "Automático" queda congelado en el último tema explícito.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Appearance, useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nwColorScheme } from 'react-native-css-interop';

const STORAGE_KEY = '@pulpolive/color-scheme';

/** Preferencia guardada del usuario */
export type ThemePreference = 'light' | 'dark' | 'system';

type ResolvedScheme = 'light' | 'dark';

interface ThemeContextValue {
  themePreference: ThemePreference;
  resolvedScheme: ResolvedScheme;
  isDark: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  /** Ciclo: sistema → claro → oscuro → sistema */
  cycleThemePreference: () => void;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isResolvedScheme(value: unknown): value is ResolvedScheme {
  return value === 'light' || value === 'dark';
}

/** Tema efectivo para NativeWind y UI (nunca 'system' en la capa nativa) */
function resolveScheme(
  preference: ThemePreference,
  deviceScheme: ResolvedScheme
): ResolvedScheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return deviceScheme;
}

/**
 * Aplica la preferencia a la capa nativa. Devuelve `false` si el nativo rechazó el valor,
 * para que el caller pueda caer al modo explícito y no dejar la app sin tema aplicado.
 */
function applyNativeScheme(preference: ThemePreference, resolved: ResolvedScheme): boolean {
  if (preference !== 'system') {
    nwColorScheme.set(resolved);
    return true;
  }
  try {
    Appearance.setColorScheme('unspecified');
    return true;
  } catch {
    return false;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rawDeviceScheme = useDeviceColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  /**
   * `useColorScheme()` puede devolver 'unspecified' (o null) justo después de limpiar el
   * override, antes de que llegue el evento nativo con el valor real. Tomarlo como "claro"
   * haría parpadear la app a claro en un dispositivo oscuro: conservamos el último válido.
   */
  const lastValidDeviceScheme = useRef<ResolvedScheme>('light');
  if (isResolvedScheme(rawDeviceScheme)) {
    lastValidDeviceScheme.current = rawDeviceScheme;
  }
  const deviceScheme = isResolvedScheme(rawDeviceScheme)
    ? rawDeviceScheme
    : lastValidDeviceScheme.current;

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
   * Usamos `colorScheme` de react-native-css-interop (referencia estable), no el objeto que
   * devuelve `useColorScheme()` de NativeWind: ese objeto es nuevo en cada render y si se pone
   * en deps de un effect se llama setColorScheme en cada frame → puede cerrar la app (crash nativo).
   */
  useEffect(() => {
    if (!isReady) return;
    const resolved = resolveScheme(themePreference, deviceScheme);
    if (!applyNativeScheme(themePreference, resolved)) {
      nwColorScheme.set(resolved);
    }
  }, [isReady, themePreference, deviceScheme]);

  /**
   * Al volver del background re-limpiamos el override en modo automático: ventanas nativas
   * creadas mientras la app estaba suspendida (alerts, pickers del sistema) pueden reponerlo
   * y volver a congelar el seguimiento del tema del dispositivo.
   */
  useEffect(() => {
    if (!isReady || themePreference !== 'system') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      applyNativeScheme('system', deviceScheme);
    });
    return () => subscription.remove();
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
