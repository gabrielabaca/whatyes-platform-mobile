import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  IconHome,
  IconSearch,
  IconPlus,
  IconBell,
  IconShoppingBag,
  type SvgIconProps,
} from '../../icons';
import { Text } from '../../atoms/Text';
import { FONT_FAMILY } from '../../../theme/typography';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';
import type { HomeBottomTab } from './types';

interface HomeBottomNavProps {
  activeTab: HomeBottomTab;
  onTabPress: (tab: HomeBottomTab) => void;
}

const ICON = 24;
const ICON_WRAP = 40;
const FAB_SIZE = 46;
const RADIUS = 14;
/** Borde superior alineado al diseño de referencia del layout principal. */
const NAV_BORDER = '#71717B';
const MUTED = '#71717B';
/** Fondo barra inferior (MVP Figma BottomNav). */
const NAV_BG_LIGHT = '#E8E8FF';

export const HomeBottomNav: React.FC<HomeBottomNavProps> = ({ activeTab, onTabPress }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const muted = isDark ? themeColors.dark.textMuted : MUTED;
  const active = themeColors.primary;

  const NavItem = ({
    tab,
    labelKey,
    IconCmp,
  }: {
    tab: HomeBottomTab;
    labelKey: 'home.tabHome' | 'home.tabExplore' | 'home.tabActivity' | 'home.tabPurchases';
    IconCmp: React.FC<SvgIconProps>;
  }) => {
    const on = activeTab === tab;
    const color = on ? active : muted;
    return (
      <TouchableOpacity
        onPress={() => onTabPress(tab)}
        style={styles.navItem}
        activeOpacity={0.75}
        hitSlop={6}
      >
        <View style={styles.iconWrap}>
          <IconCmp size={ICON} color={color} strokeWidth={2} />
        </View>
        <Text style={[styles.label, { color }]}>{t(labelKey)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.bar, isDark ? styles.barDark : styles.barLight]}>
      <NavItem tab="home" labelKey="home.tabHome" IconCmp={IconHome} />
      <NavItem tab="explore" labelKey="home.tabExplore" IconCmp={IconSearch} />
      <CenterFab onPress={() => onTabPress('create')} />
      <NavItem tab="activity" labelKey="home.tabActivity" IconCmp={IconBell} />
      <NavItem tab="purchases" labelKey="home.tabPurchases" IconCmp={IconShoppingBag} />
    </View>
  );
};

const CenterFab: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.fabSlot}
      activeOpacity={0.85}
      hitSlop={12}
    >
      <View style={styles.fabInner}>
        <IconPlus size={28} color="#FFFFFF" strokeWidth={3} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 26,
    borderTopWidth: 0.7,
    borderTopColor: NAV_BORDER,
  },
  barLight: {
    backgroundColor: NAV_BG_LIGHT,
  },
  barDark: {
    backgroundColor: '#050f2f',
    borderTopColor: '#3f3f46',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    gap: 2,
  },
  iconWrap: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONT_FAMILY.regular,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 0,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  fabInner: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: RADIUS,
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
