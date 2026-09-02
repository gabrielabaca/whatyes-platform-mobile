import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from '../utils/storage';

export const PROFILE_PAGE_SIZE = 20;

/**
 * Paginación por offset para las listas del perfil (Shows y Productos).
 *
 * La API devuelve un array plano, así que "no hay más" se detecta cuando una
 * página vuelve con menos elementos que el límite pedido. Los items se
 * dedupean por clave: con offset la lista del servidor puede correrse entre
 * páginas (p. ej. un show que termina) y repetir un elemento en el borde.
 */
export function usePagedProfileList<T>(
  userId: string | null,
  enabled: boolean,
  fetchPage: (
    token: string,
    userId: string,
    options: { limit: number; offset: number }
  ) => Promise<T[]>,
  keyOf: (item: T) => string,
  logTag: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Una respuesta solo aplica si su generación sigue vigente: reset, cambio de
  // usuario/tab o desmontaje la invalidan y la respuesta tardía se descarta.
  const generationRef = useRef(0);
  // Generación con request en vuelo (null = libre). loadMore no dispara dos
  // veces la misma página; un reset sí puede pisar un loadMore colgado.
  const inFlightGenRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(false);

  const load = useCallback(
    async (reset: boolean) => {
      if (!userId || !enabled) return;
      if (reset) {
        generationRef.current += 1;
      } else if (inFlightGenRef.current != null || !hasMoreRef.current) {
        return;
      }
      const generation = generationRef.current;
      inFlightGenRef.current = generation;
      const offset = reset ? 0 : offsetRef.current;
      if (reset) {
        setLoading(true);
        // Un reset invalida cualquier página en vuelo: su finally ya no va a
        // apagar loadingMore (generación vieja), así que se apaga acá.
        setLoadingMore(false);
      } else {
        setLoadingMore(true);
      }
      try {
        const token = await storage.getAccessToken();
        if (!token) {
          if (generation === generationRef.current) {
            hasMoreRef.current = false;
            setHasMore(false);
            // Sin token en un loadMore no se blanquea lo ya cargado.
            if (reset) {
              offsetRef.current = 0;
              setItems([]);
            }
          }
          return;
        }
        const page = await fetchPage(token, userId, {
          limit: PROFILE_PAGE_SIZE,
          offset,
        });
        if (generation !== generationRef.current) return;
        offsetRef.current = offset + page.length;
        const more = page.length >= PROFILE_PAGE_SIZE;
        hasMoreRef.current = more;
        setHasMore(more);
        setItems((prev) => {
          if (reset) return page;
          const seen = new Set(prev.map(keyOf));
          return [
            ...prev,
            ...page.filter((it) => {
              const key = keyOf(it);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            }),
          ];
        });
      } catch (e) {
        console.warn(logTag, e);
        if (generation === generationRef.current && reset) {
          offsetRef.current = 0;
          hasMoreRef.current = false;
          setItems([]);
          setHasMore(false);
        }
        // Error al pedir la página siguiente: hasMore queda como estaba y el
        // próximo gesto de scroll reintenta.
      } finally {
        if (inFlightGenRef.current === generation) inFlightGenRef.current = null;
        if (generation === generationRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [userId, enabled, fetchPage, keyOf, logTag]
  );

  useEffect(() => {
    if (!userId || !enabled) {
      generationRef.current += 1;
      inFlightGenRef.current = null;
      offsetRef.current = 0;
      hasMoreRef.current = false;
      setItems([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    load(true).catch(() => {});
    return () => {
      // Invalida lo que quede en vuelo al desmontar o cambiar de usuario/tab.
      generationRef.current += 1;
      inFlightGenRef.current = null;
    };
  }, [userId, enabled, load]);

  const loadMore = useCallback(() => {
    load(false).catch(() => {});
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  return { items, loading, loadingMore, hasMore, loadMore, reload };
}
