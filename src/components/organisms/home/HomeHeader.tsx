import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '../../atoms/Text';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import {
  IconSearch,
  IconBell,
  IconUser,
  IconSun,
  IconMoon,
  IconSmartphone,
} from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme, type ThemePreference } from '../../../context/ThemeContext';

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
  /** Menú cuenta (tema + cerrar sesión); controlado desde HomeScreen también para la tab Perfil */
  accountMenuVisible: boolean;
  onAccountMenuVisibleChange: (visible: boolean) => void;
  onLogout: () => void;
  hasNotificationDot?: boolean;
}

function ThemeMenuIcon({
  preference,
  size,
  color,
}: {
  preference: ThemePreference;
  size: number;
  color: string;
}) {
  switch (preference) {
    case 'light':
      return <IconSun size={size} color={color} strokeWidth={2} />;
    case 'dark':
      return <IconMoon size={size} color={color} strokeWidth={2} />;
    default:
      return <IconSmartphone size={size} color={color} strokeWidth={2} />;
  }
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  profileImageUri,
  profileInitials,
  onPressSearch,
  onPressNotifications,
  accountMenuVisible,
  onAccountMenuVisibleChange,
  onLogout,
  hasNotificationDot = true,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, themePreference, cycleThemePreference } = useTheme();
  const iconMuted = isDark ? themeColors.dark.textMuted : HEADER_METRICS.iconGray;
  const logoWordColor = isDark ? themeColors.primary : HEADER_METRICS.logoText;

  const themeLabel =
    themePreference === 'system'
      ? t('home.themeAutomatic')
      : themePreference === 'light'
        ? t('home.themeLight')
        : t('home.themeDark');

  const closeMenu = () => onAccountMenuVisibleChange(false);

  return (
    <>
      <View
        style={styles.bar}
        className="flex-row bg-[#FFFFFF] dark:bg-[#050f2f] items-center justify-between w-full"
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
                    {
                      backgroundColor: HEADER_METRICS.bellDot,
                      borderColor: isDark ? '#050f2f' : '#E7E7FF',
                    },
                  ]}
                />
              ) : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onAccountMenuVisibleChange(true)}
            style={[
              styles.profileOuter,
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
        </View>
      </View>

      <Modal
        visible={accountMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={styles.modalBackdrop} onPress={closeMenu} />
          <View
            style={[
              styles.menuSheet,
              {
                top: insets.top + HEADER_METRICS.paddingV + HEADER_METRICS.profileSize + 8,
                right: HEADER_METRICS.paddingH,
              },
            ]}
            className="bg-white dark:bg-night-900 rounded-2xl border border-[#E4E4E7] dark:border-night-700"
            pointerEvents="box-none"
          >
            <Text
              style={{ fontFamily: FONT_FAMILY.semibold }}
              className="text-[13px] text-[#71717A] dark:text-night-muted px-4 pt-3 pb-1"
            >
              {t('home.accountMenuTitle')}
            </Text>

            <TouchableOpacity
              onPress={() => cycleThemePreference()}
              activeOpacity={0.75}
              className="flex-row items-center px-4 py-3 gap-3"
              accessibilityRole="button"
              accessibilityLabel={t('home.themeCycleHint')}
            >
              <ThemeMenuIcon preference={themePreference} size={22} color={themeColors.primary} />
              <View className="flex-1">
                <Text
                  style={{ fontFamily: FONT_FAMILY.semibold }}
                  className="text-[15px] text-[#18181b] dark:text-white"
                >
                  {themeLabel}
                </Text>
                <Text className="text-[12px] text-[#71717A] dark:text-night-muted mt-0.5">
                  {t('home.themeCycleHint')}
                </Text>
              </View>
            </TouchableOpacity>

            <View className="h-px bg-[#E4E4E7] dark:bg-night-700 mx-3" />

            <TouchableOpacity
              onPress={() => {
                closeMenu();
                onLogout();
              }}
              activeOpacity={0.75}
              className="px-4 py-3.5"
              accessibilityRole="button"
            >
              <Text
                style={{ fontFamily: FONT_FAMILY.semibold }}
                className="text-[15px] text-red-600 dark:text-red-400 text-center"
              >
                {t('home.menuLogout')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  modalRoot: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  menuSheet: {
    position: 'absolute',
    minWidth: 268,
    maxWidth: 320,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
});
