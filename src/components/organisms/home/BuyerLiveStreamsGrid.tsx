import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Text } from '../../atoms/Text';
import { LiveStreamPreviewCard } from './LiveStreamPreviewCard';
import type { LiveStreamPreviewModel } from './types';

const DEFAULT_GAP = 12;
const H_PADDING = 16;

export interface BuyerLiveStreamsGridProps {
  previews: LiveStreamPreviewModel[];
  loading: boolean;
  onStreamPress: (item: LiveStreamPreviewModel) => void;
  /** Texto mientras la primera carga y no hay ítems. */
  loadingLabel: string;
  /** Texto cuando no hay salas. */
  emptyLabel: string;
  gap?: number;
  /** Ancho horizontal del contenido (padding del ScrollView padre). */
  horizontalPadding?: number;
  /** Contenido opcional encima de la rejilla (p. ej. SectionHeader). */
  sectionHeader?: React.ReactNode;
  previewWithCategory?: (p: LiveStreamPreviewModel) => LiveStreamPreviewModel;
}

export const BuyerLiveStreamsGrid: React.FC<BuyerLiveStreamsGridProps> = ({
  previews,
  loading,
  onStreamPress,
  loadingLabel,
  emptyLabel,
  gap = DEFAULT_GAP,
  horizontalPadding = H_PADDING * 2,
  sectionHeader,
  previewWithCategory,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const gridColW = (windowWidth - horizontalPadding - gap) / 2;

  if (loading && previews.length === 0) {
    return <Text className="text-[#4C4E55] dark:text-night-muted mb-4">{loadingLabel}</Text>;
  }

  if (!loading && previews.length === 0) {
    return <Text className="text-[#4C4E55] dark:text-night-muted mb-6">{emptyLabel}</Text>;
  }

  const mapItem = previewWithCategory ?? ((p: LiveStreamPreviewModel) => p);

  return (
    <>
      {sectionHeader}
      <View className="flex-row flex-wrap" style={{ gap }}>
        {previews.map((item) => (
          <View key={item.id} style={{ width: gridColW }}>
            <LiveStreamPreviewCard
              variant="grid"
              stream={mapItem(item)}
              onPress={() => onStreamPress(item)}
            />
          </View>
        ))}
      </View>
    </>
  );
};
