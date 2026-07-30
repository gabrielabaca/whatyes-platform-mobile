import React, { useState } from 'react';
import { TextInput, TextInputProps, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Text } from '../Text';
import { FONT_FAMILY } from '../../../theme/typography';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  containerClassName = '',
  secureTextEntry,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = secureTextEntry;
  const { isDark } = useTheme();

  /**
   * Placeholder e íconos son props JS, no clases: se resuelven por tema. En claro se
   * conservan los literales actuales (`#9ca3af` / `#6b7280`) para no cambiar nada del
   * tema claro; en oscuro van al token `textMuted` (#8e9aaf), igual que el resto de los
   * inputs oscuros de la app.
   */
  const placeholderColor = isDark ? themeColors.dark.textMuted : '#9ca3af';
  const iconColor = isDark ? themeColors.dark.textMuted : '#6b7280';

  const inputClasses = [
    'border rounded-lg px-4 py-3 text-base font-mulish',
    error ? 'border-red-500' : 'border-gray-300',
    'bg-white text-gray-900',
    'dark:bg-night-800 dark:text-white',
    isPasswordField ? 'pr-12' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View className={containerClassName || ''}>
      {label && (
        <Text variant="label" className="mb-2">
          {label}
        </Text>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          className={inputClasses}
          style={{ fontFamily: FONT_FAMILY.regular }}
          placeholderTextColor={placeholderColor}
          secureTextEntry={isPasswordField && !showPassword}
          {...props}
        />
        {isPasswordField && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.iconButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.iconContainer}>
              {showPassword ? (
                <EyeOff size={22} color={iconColor} strokeWidth={2.5} />
              ) : (
                <Eye size={22} color={iconColor} strokeWidth={2.5} />
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text variant="caption" className="text-red-500 mt-1">
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    position: 'relative',
  },
  iconButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: '100%',
    zIndex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
  },
});
