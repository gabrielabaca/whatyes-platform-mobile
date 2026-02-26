import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  className?: string;
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  className = '',
  children,
  ...props
}) => {
  const variantClasses = {
    h1: 'text-3xl font-bold text-gray-900',
    h2: 'text-2xl font-semibold text-gray-900',
    h3: 'text-xl font-medium text-gray-800',
    body: 'text-base text-gray-700',
    caption: 'text-sm text-gray-600',
    label: 'text-sm font-medium text-gray-700',
  };

  const combinedClasses = [variantClasses[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <RNText className={combinedClasses} {...props}>
      {children}
    </RNText>
  );
};
