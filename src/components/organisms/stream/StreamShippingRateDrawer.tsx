/**
 * Drawer "Tasa de Envío" — Figma 698-7308.
 * Muestra el costo de envío del producto en subasta hacia el domicilio del
 * comprador: dirección (editable), entrega a domicilio con fecha estimada y
 * retiro en el domicilio del vendedor (gratis).
 */
import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPinHouse, ChevronRight } from 'lucide-react-native';
import { StreamBottomSheet, streamBottomPanelStyle } from './StreamBottomSheet';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import type { ShippingQuoteState } from '../../../hooks/useProductShippingQuote';

const WHITE = themeColors.glass.text;
const SOFT = themeColors.glass.textMuted;
const MUTED = themeColors.glass.textSoft;
const GREEN = themeColors.success;
const BORDER = themeColors.glass.border;

function estimatedArrivalLabel(estimatedDays: number | null, locale: string): string | null {
  if (estimatedDays == null || estimatedDays <= 0) return null;
  const date = new Date();
  date.setDate(date.getDate() + estimatedDays);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date);
}

export interface StreamShippingRateDrawerProps {
  visible: boolean;
  quote: ShippingQuoteState;
  /** Dirección de envío del comprador, ya formateada en una línea. */
  addressLabel: string;
  /** Dirección del vendedor para retiro en persona (Figma: "Gaona 1330, Lomas de Zamora"). */
  sellerAddressLabel?: string | null;
  onClose: () => void;
  /** Tocar la dirección: editar el domicilio de envío. */
  onEditAddress: () => void;
}

export const StreamShippingRateDrawer: React.FC<StreamShippingRateDrawerProps> = ({
  visible,
  quote,
  addressLabel,
  sellerAddressLabel,
  onClose,
  onEditAddress,
}) => {
  const { t, i18n } = useTranslation();

  let receiveRight: React.ReactNode;
  if (quote.status === 'loading' || quote.status === 'idle') {
    receiveRight = <ActivityIndicator color={WHITE} size="small" />;
  } else if (quote.status === 'free') {
    receiveRight = <RNText style={styles.priceFree}>{t('stream.shippingDrawer.free')}</RNText>;
  } else if (quote.status === 'quoted') {
    receiveRight = (
      <RNText style={styles.price}>
        {formatStreamPrice(Math.round(quote.priceCents / 100), quote.currency)}
      </RNText>
    );
  } else {
    receiveRight = <RNText style={styles.priceMuted}>—</RNText>;
  }

  const arrivalDate =
    quote.status === 'quoted'
      ? estimatedArrivalLabel(quote.estimatedDays, i18n.language || 'es')
      : null;

  const receiveBody =
    quote.status === 'free'
      ? t('stream.shippingFree')
      : quote.status === 'unavailable'
        ? t('stream.shippingDrawer.unavailable')
        : arrivalDate
          ? null
          : t('stream.shippingDrawer.receiveGeneric');

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.shippingRate')}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
    >
      <RNText style={styles.subtitle}>{t('stream.shippingDrawer.subtitle')}</RNText>

      <View style={styles.addressBlock}>
        <RNText style={styles.addressLabel}>{t('stream.shippingDrawer.addressLabel')}</RNText>
        <TouchableOpacity
          style={styles.addressPill}
          onPress={onEditAddress}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <MapPinHouse size={24} color={WHITE} strokeWidth={1.75} />
          <RNText style={styles.addressText} numberOfLines={1}>
            {addressLabel}
          </RNText>
          <ChevronRight size={24} color={WHITE} />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionBlock}>
        <RNText style={styles.sectionTitle}>{t('stream.shippingDrawer.receiveTitle')}</RNText>
        <View style={[styles.sectionRow, styles.sectionRowDivider]}>
          <RNText style={styles.sectionBody}>
            {arrivalDate ? (
              <>
                {t('stream.shippingDrawer.arrivesPrefix')}
                <RNText style={styles.sectionBodyBold}>{arrivalDate}</RNText>
                {t('stream.shippingDrawer.arrivesSuffix')}
              </>
            ) : (
              receiveBody
            )}
          </RNText>
          {receiveRight}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <RNText style={styles.sectionTitle}>{t('stream.shippingDrawer.pickupTitle')}</RNText>
        <View style={styles.sectionRow}>
          <View style={styles.pickupTextCol}>
            <RNText style={[styles.sectionBody, styles.pickupBodyText]}>
              {t('stream.shippingDrawer.pickupBody')}
            </RNText>
            {sellerAddressLabel ? (
              <RNText style={styles.pickupAddress}>{sellerAddressLabel}</RNText>
            ) : null}
          </View>
          <RNText style={styles.priceFree}>{t('stream.shippingDrawer.free')}</RNText>
        </View>
      </View>
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 24,
    alignItems: 'stretch',
  },
  subtitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: SOFT,
    includeFontPadding: false,
  },
  addressBlock: {
    gap: 8,
    width: '100%',
  },
  addressLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    lineHeight: 18,
    letterSpacing: 0.05,
    color: WHITE,
    includeFontPadding: false,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 100,
    padding: 16,
  },
  addressText: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0.06,
    color: MUTED,
    includeFontPadding: false,
  },
  sectionBlock: {
    gap: 16,
    width: '100%',
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: WHITE,
    includeFontPadding: false,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    width: '100%',
  },
  sectionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 24,
  },
  sectionBody: {
    flex: 1,
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: SOFT,
    includeFontPadding: false,
  },
  pickupTextCol: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  pickupBodyText: {
    flex: 0,
  },
  pickupAddress: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: SOFT,
    includeFontPadding: false,
  },
  sectionBodyBold: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: SOFT,
    includeFontPadding: false,
  },
  price: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 28,
    color: WHITE,
    includeFontPadding: false,
  },
  priceFree: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 28,
    color: GREEN,
    includeFontPadding: false,
  },
  priceMuted: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 28,
    color: MUTED,
    includeFontPadding: false,
  },
});
