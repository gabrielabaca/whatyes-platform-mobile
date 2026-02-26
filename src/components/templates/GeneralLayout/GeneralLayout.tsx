/**
 * General Layout
 * Layout reutilizable para usuarios logueados (buyer y seller)
 * Incluye Header con menú hamburguesa y drawer lateral
 */

import React, { useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../molecules/Header';
import { UserMenu, MenuOption, UserMenuRef } from '../../molecules/UserMenu';
import { useAuth } from '../../../hooks/useAuth';

interface GeneralLayoutProps {
  children: React.ReactNode;
  title?: string;
  menuOptions: MenuOption[];
}

export const GeneralLayout: React.FC<GeneralLayoutProps> = ({
  children,
  title = 'WhatYes!',
  menuOptions,
}) => {
  const { user } = useAuth();
  const menuRef = useRef<UserMenuRef>(null);

  const handleMenuPress = () => {
    menuRef.current?.toggleDrawer();
  };

  if (!user || (user.user_type !== 'buyer_user' && user.user_type !== 'seller_user')) {
    // Si no es buyer_user ni seller_user, renderizar sin layout especial
    return (
      <SafeAreaView className="flex-1 bg-white">
        {children}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <Header
        title={title}
        onMenuPress={handleMenuPress}
        showMenuButton={true}
      />

      {/* User Menu Drawer */}
      <UserMenu ref={menuRef} user={user} options={menuOptions} />

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
