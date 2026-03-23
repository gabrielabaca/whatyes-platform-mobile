import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  className?: string;
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  className = '',
  children,
  style,
  ...props
}) => {
  const variantClasses = {
    h1: 'font-mulish text-3xl font-bold text-gray-900',
    h2: 'font-mulish text-2xl font-semibold text-gray-900',
    h3: 'font-mulish text-xl font-semibold text-gray-800',
    body: 'font-mulish text-base font-normal text-gray-700',
    caption: 'font-mulish text-sm font-normal text-gray-600',
    label: 'font-mulish text-sm font-semibold text-gray-700',
  };

  const combinedClasses = [variantClasses[variant], className]
    .filter(Boolean)
    .join(' ');

  const resolvedFontFamily = combinedClasses.includes('font-bold')
    ? FONT_FAMILY.bold
    : combinedClasses.includes('font-semibold') || combinedClasses.includes('font-medium')
      ? FONT_FAMILY.semibold
      : FONT_FAMILY.regular;

  return (
    <RNText className={combinedClasses} style={[{ fontFamily: resolvedFontFamily }, style]} {...props}>
      {children}
    </RNText>
  );
};
