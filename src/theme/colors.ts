/**
 * Tokens de color PulpoLive — alineados al diseño Figma (MVP), incl. modo oscuro
 * Ref. dark: nodo "Sign Up" — fondo #050f2f, inputs #0C142D, labels #8E9AAF, primario #685CF0
 */
export const themeColors = {
  light: {
    background: '#FEFEFE',
    surface: '#FFFFFF',
    text: '#02050F',
    textSecondary: '#4C4E55',
    textMuted: '#7D7E83',
    border: '#D9D9D9',
    borderFocus: '#49A9E1',
    overlay: 'rgba(0,0,0,0.5)',
  },
  dark: {
    /** Figma: bg principal */
    background: '#050f2f',
    /** Superficie inputs / tarjetas */
    surface: '#0c142d',
    /** Texto principal / títulos */
    text: '#FEFEFE',
    /** Texto secundario */
    textSecondary: '#8e9aaf',
    textMuted: '#8e9aaf',
    /** Bordes (Line Light en Figma) */
    border: '#d9d9d9',
    borderFocus: '#49a9e1',
    overlay: 'rgba(0,0,0,0.65)',
  },
  primary: '#685CF0',
  success: '#00c566',
} as const;
