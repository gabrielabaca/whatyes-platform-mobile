import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../../atoms/Text';
import { FONT_FAMILY } from '../../../theme/typography';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onActionPress,
}) => {
  return (
    <View className="flex-row items-center justify-between w-full mb-4">
      <Text
        style={{ fontFamily: FONT_FAMILY.bold }}
        className="text-[#27272a] dark:text-white text-[20px] leading-7 flex-1"
      >
        {title}
      </Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} activeOpacity={0.7} hitSlop={8}>
          <Text
            style={{ fontFamily: FONT_FAMILY.semibold }}
            className="text-primary-600 text-[14px]"
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
