/**
 * Tokens de color PulpoLive — modo claro y oscuro.
 * Ref. dark: nodo "Sign Up" — fondo #050f2f, inputs #0C142D, labels #8E9AAF, primario #685CF0
 *
 * Fuente única de color de la app: los componentes no deben redeclarar hex propios.
 * Los overlays glass (drawers sobre el vivo, modales de cuenta) son oscuros en ambos temas
 * por diseño; su paleta vive en `glass`, no en `light`/`dark`.
 */
export const themeColors = {
  light: {
    /** Fondo plano. El degradado de Home se arma con `home.gradientTop/Bottom` en SVG. */
    background: '#FFFFFF',
    backgroundTop: '#FFFFFF',
    backgroundBottom: '#E7E7FF',
    surface: '#FFFFFF',
    /** Superficie secundaria (chips, filas alternas) */
    surfaceAlt: '#F4F4F5',
    text: '#02050F',
    textSecondary: '#4C4E55',
    textMuted: '#7D7E83',
    /** Borde de inputs y píldoras de formulario */
    border: '#D9D9D9',
    /** Contorno de tarjetas y separadores dentro de una misma superficie */
    borderSubtle: '#E4E4E7',
    borderFocus: '#49A9E1',
    overlay: 'rgba(0,0,0,0.5)',
  },
  dark: {
    /** Fondo principal modo oscuro */
    background: '#050f2f',
    backgroundTop: '#050f2f',
    backgroundBottom: '#050f2f',
    /** Superficie inputs / tarjetas */
    surface: '#0c142d',
    surfaceAlt: '#152042',
    /** Texto principal / títulos */
    text: '#FEFEFE',
    /** Texto secundario */
    textSecondary: '#8e9aaf',
    textMuted: '#8e9aaf',
    /**
     * Borde de inputs: se mantiene claro a propósito (referencia Figma del modo oscuro).
     * Para contornos de tarjeta usar `borderSubtle`, que sí es oscuro.
     */
    border: '#d9d9d9',
    borderSubtle: '#27272A',
    borderFocus: '#49a9e1',
    overlay: 'rgba(0,0,0,0.65)',
  },
  primary: '#685CF0',
  /** Fondo tenue de acento (píldoras de ícono, chips activos suaves) en modo claro */
  primaryTint: '#F1F0FE',
  success: '#00c566',
  /** Acciones destructivas (eliminar cuenta, finalizar vivo) */
  danger: '#FB2C36',
  /** Secundaria / "Cancelar" sobre superficies glass */
  gold: '#FDC700',
  /** Opacidad estándar de botón deshabilitado */
  disabledOpacity: 0.45,
  /** Home MVP Figma 566-3736 / 566-3737 */
  home: {
    gradientTop: '#FFFFFF',
    gradientBottom: '#E7E7FF',
    navBar: '#E8E8FF',
    header: '#FFFFFF',
    cardSurface: 'transparent',
  },
  /** Paleta de drawers y modales glass — siempre oscura, no depende del tema */
  glass: {
    text: '#FFFFFF',
    textMuted: '#D9D9D9',
    textSoft: 'rgba(255,255,255,0.75)',
    border: '#DDDDDD',
    /** Fondo de inputs y píldoras sobre glass */
    inputBg: 'rgba(255,255,255,0.08)',
    placeholder: 'rgba(255,255,255,0.5)',
    /** Fondo de filas seleccionables */
    rowBg: 'rgba(255,255,255,0.14)',
  },
} as const;
