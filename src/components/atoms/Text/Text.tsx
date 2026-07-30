import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { FONT_FAMILY } from '../../../theme/typography';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  className?: string;
  children: React.ReactNode;
}

/**
 * Color de tema oscuro por variante. Los colores claros siguen viviendo en
 * `variantClasses` sin tocar: el modo claro no cambia en ningún caso.
 *
 * Se agrega SOLO si el call site no trae color de texto propio. En NativeWind gana la
 * especificidad CSS, no el orden del string: `dark:text-white` compila a
 * `:is(.dark .dark\:text-white)` (2 clases) y le ganaría a un `text-white` o un
 * `text-red-500` del call site (1 clase). Saltear la clase cuando el call site define su
 * color mantiene la regla "el call site manda" y evita que en oscuro se pierdan los
 * colores semánticos (error en rojo, montos en verde, texto blanco sobre chips).
 */
const VARIANT_DARK_TEXT: Record<NonNullable<TextProps['variant']>, string> = {
  h1: 'dark:text-white',
  h2: 'dark:text-white',
  h3: 'dark:text-white',
  body: 'dark:text-white',
  caption: 'dark:text-night-muted',
  label: 'dark:text-night-muted',
};

/**
 * Utilidades `text-*` que son COLOR (no tamaño ni alineación): `text-white`,
 * `text-gray-500`, `text-primary-600`, `text-night-muted`, `text-[#02050F]`…
 * Deja fuera `text-base`, `text-2xl`, `text-[14px]`, `text-center`, etc.
 */
const HAS_TEXT_COLOR =
  /(?:^|\s)(?:dark:)?!?text-(?:\[(?:#|rgb|hsl|var)|(?:white|black|transparent|current|inherit|night-muted|[a-z]+-\d{2,3})(?![\w-]))/;

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

  const combinedClasses = [
    variantClasses[variant],
    HAS_TEXT_COLOR.test(className) ? '' : VARIANT_DARK_TEXT[variant],
    className,
  ]
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
