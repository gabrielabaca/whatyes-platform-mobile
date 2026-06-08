import React from 'react';
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export type StreamIconButtonSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<StreamIconButtonSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

export interface StreamIconButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: StreamIconButtonSize;
}

export const StreamIconButton: React.FC<StreamIconButtonProps> = ({
  onPress,
  disabled,
  accessibilityLabel,
  children,
  style,
  size = 'sm',
}) => {
  const dim = SIZE_MAP[size];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.btn, { width: dim, height: dim }, style]}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
