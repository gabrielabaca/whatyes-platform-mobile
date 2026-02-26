import React, { useState } from 'react';
import { TextInput, TextInputProps, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Text } from '../Text';

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

  const inputClasses = [
    'border rounded-lg px-4 py-3 text-base',
    error ? 'border-red-500' : 'border-gray-300',
    'bg-white text-gray-900',
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
          placeholderTextColor="#9ca3af"
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
                <EyeOff size={22} color="#6b7280" strokeWidth={2.5} />
              ) : (
                <Eye size={22} color="#6b7280" strokeWidth={2.5} />
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
