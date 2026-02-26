import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { Text } from '../Text';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-primary-600 active:bg-primary-700',
    secondary: 'bg-gray-600 active:bg-gray-700',
    outline: 'bg-transparent border-2 border-primary-600 active:bg-primary-50',
  };

  const textColorClasses = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-primary-600',
  };

  const sizeClasses = {
    small: 'px-4 py-2 rounded-lg',
    medium: 'px-6 py-3 rounded-lg',
    large: 'px-8 py-4 rounded-xl',
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  const isDisabled = disabled || loading;

  const buttonClasses = [
    variantClasses[variant],
    sizeClasses[size],
    isDisabled ? 'opacity-50' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const textClasses = [
    textColorClasses[variant],
    textSizeClasses[size],
    'font-semibold text-center',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <TouchableOpacity
      className={buttonClasses}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#0284c7' : '#ffffff'} />
      ) : (
        <Text className={textClasses}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};
