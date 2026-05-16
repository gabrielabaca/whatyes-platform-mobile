/**
 * Iconos vectoriales (react-native-svg). Sin dependencia de paquetes de iconos tipo fuente.
 */
import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export interface SvgIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function IconSearch({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="m21 21-4.3-4.3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconBell({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconUser({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconShoppingBag({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 6h18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M16 10a4 4 0 0 1-8 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconSun({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconMoon({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconSmartphone({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="5"
        y="2"
        width="14"
        height="20"
        rx="2"
        ry="2"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Line x1="12" y1="18" x2="12.01" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconHome({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="9 22 9 12 15 12 15 22"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconPlus({ size = 29, color = '#FFFFFF' }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 29 29" fill="none">
      <Path
        d="M22.6401 3.5748H5.95788C4.64169 3.5748 3.57471 4.64178 3.57471 5.95797V22.6402C3.57471 23.9564 4.64169 25.0234 5.95788 25.0234H22.6401C23.9563 25.0234 25.0233 23.9564 25.0233 22.6402V5.95797C25.0233 4.64178 23.9563 3.5748 22.6401 3.5748Z"
        stroke={color}
        strokeWidth={2.38317}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.53271 14.2991H19.0654"
        stroke={color}
        strokeWidth={2.38317}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.2991 9.53273V19.0654"
        stroke={color}
        strokeWidth={2.38317}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}



export function IconEye({ size = 24, color = '#000', strokeWidth = 2 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Estrella rellena (valoraciones). */
export function IconStar({ size = 24, color = '#fbbf24' }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

/** Filter Icon */
export function IconFilter({ size = 24, color = '#000' }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 9V7H16V3H18V7H21V9H13ZM16 21V11H18V21H16ZM6 21V17H3V15H11V17H8V21H6ZM6 13V3H8V13H6Z"
        fill={color}
      />
    </Svg>
  );
}