import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../atoms/Text';
import { IconVideo } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';
import { LiveStreamPreviewCard } from './LiveStreamPreviewCard';
import { LiveStreamCardSkeleton } from './LiveStreamCardSkeleton';
import type { LiveStreamPreviewModel } from './types';

const DEFAULT_GAP = 12;
const H_PADDING = 16;
const SKELETON_COUNT = 4;

export interface BuyerLiveStreamsGridProps {
  previews: LiveStreamPreviewModel[];
  loading: boolean;
  onStreamPress: (item: LiveStreamPreviewModel) => void;
  /** Mantener presionada una card: abre el peek del vivo (se cierra con la X). */
  onStreamLongPress?: (item: LiveStreamPreviewModel) => void;
  /** Hint animado del gesto en la primera card del listado. */
  peekHintFirstCard?: boolean;
  /** @deprecated Ya no se muestra texto de carga: se renderizan skeletons. */
  loadingLabel?: string;
  /** Título cuando no hay salas. */
  emptyLabel: string;
  /** Texto secundario opcional bajo el título del estado vacío. */
  emptySubtitle?: string;
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
  onStreamLongPress,
  peekHintFirstCard,
  emptyLabel,
  emptySubtitle,
  gap = DEFAULT_GAP,
  horizontalPadding = H_PADDING * 2,
  sectionHeader,
  previewWithCategory,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const { isDark } = useTheme();
  const gridColW = (windowWidth - horizontalPadding - gap) / 2;

  if (loading && previews.length === 0) {
    return (
      <View className="flex-row flex-wrap" style={{ gap }}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <View key={i} style={{ width: gridColW }}>
            <LiveStreamCardSkeleton />
          </View>
        ))}
      </View>
    );
  }

  if (!loading && previews.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: isDark ? 'rgba(104,92,240,0.16)' : 'rgba(104,92,240,0.10)' },
          ]}
        >
          <IconVideo size={28} color={themeColors.primary} strokeWidth={2} />
        </View>
        <Text
          style={[styles.emptyTitle, { fontFamily: FONT_FAMILY.bold }]}
          className="text-[#02050F] dark:text-white"
        >
          {emptyLabel}
        </Text>
        {emptySubtitle ? (
          <Text
            style={[styles.emptySubtitle, { fontFamily: FONT_FAMILY.regular }]}
            className="text-[#4C4E55] dark:text-night-muted"
          >
            {emptySubtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  const mapItem = previewWithCategory ?? ((p: LiveStreamPreviewModel) => p);

  return (
    <>
      {sectionHeader}
      <View className="flex-row flex-wrap" style={{ gap }}>
        {previews.map((item, index) => (
          <View key={item.id} style={{ width: gridColW }}>
            <LiveStreamPreviewCard
              variant="grid"
              stream={mapItem(item)}
              onPress={() => onStreamPress(item)}
              onLongPress={onStreamLongPress ? () => onStreamLongPress(item) : undefined}
              showPeekHint={peekHintFirstCard && index === 0}
            />
          </View>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
});
