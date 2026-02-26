/**
 * User Menu Component
 * Menú de navegación lateral (drawer) del usuario con opciones de navegación
 */

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Text } from '../../atoms/Text';
import { Check, AlertCircle, X } from 'lucide-react-native';
import type { User } from '../../../api/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75; // 75% del ancho de la pantalla

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

/**
 * Verifica si el perfil del usuario está completo
 */
const isProfileComplete = (user: User): boolean => {
  if (!user.profile) {
    return false;
  }

  // Verificar campos importantes del perfil
  const hasPhone = !!user.profile.phone;
  const hasLocation = !!user.profile.location;
  const hasTimezone = !!user.profile.timezone;

  // Para buyer_user, al menos debe tener teléfono
  if (user.user_type === 'buyer_user') {
    return hasPhone;
  }

  // Para seller_user, debe tener más campos
  return hasPhone && hasLocation;
};

export const UserMenu = forwardRef<UserMenuRef, UserMenuProps>(
  ({ user, options, onMenuButtonPress }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const profileComplete = isProfileComplete(user);
    const isVerified = user.is_verified;

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
      return <Check size={16} color="#10b981" />; // Verde
    }
    if (isVerified && !profileComplete) {
      return <AlertCircle size={16} color="#f59e0b" />; // Amarillo
    }
    return null;
  };

  const getStatusText = () => {
    if (isVerified && profileComplete) {
      return 'Verificado';
    }
    if (isVerified && !profileComplete) {
      return 'Perfil incompleto';
    }
    return 'No verificado';
  };

  const getStatusColor = () => {
    if (isVerified && profileComplete) {
      return '#10b981'; // Verde
    }
    if (isVerified && !profileComplete) {
      return '#f59e0b'; // Amarillo
    }
    return '#6b7280'; // Gris
  };

  return (
    <>

      {/* Overlay oscuro */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={closeDrawer}
        />
      </Animated.View>

      {/* Drawer lateral */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Header del drawer */}
        <View className="bg-primary-600 pt-12 pb-6 px-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text variant="h2" className="text-white font-bold">
              Menú
            </Text>
            <TouchableOpacity onPress={closeDrawer} activeOpacity={0.7}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Información del usuario */}
          <View className="bg-white/10 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <View className="bg-white/20 rounded-full w-12 h-12 items-center justify-center mr-3">
                <Text className="text-white text-lg font-bold">
                  {user.name.charAt(0)}{user.last_name.charAt(0)}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text variant="h3" className="text-white mr-2">
                    {user.name} {user.last_name}
                  </Text>
                  {getStatusIcon()}
                </View>
                <Text variant="caption" className="text-white/80 mt-1">
                  {user.email}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center mt-2">
              <Text
                variant="caption"
                style={{ color: getStatusColor() === '#10b981' ? '#10b981' : getStatusColor() === '#f59e0b' ? '#fbbf24' : '#ffffff' }}
                className="font-medium"
              >
                {getStatusText()}
              </Text>
            </View>
          </View>
        </View>

        {/* Opciones del menú */}
        <View className="flex-1 bg-white pt-4">
          {options.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleOptionPress(option)}
              className="flex-row items-center px-6 py-4 border-b border-gray-100"
              activeOpacity={0.7}
            >
              <Text variant="body" className="text-gray-900 flex-1">
                {option.label}
              </Text>
              <Text className="text-gray-400 text-lg">›</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: 'white',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
});
