/**
 * Detalle de una compra — Figma 698-3403.
 * Secciones: resumen del producto, detalles de la compra, clip de la compra
 * (video de la subasta grabado por platform_livestream), estado del envío
 * (derivado del estado de pago hasta integrar shipments), detalle de pago,
 * información del vendedor, reseña y productos similares.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Copy, Play, Star, Tag, Video as VideoIcon } from 'lucide-react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft, IconShare, IconBell, IconChat } from '../../icons';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { StarRatingInput } from '../../molecules/profile/StarRatingInput';
import { formatStreamPrice } from '../../atoms/stream/StreamPriceText';
import { useSellerFollow } from '../../../hooks/useSellerFollow';
import { useSellerNotifications } from '../../../hooks/useSellerNotifications';
import { PurchaseClipViewer } from '../../organisms/purchases/PurchaseClipViewer';
import {
  getUserPublicProfile,
  createUserReview,
  type UserPublicProfile,
} from '../../../api/profileApi';
import {
  getUserProfileProducts,
  type PurchaseItem,
  type UserProfileProductItem,
} from '../../../api/platformApi';
import { formatCompactCount } from '../../../utils/formatCount';
import { storage } from '../../../utils/storage';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';

const PRIMARY = themeColors.primary;
/** Paleta oscura: se aplica inline sobre los estilos estáticos (claro sin cambios). */
const D = themeColors.dark;
const TEXT = '#18181B';
const MUTED = '#6B7280';
const GOLD = '#EAB308';
const CARD_BG = '#FAFAFF';
const ROW_BG = '#EFEFFA';

function formatDateTime(epochSec: number, locale: string): string {
  const d = new Date(epochSec * 1000);
  const date = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${date}, ${time}h`;
}

function formatClipDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface PurchaseDetailScreenProps {
  purchase: PurchaseItem;
  onBack: () => void;
  onOpenSellerProfile?: (sellerUserId: string) => void;
  /** Inicia (o retoma) el chat con la contraparte: vendedor en compras, comprador en ventas. */
  onStartChat?: (peerUserId: string) => void;
}

export const PurchaseDetailScreen: React.FC<PurchaseDetailScreenProps> = ({
  purchase,
  onBack,
  onOpenSellerProfile,
  onStartChat,
}) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const sellerId = purchase.counterpart.user_id;

  // Overrides oscuros; en claro todos son `null` y mandan los estilos estáticos.
  const darkText = isDark ? { color: D.text } : null;
  const darkMuted = isDark ? { color: D.textSecondary } : null;
  const darkCard = isDark ? { backgroundColor: D.surface } : null;
  const darkRow = isDark ? { backgroundColor: D.surfaceAlt } : null;
  const darkHairline = isDark ? { borderColor: D.borderSubtle } : null;

  const [sellerProfile, setSellerProfile] = useState<UserPublicProfile | null>(null);
  const [similarProducts, setSimilarProducts] = useState<UserProfileProductItem[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [clipPaused, setClipPaused] = useState(true);
  const [clipDuration, setClipDuration] = useState<number | null>(null);
  const [clipError, setClipError] = useState(false);
  const [clipViewerOpen, setClipViewerOpen] = useState(false);

  const sellerName =
    sellerProfile?.display_name?.trim() ||
    purchase.counterpart.name?.trim() ||
    t('activity.unknownUser');

  const {
    isFollowing,
    followLoading,
    toggleFollow,
  } = useSellerFollow({
    sellerUserId: sellerId,
    sellerName,
    initialFollowing: sellerProfile?.is_following ?? false,
  });
  const { isSubscribed, toggleSubscription } = useSellerNotifications({
    sellerUserId: sellerId,
    enabled: true,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const [profile, products] = await Promise.all([
          getUserPublicProfile(sellerId, token).catch(() => null),
          getUserProfileProducts(token, sellerId, { limit: 4 }).catch(
            () => [] as UserProfileProductItem[]
          ),
        ]);
        if (cancelled) return;
        if (profile) setSellerProfile(profile);
        setSimilarProducts(products.filter((p) => p.title !== purchase.product_title));
      } catch {
        // Información complementaria: no bloquea el detalle.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId, purchase.product_title]);

  // Sin @react-native-clipboard/clipboard instalado: se muestra el número completo
  // para copiar manualmente (agregar la dependencia habilita copia real).
  const copyToClipboard = (value: string) => {
    Alert.alert(t('activity.orderNumber'), value);
  };

  const submitReview = async () => {
    if (reviewRating < 1 || reviewSending) return;
    setReviewSending(true);
    try {
      await createUserReview(sellerId, {
        rating_general: reviewRating,
        rating_shipping: reviewRating,
        rating_product: reviewRating,
        comment: reviewMessage.trim() || null,
        product_label: purchase.product_title,
        product_image_url: purchase.product_image_url ?? null,
      });
      setReviewSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.appName'), msg);
    } finally {
      setReviewSending(false);
    }
  };

  // Timeline derivada del estado de pago (sin envío real todavía).
  const isPaid = purchase.payment_status === 'paid';
  const timelineSteps: { label: string; sub?: string; state: 'done' | 'current' | 'todo' }[] = [
    {
      label: t('activity.stepConfirmed'),
      sub: formatDateTime(purchase.created_at, i18n.language || 'es'),
      state: 'done',
    },
    {
      label: t('activity.stepPaymentApproved'),
      state: isPaid ? 'done' : 'current',
      sub: isPaid ? undefined : t('activity.stepPaymentPendingHint'),
    },
    {
      label: t('activity.stepPreparing'),
      state: isPaid ? 'current' : 'todo',
      sub: isPaid ? t('activity.stepPreparingHint') : undefined,
    },
    { label: t('activity.stepOnTheWay'), state: 'todo' },
    { label: t('activity.stepDelivered'), state: 'todo' },
  ];

  const conditionLabel =
    purchase.condition === 'new'
      ? t('activity.conditionNew')
      : purchase.condition === 'lightly_used'
        ? t('activity.conditionLightlyUsed')
        : purchase.condition === 'used'
          ? t('activity.conditionUsed')
          : '—';

  const priceLabel = formatStreamPrice(
    Math.round(purchase.amount_cents / 100),
    purchase.currency
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top ? 8 : 16 }]}>
        <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button">
          <IconChevronLeft size={24} color={isDark ? D.text : TEXT} />
        </TouchableOpacity>
        <RNText style={[styles.headerTitle, darkText]}>{t('activity.detailTitle')}</RNText>
        <TouchableOpacity
          onPress={() => Alert.alert(t('common.appName'), t('home.placeholderScreen'))}
          hitSlop={12}
        >
          <IconShare size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <KeyboardDismissScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Resumen del producto */}
        <View style={[styles.summaryRow, darkHairline]}>
          {purchase.product_image_url ? (
            <Image
              source={{ uri: purchase.product_image_url }}
              style={[styles.summaryImage, darkRow]}
            />
          ) : (
            <View style={[styles.summaryImage, styles.summaryImageFallback, darkRow]} />
          )}
          <View style={styles.summaryBody}>
            <RNText style={[styles.summaryTitle, darkText]}>{purchase.product_title}</RNText>
            <TouchableOpacity
              style={styles.sellerChip}
              onPress={() => onOpenSellerProfile?.(sellerId)}
              activeOpacity={0.8}
            >
              {purchase.counterpart.profile_picture ? (
                <Image
                  source={{ uri: purchase.counterpart.profile_picture }}
                  style={styles.sellerChipAvatar}
                />
              ) : (
                <View style={[styles.sellerChipAvatar, styles.sellerChipFallback, darkRow]} />
              )}
              <RNText style={styles.sellerChipText}>{sellerName}</RNText>
            </TouchableOpacity>
            <View style={styles.wonRow}>
              <RNText style={[styles.wonText, darkText]}>🏆 {t('activity.wonAuction')}</RNText>
              <RNText style={styles.wonPrice}>{priceLabel}</RNText>
            </View>
          </View>
        </View>

        {/* Detalles de la compra */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.purchaseDetails')}</RNText>
          <DetailRow
            label={t('activity.orderNumber')}
            value={`#${purchase.order_number}`}
            valueColor={PRIMARY}
            onCopy={() => copyToClipboard(purchase.order_number)}
          />
          {purchase.sku ? <DetailRow label="SKU" value={purchase.sku} /> : null}
          <DetailRow
            label={t('activity.dateTime')}
            value={formatDateTime(purchase.created_at, i18n.language || 'es')}
          />
          {purchase.category_name ? (
            <DetailRow label={t('activity.category')} value={purchase.category_name} />
          ) : null}
          <DetailRow label={t('activity.quantity')} value={String(purchase.quantity)} />
          <DetailRow label={t('activity.condition')} value={conditionLabel} />
        </View>

        {/* Clip de la Compra: video de la subasta (grabado por platform_livestream). */}
        {purchase.recording_asset_url && !clipError ? (
          <View style={[styles.card, darkCard]}>
            <RNText style={[styles.cardTitle, darkText]}>{t('activity.clipTitle')}</RNText>
            <TouchableOpacity
              style={styles.clipVideoWrap}
              activeOpacity={0.9}
              onPress={() => setClipViewerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('activity.clipTitle')}
            >
              <Video
                source={{ uri: purchase.recording_asset_url }}
                style={styles.clipVideo}
                paused={clipPaused}
                resizeMode="cover"
                poster={purchase.product_image_url ?? undefined}
                posterResizeMode="cover"
                onLoad={(data) => setClipDuration(data.duration)}
                onEnd={() => setClipPaused(true)}
                onError={() => setClipError(true)}
                ignoreSilentSwitch="ignore"
              />
              {purchase.category_name ? (
                <View style={styles.clipCategoryChip}>
                  <RNText style={styles.clipCategoryText}>{purchase.category_name}</RNText>
                </View>
              ) : null}
              {clipPaused ? (
                <View style={styles.clipPlayOverlay} pointerEvents="none">
                  <View style={styles.clipPlayCircle}>
                    <Play size={30} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1} />
                  </View>
                </View>
              ) : null}
              {clipDuration != null && clipDuration > 0 ? (
                <View style={styles.clipDurationBadge}>
                  <RNText style={styles.clipDurationText}>
                    {formatClipDuration(clipDuration)}
                  </RNText>
                </View>
              ) : null}
            </TouchableOpacity>
            <View style={styles.clipInfoRow}>
              <View style={styles.clipInfoIcon}>
                <VideoIcon size={20} color={PRIMARY} strokeWidth={1.75} />
              </View>
              <View style={styles.clipInfoTextCol}>
                <RNText style={[styles.clipInfoTitle, darkText]} numberOfLines={1}>
                  {sellerName} · {t('activity.clipOf', { title: purchase.product_title })}
                </RNText>
                <RNText style={[styles.clipInfoSub, darkMuted]}>
                  {t('activity.clipSubtitle')}
                </RNText>
                {purchase.won_at_ms ? (
                  <RNText style={[styles.clipInfoSub, darkMuted]}>
                    {formatDateTime(Math.round(purchase.won_at_ms / 1000), i18n.language || 'es')}
                  </RNText>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Estado del Envío */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.shippingStatus')}</RNText>
          <View style={styles.timeline}>
            {timelineSteps.map((step, idx) => (
              <View key={step.label} style={styles.timelineStep}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.state === 'todo' && darkRow,
                      step.state === 'done' && styles.timelineDotDone,
                      step.state === 'current' && styles.timelineDotCurrent,
                    ]}
                  >
                    {step.state === 'done' ? (
                      <RNText style={styles.timelineCheck}>✓</RNText>
                    ) : step.state === 'current' ? (
                      <View style={styles.timelineInnerDot} />
                    ) : null}
                  </View>
                  {idx < timelineSteps.length - 1 ? (
                    <View
                      style={[
                        styles.timelineLine,
                        step.state !== 'done' && darkRow,
                        step.state === 'done' && styles.timelineLineDone,
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.timelineTextCol}>
                  <RNText
                    style={[
                      styles.timelineLabel,
                      step.state !== 'todo' && darkText,
                      step.state === 'todo' && styles.timelineLabelTodo,
                      step.state === 'todo' && isDark ? { color: D.textMuted } : null,
                    ]}
                  >
                    {step.label}
                  </RNText>
                  {step.sub ? (
                    <RNText style={[styles.timelineSub, darkMuted]}>{step.sub}</RNText>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Detalle de Pago */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.paymentDetail')}</RNText>
          <DetailRow
            label={t('activity.orderId')}
            value={`#PL-${purchase.order_number}`}
          />
          <View style={[styles.totalRow, darkHairline]}>
            <RNText style={[styles.totalLabel, darkText]}>{t('activity.totalPaid')}</RNText>
            <RNText style={[styles.totalValue, darkText]}>{priceLabel}</RNText>
          </View>
        </View>

        {/* Información del vendedor */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.sellerInfo')}</RNText>
          <View style={styles.sellerHeaderRow}>
            <TouchableOpacity
              style={styles.sellerIdentity}
              onPress={() => onOpenSellerProfile?.(sellerId)}
              activeOpacity={0.8}
            >
              {purchase.counterpart.profile_picture ? (
                <Image
                  source={{ uri: purchase.counterpart.profile_picture }}
                  style={styles.sellerAvatar}
                />
              ) : (
                <View style={[styles.sellerAvatar, styles.sellerChipFallback, darkRow]} />
              )}
              <View style={styles.sellerNameCol}>
                <RNText style={[styles.sellerName, darkText]}>{sellerName}</RNText>
                {sellerProfile?.subtitle ? (
                  <RNText style={[styles.sellerSubtitle, darkMuted]} numberOfLines={1}>
                    {sellerProfile.subtitle}
                  </RNText>
                ) : null}
              </View>
            </TouchableOpacity>
            <View style={styles.sellerActions}>
              <TouchableOpacity
                style={[
                  styles.sellerActionBtn,
                  darkRow,
                  isSubscribed && styles.sellerActionBtnActive,
                ]}
                onPress={() => {
                  void toggleSubscription();
                }}
              >
                <IconBell size={20} color={isSubscribed ? '#FFFFFF' : PRIMARY} strokeWidth={1.75} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sellerActionBtn, darkRow]}
                onPress={() =>
                  onStartChat
                    ? onStartChat(sellerId)
                    : Alert.alert(t('common.appName'), t('home.placeholderScreen'))
                }
                accessibilityRole="button"
                accessibilityLabel={t('profile.messageSeller')}
              >
                <IconChat size={20} color={PRIMARY} strokeWidth={1.75} />
              </TouchableOpacity>
            </View>
          </View>

          {sellerProfile ? (
            <View style={styles.sellerStatsRow}>
              <View style={[styles.sellerStatCard, darkRow]}>
                <Star size={16} color={PRIMARY} strokeWidth={2} />
                <RNText style={[styles.sellerStatValue, darkText]}>
                  {sellerProfile.reviews_avg ?? '—'}
                </RNText>
                <RNText style={[styles.sellerStatLabel, darkMuted]}>
                  {formatCompactCount(sellerProfile.reviews_count ?? 0)}{' '}
                  {t('profile.reviewsLabel')}
                </RNText>
              </View>
              <View style={[styles.sellerStatCard, darkRow]}>
                <Tag size={16} color={PRIMARY} strokeWidth={2} />
                <RNText style={[styles.sellerStatValue, darkText]}>
                  {formatCompactCount(sellerProfile.sold_count ?? 0)}
                </RNText>
                <RNText style={[styles.sellerStatLabel, darkMuted]}>{t('profile.sold')}</RNText>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing && styles.followBtnFollowing,
              isFollowing ? darkRow : null,
            ]}
            onPress={() => {
              void toggleFollow();
            }}
            disabled={followLoading}
            activeOpacity={0.85}
          >
            {followLoading ? (
              <ActivityIndicator
                color={isFollowing ? (isDark ? D.textSecondary : MUTED) : '#FFFFFF'}
                size="small"
              />
            ) : (
              <RNText
                style={[
                  styles.followBtnText,
                  isFollowing && styles.followBtnTextFollowing,
                  isFollowing ? darkMuted : null,
                ]}
              >
                {isFollowing ? t('stream.following') : t('stream.follow')}
              </RNText>
            )}
          </TouchableOpacity>
        </View>

        {/* Cuéntanos tu opinión */}
        <View style={[styles.card, darkCard]}>
          <View style={styles.reviewHeaderRow}>
            <RNText style={[styles.cardTitle, darkText]}>{t('activity.reviewTitle')}</RNText>
            <TouchableOpacity onPress={() => onOpenSellerProfile?.(sellerId)}>
              <RNText style={styles.reviewSeeAll}>{t('activity.seeReviews')}</RNText>
            </TouchableOpacity>
          </View>
          {reviewSent ? (
            <RNText style={styles.reviewThanks}>{t('activity.reviewThanks')}</RNText>
          ) : (
            <>
              <View style={[styles.reviewStarsWrap, darkRow]}>
                <StarRatingInput value={reviewRating} onChange={setReviewRating} />
              </View>
              <RNText style={[styles.reviewFieldLabel, darkMuted]}>
                {t('activity.reviewMessage')}
              </RNText>
              <TextInput
                style={[styles.reviewInput, darkHairline, darkRow, darkText]}
                value={reviewMessage}
                onChangeText={setReviewMessage}
                placeholder={t('activity.reviewMessagePlaceholder')}
                placeholderTextColor={isDark ? D.textMuted : MUTED}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  (reviewRating < 1 || reviewSending) && styles.sendBtnDisabled,
                ]}
                onPress={() => {
                  void submitReview();
                }}
                disabled={reviewRating < 1 || reviewSending}
                activeOpacity={0.85}
              >
                {reviewSending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <RNText style={styles.followBtnText}>{t('activity.reviewSend')}</RNText>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Productos similares */}
        {similarProducts.length > 0 ? (
          <View style={[styles.card, darkCard]}>
            <View style={styles.reviewHeaderRow}>
              <RNText style={[styles.cardTitle, darkText]}>{t('activity.similarProducts')}</RNText>
              <TouchableOpacity onPress={() => onOpenSellerProfile?.(sellerId)}>
                <RNText style={styles.reviewSeeAll}>{t('activity.seeAll')}</RNText>
              </TouchableOpacity>
            </View>
            <View style={styles.similarRow}>
              {similarProducts.slice(0, 2).map((product) => (
                <View key={product.room_uuid} style={[styles.similarCard, darkRow]}>
                  {product.thumbnail_url ? (
                    <Image
                      source={{ uri: product.thumbnail_url }}
                      style={styles.similarImage}
                    />
                  ) : (
                    <View style={[styles.similarImage, styles.sellerChipFallback, darkRow]} />
                  )}
                  <RNText style={[styles.similarTitle, darkText]} numberOfLines={1}>
                    {product.title}
                  </RNText>
                  <RNText style={[styles.similarSeller, darkMuted]} numberOfLines={1}>
                    {sellerName}
                  </RNText>
                  <RNText style={[styles.similarPrice, darkText]}>
                    {formatStreamPrice(
                      Math.round(product.price_cents / 100),
                      product.currency
                    )}
                  </RNText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Soporte */}
        <View style={[styles.card, darkCard]}>
          <RNText style={[styles.cardTitle, darkText]}>{t('activity.needHelp')}</RNText>
          <TouchableOpacity
            style={styles.followBtn}
            onPress={() => Alert.alert(t('common.appName'), t('home.placeholderScreen'))}
            activeOpacity={0.85}
          >
            <RNText style={styles.followBtnText}>{t('activity.contactSupport')}</RNText>
          </TouchableOpacity>
        </View>
      </KeyboardDismissScrollView>

      {/* Visor fullscreen del clip — Figma 698-11133 */}
      {purchase.recording_asset_url ? (
        <PurchaseClipViewer
          visible={clipViewerOpen}
          uri={purchase.recording_asset_url}
          purchase={purchase}
          sellerName={sellerName}
          sellerAvatarUrl={
            sellerProfile?.profile_picture ?? purchase.counterpart.profile_picture
          }
          sellerRating={sellerProfile?.reviews_avg}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onToggleFollow={() => {
            void toggleFollow();
          }}
          onOpenSellerProfile={
            onOpenSellerProfile ? () => onOpenSellerProfile(sellerId) : undefined
          }
          onClose={() => setClipViewerOpen(false)}
        />
      ) : null}
    </View>
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  onCopy?: () => void;
}> = ({ label, value, valueColor, onCopy }) => {
  const { isDark } = useTheme();
  return (
    <View style={[styles.detailRow, isDark ? { backgroundColor: D.surfaceAlt } : null]}>
      <RNText style={[styles.detailLabel, isDark ? { color: D.textSecondary } : null]}>
        {label}
      </RNText>
      <View style={styles.detailValueWrap}>
        <RNText
          style={[
            styles.detailValue,
            isDark ? { color: D.text } : null,
            valueColor ? { color: valueColor } : null,
          ]}
        >
          {value}
        </RNText>
        {onCopy ? (
          <TouchableOpacity onPress={onCopy} hitSlop={8}>
            <Copy size={16} color={PRIMARY} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
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
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4E7',
    paddingBottom: 20,
  },
  summaryImage: {
    width: 132,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  summaryImageFallback: {
    backgroundColor: '#E7E7FF',
  },
  summaryBody: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    justifyContent: 'center',
  },
  summaryTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    lineHeight: 24,
    color: TEXT,
    includeFontPadding: false,
  },
  sellerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerChipAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  sellerChipFallback: {
    backgroundColor: '#E7E7FF',
  },
  sellerChipText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: PRIMARY,
    includeFontPadding: false,
  },
  wonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wonText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: TEXT,
    includeFontPadding: false,
  },
  wonPrice: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: GOLD,
    includeFontPadding: false,
  },
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: ROW_BG,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  detailLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 16,
    color: TEXT,
    includeFontPadding: false,
  },
  detailValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  detailValue: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    lineHeight: 16,
    color: TEXT,
    includeFontPadding: false,
  },
  clipVideoWrap: {
    width: '100%',
    height: 224,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#18181B',
  },
  clipVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  clipPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipPlayCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  clipDurationBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clipDurationText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  clipCategoryChip: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clipCategoryText: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FDC700',
    includeFontPadding: false,
  },
  clipInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  clipInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(104,92,240,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipInfoTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  clipInfoTitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  clipInfoSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  timeline: {
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: PRIMARY,
  },
  timelineDotCurrent: {
    backgroundColor: PRIMARY,
  },
  timelineInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  timelineCheck: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: '#E4E4E7',
  },
  timelineLineDone: {
    backgroundColor: PRIMARY,
  },
  timelineTextCol: {
    flex: 1,
    paddingBottom: 20,
    gap: 2,
  },
  timelineLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  timelineLabelTodo: {
    color: '#A1A1AA',
    fontFamily: FONT_FAMILY.semibold,
  },
  timelineSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E7',
  },
  totalLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  totalValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 18,
    lineHeight: 24,
    color: TEXT,
    includeFontPadding: false,
  },
  sellerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sellerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sellerNameCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sellerName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  sellerSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  sellerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sellerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E7E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerActionBtnActive: {
    backgroundColor: PRIMARY,
  },
  sellerStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sellerStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ROW_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sellerStatValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  sellerStatLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    lineHeight: 14,
    color: MUTED,
    flexShrink: 1,
    includeFontPadding: false,
  },
  followBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: 1000,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnFollowing: {
    backgroundColor: '#E4E4E7',
  },
  followBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  followBtnTextFollowing: {
    color: '#52525B',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewSeeAll: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    lineHeight: 16,
    color: PRIMARY,
    includeFontPadding: false,
  },
  reviewStarsWrap: {
    backgroundColor: ROW_BG,
    borderRadius: 1000,
    paddingVertical: 14,
  },
  reviewFieldLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: MUTED,
    includeFontPadding: false,
  },
  reviewInput: {
    width: '100%',
    minHeight: 96,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    padding: 12,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: TEXT,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  reviewThanks: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.success,
    includeFontPadding: false,
  },
  similarRow: {
    flexDirection: 'row',
    gap: 12,
  },
  similarCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 12,
    gap: 4,
  },
  similarImage: {
    width: '100%',
    aspectRatio: 1.05,
    marginBottom: 6,
  },
  similarTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 13,
    lineHeight: 16,
    color: TEXT,
    paddingHorizontal: 10,
    includeFontPadding: false,
  },
  similarSeller: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    lineHeight: 14,
    color: MUTED,
    paddingHorizontal: 10,
    includeFontPadding: false,
  },
  similarPrice: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 18,
    color: TEXT,
    paddingHorizontal: 10,
    includeFontPadding: false,
  },
});
