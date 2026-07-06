import React from 'react';
import { View, Text as RNText, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamPriceText, formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { StreamCountdownText } from '../../atoms/stream/StreamCountdownText';
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
  /** Tocar la fila "N artículos" (misma acción que el stack de fotos). */
  onPressItemsRow?: () => void;
  /** Cotización de envío hacia el domicilio del comprador (Figma 698-8349). */
  shippingQuote?: ShippingQuoteState;
  /** Tocar la fila de envío cuando falta domicilio (abre wallet → shipping). */
  onPressShipping?: () => void;
}

export const StreamAuctionPanel: React.FC<StreamAuctionPanelProps> = ({
  productTitle,
  itemCount = 1,
  winningUsername,
  currentPrice,
  secondsRemaining,
  isAuctionActive,
  variant = 'buyer',
  onPressItemsRow,
  shippingQuote,
  onPressShipping,
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

  const statusLabel = winningUsername
    ? t('stream.winning', { username: winningUsername })
    : variant === 'seller' || isAuctionActive
      ? t('stream.noBidsYet')
      : null;

  const showStatusRow = variant === 'seller' ? statusLabel != null : winningUsername != null;

  return (
    <View style={styles.panel}>
      <View style={styles.left}>
        {showStatusRow && statusLabel ? (
          <AuctionStatusRow label={statusLabel} winningKey={winningUsername} />
        ) : null}
        <RNText style={styles.title} numberOfLines={1}>
          {productTitle}
        </RNText>
        {variant === 'buyer' ? (
          <TouchableOpacity style={styles.itemsRow} onPress={handleItemsPress} activeOpacity={0.8}>
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
      <View style={styles.right}>
        <StreamPriceText amount={currentPrice} />
        <StreamCountdownText seconds={secondsRemaining} />
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
  title: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: STREAM_COLORS.white,
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
