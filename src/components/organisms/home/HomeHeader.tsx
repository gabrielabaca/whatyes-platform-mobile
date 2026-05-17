import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../../atoms/Text';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import { IconSearch, IconBell, IconUser } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';

/** Medidas y colores del header de inicio (comprador). */
const HEADER_METRICS = {
  logoText: '#685CF0',
  logoTextSize: 24,
  logoLineHeight: 32,
  logoIconW: 26,
  logoIconH: 23,
  gapLogoToText: 8,
  iconGray: '#71717A',
  profileCircle: '#685CF0',
  profileIcon: '#02050F',
  bellDot: '#FB2C36',
  hitSearchBell: 38,
  iconSearchBell: 22,
  profileSize: 32,
  profileIconInner: 18,
  paddingH: 16,
  paddingV: 12,
} as const;

interface HomeHeaderProps {
  profileImageUri?: string | null;
  profileInitials: string;
  onPressSearch?: () => void;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
  hasNotificationDot?: boolean;
  showProfile?: boolean;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  profileImageUri,
  profileInitials: _profileInitials,
  onPressSearch,
  onPressNotifications,
  onPressProfile,
  hasNotificationDot = true,
  showProfile = true,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const iconMuted = isDark ? themeColors.dark.textMuted : HEADER_METRICS.iconGray;
  const logoWordColor = isDark ? themeColors.primary : HEADER_METRICS.logoText;

  return (
    <View
      style={[styles.bar, { backgroundColor: isDark ? '#050f2f' : themeColors.home.header }]}
      className="flex-row items-center justify-between w-full"
    >
      <View style={styles.logoRow} className="flex-row items-center flex-1 min-w-0">
        <HeaderLogo width={HEADER_METRICS.logoIconW} height={HEADER_METRICS.logoIconH} />
        <Text
          style={{
            fontFamily: FONT_FAMILY.bold,
            fontSize: HEADER_METRICS.logoTextSize,
            lineHeight: HEADER_METRICS.logoLineHeight,
            color: logoWordColor,
          }}
        >
          PulpoLive
        </Text>
      </View>

      <View style={styles.actions} className="flex-row items-center justify-end shrink-0">
        <TouchableOpacity
          onPress={onPressSearch}
          style={styles.hit}
          activeOpacity={0.7}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Buscar"
        >
          <IconSearch size={HEADER_METRICS.iconSearchBell} color={iconMuted} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPressNotifications}
          style={styles.hit}
          activeOpacity={0.7}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
        >
          <View style={styles.bellWrap}>
            <IconBell size={HEADER_METRICS.iconSearchBell} color={iconMuted} strokeWidth={2} />
            {hasNotificationDot ? (
              <View
                style={[
                  styles.bellDot,
                  // eslint-disable-next-line react-native/no-inline-styles
                  {
                    backgroundColor: HEADER_METRICS.bellDot,
                    borderColor: isDark ? '#050f2f' : '#E7E7FF',
                  },
                ]}
              />
            ) : null}
          </View>
        </TouchableOpacity>

        {showProfile ? (
          <TouchableOpacity
            onPress={onPressProfile}
            style={[
              styles.profileOuter,
              // eslint-disable-next-line react-native/no-inline-styles
              {
                width: HEADER_METRICS.profileSize,
                height: HEADER_METRICS.profileSize,
                borderRadius: HEADER_METRICS.profileSize / 2,
                backgroundColor: profileImageUri ? 'transparent' : HEADER_METRICS.profileCircle,
              },
            ]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('home.tabProfile')}
          >
            {profileImageUri ? (
              <Image
                source={{ uri: profileImageUri }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.profileFallback,
                  {
                    width: HEADER_METRICS.profileSize,
                    height: HEADER_METRICS.profileSize,
                    borderRadius: HEADER_METRICS.profileSize / 2,
                  },
                ]}
              >
                <IconUser
                  size={HEADER_METRICS.profileIconInner}
                  color={HEADER_METRICS.profileIcon}
                  strokeWidth={2.2}
                />
              </View>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: HEADER_METRICS.paddingH,
    paddingVertical: HEADER_METRICS.paddingV,
  },
  logoRow: {
    gap: HEADER_METRICS.gapLogoToText,
  },
  actions: {
    gap: 10,
  },
  hit: {
    width: HEADER_METRICS.hitSearchBell,
    height: HEADER_METRICS.hitSearchBell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellWrap: {
    width: HEADER_METRICS.iconSearchBell,
    height: HEADER_METRICS.iconSearchBell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  profileOuter: {
    marginLeft: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: HEADER_METRICS.profileSize,
    height: HEADER_METRICS.profileSize,
    borderRadius: HEADER_METRICS.profileSize / 2,
  },
  profileFallback: {
    backgroundColor: HEADER_METRICS.profileCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
