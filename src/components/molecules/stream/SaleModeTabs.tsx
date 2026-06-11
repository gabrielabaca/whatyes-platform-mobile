import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FONT_FAMILY } from '../../../theme/typography';

export type LiveProductSaleMode = 'buy_now' | 'auction' | 'raffle';

const TABS: { key: LiveProductSaleMode; flex?: number }[] = [
  { key: 'buy_now' },
  { key: 'auction' },
  { key: 'raffle', flex: 1 },
];

function tabLabel(t: (key: 'stream.productsSaleModeBuyNow' | 'stream.productsSaleModeAuction' | 'stream.productsSaleModeRaffle') => string, key: LiveProductSaleMode): string {
  if (key === 'buy_now') return t('stream.productsSaleModeBuyNow');
  if (key === 'auction') return t('stream.productsSaleModeAuction');
  return t('stream.productsSaleModeRaffle');
}

export interface SaleModeTabsProps {
  value: LiveProductSaleMode;
  onChange: (mode: LiveProductSaleMode) => void;
}

export const SaleModeTabs: React.FC<SaleModeTabsProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const active = value === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              tab.flex ? styles.tabFlex : null,
              active ? styles.tabActive : styles.tabInactive,
            ]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <RNText style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
              {tabLabel(t, tab.key)}
            </RNText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  tab: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabFlex: {
    flex: 1,
  },
  tabActive: {
    backgroundColor: '#454087',
  },
  tabInactive: {
    backgroundColor: '#DDDAFF',
  },
  tabText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextInactive: {
    color: '#18181B',
  },
});
