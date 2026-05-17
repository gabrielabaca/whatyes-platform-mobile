import React from 'react';
import {
  View,
  StyleSheet,
  Text as RNText,
  FlatList,
  Image,
  ActivityIndicator,
  type ListRenderItem,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { StreamBottomSheet } from './StreamBottomSheet';
import { FONT_FAMILY } from '../../../theme/typography';
import type { RoomCatalogProductItem } from '../../../api/platformApi';

export interface StreamRoomProductsDrawerProps {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  items: RoomCatalogProductItem[];
  errorMessage?: string | null;
}

function formatCatalogPrice(cents: number, currency: string): string {
  const major = cents / 100;
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major}`;
  }
}

export const StreamRoomProductsDrawer: React.FC<StreamRoomProductsDrawerProps> = ({
  visible,
  onClose,
  loading = false,
  items,
  errorMessage,
}) => {
  const { t } = useTranslation();

  const renderItem: ListRenderItem<RoomCatalogProductItem> = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.thumbWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
      </View>
      <View style={styles.rowText}>
        <RNText style={styles.title} numberOfLines={2}>
          {item.title}
        </RNText>
        <RNText style={styles.price}>{formatCatalogPrice(item.base_price_cents, item.currency)}</RNText>
        <RNText style={styles.stock}>
          {t('stream.productsStock', { count: item.quantity_on_hand })}
        </RNText>
      </View>
    </View>
  );

  return (
    <StreamBottomSheet
      visible={visible}
      title={t('stream.productsCatalogTitle')}
      onClose={onClose}
      panelStyle={styles.panel}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
    >
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
          ItemSeparatorComponent={() => <View style={styles.sep} />}
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
    maxHeight: 480,
  },
  content: {
    gap: 0,
    width: '100%',
    minHeight: 120,
  },
  list: {
    maxHeight: 400,
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
  sep: {
    height: 1,
    backgroundColor: 'rgba(221, 221, 221, 0.25)',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  thumbPlaceholder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  price: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 22,
    color: '#FDC700',
  },
  stock: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});
