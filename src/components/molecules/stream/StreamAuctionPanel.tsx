import React from 'react';
import { View, Text as RNText, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamPriceText } from '../../atoms/stream/StreamPriceText';
import { StreamCountdownText } from '../../atoms/stream/StreamCountdownText';
import { AuctionStatusRow } from '../../atoms/AuctionStatusRow';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from './streamTokens';

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
}) => {
  const { t } = useTranslation();

  const handleItemsPress = () => {
    if (onPressItemsRow) {
      onPressItemsRow();
      return;
    }
    Alert.alert(t('common.appName'), t('stream.comingSoon'));
  };

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
          <AuctionStatusRow label={statusLabel} />
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
      </View>
      <View style={styles.right}>
        <StreamPriceText amount={currentPrice} />
        <StreamCountdownText seconds={secondsRemaining} />
        {variant === 'buyer' ? (
          <RNText style={styles.shippingLabel}>{t('stream.shippingRate')}</RNText>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
});
