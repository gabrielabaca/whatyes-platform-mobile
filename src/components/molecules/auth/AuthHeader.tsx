/**
 * Header canónico de las pantallas de auth y onboarding comprador — Figma
 * 1117:3507 (con flecha) y 1108:1037 (sin flecha): fila con flecha de volver a la
 * izquierda, logo de PulpoLive centrado y spacer simétrico, y el título centrado
 * en una fila propia debajo.
 *
 * Existe por el mismo motivo que GlassModalHeader en los modales glass: seis
 * pantallas rearmaban este bloque a mano y el logo faltaba en todas. Sin `onBack`
 * se conserva el spacer izquierdo para que el logo no se descentre.
 */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import HeaderLogo from '../../../../assets/images/header_logo.svg';
import { Text } from '../../atoms/Text';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';

export interface AuthHeaderProps {
  title: string;
  /** Sin `onBack` no hay flecha (variante Figma 1108:1037) pero el logo sigue centrado. */
  onBack?: () => void;
  /** Margen externo del bloque; cada pantalla conserva el espaciado que ya tenía. */
  className?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ title, onBack, className }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const c = isDark ? themeColors.dark : themeColors.light;

  return (
    <View className={className}>
      <View className="flex-row items-center justify-between">
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            className="w-8 h-8 items-start justify-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <ArrowLeft size={24} color={c.text} />
          </TouchableOpacity>
        ) : (
          <View className="w-8 h-8" />
        )}
        {/* 26×23 = tamaño natural de header_logo.svg, el mismo del nodo Figma (25.2×23). */}
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <HeaderLogo width={26} height={23} />
        </View>
        <View className="w-8 h-8" />
      </View>
      <Text
        accessibilityRole="header"
        className="mt-4 text-center text-[20px] font-bold text-[#02050F] dark:text-white"
      >
        {title}
      </Text>
    </View>
  );
};
