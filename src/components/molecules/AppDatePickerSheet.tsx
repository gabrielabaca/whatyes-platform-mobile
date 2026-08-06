/**
 * Selector de fecha/hora — bottom sheet glass compartido.
 *
 * Reemplaza los tres sheets blancos con `@react-native-community/datetimepicker`
 * (cumpleaños en Registro, fecha y hora de programación del vivo). Esa librería no
 * renderiza inline en Android: montarla abría el diálogo Material del sistema por
 * encima del sheet propio, y quedaban el panel blanco vacío abajo y el diálogo con
 * su sombra flotando en el medio. `react-native-date-picker` sí dibuja la rueda
 * inline en ambas plataformas, así que el picker vive dentro del mismo panel glass
 * que el resto de los drawers (StreamBottomSheet, entra desde la base y tapa la
 * navegación).
 *
 * Misma semántica que los sheets que reemplaza: girar la rueda aplica el valor al
 * instante (`onChange` en vivo) y cerrar —X, fondo o "Listo"— solo cierra.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-native-date-picker';
import {
  StreamBottomSheet,
  streamBottomPanelStyle,
  streamSheetStyles,
} from '../organisms/stream/StreamBottomSheet';
import { themeColors } from '../../theme/colors';

export interface AppDatePickerSheetProps {
  visible: boolean;
  title: string;
  mode: 'date' | 'time';
  value: Date;
  /** Se dispara en vivo con cada giro de la rueda (misma semántica que antes). */
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  locale?: string;
  /**
   * `false` monta el sheet en el portal raíz. Dejarlo en `true` (default) cuando el
   * caller ya vive dentro de un Modal nativo (p. ej. PreLiveSetupOverlay): el portal
   * raíz queda detrás de esa ventana y el picker no se vería.
   */
  nativeModal?: boolean;
}

export const AppDatePickerSheet: React.FC<AppDatePickerSheetProps> = ({
  visible,
  title,
  mode,
  value,
  onChange,
  onClose,
  minimumDate,
  maximumDate,
  locale = 'es-AR',
  nativeModal = true,
}) => {
  const { t } = useTranslation();

  return (
    <StreamBottomSheet
      visible={visible}
      nativeModal={nativeModal}
      title={title}
      onClose={onClose}
      panelStyle={streamBottomPanelStyle}
      contentContainerStyle={styles.content}
      footer={
        <TouchableOpacity
          style={streamSheetStyles.primaryBtn}
          onPress={onClose}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <RNText style={streamSheetStyles.primaryBtnText}>{t('common.done')}</RNText>
        </TouchableOpacity>
      }
    >
      <View style={styles.pickerWrap}>
        <DatePicker
          date={value}
          mode={mode}
          onDateChange={onChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          locale={locale}
          // El panel glass es oscuro en ambos temas por diseño: la rueda también.
          theme="dark"
          dividerColor={themeColors.glass.border}
        />
      </View>
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
  },
  pickerWrap: {
    width: '100%',
    alignItems: 'center',
  },
});
