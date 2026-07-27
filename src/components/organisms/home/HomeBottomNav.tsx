import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  IconHome,
  IconSearch,
  IconPlus,
  IconBell,
  type SvgIconProps,
  IconAccount,
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
/** Borde superior alineado al diseño (Figma 652:34535). */
const NAV_BORDER = '#DDD';
const MUTED = '#71717B';
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
    labelKey:
      | 'home.tabHome'
      | 'home.tabExplore'
      | 'home.tabActivity'
      | 'home.tabAccount';
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
        <Text
          style={[styles.label, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {t(labelKey)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: isDark ? themeColors.dark.background : themeColors.home.navBar },
      ]}
    >
      <NavItem tab="home" labelKey="home.tabHome" IconCmp={IconHome} />
      <NavItem tab="explore" labelKey="home.tabExplore" IconCmp={IconSearch} />
      <CenterFab onPress={() => onTabPress('create')} />
      <NavItem tab="activity" labelKey="home.tabActivity" IconCmp={IconBell} />
      <NavItem tab="account" labelKey="home.tabAccount" IconCmp={IconAccount} />
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
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
    borderTopWidth: 0.7,
    borderTopColor: NAV_BORDER,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
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
    width: '100%',
    fontFamily: FONT_FAMILY.regular,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 0,
  },
  fabSlot: {
    flexGrow: 0,
    flexShrink: 0,
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
