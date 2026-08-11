import React, { forwardRef, useCallback, useEffect, useId, useRef } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';
import { FONT_FAMILY } from '../../../theme/typography';
import { useKeyboardAwareScroll } from '../KeyboardDismissScrollView/keyboardAwareScrollContext';
import {
  useKeyboardAccessoryAppearance,
  type KeyboardAccessoryAppearance,
} from './keyboardAccessoryAppearance';

export interface AppTextInputProps extends TextInputProps {
  /**
   * Barra "Listo" sobre el teclado en iOS (los teclados numéricos no tienen return y
   * el teclado del sistema no trae botón de cerrar). Default true; apagar solo si el
   * input ya resuelve el cierre de otra forma.
   */
  keyboardAccessory?: boolean;
  /** Fuerza la apariencia de la barra; sin esto hereda del contexto o del tema. */
  accessoryAppearance?: KeyboardAccessoryAppearance;
  /** Texto del botón de la barra. Default: `common.done` ("Listo"). */
  accessoryLabel?: string;
}

/**
 * TextInput base de la app. TODO input debe usarlo (directo o vía el atom `Input`):
 * centraliza la barra "Listo" de iOS y avisa el foco al `KeyboardDismissScrollView`
 * ancestro para que el campo enfocado quede siempre visible sobre el teclado.
 *
 * Nota Fabric (new arch): el `InputAccessoryView` se vincula UNA vez al montarse,
 * buscando en la ventana el TextInput cuyo `inputAccessoryViewID` coincida. Por eso
 * la barra se renderiza acá adentro, por input y con ID único —un accessory global
 * compartido no se vincula—, como hermano POSTERIOR al TextInput (el input ya está
 * en la ventana cuando el accessory busca). Por lo mismo, `autoFocus` se resuelve en
 * JS post-montaje: el autofocus nativo dispara el teclado antes del vínculo y la
 * primera apertura saldría sin barra.
 */
export const AppTextInput = forwardRef<RNTextInput, AppTextInputProps>(function AppTextInput(
  {
    keyboardAccessory = true,
    accessoryAppearance,
    accessoryLabel,
    autoFocus,
    inputAccessoryViewID,
    onFocus,
    onBlur,
    ...props
  },
  forwardedRef,
) {
  const innerRef = useRef<RNTextInput | null>(null);
  const setRef = useCallback(
    (node: RNTextInput | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const awareScroll = useKeyboardAwareScroll();
  const reactId = useId();
  const accessoryEnabled =
    Platform.OS === 'ios' && keyboardAccessory && inputAccessoryViewID == null;
  const accessoryID = `apptextinput-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const jsAutoFocus = accessoryEnabled && autoFocus === true;
  useEffect(() => {
    if (!jsAutoFocus) return;
    const timer = setTimeout(() => innerRef.current?.focus(), 30);
    return () => clearTimeout(timer);
    // Solo al montar: emula el autoFocus nativo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (e) => {
      awareScroll?.onInputFocused(innerRef.current);
      onFocus?.(e);
    },
    [awareScroll, onFocus],
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (e) => {
      awareScroll?.onInputBlurred(innerRef.current);
      onBlur?.(e);
    },
    [awareScroll, onBlur],
  );

  const input = (
    <RNTextInput
      ref={setRef}
      autoFocus={jsAutoFocus ? false : autoFocus}
      inputAccessoryViewID={accessoryEnabled ? accessoryID : inputAccessoryViewID}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );

  if (!accessoryEnabled) {
    return input;
  }

  return (
    <>
      {input}
      {/*
       * Host absoluto de tamaño cero: el placeholder in-tree del accessory no debe
       * ocupar layout ni consumir `gap` en filas (el contenido real se re-aloja
       * sobre el teclado a nivel nativo).
       */}
      <View style={styles.accessoryHost} pointerEvents="none">
        <KeyboardAccessoryBar
          nativeID={accessoryID}
          appearance={accessoryAppearance}
          label={accessoryLabel}
        />
      </View>
    </>
  );
});

const KeyboardAccessoryBar: React.FC<{
  nativeID: string;
  appearance?: KeyboardAccessoryAppearance;
  label?: string;
}> = ({ nativeID, appearance, label }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const contextAppearance = useKeyboardAccessoryAppearance();
  const resolved = appearance ?? contextAppearance;
  const dark = resolved === 'dark' || (resolved === 'auto' && isDark);

  const backgroundColor = dark ? themeColors.dark.surfaceAlt : themeColors.light.surface;
  const borderTopColor = dark ? 'rgba(255,255,255,0.12)' : themeColors.light.border;

  return (
    <InputAccessoryView nativeID={nativeID} backgroundColor={backgroundColor}>
      <View style={[styles.bar, { backgroundColor, borderTopColor }]}>
        <TouchableOpacity
          onPress={() => Keyboard.dismiss()}
          style={styles.doneBtn}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={label ?? t('common.done')}
        >
          <RNText style={styles.doneText} maxFontSizeMultiplier={1.2}>
            {label ?? t('common.done')}
          </RNText>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
};

const styles = StyleSheet.create({
  accessoryHost: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    height: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    minWidth: 64,
    alignItems: 'flex-end',
  },
  doneText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: themeColors.primary,
    includeFontPadding: false,
  },
});
