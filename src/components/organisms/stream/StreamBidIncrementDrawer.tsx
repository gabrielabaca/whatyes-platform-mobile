/**
 * Drawer del multiplicador de puja. No está en Figma: la referencia es el
 * lenguaje del propio vivo (StreamBidBar, streamTokens, drawers glass).
 *
 * Selector horizontal 1×/2×/3× en una sola fila: el multiplicador es la
 * identidad de cada opción (grande) y el monto real que suma va debajo, más
 * chico y en dorado al quedar elegido — la jerarquía que la fila píldora de
 * los modales de cuenta no podía dar. La opción elegida se marca con el
 * degradado violeta → ámbar de StreamBidBar (borde pleno + relleno al 20%,
 * los pares que ya viven en streamTokens): es el lenguaje visual de "esto
 * puja", no un borde violeta plano. Un toque elige, persiste y cierra —
 * pensado para una subasta de 10 s, sin teclado ni scroll.
 *
 * Fuera de una subasta (`showAmounts` false: idle o compra directa) muestra
 * los multiplicadores sin monto: el paso depende del precio del próximo
 * producto subastado, que aún no se conoce, y cualquier cifra saldría del
 * fallback — inventada. La línea de ayuda explica de dónde sale el monto.
 *
 * Vive sobre el stream: `StreamBottomSheet` en OverlayPortal (nativeModal
 * default false en bottomPanel). No monta un Modal RN, el mismo patrón que
 * CountrySelect/AppOptionPickerSheet, el alta de dirección y DeletePaymentMethodModal.
 */
import React, { useId, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { StreamBottomSheet, streamBottomPanelStyle } from './StreamBottomSheet';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { STREAM_COLORS, STREAM_RADIUS } from '../../molecules/stream/streamTokens';
import { themeColors } from '../../../theme/colors';
import { FONT_FAMILY } from '../../../theme/typography';
import {
  BID_MULTIPLIERS,
  bidIncrementAmount,
  type BidMultiplier,
} from '../../../utils/bidIncrement';

const CELL_HEIGHT = 64;
const CELL_GAP = 8;
/** Borde degradado de la opción elegida (mismo par violeta → ámbar de StreamBidBar). */
const SELECTED_STROKE = 2;

export interface StreamBidIncrementDrawerProps {
  visible: boolean;
  onClose: () => void;
  /** Precio base en pesos enteros (ya convertido desde centavos). */
  floorMajor: number;
  /** Moneda del producto subastado (ISO 4217). Sin dato cae a la moneda por defecto. */
  currency?: string | null;
  /**
   * true solo con una subasta en curso: ahí el monto por opción es el paso
   * real que aplica la barra (fallback incluido si faltara el precio base).
   * En idle o compra directa va false: el paso depende del precio del PRÓXIMO
   * producto subastado, que todavía no se conoce, y mostrar un monto sería
   * inventarlo.
   */
  showAmounts: boolean;
  multiplier: BidMultiplier;
  onSelect: (multiplier: BidMultiplier) => void;
}

export const StreamBidIncrementDrawer: React.FC<StreamBidIncrementDrawerProps> = ({
  visible,
  onClose,
  floorMajor,
  currency,
  showAmounts,
  multiplier,
  onSelect,
}) => {
  const { t } = useTranslation();
  const gradId = useId().replace(/:/g, '');
  const [rowWidth, setRowWidth] = useState(0);

  const onRowLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== rowWidth) setRowWidth(w);
  };

  /** Las tres celdas comparten flex:1 y el mismo gap: mismo ancho. */
  const cellWidth =
    rowWidth > 0
      ? (rowWidth - CELL_GAP * (BID_MULTIPLIERS.length - 1)) / BID_MULTIPLIERS.length
      : 0;

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.bidIncrementTitle')}
      onClose={onClose}
      /**
       * Con scrollEnabled=false el sheet no mide el contenido (eso lo hace el
       * onContentSizeChange del ScrollView), así que sin tope el panel queda
       * en su alto máximo (62% de pantalla) con el fondo vacío. El maxHeight
       * ES el hug acá: alto del contenido con las fuentes capadas + aire.
       */
      panelStyle={[streamBottomPanelStyle, styles.panel]}
      scrollEnabled={false}
      nativeModal={false}
    >
      <View style={styles.content}>
        {/* Fuentes capadas (1.2): el alto del panel es un tope fijo (ver arriba)
            y las celdas miden 64 — el texto escalado tiene que seguir entrando. */}
        <RNText style={styles.help} maxFontSizeMultiplier={1.2}>
          {t(showAmounts ? 'stream.bidIncrementHelp' : 'stream.bidIncrementHelpNoAmount')}
        </RNText>
        <View style={styles.row} onLayout={onRowLayout} accessibilityRole="radiogroup">
          {BID_MULTIPLIERS.map((m) => {
            const selected = multiplier === m;
            const amountLabel = showAmounts
              ? `+${formatStreamPrice(bidIncrementAmount(floorMajor, m), currency)}`
              : null;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.cell, !selected && styles.cellIdle]}
                onPress={() => {
                  onSelect(m);
                  onClose();
                }}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={
                  amountLabel != null
                    ? t('stream.bidIncrementOption', {
                        multiplier: m,
                        amount: formatStreamPrice(bidIncrementAmount(floorMajor, m), currency),
                      })
                    : `${m}×`
                }
              >
                {selected && cellWidth > 0 ? (
                  <Svg
                    pointerEvents="none"
                    style={StyleSheet.absoluteFill}
                    width={cellWidth}
                    height={CELL_HEIGHT}
                  >
                    <Defs>
                      <SvgLinearGradient id={`${gradId}-fill`} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={STREAM_COLORS.ctaSoft} />
                        <Stop offset="1" stopColor={STREAM_COLORS.ctaSoftGradientEnd} />
                      </SvgLinearGradient>
                      <SvgLinearGradient id={`${gradId}-line`} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={STREAM_COLORS.primary} />
                        <Stop offset="1" stopColor={STREAM_COLORS.bidGradientEnd} />
                      </SvgLinearGradient>
                    </Defs>
                    <Rect
                      x={SELECTED_STROKE / 2}
                      y={SELECTED_STROKE / 2}
                      width={cellWidth - SELECTED_STROKE}
                      height={CELL_HEIGHT - SELECTED_STROKE}
                      rx={STREAM_RADIUS.bubble - SELECTED_STROKE / 2}
                      fill={`url(#${gradId}-fill)`}
                      stroke={`url(#${gradId}-line)`}
                      strokeWidth={SELECTED_STROKE}
                    />
                  </Svg>
                ) : null}
                <RNText style={styles.multiplier} maxFontSizeMultiplier={1.2}>
                  {m}×
                </RNText>
                {amountLabel != null ? (
                  <RNText
                    style={[styles.amount, selected && styles.amountSelected]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {amountLabel}
                  </RNText>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  /** Tope = hug (ver nota en el JSX): header + ayuda + celdas + padding inferior. */
  panel: {
    maxHeight: 240,
  },
  content: {
    gap: 12,
    width: '100%',
  },
  help: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
  },
  row: {
    flexDirection: 'row',
    gap: CELL_GAP,
    width: '100%',
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    borderRadius: STREAM_RADIUS.bubble,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  /** Sin elegir: el glass quieto de los inputs de drawer, con borde hairline. */
  cellIdle: {
    backgroundColor: themeColors.glass.inputBg,
    borderWidth: 1,
    borderColor: themeColors.glass.border,
  },
  multiplier: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 26,
    color: themeColors.glass.text,
    includeFontPadding: false,
  },
  amount: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
  },
  amountSelected: {
    color: STREAM_COLORS.priceGold,
  },
});
