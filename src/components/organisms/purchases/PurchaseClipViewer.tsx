/**
 * Visor fullscreen del clip de una compra — Figma 698-11133.
 * Video a pantalla completa estilo vivo: header pill con el vendedor (avatar,
 * nombre, rating y Seguir), rail de acciones a la derecha (productos del
 * vendedor, compartir) y la info del producto abajo sobre un velo oscuro.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Image,
  Share,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Play, ShoppingBag, Star } from 'lucide-react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft, IconShare } from '../../icons';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { PurchaseLiveItemsSheet } from './PurchaseLiveItemsSheet';
import { getMyPurchases, type PurchaseItem } from '../../../api/platformApi';
import { storage } from '../../../utils/storage';
import { FONT_FAMILY } from '../../../theme/typography';

const PRIMARY = '#685CF0';

export interface PurchaseClipViewerProps {
  visible: boolean;
  uri: string;
  purchase: PurchaseItem;
  sellerName: string;
  sellerAvatarUrl?: string | null;
  sellerRating?: number | null;
  isFollowing: boolean;
  followLoading: boolean;
  onToggleFollow: () => void;
  onOpenSellerProfile?: () => void;
  onClose: () => void;
}

export const PurchaseClipViewer: React.FC<PurchaseClipViewerProps> = ({
  visible,
  uri,
  purchase,
  sellerName,
  sellerAvatarUrl,
  sellerRating,
  isFollowing,
  followLoading,
  onToggleFollow,
  onOpenSellerProfile,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [paused, setPaused] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  // Artículos REALES comprados en este vivo (todas las compras con el mismo room_id).
  const [liveItems, setLiveItems] = useState<PurchaseItem[]>([purchase]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const purchases = await getMyPurchases(token, { limit: 100 });
        if (cancelled) return;
        const sameLive = purchases.items.filter((p) => p.room_id === purchase.room_id);
        if (sameLive.length > 0) setLiveItems(sameLive);
      } catch {
        // sin red: se mantiene al menos la compra actual
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, purchase.room_id]);

  const share = () => {
    void Share.share({ message: uri, url: uri });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={['portrait']}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        {/* Video fullscreen; tap para pausar/reanudar */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setPaused((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={t('activity.clipTitle')}
        >
          <Video
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            paused={paused}
            resizeMode="cover"
            repeat
            poster={purchase.product_image_url ?? undefined}
            posterResizeMode="cover"
            ignoreSilentSwitch="ignore"
          />
          {/* Velo inferior para legibilidad del texto (sin lib de gradientes) */}
          <View style={styles.bottomScrim} pointerEvents="none" />
        </TouchableOpacity>

        {/* Botón de play: control propio para que el tap en el centro reanude */}
        {paused ? (
          <View style={styles.playOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.playCircle}
              activeOpacity={0.85}
              onPress={() => setPaused(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('activity.clipPlay')}
            >
              <Play size={30} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Header: back + pill del vendedor */}
        <View style={[styles.headerRow, { top: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Atrás')}
          >
            <IconChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.sellerPill}>
            {sellerAvatarUrl ? (
              <Image source={{ uri: sellerAvatarUrl }} style={styles.sellerAvatar} />
            ) : (
              <View style={[styles.sellerAvatar, styles.sellerAvatarFallback]}>
                <RNText style={styles.sellerAvatarInitial}>
                  {sellerName.charAt(0).toUpperCase()}
                </RNText>
              </View>
            )}
            <View style={styles.sellerTextCol}>
              <RNText style={styles.sellerName} numberOfLines={1}>
                {sellerName}
              </RNText>
              {sellerRating != null && sellerRating > 0 ? (
                <View style={styles.sellerRatingRow}>
                  <Star size={12} color="#EAB308" fill="#EAB308" strokeWidth={1} />
                  <RNText style={styles.sellerRatingText}>{sellerRating.toFixed(1)}</RNText>
                </View>
              ) : null}
            </View>
            <View style={styles.pillDivider} />
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnFollowing]}
              onPress={onToggleFollow}
              disabled={followLoading}
              activeOpacity={0.85}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <RNText style={styles.followBtnText}>
                  {isFollowing ? t('stream.following') : t('stream.follow')}
                </RNText>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Rail de acciones (derecha, sobre la info) */}
        <View style={[styles.actionRail, { bottom: insets.bottom + 140 }]}>
          {onOpenSellerProfile ? (
            <TouchableOpacity
              onPress={onOpenSellerProfile}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
            >
              <ShoppingBag size={24} color="#FFFFFF" strokeWidth={1.75} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={share}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
          >
            <IconShare size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Info del producto (abajo) */}
        <View style={[styles.bottomInfo, { bottom: insets.bottom + 32 }]}>
          <RNText style={styles.productTitle} numberOfLines={1}>
            {purchase.product_title}
          </RNText>
          <TouchableOpacity
            style={styles.itemsRow}
            onPress={() => {
              setPaused(true);
              setItemsOpen(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
          >
            <RNText style={styles.itemsText}>
              {t('activity.clipItemsCount', {
                count: liveItems.length,
                defaultValue:
                  liveItems.length === 1 ? '1 artículo' : `${liveItems.length} artículos`,
              })}
            </RNText>
            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          <RNText style={styles.priceText}>
            {formatStreamPrice(Math.round(purchase.amount_cents / 100), purchase.currency)}
          </RNText>
        </View>

        {/* Detalle de artículos comprados en el live — Figma 698-11283 */}
        <PurchaseLiveItemsSheet
          visible={itemsOpen}
          items={liveItems}
          sellerId={purchase.counterpart.user_id}
          onClose={() => {
            setItemsOpen(false);
            setPaused(false);
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  headerRow: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerPill: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  sellerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: '#3F3F47',
  },
  sellerAvatarFallback: {
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarInitial: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  sellerTextCol: { flex: 1, minWidth: 1 },
  sellerName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  sellerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerRatingText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  pillDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 12,
    backgroundColor: 'rgba(221,221,221,0.87)',
  },
  followBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minWidth: 64,
    alignItems: 'center',
  },
  followBtnFollowing: { backgroundColor: 'rgba(255,255,255,0.25)' },
  followBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  actionRail: {
    position: 'absolute',
    right: 24,
    alignItems: 'center',
    gap: 24,
  },
  bottomInfo: {
    position: 'absolute',
    left: 24,
    right: 84,
    gap: 8,
  },
  productTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  itemsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  itemsText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  priceText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    lineHeight: 16,
    color: '#FFFFFF',
  },
});
