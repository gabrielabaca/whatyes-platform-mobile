/**
 * Actividad — Figma 698-2823.
 * Tabs Compras | Ventas, chips de filtro y cards de operaciones (tabla sales).
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SlidersVertical, Truck, ShoppingBag } from 'lucide-react-native';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { useMyActivity, type ActivityRole } from '../../../hooks/useMyActivity';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';
import type { PurchaseItem } from '../../../api/platformApi';

const PRIMARY = '#685CF0';
const TEXT = '#18181B';
const MUTED = '#6B7280';
const GOLD = '#EAB308';
const CHIP_BG = '#E7E7FF';

type ActivityFilter = 'all' | 'recent' | 'lowestPrice';

/** Última semana para el chip "Recientes". */
const RECENT_WINDOW_S = 7 * 24 * 60 * 60;

export interface ActivityScreenProps {
  /** Ventas habilitado solo para vendedores. */
  isSeller: boolean;
  onOpenPurchase: (purchase: PurchaseItem) => void;
}


export const ActivityScreen: React.FC<ActivityScreenProps> = ({
  isSeller,
  onOpenPurchase,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const d = themeColors.dark;
  const [role, setRole] = useState<ActivityRole>('purchases');
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const { items, loading, reload } = useMyActivity(role);

  const filteredItems = useMemo(() => {
    let list = [...items];
    if (filter === 'recent') {
      const cutoff = Math.floor(Date.now() / 1000) - RECENT_WINDOW_S;
      list = list.filter((it) => it.created_at >= cutoff);
    }
    if (filter === 'lowestPrice') {
      list.sort((a, b) => a.amount_cents - b.amount_cents);
    }
    return list;
  }, [items, filter]);

  const filters: { key: ActivityFilter; label: string }[] = [
    { key: 'all', label: t('activity.filterAll') },
    { key: 'recent', label: t('activity.filterRecent') },
    { key: 'lowestPrice', label: t('activity.filterLowestPrice') },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.tabsRow}>
        {(['purchases', 'sales'] as ActivityRole[]).map((key) => {
          const active = role === key;
          const disabled = key === 'sales' && !isSeller;
          if (disabled) return null;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tab,
                active && styles.tabActive,
                active && isDark ? { borderBottomColor: d.text } : null,
              ]}
              onPress={() => setRole(key)}
            >
              <RNText
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                  isDark ? { color: active ? d.text : d.textSecondary } : null,
                ]}
              >
                {key === 'purchases' ? t('activity.tabPurchases') : t('activity.tabSales')}
              </RNText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.filterIconWrap}>
          <SlidersVertical size={18} color="#FFFFFF" strokeWidth={2} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.chip,
                  active ? styles.chipActive : styles.chipInactive,
                  isDark
                    ? {
                        backgroundColor: active ? d.surfaceAlt : d.surface,
                        ...(active ? { borderColor: d.borderSubtle } : null),
                      }
                    : null,
                ]}
                onPress={() => setFilter(f.key)}
              >
                <RNText
                  style={[
                    styles.chipLabel,
                    active && styles.chipLabelActive,
                    isDark ? { color: active ? d.text : d.textSecondary } : null,
                  ]}
                >
                  {f.label}
                </RNText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={PRIMARY} style={styles.loader} />
      ) : filteredItems.length === 0 ? (
        <View style={styles.empty}>
          <ShoppingBag size={44} color={isDark ? d.textSecondary : MUTED} strokeWidth={1.5} />
          <RNText style={[styles.emptyTitle, isDark ? { color: d.textSecondary } : null]}>
            {role === 'purchases'
              ? t('activity.emptyPurchases')
              : t('activity.emptySales')}
          </RNText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                void reload();
              }}
              tintColor={PRIMARY}
            />
          }
        >
          {filteredItems.map((item) => (
            <ActivityCard
              key={item.sale_uuid}
              item={item}
              role={role}
              onPress={() => onOpenPurchase(item)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const ActivityCard: React.FC<{
  item: PurchaseItem;
  role: ActivityRole;
  onPress: () => void;
}> = ({ item, role, onPress }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const d = themeColors.dark;
  const counterpartName = item.counterpart.name?.trim() || t('activity.unknownUser');
  const darkMuted = isDark ? { color: d.textSecondary } : null;
  const darkSurfaceAlt = isDark ? { backgroundColor: d.surfaceAlt } : null;

  return (
    <TouchableOpacity
      style={[styles.card, isDark ? { borderBottomColor: d.borderSubtle } : null]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {item.product_image_url ? (
        <Image source={{ uri: item.product_image_url }} style={[styles.cardImage, darkSurfaceAlt]} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder, darkSurfaceAlt]}>
          <ShoppingBag size={28} color={isDark ? d.textSecondary : MUTED} strokeWidth={1.5} />
        </View>
      )}
      <View style={styles.cardBody}>
        <RNText
          style={[styles.cardTitle, isDark ? { color: d.text } : null]}
          numberOfLines={1}
        >
          {item.product_title}
        </RNText>
        <View style={styles.cardRow}>
          <View style={styles.counterpartChip}>
            {item.counterpart.profile_picture ? (
              <Image
                source={{ uri: item.counterpart.profile_picture }}
                style={styles.counterpartAvatar}
              />
            ) : (
              <View
                style={[
                  styles.counterpartAvatar,
                  styles.counterpartAvatarFallback,
                  darkSurfaceAlt,
                ]}
              />
            )}
            <RNText style={[styles.counterpartText, darkMuted]} numberOfLines={1}>
              {role === 'purchases'
                ? t('activity.bySeller', { name: counterpartName })
                : t('activity.toBuyer', { name: counterpartName })}
            </RNText>
          </View>
          <RNText style={[styles.orderNumber, darkMuted]}>
            {t('activity.orderShort', { number: item.order_number.slice(-4) })}
          </RNText>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.statusChip}>
            <Truck size={14} color={PRIMARY} strokeWidth={2} />
            <RNText style={styles.statusText}>
              {item.payment_status === 'paid'
                ? t('activity.statusPreparing')
                : item.payment_status === 'cancelled'
                  ? t('activity.statusCancelled')
                  : t('activity.statusPendingPayment')}
            </RNText>
          </View>
        </View>
        <View style={styles.cardRow}>
          <RNText style={[styles.costLabel, darkMuted]}>{t('activity.totalCost')}</RNText>
          <RNText style={styles.costValue}>
            {formatStreamPrice(Math.round(item.amount_cents / 100), item.currency)}
          </RNText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: TEXT,
  },
  tabLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: MUTED,
    includeFontPadding: false,
  },
  tabLabelActive: {
    fontFamily: FONT_FAMILY.bold,
    color: TEXT,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  filterIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsContent: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 1000,
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  chipInactive: {
    backgroundColor: CHIP_BG,
  },
  chipLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: TEXT,
    includeFontPadding: false,
  },
  chipLabelActive: {
    fontFamily: FONT_FAMILY.bold,
  },
  loader: {
    marginTop: 32,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
    includeFontPadding: false,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 24,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4E7',
    paddingBottom: 20,
  },
  cardImage: {
    width: 132,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  counterpartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  counterpartAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  counterpartAvatarFallback: {
    backgroundColor: CHIP_BG,
  },
  counterpartText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    flexShrink: 1,
    includeFontPadding: false,
  },
  orderNumber: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: PRIMARY,
    includeFontPadding: false,
  },
  costLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  costValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: GOLD,
    includeFontPadding: false,
  },
});
