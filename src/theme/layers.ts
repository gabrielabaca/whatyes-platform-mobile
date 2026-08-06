/**
 * Orden de apilado de overlays. Los drawers y hosts se montan como hermanos absolutos
 * dentro de la pantalla, así que el z-index es lo único que define quién tapa a quién.
 *
 * Usar estas constantes en `zIndex` y `elevation` (Android ignora zIndex en varios casos).
 */
export const LAYERS = {
  /** Panel inferior de StreamBottomSheet montado inline sobre el vivo */
  sheet: 200,
  /** Hosts que montan drawers de un flujo (wizard de vivo, alta de producto) */
  host: 300,
  /** Overlay que debe tapar a su propio host (selector de fotos sobre el alta) */
  overlay: 350,
  /** Cuenta regresiva antes de salir al aire — tapa todo */
  countdown: 500,
  /**
   * Host del portal raíz (`OverlayPortalProvider`). Es el último hermano del árbol, así
   * que ya gana por orden de render; el zIndex/elevation es el refuerzo para Android.
   * Va por encima de la barra de navegación y de cualquier host de pantalla.
   */
  portal: 600,
} as const;
