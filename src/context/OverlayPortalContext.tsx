/**
 * Portal de overlays a nivel raíz.
 *
 * Los bottom sheets se montaban inline, dentro del subárbol de la pantalla. En las
 * pantallas con `GeneralLayout` eso los dejaba encerrados en el `View` de contenido, que
 * es hermano ANTERIOR a la barra de navegación: el sheet se anclaba al borde superior de
 * la barra y la barra quedaba visible y tocable con el drawer abierto. Subir el `zIndex`
 * no alcanza — el z-index solo ordena hermanos, y el sheet vive en otro subárbol.
 *
 * La solución es teletransportar el sheet al final del árbol raíz, donde sí es hermano
 * posterior de todo (incluida la barra). Se hace con un portal y NO con `Modal` de RN
 * porque el glass necesita la misma ventana nativa que la pantalla de fondo: en un Modal
 * el BlurView no tiene nada que difuminar.
 */
import React, { createContext, useContext, useEffect, useId, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LAYERS } from '../theme/layers';

interface OverlayPortalApi {
  mount: (id: string, node: React.ReactNode) => void;
  unmount: (id: string) => void;
}

/**
 * Solo expone la API (estable). El estado de nodos vive dentro del provider y no se
 * publica por contexto a propósito: si `OverlayPortal` se suscribiera a él, cada montaje
 * lo re-renderizaría, generando un nodo nuevo y volviendo a montar en bucle.
 */
const OverlayPortalApiContext = createContext<OverlayPortalApi | null>(null);

/**
 * Marca que el subárbol ya está dentro de una ventana nativa propia (`Modal`). Los sheets
 * que se abren ahí adentro NO deben portarse a la raíz: el host raíz vive en la ventana
 * principal, que queda por debajo del modal, y el sheet sería invisible.
 */
const ModalWindowContext = createContext(false);

interface PortalEntry {
  id: string;
  node: React.ReactNode;
}

export const OverlayPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<PortalEntry[]>([]);

  const api = useMemo<OverlayPortalApi>(
    () => ({
      mount: (id, node) =>
        setEntries((prev) => {
          const index = prev.findIndex((entry) => entry.id === id);
          if (index === -1) return [...prev, { id, node }];
          const next = prev.slice();
          next[index] = { id, node };
          return next;
        }),
      unmount: (id) => setEntries((prev) => prev.filter((entry) => entry.id !== id)),
    }),
    [],
  );

  return (
    <OverlayPortalApiContext.Provider value={api}>
      <View style={styles.root}>
        {/*
         * `children` llega como prop, así que el re-render del provider por su propio
         * estado no vuelve a renderizar la app entera: React reusa el mismo elemento.
         */}
        {children}
        {entries.length > 0 ? (
          <View style={styles.host} pointerEvents="box-none">
            {entries.map((entry) => (
              <React.Fragment key={entry.id}>{entry.node}</React.Fragment>
            ))}
          </View>
        ) : null}
      </View>
    </OverlayPortalApiContext.Provider>
  );
};

/**
 * Renderiza `children` al final del árbol raíz, por encima de la barra de navegación.
 * Sin provider —o dentro de un `Modal`— cae al render en el lugar, que es el
 * comportamiento correcto en esos casos.
 */
export const OverlayPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const api = useContext(OverlayPortalApiContext);
  const insideModalWindow = useContext(ModalWindowContext);
  const id = useId();
  const enabled = api != null && !insideModalWindow;

  useEffect(() => {
    if (!enabled || !api) return;
    api.mount(id, children);
  }, [enabled, api, id, children]);

  // Desmontaje separado del refresco: solo debe correr al salir, no en cada render.
  useEffect(() => {
    if (!enabled || !api) return;
    return () => api.unmount(id);
  }, [enabled, api, id]);

  if (enabled) return null;
  return <>{children}</>;
};

/** Envuelve el contenido de un `Modal` para que los sheets de adentro no se porten fuera. */
export const ModalWindowBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModalWindowContext.Provider value={true}>{children}</ModalWindowContext.Provider>
);

export function useInsideModalWindow(): boolean {
  return useContext(ModalWindowContext);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: LAYERS.portal,
    elevation: LAYERS.portal,
  },
});
