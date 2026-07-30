/**
 * User Menu Component
 * Menú lateral con colores alineados a themeColors (modo claro / oscuro)
 */

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Text } from '../../atoms/Text';
import { AlertCircle, Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';
import type { User } from '../../../api/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export interface MenuOption {
  label: string;
  value: string;
  onPress: () => void;
}

interface UserMenuProps {
  user: User;
  options: MenuOption[];
  onMenuButtonPress?: () => void;
}

export interface UserMenuRef {
  toggleDrawer: () => void;
  closeDrawer: () => void;
  openDrawer: () => void;
}

const isProfileComplete = (user: User): boolean => {
  if (!user.profile) {
    return false;
  }
  const hasPhone = !!user.profile.phone;
  const hasLocation = !!user.profile.location;
  if (user.user_type === 'buyer_user') {
    return hasPhone;
  }
  return hasPhone && hasLocation;
};

export const UserMenu = forwardRef<UserMenuRef, UserMenuProps>(
  ({ user, options, onMenuButtonPress }, ref) => {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const profileComplete = isProfileComplete(user);
    const isVerified = user.is_verified;

    const c = isDark ? themeColors.dark : themeColors.light;
    const drawerBackground = isDark ? c.background : c.surface;
    const overlayBg = isDark ? themeColors.dark.overlay : themeColors.light.overlay;

    useEffect(() => {
      if (isOpen) {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -DRAWER_WIDTH,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isOpen]);

    const toggleDrawer = () => {
      setIsOpen(!isOpen);
    };

    const closeDrawer = () => {
      setIsOpen(false);
    };

    const openDrawer = () => {
      setIsOpen(true);
    };

    useImperativeHandle(ref, () => ({
      toggleDrawer,
      closeDrawer,
      openDrawer,
    }));

    const handleOptionPress = (option: MenuOption) => {
      closeDrawer();
      option.onPress();
    };

    const getStatusIcon = () => {
      if (isVerified && profileComplete) {
        return <Check size={16} color={themeColors.success} />;
      }
      if (isVerified && !profileComplete) {
        return <AlertCircle size={16} color={themeColors.gold} />;
      }
      return null;
    };

    const getStatusText = () => {
      if (isVerified && profileComplete) {
        return t('userMenu.statusVerified');
      }
      if (isVerified && !profileComplete) {
        return t('userMenu.statusIncompleteProfile');
      }
      return t('userMenu.statusUnverified');
    };

    const getStatusColor = () => {
      if (isVerified && profileComplete) {
        return themeColors.success;
      }
      if (isVerified && !profileComplete) {
        return themeColors.gold;
      }
      return themeColors.glass.textSoft;
    };

    return (
      <>
        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
              backgroundColor: overlayBg,
            },
          ]}
        >
          <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={closeDrawer} />
        </Animated.View>

        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
              backgroundColor: drawerBackground,
            },
          ]}
        >
          {/* Cabecera marca (primario PulpoLive) */}
          <View className="bg-primary-600 pt-12 pb-6 px-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text variant="h2" className="font-bold text-[#FEFEFE]">
                {t('userMenu.title')}
              </Text>
              <TouchableOpacity
                onPress={closeDrawer}
                activeOpacity={0.7}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={22} color="#FEFEFE" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <View
              className="rounded-xl border border-white/15 p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
              <View className="flex-row items-center mb-2">
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <Text className="text-lg font-bold text-white">
                    {user.name.charAt(0)}
                    {user.last_name.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text variant="h3" className="mr-2 text-white">
                      {user.name} {user.last_name}
                    </Text>
                    {getStatusIcon()}
                  </View>
                  <Text variant="caption" className="mt-1 text-white/80">
                    {user.email}
                  </Text>
                </View>
              </View>
              <View className="mt-2 flex-row items-center">
                <Text variant="caption" style={{ color: getStatusColor() }} className="font-medium">
                  {getStatusText()}
                </Text>
              </View>
            </View>
          </View>

          {/* Cuerpo: superficie clara u oscura según tema */}
          <View
            className="flex-1 pt-4"
            style={{
              backgroundColor: isDark ? themeColors.dark.surface : themeColors.light.surface,
            }}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleOptionPress(option)}
                className="flex-row items-center border-b border-gray-100 px-6 py-4 dark:border-night-700"
                activeOpacity={0.7}
              >
                <Text variant="body" className="flex-1" style={{ color: c.text }}>
                  {option.label}
                </Text>
                <Text className="text-lg" style={{ color: c.textMuted }}>
                  ›
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </>
    );
  }
);

UserMenu.displayName = 'UserMenu';

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  overlayTouchable: {
    flex: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
});
