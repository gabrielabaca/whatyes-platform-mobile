import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { Text } from '../Text';
import './Button.css';

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
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
  };

  const sizeClasses = {
    small: 'btn-size-small',
    medium: 'btn-size-medium',
    large: 'btn-size-large',
  };

  const textSizeClasses = {
    small: 'btn-text-small',
    medium: 'btn-text-medium',
    large: 'btn-text-large',
  };

  const isDisabled = disabled || loading;

  const buttonClasses = [
    'btn-base',
    variantClasses[variant],
    sizeClasses[size],
    isDisabled ? 'btn-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const textClasses = [
    variant === 'outline' ? 'text-primary-600' : 'text-white',
    textSizeClasses[size],
    variant === 'primary' ? 'font-bold text-center' : 'font-semibold text-center',
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
