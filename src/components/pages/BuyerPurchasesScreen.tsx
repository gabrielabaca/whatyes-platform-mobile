import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IconShoppingBag, IconUser } from '../icons';
import { FONT_FAMILY } from '../../theme/typography';
import { themeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export interface BuyerPurchasesScreenProps {
  /** Abre la pantalla de Cuenta (ajustes / cerrar sesión). */
  onOpenAccount: () => void;
}

/** Tab "Compras" del bottom nav (Figma 652:34535). */
export const BuyerPurchasesScreen: React.FC<BuyerPurchasesScreenProps> = ({ onOpenAccount }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const d = themeColors.dark;

  return (
    <View
      style={[styles.screen, isDark ? { backgroundColor: d.background } : null]}
    >
      <View style={styles.header}>
        <RNText style={[styles.title, isDark ? { color: d.text } : null]}>
          {t('home.tabPurchases')}
        </RNText>
        <TouchableOpacity
          style={styles.accountBtn}
          onPress={onOpenAccount}
          activeOpacity={0.8}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('purchases.openAccount')}
        >
          <IconUser size={22} color={themeColors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <IconShoppingBag size={28} color={themeColors.primary} strokeWidth={2} />
        </View>
        <RNText style={[styles.emptyTitle, isDark ? { color: d.text } : null]}>
          {t('purchases.emptyTitle')}
        </RNText>
        <RNText
          style={[styles.emptySubtitle, isDark ? { color: d.textSecondary } : null]}
        >
          {t('purchases.emptySubtitle')}
        </RNText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: '#27272A',
  },
  accountBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(104, 92, 240, 0.08)',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(104, 92, 240, 0.1)',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 22,
    color: '#27272A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#71717B',
    textAlign: 'center',
  },
});
