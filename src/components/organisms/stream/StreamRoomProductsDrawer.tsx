import React from 'react';
import {
  StyleSheet,
  Text as RNText,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  type ListRenderItem,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet, streamSheetStyles } from './StreamBottomSheet';
import { FONT_FAMILY } from '../../../theme/typography';
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
  onAddProduct,
}) => {
  const { t } = useTranslation();

  const renderItem: ListRenderItem<LiveProductCardVM> = ({ item }) => (
    <LiveProductCard
      item={item}
      interactive={interactive}
      onStart={onStartProduct ? () => onStartProduct(item) : undefined}
      onPin={onPinProduct ? () => onPinProduct(item) : undefined}
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

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.productsCatalogTitle')}
      onClose={onClose}
      panelStyle={styles.panel}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      footer={footer}
    >
      {interactive && onSaleModeChange ? (
        <SaleModeTabs value={saleMode} onChange={onSaleModeChange} />
      ) : null}

      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={styles.loader} />
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
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </StreamBottomSheet>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(2, 5, 15, 0.4)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  content: {
    gap: 24,
    width: '100%',
    minHeight: 120,
  },
  list: {
    flexGrow: 0,
    maxHeight: 420,
  },
  listContent: {
    gap: 24,
  },
  loader: {
    marginVertical: 24,
  },
  errorText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
