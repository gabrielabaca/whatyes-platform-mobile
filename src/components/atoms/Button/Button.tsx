import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator, View } from 'react-native';
import { Text } from '../Text';
import { themeColors } from '../../../theme/colors';

/** Primario MVP: mismo color en claro y oscuro — Figma nodo 536-14434 */
const PRIMARY_BG = 'bg-[#685CF0] active:bg-primary-700';

/** Danger: fondo fijo en claro y oscuro */
const DANGER_BG = 'bg-[#FB2C36] active:opacity-90';

const layoutBase = 'items-center justify-center text-center rounded-full overflow-hidden';

const variantContainer: Record<
  'primary' | 'danger' | 'secondary' | 'outline' | 'ghost',
  string
> = {
  primary: PRIMARY_BG,
  danger: DANGER_BG,
  secondary:
    'bg-gray-600 active:bg-gray-700 dark:bg-night-700 dark:active:bg-night-600',
  outline:
    'bg-transparent border-2 border-primary-600 active:bg-primary-50 dark:border-primary-400 dark:active:bg-night-800',
  ghost: 'bg-transparent active:opacity-80 dark:active:opacity-70',
};

/** Tamaños; `large` coincide con CTA del diseño (px 32, py 14, pill). */
const sizeContainer = {
  small: 'px-4 py-2 min-h-[40px]',
  medium: 'px-6 py-3 min-h-[44px]',
  large: 'px-8 py-[14px] min-h-[52px]',
} as const;

const textSize = {
  small: 'text-sm leading-5',
  medium: 'text-base leading-6',
  /** Figma: 16 / 24, tracking ~0.08px */
  large: 'text-base leading-6 tracking-[0.08px]',
} as const;

export interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string;
  variant?: 'primary' | 'danger' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  className?: string;
  /** Clases extra solo para el texto del título (p. ej. enlaces “Omitir” en onboarding). */
  titleClassName?: string;
  /** Icono opcional a la izquierda del título; se oculta mientras `loading`. */
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  className = '',
  titleClassName = '',
  leftIcon,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const buttonClasses = [
    layoutBase,
    variantContainer[variant],
    variant === 'ghost' ? 'min-h-[48px] justify-center' : '',
    sizeContainer[size],
    isDisabled ? 'opacity-50' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  let coreText = '';
  if (variant === 'primary' || variant === 'danger') {
    coreText = [
      'font-semibold',
      'text-center',
      '!text-[#FEFEFE]',
      textSize[size],
    ].join(' ');
  } else if (variant === 'secondary') {
    coreText = ['font-semibold', 'text-center', '!text-white', textSize[size]].join(' ');
  } else if (variant === 'outline') {
    coreText = [
      'font-semibold',
      'text-center',
      '!text-primary-600',
      'dark:!text-primary-300',
      textSize[size],
    ].join(' ');
  } else {
    coreText = [
      'font-semibold',
      'text-center',
      '!text-primary-600',
      'dark:!text-primary-300',
      textSize[size],
    ].join(' ');
  }

  const textClasses = [coreText, titleClassName].filter(Boolean).join(' ');

  const spinnerColor =
    variant === 'outline' || variant === 'ghost' ? themeColors.primary : '#FEFEFE';

  return (
    <TouchableOpacity className={buttonClasses} disabled={isDisabled} {...props}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : leftIcon ? (
        <View className="flex-row items-center justify-center" style={{ gap: 12 }}>
          {leftIcon}
          <Text className={textClasses}>{title}</Text>
        </View>
      ) : (
        <Text className={textClasses}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
