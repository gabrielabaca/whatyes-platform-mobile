/**
 * Layout general para sesión autenticada: cabecera + drawer opcionales,
 * contenido flexible y barra inferior opcional (p. ej. tabs comprador).
 */

import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Header } from '../../molecules/Header';
import { UserMenu, MenuOption, UserMenuRef } from '../../molecules/UserMenu';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeContext';

interface GeneralLayoutProps {
  children: React.ReactNode;
  title?: string;
  /** Requerido si se muestra el menú hamburguesa (`hideChrome` false). */
  menuOptions?: MenuOption[];
  /** Oculta header y drawer (pantallas con cabecera propia, ej. home comprador). */
  hideChrome?: boolean;
  /** Barra inferior fija (navegación por tabs). */
  bottomBar?: React.ReactNode;
  /** Clases del `SafeAreaView` raíz (fondo, etc.). */
  containerClassName?: string;
}

export const GeneralLayout: React.FC<GeneralLayoutProps> = ({
  children,
  title,
  menuOptions = [],
  hideChrome = false,
  bottomBar,
  containerClassName = 'flex-1 bg-white dark:bg-night-950',
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('common.appName');
  const { user } = useAuth();
  const { isDark } = useTheme();
  const menuRef = useRef<UserMenuRef>(null);
  const insets = useSafeAreaInsets();

  const handleMenuPress = () => {
    menuRef.current?.toggleDrawer();
  };

  if (!user || (user.user_type !== 'buyer_user' && user.user_type !== 'seller_user')) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-night-950">
        {children}
      </SafeAreaView>
    );
  }

  const showHeader = !hideChrome;

  return (
    <SafeAreaView
      className={`${containerClassName} relative overflow-hidden`}
      edges={bottomBar ? ['top', 'left', 'right'] : undefined}
    >
      {!isDark ? <LightBackgroundGradient /> : null}
      {showHeader ? (
        <>
          <Header title={resolvedTitle} onMenuPress={handleMenuPress} showMenuButton={true} />
          <UserMenu ref={menuRef} user={user} options={menuOptions} />
        </>
      ) : null}

      <View style={styles.content}>{children}</View>

      {bottomBar ? (
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 8),
          }}
        >
          {bottomBar}
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const LightBackgroundGradient: React.FC = () => (
  <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Defs>
      <LinearGradient id="general-layout-light-bg" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="1" stopColor="#E7E7FF" />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#general-layout-light-bg)" />
  </Svg>
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
