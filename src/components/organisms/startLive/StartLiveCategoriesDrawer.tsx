import React, { useEffect, useState } from 'react';
import {
  View,
  Text as RNText,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from '../stream/StreamBottomSheet';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { displayInterestCategoryIcon } from '../../../utils/interestCategoryEmoji';
import type { InterestCategoryItem } from '../../../api/types';
import { themeColors } from '../../../theme/colors';
import { startLiveFullSheetProps, startLiveStyles } from './startLiveStyles';
import { StartLivePrimaryButton } from './StartLivePrimitives';
import { StartLiveCategoryTile } from './StartLiveCategoryTile';

const TILE_GAP = 12;
const SHEET_H_PADDING = 24;

export interface StartLiveCategoriesDrawerProps {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onContinue: (categoryUuids: string[]) => void;
  /** Wizard live: varias. Producto: una sola. */
  selectionMode?: 'single' | 'multiple';
  titleKey?: string;
  subtitleKey?: string;
  initialSelected?: string[];
}

function chunkRows(items: InterestCategoryItem[]): InterestCategoryItem[][] {
  const rows: InterestCategoryItem[][] = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3));
  }
  return rows;
}

/** Figma 536-24402 */
export const StartLiveCategoriesDrawer: React.FC<StartLiveCategoriesDrawerProps> = ({
  visible,
  busy,
  onClose,
  onContinue,
  selectionMode = 'multiple',
  titleKey = 'startLive.categoriesTitle',
  subtitleKey = 'startLive.categoriesBody',
  initialSelected,
}) => {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const { categories, loadOnce, isLoading, isLoaded } = useInterestCategories();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tileSize = Math.floor((windowWidth - SHEET_H_PADDING * 2 - TILE_GAP * 2) / 3);

  useEffect(() => {
    if (visible) {
      void loadOnce();
      if (initialSelected?.length) {
        setSelected(new Set(initialSelected));
      } else {
        setSelected(new Set());
      }
    }
  }, [visible, loadOnce, initialSelected]);

  const toggle = (uuid: string) => {
    if (busy) {
      return;
    }
    if (selectionMode === 'single') {
      setSelected(new Set([uuid]));
      onContinue([uuid]);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const loading = isLoading && !isLoaded;
  const canContinue = selected.size > 0 && !busy;
  const rows = chunkRows(categories);

  return (
    <StreamBottomSheet
      visible={visible}
      title={t(titleKey as 'startLive.categoriesTitle' | 'addProduct.categoryTitle')}
      onClose={onClose}
      {...startLiveFullSheetProps}
      contentContainerStyle={startLiveStyles.categoriesSheetBody}
      scrollEnabled={false}
      /** Multiselección = hay borrador que perder; el modo single es un picker de una opción. */
      dismissOnBackdropPress={selectionMode === 'single'}
      footer={selectionMode === 'multiple' ? (
        <StartLivePrimaryButton
          label={t('startLive.categoriesCta')}
          onPress={() => onContinue(Array.from(selected))}
          disabled={!canContinue}
          loading={busy}
        />
      ) : undefined}
    >
      <RNText style={startLiveStyles.categoriesSubtitle}>
        {t(subtitleKey as 'startLive.categoriesBody' | 'addProduct.categorySubtitle')}
      </RNText>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={themeColors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.gridScrollView}
          contentContainerStyle={styles.gridScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          bounces
        >
          {rows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {row.map((cat) => (
                <StartLiveCategoryTile
                  key={cat.uuid}
                  label={cat.label}
                  icon={displayInterestCategoryIcon(cat)}
                  selected={selected.has(cat.uuid)}
                  size={tileSize}
                  onPress={() => toggle(cat.uuid)}
                />
              ))}
              {row.length < 3
                ? Array.from({ length: 3 - row.length }).map((_, idx) => (
                    <View key={`pad-${rowIndex}-${idx}`} style={{ width: tileSize, height: tileSize }} />
                  ))
                : null}
            </View>
          ))}
        </ScrollView>
      )}
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridScrollView: {
    flex: 1,
  },
  gridScroll: {
    gap: TILE_GAP,
    paddingBottom: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});
