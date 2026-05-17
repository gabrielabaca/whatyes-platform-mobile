import React from 'react';
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export interface StreamIconButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const StreamIconButton: React.FC<StreamIconButtonProps> = ({
  onPress,
  disabled,
  accessibilityLabel,
  children,
  style,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.75}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={[styles.btn, style]}
  >
    {children}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
