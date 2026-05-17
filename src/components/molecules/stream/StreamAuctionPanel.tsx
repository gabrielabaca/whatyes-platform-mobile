import React from 'react';
import { View, Text as RNText, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StreamPriceText } from '../../atoms/stream/StreamPriceText';
import { StreamCountdownText } from '../../atoms/stream/StreamCountdownText';
import { FONT_FAMILY } from '../../../theme/typography';
import { STREAM_COLORS } from './streamTokens';

export interface StreamAuctionPanelProps {
  productTitle: string;
  itemCount?: number;
  winningUsername?: string | null;
  currentPrice: number;
  secondsRemaining: number | null;
  isAuctionActive: boolean;
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

  return (
    <View style={styles.panel}>
      <View style={styles.left}>
        {winningUsername ? (
          <View style={styles.winningRow}>
            <RNText style={styles.trophy}>🏆</RNText>
            <RNText style={styles.winningText} numberOfLines={1}>
              {t('stream.winning', { username: winningUsername })}
            </RNText>
          </View>
        ) : null}
        <RNText style={styles.title} numberOfLines={1}>
          {productTitle}
        </RNText>
        <TouchableOpacity style={styles.itemsRow} onPress={handleItemsPress} activeOpacity={0.8}>
          <RNText style={styles.itemsText}>
            {t('stream.itemsCount', { count: itemCount })}
          </RNText>
          <ChevronRight size={16} color={STREAM_COLORS.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.right}>
        <StreamPriceText amount={currentPrice} />
        <StreamCountdownText seconds={secondsRemaining} />
        <RNText style={styles.shippingLabel}>{t('stream.shippingRate')}</RNText>
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
  winningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trophy: {
    fontSize: 14,
  },
  winningText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 20,
    color: STREAM_COLORS.white,
    flex: 1,
    includeFontPadding: false,
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
