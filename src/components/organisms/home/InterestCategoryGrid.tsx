import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '../../atoms/Text';
import { FONT_FAMILY } from '../../../theme/typography';
import type { InterestCategoryItem } from '../../../api/types';
import { displayInterestCategoryIcon } from '../../../utils/interestCategoryEmoji';

const TILE_GAP = 12;
const DEFAULT_H_PADDING = 16;

function chunkRows(items: InterestCategoryItem[]): InterestCategoryItem[][] {
  const rows: InterestCategoryItem[][] = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3));
  }
  return rows;
}

const SelectedTileBackground: React.FC = () => (
  <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
    <Defs>
      <LinearGradient id="category-selected-bg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#685CF0" stopOpacity={0.86} />
        <Stop offset="0.52" stopColor="#E8E7FF" stopOpacity={0.88} />
        <Stop offset="1" stopColor="#FDE7AE" stopOpacity={0.72} />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#category-selected-bg)" />
  </Svg>
);

export interface InterestCategoryGridProps {
  items: InterestCategoryItem[];
  selectedUuids: Set<string>;
  onPressItem: (item: InterestCategoryItem) => void;
  onPressInItem?: (uuid: string) => void;
  disabled?: boolean;
  horizontalPadding?: number;
  style?: StyleProp<ViewStyle>;
  withBottomGap?: boolean;
}

/** Grid 3×N de categorías (mismo diseño que Explorar). */
export const InterestCategoryGrid: React.FC<InterestCategoryGridProps> = ({
  items,
  selectedUuids,
  onPressItem,
  onPressInItem,
  disabled = false,
  horizontalPadding = DEFAULT_H_PADDING,
  style,
  withBottomGap = false,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const tileW = Math.floor((windowWidth - horizontalPadding * 2 - TILE_GAP * 2) / 3);
  const tileStyle = useMemo(() => ({ width: tileW, height: tileW + 1 }), [tileW]);

  const renderTile = (item: InterestCategoryItem) => {
    const emoji = displayInterestCategoryIcon(item);
    const selected = selectedUuids.has(item.uuid);
    return (
      <TouchableOpacity
        key={item.uuid}
        activeOpacity={0.85}
        disabled={disabled}
        onPressIn={() => onPressInItem?.(item.uuid)}
        onPress={() => onPressItem(item)}
        style={[styles.tile, tileStyle, selected ? styles.tileSelected : null]}
      >
        {selected ? <SelectedTileBackground /> : null}
        {emoji ? <Text className="text-[20px] mb-1 text-center">{emoji}</Text> : null}
        <Text
          style={{ fontFamily: FONT_FAMILY.semibold }}
          className="text-[14px] text-[#18181b] dark:text-white text-center"
          numberOfLines={2}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[withBottomGap ? styles.gridWithBottomGap : undefined, style]}>
      {chunkRows(items).map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.gridRow}>
          {row.map(renderTile)}
          {row.length < 3
            ? Array.from({ length: 3 - row.length }).map((_, idx) => (
                <View key={`empty-${rowIndex}-${idx}`} style={tileStyle} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderColor: '#cbceff',
    borderRadius: 8,
    backgroundColor: '#FAFAFF',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileSelected: {
    backgroundColor: '#E7E7FF',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: TILE_GAP,
  },
  gridWithBottomGap: {
    marginBottom: 12,
  },
});
