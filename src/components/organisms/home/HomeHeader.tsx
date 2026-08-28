import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../../atoms/Text';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import ForumIcon from '../../../../assets/icons/header/forum.svg';
import { IconBell } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';

/** Medidas y colores del header de inicio (comprador). Figma 698:1898. */
const HEADER_METRICS = {
  logoText: '#685CF0',
  logoTextSize: 24,
  logoLineHeight: 32,
  logoIconW: 26,
  logoIconH: 23,
  gapLogoToText: 8,
  iconGray: '#71717A',
  /** Rojo del punto de la campana y del chat. */
  badgeRed: '#FB2C36',
  hitSearchBell: 38,
  iconSearchBell: 22,
  /** El ícono de chat va sin caja de 38 (Figma lo pone suelto): el área táctil la da hitSlop. */
  iconChat: 24,
  paddingH: 16,
  paddingV: 12,
} as const;

interface HomeHeaderProps {
  onPressNotifications?: () => void;
  /** Chat entre usuarios: reemplaza al antiguo botón de perfil (Figma 961:742). */
  onPressChat?: () => void;
  /** Punto rojo de la campana: encendido solo si hay notificaciones sin leer. */
  hasNotificationDot?: boolean;
  showChat?: boolean;
  /** Conversaciones con mensajes nuevos: pinta el contador rojo sobre el ícono. */
  chatUnreadCount?: number;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  onPressNotifications,
  onPressChat,
  hasNotificationDot = false,
  showChat = true,
  chatUnreadCount = 0,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const iconMuted = isDark ? themeColors.dark.textMuted : HEADER_METRICS.iconGray;
  const logoWordColor = isDark ? themeColors.primary : HEADER_METRICS.logoText;
  const badgeBorderColor = isDark ? '#050f2f' : '#E7E7FF';

  const unreadCount = Math.max(0, Math.trunc(chatUnreadCount) || 0);

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
                  styles.unreadDot,
                  {
                    backgroundColor: HEADER_METRICS.badgeRed,
                    borderColor: badgeBorderColor,
                  },
                ]}
              />
            ) : null}
          </View>
        </TouchableOpacity>

        {showChat ? (
          <TouchableOpacity
            onPress={onPressChat}
            style={styles.chatHit}
            activeOpacity={0.7}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `${t('home.chat')}, ${t('home.chatUnread', { count: unreadCount })}`
                : t('home.chat')
            }
          >
            {/* El fill del SVG es currentColor: `color` lo tiñe según el tema. */}
            <ForumIcon
              width={HEADER_METRICS.iconChat}
              height={HEADER_METRICS.iconChat}
              color={iconMuted}
            />
            {unreadCount > 0 ? (
              <View
                style={[
                  styles.unreadDot,
                  {
                    backgroundColor: HEADER_METRICS.badgeRed,
                    borderColor: badgeBorderColor,
                  },
                ]}
              />
            ) : null}
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
    // Figma 698:1909
    gap: 12,
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
  unreadDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  chatHit: {
    width: HEADER_METRICS.iconChat,
    height: HEADER_METRICS.iconChat,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
