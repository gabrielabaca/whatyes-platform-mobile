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

/** Campana Material "notifications" (relleno, sin stroke) — Figma nodo 821-1104. */
export function IconNotifications({ size = 24, color = '#000' }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19V17H6V10C6 8.61667 6.41667 7.3875 7.25 6.3125C8.08333 5.2375 9.16667 4.53333 10.5 4.2V3.5C10.5 3.08333 10.6458 2.72917 10.9375 2.4375C11.2292 2.14583 11.5833 2 12 2C12.4167 2 12.7708 2.14583 13.0625 2.4375C13.3542 2.72917 13.5 3.08333 13.5 3.5V4.2C14.8333 4.53333 15.9167 5.2375 16.75 6.3125C17.5833 7.3875 18 8.61667 18 10V17H20V19H4ZM12 22C11.45 22 10.9792 21.8042 10.5875 21.4125C10.1958 21.0208 10 20.55 10 20H14C14 20.55 13.8042 21.0208 13.4125 21.4125C13.0208 21.8042 12.55 22 12 22ZM8 17H16V10C16 8.9 15.6083 7.95833 14.825 7.175C14.0417 6.39167 13.1 6 12 6C10.9 6 9.95833 6.39167 9.175 7.175C8.39167 7.95833 8 8.9 8 10V17Z"
        fill={color}
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

/** Compartir (Figma 536:23125 — share). */
export function IconShare({ size = 24, color = '#FFFFFF' }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 22C16.1667 22 15.4583 21.7083 14.875 21.125C14.2917 20.5417 14 19.8333 14 19C14 18.9 14.025 18.6667 14.075 18.3L7.05 14.2C6.78333 14.45 6.475 14.6458 6.125 14.7875C5.775 14.9292 5.4 15 5 15C4.16667 15 3.45833 14.7083 2.875 14.125C2.29167 13.5417 2 12.8333 2 12C2 11.1667 2.29167 10.4583 2.875 9.875C3.45833 9.29167 4.16667 9 5 9C5.4 9 5.775 9.07083 6.125 9.2125C6.475 9.35417 6.78333 9.55 7.05 9.8L14.075 5.7C14.0417 5.58333 14.0208 5.47083 14.0125 5.3625C14.0042 5.25417 14 5.13333 14 5C14 4.16667 14.2917 3.45833 14.875 2.875C15.4583 2.29167 16.1667 2 17 2C17.8333 2 18.5417 2.29167 19.125 2.875C19.7083 3.45833 20 4.16667 20 5C20 5.83333 19.7083 6.54167 19.125 7.125C18.5417 7.70833 17.8333 8 17 8C16.6 8 16.225 7.92917 15.875 7.7875C15.525 7.64583 15.2167 7.45 14.95 7.2L7.925 11.3C7.95833 11.4167 7.97917 11.5292 7.9875 11.6375C7.99583 11.7458 8 11.8667 8 12C8 12.1333 7.99583 12.2542 7.9875 12.3625C7.97917 12.4708 7.95833 12.5833 7.925 12.7L14.95 16.8C15.2167 16.55 15.525 16.3542 15.875 16.2125C16.225 16.0708 16.6 16 17 16C17.8333 16 18.5417 16.2917 19.125 16.875C19.7083 17.4583 20 18.1667 20 19C20 19.8333 19.7083 20.5417 19.125 21.125C18.5417 21.7083 17.8333 22 17 22ZM17 20C17.2833 20 17.5208 19.9042 17.7125 19.7125C17.9042 19.5208 18 19.2833 18 19C18 18.7167 17.9042 18.4792 17.7125 18.2875C17.5208 18.0958 17.2833 18 17 18C16.7167 18 16.4792 18.0958 16.2875 18.2875C16.0958 18.4792 16 18.7167 16 19C16 19.2833 16.0958 19.5208 16.2875 19.7125C16.4792 19.9042 16.7167 20 17 20ZM5 13C5.28333 13 5.52083 12.9042 5.7125 12.7125C5.90417 12.5208 6 12.2833 6 12C6 11.7167 5.90417 11.4792 5.7125 11.2875C5.52083 11.0958 5.28333 11 5 11C4.71667 11 4.47917 11.0958 4.2875 11.2875C4.09583 11.4792 4 11.7167 4 12C4 12.2833 4.09583 12.5208 4.2875 12.7125C4.47917 12.9042 4.71667 13 5 13ZM17.7125 5.7125C17.9042 5.52083 18 5.28333 18 5C18 4.71667 17.9042 4.47917 17.7125 4.2875C17.5208 4.09583 17.2833 4 17 4C16.7167 4 16.4792 4.09583 16.2875 4.2875C16.0958 4.47917 16 4.71667 16 5C16 5.28333 16.0958 5.52083 16.2875 5.7125C16.4792 5.90417 16.7167 6 17 6C17.2833 6 17.5208 5.90417 17.7125 5.7125Z"
        fill={color}
      />
    </Svg>
  );
}

/** Menú vertical (Figma perfil — more_vert). */
export function IconMoreVertical({ size = 24, color = '#FFFFFF' }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="12" cy="19" r="1.5" fill={color} />
    </Svg>
  );
}

/** Etiqueta / vendidos (Figma perfil — sell). */
export function IconTag({ size = 19, color = '#685CF0', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7" cy="7" r="1.5" fill={color} />
    </Svg>
  );
}

export function IconChevronLeft({ size = 24, color = '#FFFFFF', strokeWidth = 2.5 }: SvgIconProps) {
  const sw = (strokeWidth * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m15 18-6-6 6-6"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Chevron iOS (arrow_forward_ios) — Figma cuenta. */
export function IconChevronRight({ size = 16, color = '#18181B', strokeWidth = 2.5 }: SvgIconProps) {
  const sw = (strokeWidth * size) / 16;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m10 6 6 6-6 6"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconCreditCard({ size = 18, color = '#18181B', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M6 15h2M10 15h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconLocation({ size = 18, color = '#18181B', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconSettings({ size = 18, color = '#18181B', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconLock({ size = 16, color = '#18181B', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconChat({ size = 18, color = '#18181B', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="9" y1="10" x2="15" y2="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="9" y1="14" x2="13" y2="14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconDocument({ size = 18, color = '#18181B', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="14 2 14 8 20 8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8" y1="17" x2="16" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function IconHelpCircle({ size = 18, color = '#18181B', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="17" r="0.5" fill={color} stroke={color} strokeWidth={1} />
    </Svg>
  );
}

export function IconLogOut({ size = 18, color = '#DC2626', strokeWidth = 1.75 }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="16 17 21 12 16 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Icono de cuenta (perfil con badge de verificación). */
export function IconAccount({ size = 24, color = '#685CF0', strokeWidth = 2 }: SvgIconProps) {
  const sw = (strokeWidth * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
/** Icono de cámara de video (estado vacío de vivos). */
export function IconVideo({ size = 24, color = '#685CF0', strokeWidth = 2 }: SvgIconProps) {
  const sw = (strokeWidth * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 8L16 12L22 16V8Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 6H4C2.89543 6 2 6.89543 2 8V16C2 17.1046 2.89543 18 4 18H14C15.1046 18 16 17.1046 16 16V8C16 6.89543 15.1046 6 14 6Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
/** Pin con "+" — Material "add_location" (relleno) — Figma nodo 1210-3132. */
export function IconAddLocation({ size = 20, color = '#000' }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M9.16667 11.6667H10.8333V9.16667H13.3333V7.5H10.8333V5H9.16667V7.5H6.66667V9.16667H9.16667V11.6667ZM10 16.125C11.6944 14.5694 12.9514 13.1562 13.7708 11.8854C14.5903 10.6146 15 9.48611 15 8.5C15 6.98611 14.5174 5.74653 13.5521 4.78125C12.5868 3.81597 11.4028 3.33333 10 3.33333C8.59722 3.33333 7.41319 3.81597 6.44792 4.78125C5.48264 5.74653 5 6.98611 5 8.5C5 9.48611 5.40972 10.6146 6.22917 11.8854C7.04861 13.1562 8.30556 14.5694 10 16.125ZM10 18.3333C7.76389 16.4306 6.09375 14.6632 4.98958 13.0312C3.88542 11.3993 3.33333 9.88889 3.33333 8.5C3.33333 6.41667 4.00347 4.75694 5.34375 3.52083C6.68403 2.28472 8.23611 1.66667 10 1.66667C11.7639 1.66667 13.316 2.28472 14.6563 3.52083C15.9965 4.75694 16.6667 6.41667 16.6667 8.5C16.6667 9.88889 16.1146 11.3993 15.0104 13.0312C13.9062 14.6632 12.2361 16.4306 10 18.3333Z"
        fill={color}
      />
    </Svg>
  );
}
/** Cámara con "+" — Material "add_a_photo" (relleno) — Figma nodo 1121-10840. */
export function IconAddAPhoto({ size = 24, color = '#FFFFFF' }: SvgIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.27273 18.5C5.92273 18.5 5.62311 18.3727 5.37386 18.1181C5.12462 17.8635 5 17.5575 5 17.2V9.4C5 9.0425 5.12462 8.73646 5.37386 8.48187C5.62311 8.22729 5.92273 8.1 6.27273 8.1H8.27727L9.45455 6.8H13.2727V8.1H10.0114L8.85 9.4H6.27273V17.2H16.4545V11.35H17.7273V17.2C17.7273 17.5575 17.6027 17.8635 17.3534 18.1181C17.1042 18.3727 16.8045 18.5 16.4545 18.5H6.27273ZM16.4545 9.4V8.1H15.1818V6.8H16.4545V5.5H17.7273V6.8H19V8.1H17.7273V9.4H16.4545ZM11.3636 16.225C12.1591 16.225 12.8352 15.9406 13.392 15.3719C13.9489 14.8031 14.2273 14.1125 14.2273 13.3C14.2273 12.4875 13.9489 11.7969 13.392 11.2281C12.8352 10.6594 12.1591 10.375 11.3636 10.375C10.5682 10.375 9.89205 10.6594 9.33523 11.2281C8.77841 11.7969 8.5 12.4875 8.5 13.3C8.5 14.1125 8.77841 14.8031 9.33523 15.3719C9.89205 15.9406 10.5682 16.225 11.3636 16.225ZM11.3636 14.925C10.9182 14.925 10.5417 14.7679 10.2341 14.4538C9.92652 14.1396 9.77273 13.755 9.77273 13.3C9.77273 12.845 9.92652 12.4604 10.2341 12.1463C10.5417 11.8321 10.9182 11.675 11.3636 11.675C11.8091 11.675 12.1856 11.8321 12.4932 12.1463C12.8008 12.4604 12.9545 12.845 12.9545 13.3C12.9545 13.755 12.8008 14.1396 12.4932 14.4538C12.1856 14.7679 11.8091 14.925 11.3636 14.925Z"
        fill={color}
      />
    </Svg>
  );
}
