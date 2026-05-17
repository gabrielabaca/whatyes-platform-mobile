import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Text } from '../../atoms/Text';
import { IconChevronRight, type SvgIconProps } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';

/** Tokens Figma nodo 536:16114 */
const BORDER = '#CBCEFF';
const ICON_BG = '#DBDBDF';
const LABEL_COLOR = '#18181B';
const DANGER_COLOR = '#DC2626';
const CHEVRON_COLOR = '#18181B';

const ROW_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  android: { elevation: 2 },
  default: {},
});

export interface AccountMenuRowProps {
  label: string;
  icon: React.FC<SvgIconProps>;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

export const AccountMenuRow: React.FC<AccountMenuRowProps> = ({
  label,
  icon: IconCmp,
  onPress,
  variant = 'default',
}) => {
  const isDanger = variant === 'danger';
  const labelColor = isDanger ? DANGER_COLOR : LABEL_COLOR;
  const iconColor = isDanger ? DANGER_COLOR : LABEL_COLOR;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.row}
      accessibilityRole="button"
    >
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <IconCmp size={18} color={iconColor} strokeWidth={1.75} />
        </View>
        <Text
          numberOfLines={1}
          style={[styles.label, { color: labelColor, fontFamily: FONT_FAMILY.semibold }]}
        >
          {label}
        </Text>
      </View>
      {!isDanger ? (
        <IconChevronRight size={16} color={CHEVRON_COLOR} strokeWidth={2} />
      ) : (
        <View style={styles.chevronSpacer} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    padding: 12,
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    ...ROW_SHADOW,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  chevronSpacer: {
    width: 16,
    height: 16,
  },
});
