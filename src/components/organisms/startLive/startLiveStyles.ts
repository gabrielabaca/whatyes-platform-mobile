import { StyleSheet } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';

import { drawerPanelGlass } from '../../../theme/glassTokens';
import { themeColors } from '../../../theme/colors';

/**
 * Alias locales de los tokens de `src/theme/colors.ts` — se mantienen los nombres
 * porque los consumen addProduct y StartLiveCategoryTile. No declarar hex nuevos acá:
 * si falta un color, agregarlo primero como token en `themeColors`.
 */
export const START_LIVE_COLORS = {
  /** Tint de referencia del panel glass (ver glassTokens.ts). */
  panel: drawerPanelGlass.ios.tintOverlay,
  primary: themeColors.primary,
  text: themeColors.glass.text,
  textMuted: themeColors.glass.textMuted,
  /** Gris de textos terciarios del wizard — sin equivalente en themeColors todavía. */
  textSubtle: '#71717B',
  /** Círculo claro de los íconos de feature (el ícono de adentro es oscuro). */
  iconCircle: '#DBDBDF',
  /** Lila de marca (bordes de tiles e íconos del wizard) — sin token propio todavía. */
  border: '#CBCEFF',
  borderInput: themeColors.glass.border,
  placeholder: themeColors.glass.placeholder,
  radioBg: themeColors.glass.rowBg,
  success: themeColors.success,
  homeIndicator: '#C7C8CA',
};

export const startLivePanelStyle = {
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
};

/** Pasos 1–2 (bienvenida / términos): panel anclado abajo. */
export const startLiveWelcomeSheetProps = {
  bottomPanel: true,
  panelStyle: startLivePanelStyle,
} as const;

/** Resto del wizard: sheet a pantalla completa. */
export const startLiveFullSheetProps = {
  bottomPanel: false,
  fullHeight: true,
  panelStyle: startLivePanelStyle,
} as const;

export const startLiveStyles = StyleSheet.create({
  sheetContent: {
    gap: 24,
    width: '100%',
  },
  /** Panel inferior bienvenida / términos — contenido compacto + scroll. */
  welcomeSheetContent: {
    gap: 12,
    width: '100%',
    paddingBottom: 4,
  },
  welcomeScrollBody: {
    width: '100%',
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  scrollBody: {
    gap: 12,
    width: '100%',
    maxHeight: 520,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: START_LIVE_COLORS.textMuted,
    includeFontPadding: false,
  },
  categoriesSheetBody: {
    gap: 12,
    width: '100%',
    flex: 1,
  },
  categoriesSubtitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: START_LIVE_COLORS.textMuted,
    width: '100%',
    includeFontPadding: false,
  },
  featureList: {
    gap: 16,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 1000,
    backgroundColor: START_LIVE_COLORS.iconCircle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  featureTextCol: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 18,
    color: START_LIVE_COLORS.text,
    includeFontPadding: false,
  },
  featureBody: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: START_LIVE_COLORS.textMuted,
    includeFontPadding: false,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap 12: con 24 el checkbox quedaba desprendido de su etiqueta.
    gap: 12,
    width: '100%',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: START_LIVE_COLORS.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: START_LIVE_COLORS.primary,
    borderColor: START_LIVE_COLORS.primary,
  },
  termsText: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: START_LIVE_COLORS.textMuted,
    includeFontPadding: false,
  },
  /** Fila de opción sobre panel glass: misma piel que el resto del sistema (white-on-dark). */
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 12,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    backgroundColor: themeColors.glass.rowBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  radioRowOn: {
    borderColor: START_LIVE_COLORS.primary,
    backgroundColor: 'rgba(104, 92, 240, 0.25)',
  },
  radioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: START_LIVE_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: START_LIVE_COLORS.primary,
  },
  field: {
    gap: 8,
    width: '100%',
  },
  fieldLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: START_LIVE_COLORS.text,
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  fieldInputWrap: {
    borderWidth: 1,
    borderColor: START_LIVE_COLORS.borderInput,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: themeColors.glass.inputBg,
  },
  fieldInput: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: START_LIVE_COLORS.text,
    letterSpacing: 0.06,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 18,
    color: START_LIVE_COLORS.text,
    letterSpacing: 0.06,
    includeFontPadding: false,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(221, 221, 221, 0.35)',
    width: '100%',
    marginVertical: 4,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  consentCheck: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: START_LIVE_COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  consentText: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: START_LIVE_COLORS.text,
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
  primaryBtn: {
    width: '100%',
    height: 40,
    borderRadius: 1000,
    backgroundColor: START_LIVE_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: START_LIVE_COLORS.text,
    includeFontPadding: false,
  },
  error: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.danger,
    includeFontPadding: false,
  },
  readyHeadline: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 24,
    lineHeight: 32,
    color: START_LIVE_COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.12,
    includeFontPadding: false,
  },
  readyBody: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: START_LIVE_COLORS.text,
    textAlign: 'center',
    includeFontPadding: false,
  },
  readyTip: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    color: START_LIVE_COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.05,
    includeFontPadding: false,
  },
});
