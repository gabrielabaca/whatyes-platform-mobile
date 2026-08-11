import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { startLivePanelStyle } from '../startLive/startLiveStyles';

/**
 * Paleta de la PANTALLA clara de alta de producto (`AddProductScreen`).
 * No usar para los drawers: ellos viven sobre panel glass oscuro y usan
 * `themeColors.glass` / `addProductGlassStyles`.
 */
export const ADD_PRODUCT_COLORS = {
  primary: '#685CF0',
  text: '#18181B',
  title: '#27272A',
  muted: '#71717B',
  placeholder: '#BABABA',
  placeholderSelect: 'rgba(0,0,0,0.25)',
  border: '#DDDDDD',
  borderAccent: '#CBCEFF',
  bannerStart: 'rgba(97, 83, 255, 0.1)',
  bannerEnd: 'rgba(250, 202, 77, 0.1)',
};

/** Presentación común de los drawers de alta de producto (panel inferior glass). */
export const addProductDrawerProps = {
  bottomPanel: true as const,
  panelStyle: [startLivePanelStyle, { paddingTop: 28 }] as StyleProp<ViewStyle>,
};

export const addProductStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 24,
  },
  tipsBanner: {
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.borderAccent,
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: ADD_PRODUCT_COLORS.bannerStart,
  },
  tipsTextCol: {
    flex: 1,
    gap: 4,
  },
  tipsTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.text,
  },
  tipsBody: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.text,
  },
  tipsArrow: {
    width: 40,
    height: 32,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.borderAccent,
    backgroundColor: 'rgba(104, 92, 240, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: ADD_PRODUCT_COLORS.title,
  },
  photoBox: {
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.border,
    borderRadius: 12,
    minHeight: 147,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  photoBoxLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.muted,
    textAlign: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTile: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  photoAddTileLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9,
    lineHeight: 12,
    color: ADD_PRODUCT_COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  /** Solo drawers (glass): hint bajo el título de una fila de opción. */
  photoOptionHint: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textMuted,
  },
  photoSourceBody: {
    gap: 18,
    width: '100%',
  },
  photoSourceIntro: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  photoSourceList: {
    gap: 12,
    width: '100%',
  },
  photoSourceRow: {
    minHeight: 76,
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(203, 206, 255, 0.9)',
    backgroundColor: themeColors.glass.rowBg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  photoSourceRowDisabled: {
    opacity: themeColors.disabledOpacity,
  },
  photoSourceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: themeColors.glass.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSourceTextCol: {
    flex: 1,
    gap: 3,
  },
  photoSourceTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  photoSourceHint: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textMuted,
  },
  photoCountHint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 16,
    color: ADD_PRODUCT_COLORS.muted,
    marginTop: 4,
  },
  fields: {
    gap: 12,
  },
  field: {
    gap: 8,
  },
  /** Label de campo — Figma 698:11679: Mulish Regular 12/18, tracking 0.06. */
  fieldLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.06,
    color: ADD_PRODUCT_COLORS.text,
  },
  pillInput: {
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.border,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: ADD_PRODUCT_COLORS.text,
  },
  pillInputMultiline: {
    borderRadius: 12,
    minHeight: 147,
    textAlignVertical: 'top',
  },
  priceInputWrap: {
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.border,
    borderRadius: 100,
    minHeight: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pricePrefix: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.text,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 0,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: ADD_PRODUCT_COLORS.text,
  },
  pillSelect: {
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.border,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillSelectText: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.placeholderSelect,
  },
  pillSelectTextFilled: {
    color: ADD_PRODUCT_COLORS.text,
    fontFamily: FONT_FAMILY.bold,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: ADD_PRODUCT_COLORS.primary,
    borderRadius: 1000,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  cancelBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: ADD_PRODUCT_COLORS.primary,
  },
  drawerBody: {
    gap: 24,
    width: '100%',
  },
  drawerHint: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.textMuted,
  },
  tierList: {
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221,221,221,0.87)',
    paddingBottom: 24,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierTextCol: {
    flex: 1,
    gap: 4,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  tierRange: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  tierHint: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textMuted,
  },
  tierRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ADD_PRODUCT_COLORS.borderAccent,
    backgroundColor: 'rgba(104, 92, 240, 0.1)',
  },
  tierRadioOn: {
    borderColor: themeColors.primary,
    borderWidth: 2,
    backgroundColor: themeColors.primary,
  },
  manualWeightLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 18,
    color: themeColors.glass.text,
  },
  manualWeightRow: {
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.glass.inputBg,
  },
  manualWeightInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    color: themeColors.glass.text,
    padding: 0,
  },
  manualWeightUnit: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    color: themeColors.glass.textMuted,
    marginRight: 4,
  },
  manualWeightHelp: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    lineHeight: 16,
    color: themeColors.glass.textMuted,
    paddingHorizontal: 16,
  },
  conditionList: {
    gap: 12,
    width: '100%',
  },
  /**
   * Filas de opción de los drawers (Formato de venta / Condición). Skin oscuro:
   * el panel es glass, así que la fila es blanca-sobre-oscuro como el resto del
   * sistema (antes era una fila clara con texto casi negro).
   */
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    borderRadius: 1000,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 56,
    backgroundColor: themeColors.glass.rowBg,
  },
  conditionRowOn: {
    borderColor: themeColors.primary,
    backgroundColor: 'rgba(104, 92, 240, 0.25)',
  },
  conditionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  conditionIcon: {
    width: 32,
    height: 32,
    borderRadius: 1000,
    backgroundColor: themeColors.glass.rowBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.glass.text,
  },
  saleFormatTextCol: {
    flex: 1,
    gap: 2,
  },
  conditionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
    backgroundColor: 'rgba(104, 92, 240, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionCheckOn: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
});

/**
 * Piel oscura (glass) de los campos de alta de producto, para el form in-live
 * `SellerAddProductDrawer`. Son SOLO overrides de color: la geometría sigue
 * viniendo de `addProductStyles`, que consume también la pantalla clara
 * `AddProductScreen` — por eso no se puede cambiar ahí el significado de los
 * estilos base y estas variantes viven aparte.
 */
export const addProductGlassStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 24,
  },
  tipsBanner: {
    backgroundColor: 'rgba(104, 92, 240, 0.18)',
  },
  tipsTitle: {
    color: themeColors.glass.text,
  },
  tipsBody: {
    color: themeColors.glass.textMuted,
  },
  tipsArrow: {
    backgroundColor: themeColors.glass.rowBg,
  },
  sectionTitle: {
    color: themeColors.glass.text,
  },
  photoBox: {
    borderColor: themeColors.glass.border,
    backgroundColor: themeColors.glass.inputBg,
  },
  photoBoxLabel: {
    color: themeColors.glass.textMuted,
  },
  photoAddTile: {
    borderColor: themeColors.glass.border,
    backgroundColor: themeColors.glass.inputBg,
  },
  fieldLabel: {
    color: themeColors.glass.text,
  },
  surface: {
    borderColor: themeColors.glass.border,
    backgroundColor: themeColors.glass.inputBg,
  },
  inputText: {
    color: themeColors.glass.text,
  },
  selectPlaceholder: {
    color: themeColors.glass.placeholder,
  },
  rowTitle: {
    color: themeColors.glass.text,
  },
  rowHint: {
    color: themeColors.glass.textMuted,
  },
  radio: {
    borderColor: themeColors.glass.border,
    backgroundColor: 'rgba(104, 92, 240, 0.1)',
  },
  radioOn: {
    borderWidth: 2,
    borderColor: themeColors.primary,
    backgroundColor: themeColors.primary,
  },
  footerActions: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 12,
  },
  secondaryBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.gold,
  },
  disabled: {
    opacity: themeColors.disabledOpacity,
  },
});
