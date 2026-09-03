/**
 * Detalle de producto — Figma 636:29107.
 * Secciones: hero con imagen, título, "Por {vendedor}", chips de Tamaño,
 * chips de Color (con muestra circular), Stock Disponible, bloque Review
 * con las tres columnas del vendedor, y CTA "Editar Producto" si el
 * producto pertenece al usuario autenticado.
 */
import React, { useState } from 'react';
import {
  View,
  Text as RNText,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { themeColors } from '../../../theme/colors';
import { FONT_FAMILY } from '../../../theme/typography';
import { StarRating } from '../../molecules/profile/StarRating';
import { useProductDetail } from '../../../hooks/useProductDetail';
import { parseProductColors } from '../../../api/productsApi';
import { useAuth } from '../../../hooks/useAuth';

const PRIMARY = '#685CF0';
const GRAY_500 = '#71717B';
const GOLD = '#FDC700';
const BORDER_LIGHT = '#DDDDDD';

export interface ProductDetailScreenProps {
  productId: string;
  sellerUserId?: string;
  onBack: () => void;
  onEditProduct?: (productId: string) => void;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  productId,
  sellerUserId,
  onBack,
  onEditProduct,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const d = themeColors.dark;

  const { product, ratings, loading, error } = useProductDetail(productId, sellerUserId);
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.uuid;

  const isOwner = !!product && !!currentUserId && product.seller_user_id === currentUserId;

  const darkBg = isDark ? { backgroundColor: d.background } : null;
  const darkText = isDark ? { color: d.text } : null;
  const darkMuted = isDark ? { color: d.textMuted } : null;
  const darkSurface = isDark ? { backgroundColor: d.surface } : null;
  const darkChip = isDark ? { backgroundColor: d.surfaceAlt } : null;

  const colors = product ? parseProductColors(product.colors) : [];
  const sizes = product?.sizes ?? [];

  const heroUri = product?.image_urls?.[0] ?? null;

  const formatPrice = (cents: number, currency: string) => {
    const major = Math.round(cents / 100);
    const sym = currency === 'USD' ? 'US$' : '$';
    return `${sym}${major.toLocaleString('es-AR')}`;
  };

  return (
    <View style={[styles.root, darkBg, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isDark ? { borderBottomColor: d.borderSubtle } : null]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('explore.back')}
        >
          <ChevronLeft size={24} color={isDark ? d.text : '#27272A'} strokeWidth={2} />
        </TouchableOpacity>
        <RNText style={[styles.headerTitle, darkText]}>{t('productDetail.title')}</RNText>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !product ? (
        <View style={styles.centered}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : error && !product ? (
        <View style={styles.centered}>
          <RNText style={[styles.errorText, darkMuted]}>{t('productDetail.loadError')}</RNText>
        </View>
      ) : product ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* Hero image */}
          <View style={styles.heroWrap}>
            {heroUri ? (
              <Image source={{ uri: heroUri }} style={styles.hero} resizeMode="cover" />
            ) : (
              <View style={[styles.hero, styles.heroPlaceholder, darkSurface]} />
            )}
          </View>

          <View style={styles.content}>
            {/* Título y vendedor */}
            <View style={styles.titleBlock}>
              <RNText style={[styles.title, darkText]}>{product.title}</RNText>
              <View style={styles.sellerRow}>
                {product.seller_avatar_url ? (
                  <Image
                    source={{ uri: product.seller_avatar_url }}
                    style={styles.sellerAvatar}
                  />
                ) : (
                  <View style={[styles.sellerAvatar, styles.sellerAvatarPlaceholder, darkChip]} />
                )}
                <RNText style={styles.sellerName}>
                  {t('productDetail.by', { name: product.seller_name })}
                </RNText>
              </View>
            </View>

            {/* Tamaño */}
            {sizes.length > 0 ? (
              <View style={styles.variantBlock}>
                <RNText style={[styles.variantLabel, darkText]}>{t('productDetail.sizeLabel')}</RNText>
                <View style={styles.chipsRow}>
                  {sizes.map((s) => (
                    <View key={s} style={[styles.chip, darkChip]}>
                      <RNText style={[styles.chipText, darkText]}>{s}</RNText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Color */}
            {colors.length > 0 ? (
              <View style={styles.variantBlock}>
                <RNText style={[styles.variantLabel, darkText]}>{t('productDetail.colorLabel')}</RNText>
                <View style={styles.chipsRow}>
                  {colors.map((c) => (
                    <View key={c.name} style={[styles.chip, darkChip]}>
                      <View style={[styles.colorDot, { backgroundColor: c.hex }]} />
                      <RNText style={[styles.chipText, darkText]}>{c.name}</RNText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Stock */}
            <View style={styles.stockRow}>
              <RNText style={[styles.stockLabel, darkText]}>{t('productDetail.stockLabel')}</RNText>
              <RNText style={[styles.stockValue, darkText]}>{product.quantity_on_hand}</RNText>
            </View>

            {/* Precio */}
            <RNText style={styles.price}>
              {formatPrice(product.base_price_cents, product.currency)}
            </RNText>

            {/* Review del vendedor */}
            <View style={[styles.reviewSection, isDark ? { borderTopColor: d.borderSubtle } : null]}>
              <RNText style={[styles.reviewTitle, darkText]}>{t('productDetail.reviewTitle')}</RNText>
              {ratings ? (
                <View style={styles.ratingsRow}>
                  <RatingColumn
                    label={t('productDetail.reviewGeneral')}
                    value={ratings.general}
                    isDark={isDark}
                  />
                  <RatingColumn
                    label={t('productDetail.reviewShipping')}
                    value={ratings.shipping}
                    isDark={isDark}
                  />
                  <RatingColumn
                    label={t('productDetail.reviewProduct')}
                    value={ratings.product}
                    isDark={isDark}
                  />
                </View>
              ) : (
                <RNText style={[styles.noRatings, darkMuted]}>
                  {t('productDetail.reviewNoRatings')}
                </RNText>
              )}
            </View>
          </View>

          {/* CTA Editar — solo si el producto es del usuario logueado */}
          {isOwner && onEditProduct ? (
            <View style={styles.ctaWrap}>
              <TouchableOpacity
                style={styles.ctaBtn}
                activeOpacity={0.85}
                onPress={() => onEditProduct(productId)}
                accessibilityRole="button"
              >
                <RNText style={styles.ctaBtnText}>{t('productDetail.editProduct')}</RNText>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
};

interface RatingColumnProps {
  label: string;
  value: number | null | undefined;
  isDark: boolean;
}

const RatingColumn: React.FC<RatingColumnProps> = ({ label, value, isDark }) => {
  const d = themeColors.dark;
  const mutedColor = isDark ? d.textMuted : GRAY_500;
  const textColor = isDark ? d.text : '#181818';
  const v = value ?? 0;
  return (
    <View style={styles.ratingCol}>
      <RNText style={[styles.ratingLabel, { color: mutedColor }]}>{label}</RNText>
      <View style={styles.ratingStarRow}>
        <StarRating value={v} size={10} gap={2} />
        <RNText style={[styles.ratingValue, { color: textColor }]}>
          {v > 0 ? String(Math.round(v * 10) / 10) : '—'}
        </RNText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: '#27272A',
    marginLeft: 8,
    includeFontPadding: false,
  },
  headerSpacer: {
    width: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: GRAY_500,
    textAlign: 'center',
  },
  scroll: {
    paddingBottom: 24,
  },
  heroWrap: {
    height: 223,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  hero: {
    width: '100%',
    height: 223,
    backgroundColor: '#E7E7FF',
  },
  heroPlaceholder: {
    backgroundColor: '#E7E7FF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  titleBlock: {
    gap: 4,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.08,
    color: '#71717B',
    includeFontPadding: false,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#3F3F47',
  },
  sellerAvatarPlaceholder: {
    backgroundColor: '#E7E7FF',
  },
  sellerName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 12,
    color: PRIMARY,
    letterSpacing: 0.06,
    includeFontPadding: false,
  },
  variantBlock: {
    gap: 8,
  },
  variantLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#18181B',
    includeFontPadding: false,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(93,91,91,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: '#18181B',
    includeFontPadding: false,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#18181B',
    includeFontPadding: false,
  },
  stockValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#18181B',
    includeFontPadding: false,
  },
  price: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 28,
    color: GOLD,
    includeFontPadding: false,
  },
  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: BORDER_LIGHT,
    paddingTop: 12,
    gap: 12,
  },
  reviewTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#18181B',
    includeFontPadding: false,
  },
  ratingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  ratingLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: GRAY_500,
    includeFontPadding: false,
    textAlign: 'center',
  },
  ratingStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#181818',
    includeFontPadding: false,
  },
  noRatings: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: GRAY_500,
    includeFontPadding: false,
  },
  ctaWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  ctaBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 1000,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  ctaBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});
