/**
 * Notificaciones — feed de la campana del header (GET /me/notifications).
 *
 * Pantalla completa dentro del flujo de Home (mismo patrón que PurchaseDetailScreen):
 * header propio con volver + "marcar todas", filas con ícono por tipo de evento y
 * fondo tintado mientras están sin leer. Tocar una fila la marca leída (optimista)
 * y navega cuando el destino ya existe en la app: seguidor → perfil, compra →
 * detalle de compra, venta del vendedor → actividad.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BellOff,
  BadgeDollarSign,
  CheckCheck,
  CircleX,
  CreditCard,
  Gift,
  MessageCircle,
  PackageCheck,
  Radio,
  ShoppingBag,
  Trophy,
  TriangleAlert,
  Truck,
  UserPlus,
} from 'lucide-react-native';
import { IconChevronLeft } from '../../icons';
import {
  getMyNotifications,
  getMyPurchase,
  markAllNotificationsRead,
  markNotificationRead,
  type PurchaseItem,
  type UserNotificationItem,
} from '../../../api/platformApi';
import { storage } from '../../../utils/storage';
import { destinationFromNotification } from '../../../utils/notificationDestination';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';

const PRIMARY = themeColors.primary;
const TEXT = '#18181B';
const MUTED = '#6B7280';

type LucideIcon = typeof Bell;

/** Ícono y color por tipo de evento; los tipos nuevos caen en la campana neutra. */
const TYPE_VISUALS: Record<string, { Icon: LucideIcon; color: string }> = {
  seller_live_start: { Icon: Radio, color: themeColors.danger },
  new_follower: { Icon: UserPlus, color: PRIMARY },
  new_message: { Icon: MessageCircle, color: PRIMARY },
  auction_won: { Icon: Trophy, color: '#EAB308' },
  auction_second_chance: { Icon: Trophy, color: PRIMARY },
  buy_now_won: { Icon: ShoppingBag, color: '#EAB308' },
  raffle_won: { Icon: Gift, color: '#EAB308' },
  purchase_paid: { Icon: CreditCard, color: themeColors.success },
  purchase_payment_action_required: { Icon: TriangleAlert, color: themeColors.danger },
  purchase_cancelled: { Icon: CircleX, color: themeColors.danger },
  purchase_shipment_created: { Icon: Truck, color: PRIMARY },
  purchase_delivered: { Icon: PackageCheck, color: themeColors.success },
  product_sold: { Icon: ShoppingBag, color: themeColors.success },
  sale_paid: { Icon: BadgeDollarSign, color: themeColors.success },
};

/** Tiempo relativo corto; pasada la semana muestra la fecha ("12 mar"). */
function timeAgoLabel(createdAt: number, t: TFunction, language: string): string {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - createdAt);
  if (seconds < 60) return t('notifications.timeNow');
  if (seconds < 3600) return t('notifications.timeMinutes', { count: Math.floor(seconds / 60) });
  if (seconds < 86400) return t('notifications.timeHours', { count: Math.floor(seconds / 3600) });
  if (seconds < 7 * 86400) return t('notifications.timeDays', { count: Math.floor(seconds / 86400) });
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(
    new Date(createdAt * 1000)
  );
}

export interface NotificationsScreenProps {
  onBack: () => void;
  /** Sincroniza el punto rojo de la campana del header sin esperar el refetch. */
  onUnreadCountChange: (count: number) => void;
  onOpenProfile: (userId: string) => void;
  onOpenPurchase: (purchase: PurchaseItem) => void;
  onOpenActivity: () => void;
  onOpenStream?: (roomId: string, sellerName?: string | null) => void;
  onOpenChat?: (conversationId?: string) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onBack,
  onUnreadCountChange,
  onOpenProfile,
  onOpenPurchase,
  onOpenActivity,
  onOpenStream,
  onOpenChat,
}) => {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const d = themeColors.dark;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unreadCount = items.filter((it) => !it.is_read).length;
  /** Evita que un doble tap sobre una compra dispare dos navegaciones. */
  const openingPurchaseRef = useRef(false);

  const load = useCallback(
    async (asRefresh: boolean) => {
      asRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const data = await getMyNotifications(token, { limit: 100 });
        setItems(data.items);
        onUnreadCountChange(data.unread_count ?? 0);
      } catch {
        // Sin red: se conserva lo que ya estaba en pantalla.
      } finally {
        asRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [onUnreadCountChange]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const markReadLocal = (uuid: string) => {
    setItems((prev) => {
      const next = prev.map((it) => (it.uuid === uuid ? { ...it, is_read: true } : it));
      onUnreadCountChange(next.filter((it) => !it.is_read).length);
      return next;
    });
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));
    onUnreadCountChange(0);
    try {
      const token = await storage.getAccessToken();
      if (token) await markAllNotificationsRead(token);
    } catch {
      // Optimista: si falla, el próximo load lo corrige.
    }
  };

  const handlePress = async (item: UserNotificationItem) => {
    if (!item.is_read) {
      markReadLocal(item.uuid);
      try {
        const token = await storage.getAccessToken();
        if (token) await markNotificationRead(token, item.uuid);
      } catch {
        // Optimista: si falla, el próximo load lo corrige.
      }
    }

    // Un solo mapeo (notificationDestination) para feed, heads-up y push.
    const dest = destinationFromNotification(item);
    if (dest.kind === 'profile') {
      onOpenProfile(dest.userId);
      return;
    }
    if (dest.kind === 'activity') {
      onOpenActivity();
      return;
    }
    if (dest.kind === 'stream') {
      onOpenStream?.(dest.roomId, dest.sellerName);
      return;
    }
    if (dest.kind === 'chat') {
      onOpenChat?.(dest.conversationId);
      return;
    }
    if (dest.kind === 'purchase' && !openingPurchaseRef.current) {
      openingPurchaseRef.current = true;
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        onOpenPurchase(await getMyPurchase(token, dest.saleId));
      } catch {
        // La venta puede no ser de este usuario (o sin red): la fila queda leída.
      } finally {
        openingPurchaseRef.current = false;
      }
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top ? 8 : 16 }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <IconChevronLeft size={24} color={isDark ? d.text : TEXT} />
        </TouchableOpacity>
        <RNText style={[styles.headerTitle, isDark ? { color: d.text } : null]}>
          {t('notifications.title')}
        </RNText>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAll}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.markAllRead')}
          >
            <CheckCheck size={22} color={PRIMARY} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={PRIMARY} style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <BellOff size={44} color={isDark ? d.textSecondary : MUTED} strokeWidth={1.5} />
          <RNText style={[styles.emptyTitle, isDark ? { color: d.textSecondary } : null]}>
            {t('notifications.empty')}
          </RNText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void load(true);
              }}
              tintColor={PRIMARY}
            />
          }
        >
          {items.map((item) => (
            <NotificationRow
              key={item.uuid}
              item={item}
              timeLabel={timeAgoLabel(item.created_at, t, i18n.language)}
              onPress={() => {
                void handlePress(item);
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const NotificationRow: React.FC<{
  item: UserNotificationItem;
  timeLabel: string;
  onPress: () => void;
}> = ({ item, timeLabel, onPress }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const d = themeColors.dark;
  const { Icon, color } = TYPE_VISUALS[item.type] ?? { Icon: Bell, color: PRIMARY };
  const unread = !item.is_read;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        unread
          ? { backgroundColor: isDark ? d.surface : themeColors.primaryTint }
          : null,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: isDark ? d.surfaceAlt : `${color}1A` },
        ]}
      >
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <View style={styles.rowBody}>
        <RNText
          style={[
            styles.rowTitle,
            unread ? styles.rowTitleUnread : null,
            isDark ? { color: d.text } : null,
          ]}
          numberOfLines={1}
        >
          {item.title?.trim() || t('notifications.defaultTitle')}
        </RNText>
        {item.body?.trim() ? (
          <RNText
            style={[styles.rowText, isDark ? { color: d.textSecondary } : null]}
            numberOfLines={2}
          >
            {item.body.trim()}
          </RNText>
        ) : null}
        <RNText style={[styles.rowTime, isDark ? { color: d.textSecondary } : null]}>
          {timeLabel}
        </RNText>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 24,
    color: TEXT,
    marginLeft: 4,
    includeFontPadding: false,
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
    paddingTop: 4,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: TEXT,
    includeFontPadding: false,
  },
  rowTitleUnread: {
    fontFamily: FONT_FAMILY.bold,
  },
  rowText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 17,
    color: MUTED,
    includeFontPadding: false,
  },
  rowTime: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: MUTED,
    marginTop: 2,
    includeFontPadding: false,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
});
