/**
 * Layout general para sesión autenticada: cabecera + drawer opcionales,
 * contenido flexible y barra inferior de tabs (comprador / vendedor).
 */

import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../molecules/Header';
import { UserMenu, MenuOption, UserMenuRef } from '../../molecules/UserMenu';
import { HomeBottomNav, HomeLightBackground } from '../../organisms/home';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../context/ThemeContext';
import { BottomNavProvider, useBottomNav } from '../../../context/BottomNavContext';
import { themeColors } from '../../../theme/colors';

interface GeneralLayoutProps {
  children: React.ReactNode;
  title?: string;
  menuOptions?: MenuOption[];
  hideChrome?: boolean;
  containerClassName?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const GeneralLayout: React.FC<GeneralLayoutProps> = (props) => {
  const { user } = useAuth();

  if (!user || (user.user_type !== 'buyer_user' && user.user_type !== 'seller_user')) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-night-950">
        {props.children}
      </SafeAreaView>
    );
  }

  return (
    <BottomNavProvider>
      <GeneralLayoutShell {...props} />
    </BottomNavProvider>
  );
};

const GeneralLayoutShell: React.FC<GeneralLayoutProps> = ({
  children,
  title,
  menuOptions = [],
  hideChrome = false,
  containerClassName = 'flex-1',
  containerStyle,
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('common.appName');
  const { user } = useAuth();
  const { isDark } = useTheme();
  const menuRef = useRef<UserMenuRef>(null);
  const insets = useSafeAreaInsets();
  const { activeTab, onTabPress } = useBottomNav();

  const shellBackground = isDark ? themeColors.dark.background : themeColors.home.gradientBottom;
  const navBackground = isDark ? themeColors.dark.background : themeColors.home.navBar;

  const handleMenuPress = () => {
    menuRef.current?.toggleDrawer();
  };

  const showHeader = !hideChrome;

  return (
    <SafeAreaView
      className={containerClassName}
      style={[styles.shell, { backgroundColor: shellBackground }, containerStyle]}
      edges={['top', 'left', 'right']}
    >
      {!isDark ? (
        <View style={styles.gradientLayer} pointerEvents="none">
          <HomeLightBackground />
        </View>
      ) : null}

      {showHeader && user ? (
        <>
          <Header title={resolvedTitle} onMenuPress={handleMenuPress} showMenuButton={true} />
          <UserMenu ref={menuRef} user={user} options={menuOptions} />
        </>
      ) : null}

      <View style={styles.content}>{children}</View>

      <View
        style={[
          styles.bottomShell,
          {
            backgroundColor: navBackground,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <HomeBottomNav activeTab={activeTab} onTabPress={onTabPress} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bottomShell: {
    width: '100%',
  },
});
