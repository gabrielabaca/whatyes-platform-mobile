/**
 * Tipos del diálogo de alerta de la app (reemplazo de `Alert.alert` de RN).
 */

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AppAlertVariant = 'info' | 'success' | 'error' | 'warning';

export interface AppAlertButton {
  text: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
}

export interface AppAlertOptions {
  /**
   * Si el backdrop / back de Android cierran el diálogo sin ejecutar un botón.
   * Default: `true` con un solo botón; `false` si hay botón `destructive`.
   */
  cancelable?: boolean;
  /** Acento visual del diálogo (icono + color). */
  variant?: AppAlertVariant;
}

export interface AppAlertRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options: AppAlertOptions;
}

export interface AppAlertHelpersInput {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  cancelable?: boolean;
}

export interface AppAlertConfirmInput {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  cancelable?: boolean;
}
