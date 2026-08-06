import React from 'react';
import { View, Image, Text as RNText, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamPriceText, formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { StreamCountdownText } from '../../atoms/stream/StreamCountdownText';
import {
  CountdownExtensionFloat,
  type CountdownExtension,
} from '../../atoms/stream/CountdownExtensionFloat';
import { AuctionStatusRow } from '../../atoms/AuctionStatusRow';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from './streamTokens';
import type { ShippingQuoteState } from '../../../hooks/useProductShippingQuote';

export type StreamAuctionPanelVariant = 'buyer' | 'seller';

export interface StreamAuctionPanelProps {
  productTitle: string;
  itemCount?: number;
  winningUsername?: string | null;
  currentPrice: number;
  secondsRemaining: number | null;
  isAuctionActive: boolean;
  variant?: StreamAuctionPanelVariant;
  /**
   * `auction` (default): el precio sube con las pujas y se muestra quién gana.
   * `buy_now`: precio fijo y sin pujas — se reemplaza la fila de estado por el
   * aviso de venta directa. El resto del panel (título, artículos, envío,
   * countdown) es idéntico.
   */
  saleMode?: 'auction' | 'buy_now';
  /** Tocar la fila "N artículos" (misma acción que el stack de fotos). */
  onPressItemsRow?: () => void;
  /** Cotización de envío hacia el domicilio del comprador (Figma 698-8349). */
  shippingQuote?: ShippingQuoteState;
  /** Tocar la fila de envío cuando falta domicilio (abre wallet → shipping). */
  onPressShipping?: () => void;
  /** Seller (Figma 890-1370): miniatura del producto activo junto al título. */
  productImageUrl?: string | null;
  /** Seller (Figma 890-1392): cantidad de pujas recibidas. Se oculta en 0. */
  bidCount?: number;
  /** Segundos que la última puja le sumó al reloj: se anuncian con un "+N" verde. */
  timeExtension?: CountdownExtension | null;
}

export const StreamAuctionPanel: React.FC<StreamAuctionPanelProps> = ({
  productTitle,
  itemCount = 1,
  winningUsername,
  currentPrice,
  secondsRemaining,
  isAuctionActive,
  variant = 'buyer',
  saleMode = 'auction',
  onPressItemsRow,
  shippingQuote,
  onPressShipping,
  productImageUrl,
  bidCount = 0,
  timeExtension,
}) => {
  const { t } = useTranslation();

  const handleItemsPress = () => {
    if (onPressItemsRow) {
      onPressItemsRow();
      return;
    }
    Alert.alert(t('common.appName'), t('stream.comingSoon'));
  };

  const quote = shippingQuote ?? { status: 'idle' as const };
  let shippingText: string | null = null;
  let shippingIsFree = false;
  let shippingIsCta = false;
  switch (quote.status) {
    case 'quoted':
      shippingText = t('stream.shippingRateValue', {
        amount: formatStreamPrice(Math.round(quote.priceCents / 100), quote.currency),
      });
      break;
    case 'free':
      shippingText = t('stream.shippingFree');
      shippingIsFree = true;
      break;
    case 'address_required':
      shippingText = t('stream.shippingAddAddress');
      shippingIsCta = true;
      break;
    case 'loading':
      shippingText = t('stream.shippingRateLoading');
      break;
    default:
      // idle | unavailable: mantener la etiqueta sola como en el diseño base.
      shippingText = t('stream.shippingRate');
  }

  const isBuyNow = saleMode === 'buy_now';
  // En compra directa no hay pujas: la fila de estado anuncia el precio fijo en
  // vez de "quién está ganando", y solo hasta que alguien se lo lleva.
  const statusLabel = isBuyNow
    ? isAuctionActive
      ? t('stream.buyNowAvailable')
      : null
    : winningUsername
      ? t('stream.winning', { username: winningUsername })
      : isAuctionActive
        ? t('stream.noBidsYet')
        : null;

  const showStatusRow = isBuyNow
    ? statusLabel != null
    : variant === 'seller'
      ? statusLabel != null
      : winningUsername != null;
  // Al vendedor le mostramos el próximo producto aunque no haya subasta corriendo:
  // ahí no hay reloj que contar, así que el countdown se oculta.
  const showCountdown = variant === 'buyer' || isAuctionActive;
  // Figma 890-1401: al vendedor le mostramos la etiqueta de tasa de envío del
  // producto, sin la cotización por domicilio que solo aplica al comprador.
  const sellerShippingLabel = variant === 'seller' ? t('stream.shippingRate') : null;

  return (
    <View style={styles.panel}>
      <View style={styles.left}>
        {showStatusRow && statusLabel ? (
          <AuctionStatusRow
            label={statusLabel}
            winningKey={winningUsername}
            icon={isBuyNow ? '⚡' : '🏆'}
          />
        ) : null}
        <View style={styles.productRow}>
          {productImageUrl ? (
            <Image source={{ uri: productImageUrl }} style={styles.thumb} resizeMode="cover" />
          ) : null}
          <View style={[styles.details, variant === 'buyer' && styles.detailsBuyer]}>
            <RNText style={styles.title} numberOfLines={sellerShippingLabel ? 1 : 2}>
              {productTitle}
            </RNText>
            {sellerShippingLabel ? (
              <RNText style={styles.shippingLabel}>{sellerShippingLabel}</RNText>
            ) : null}
            {variant === 'buyer' ? (
              <TouchableOpacity
                style={styles.itemsRow}
                onPress={handleItemsPress}
                activeOpacity={0.8}
              >
                <RNText style={styles.itemsText}>
                  {t('stream.itemsCount', { count: itemCount })}
                </RNText>
                <ChevronRight size={16} color={STREAM_COLORS.white} />
              </TouchableOpacity>
            ) : null}
            {/* Figma 698-8349: la tasa de envío va bajo "N artículos", en la columna
                izquierda. Siempre es un link: abre el domicilio de envío del wallet. */}
            {variant === 'buyer' && shippingText ? (
              <TouchableOpacity
                onPress={onPressShipping}
                disabled={!onPressShipping}
                activeOpacity={0.8}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('stream.shippingRate')}
              >
                <RNText
                  style={[
                    styles.shippingLabel,
                    shippingIsFree && styles.shippingFree,
                    shippingIsCta && styles.shippingCta,
                  ]}
                >
                  {shippingText}
                </RNText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.right}>
        {bidCount > 0 && !isBuyNow ? (
          <RNText style={styles.bidCount}>{t('stream.bidsCount', { count: bidCount })}</RNText>
        ) : null}
        <StreamPriceText amount={currentPrice} />
        {showCountdown ? (
          <View style={styles.countdownWrap}>
            <StreamCountdownText seconds={secondsRemaining} />
            {/* El "+N" flota sobre el reloj sin empujar el layout del panel. */}
            <CountdownExtensionFloat extension={timeExtension} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    // Figma 698-8349: columna izquierda (título / artículos / tasa de envío) y
    // derecha (precio + tiempo) centradas verticalmente entre sí.
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  left: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    justifyContent: 'center',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: STREAM_COLORS.white,
    backgroundColor: '#333',
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: 'center',
  },
  /** El comprador conserva el espaciado de 8 entre título / artículos / envío. */
  detailsBuyer: {
    gap: 8,
  },
  title: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  bidCount: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemsText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  countdownWrap: {
    // Ancla del "+N": el globo se posiciona contra el reloj, no contra el panel.
    position: 'relative',
    alignItems: 'flex-end',
  },
  shippingLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    lineHeight: 16,
    color: STREAM_COLORS.white,
    includeFontPadding: false,
  },
  shippingFree: {
    color: STREAM_COLORS.priceGold,
  },
  shippingCta: {
    textDecorationLine: 'underline',
  },
});
