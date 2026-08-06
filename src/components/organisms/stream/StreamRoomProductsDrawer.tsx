import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  type ListRenderItem,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamBottomPanelStyle, streamSheetStyles } from './StreamBottomSheet';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { SaleModeTabs, type LiveProductSaleMode } from '../../molecules/stream/SaleModeTabs';
import { LiveProductCard, type LiveProductCardVM } from '../../molecules/stream/LiveProductCard';

export type { LiveProductSaleMode, LiveProductCardVM };

export interface StreamRoomProductsDrawerProps {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  items: LiveProductCardVM[];
  errorMessage?: string | null;
  /** Modo seller: tabs, acciones y footer. Viewer: lista de solo lectura. */
  interactive?: boolean;
  saleMode?: LiveProductSaleMode;
  onSaleModeChange?: (mode: LiveProductSaleMode) => void;
  onStartProduct?: (item: LiveProductCardVM) => void;
  onPinProduct?: (item: LiveProductCardVM) => void;
  /** Seleccionar un producto lo deja primero en la lista (sin arrancarlo). */
  onSelectProduct?: (item: LiveProductCardVM) => void;
  onAddProduct?: () => void;
}

export const StreamRoomProductsDrawer: React.FC<StreamRoomProductsDrawerProps> = ({
  visible,
  onClose,
  loading = false,
  items,
  errorMessage,
  interactive = false,
  saleMode = 'buy_now',
  onSaleModeChange,
  onStartProduct,
  onPinProduct,
  onSelectProduct,
  onAddProduct,
}) => {
  const { t } = useTranslation();

  const renderItem: ListRenderItem<LiveProductCardVM> = ({ item }) => (
    <LiveProductCard
      item={item}
      interactive={interactive}
      onStart={onStartProduct ? () => onStartProduct(item) : undefined}
      onPin={onPinProduct ? () => onPinProduct(item) : undefined}
      onSelect={onSelectProduct ? () => onSelectProduct(item) : undefined}
    />
  );

  const footer =
    interactive && onAddProduct ? (
      <TouchableOpacity
        style={streamSheetStyles.primaryBtn}
        onPress={onAddProduct}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <RNText style={streamSheetStyles.primaryBtnText}>
          {t('stream.addProductCta')} +
        </RNText>
      </TouchableOpacity>
    ) : undefined;

  const saleModeTabs =
    interactive && onSaleModeChange ? (
      <View style={styles.tabsWrap}>
        <SaleModeTabs value={saleMode} onChange={onSaleModeChange} />
      </View>
    ) : null;

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.productsCatalogTitle')}
      onClose={onClose}
      panelStyle={[streamBottomPanelStyle, styles.panel]}
      fillToMaxHeight
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      footer={footer}
    >
      {saleModeTabs}

      {loading ? (
        <ActivityIndicator color={themeColors.glass.text} style={styles.loader} />
      ) : errorMessage ? (
        <RNText style={styles.errorText}>{errorMessage}</RNText>
      ) : items.length === 0 ? (
        <RNText style={styles.emptyText}>{t('stream.productsCatalogEmpty')}</RNText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.uuid}
          renderItem={renderItem}
          scrollEnabled
          nestedScrollEnabled
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        />
      )}
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  panel: {
    maxHeight: '88%',
  },
  content: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    gap: 24,
  },
  tabsWrap: {
    flexShrink: 0,
    width: '100%',
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    gap: 24,
    paddingBottom: 8,
  },
  loader: {
    marginVertical: 24,
  },
  errorText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: themeColors.glass.textSoft,
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: themeColors.glass.textSoft,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
