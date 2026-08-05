import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../atoms/Text';
import { Button } from '../../atoms/Button';
import { IconNotifications } from '../../icons';
import { FONT_FAMILY } from '../../../theme/typography';
import { useTheme } from '../../../context/ThemeContext';
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
  /** CTA opcional del estado vacío (Figma nodo 821-1103). Requiere `onEmptyActionPress`. */
  emptyActionLabel?: string;
  onEmptyActionPress?: () => void;
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
  emptyActionLabel,
  onEmptyActionPress,
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
    // Card del estado vacío — Figma nodo 821-1098 ("Inicio No Live").
    return (
      <View
        style={[
          styles.emptyCard,
          { borderColor: isDark ? 'rgba(104,92,240,0.35)' : '#CBCEFF' },
        ]}
      >
        <View style={styles.emptyTextBlock}>
          <Text
            style={[styles.emptyTitle, { fontFamily: FONT_FAMILY.bold }]}
            className="text-[#685CF0]"
          >
            {emptyLabel}
          </Text>
          {emptySubtitle ? (
            <Text
              style={[styles.emptySubtitle, { fontFamily: FONT_FAMILY.semibold }]}
              className="text-[#3B3B40] dark:text-night-muted"
            >
              {emptySubtitle}
            </Text>
          ) : null}
        </View>
        {emptyActionLabel && onEmptyActionPress ? (
          <Button
            title={emptyActionLabel}
            size="small"
            titleClassName="font-bold"
            style={styles.emptyCta}
            leftIcon={<IconNotifications size={24} color="#FEFEFE" />}
            onPress={onEmptyActionPress}
          />
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
  emptyCard: {
    // En el diseño la card llena el alto libre; flexGrow lo logra cuando el
    // contenedor lo permite (Home) y minHeight es el piso en el resto.
    flexGrow: 1,
    minHeight: 380,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    // Figma: 5px 5px 5px -2px rgba(0,0,0,0.05). Sin elevation: en Android la
    // sombra requiere fondo sólido y la card es transparente.
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowRadius: 5,
    shadowOpacity: 0.05,
  },
  emptyTextBlock: {
    alignItems: 'center',
    gap: 24,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 20,
    // Figma: 20/20; +4 de aire para que el emoji no se recorte en Android.
    lineHeight: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    width: '100%',
  },
  emptyCta: {
    // Figma: px 12 y drop-shadow 0 4 2 rgba(104,92,240,0.15).
    paddingHorizontal: 12,
    shadowColor: '#685CF0',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 2,
    shadowOpacity: 0.15,
    elevation: 3,
  },
});
