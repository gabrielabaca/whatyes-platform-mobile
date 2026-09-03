/**
 * Perfil público — Figma 536-23109
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text as RNText,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BadgeCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconChevronLeft,
  IconUser,
  IconStar,
  IconTag,
  IconChat,
  IconBell,
} from '../icons';
import { ProfileShowCard } from '../organisms/profile/ProfileShowCard';
import { EditProfileDrawer } from '../organisms/profile/EditProfileDrawer';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUserShows } from '../../hooks/useUserShows';
import { useUserProfileProducts } from '../../hooks/useUserProfileProducts';
import { ProfileProductRow } from '../organisms/profile/ProfileProductRow';
import { ProductDetailScreen } from './ProductDetailScreen/ProductDetailScreen';
import { AddProductScreen } from './AddProductScreen/AddProductScreen';
import type { ProductInitialValues } from '../../hooks/useAddProductForm';
import { parseProductColors } from '../../api/productsApi';
import { getPublicProduct } from '../../api/productsApi';
import { ProfileReviewsSection } from '../organisms/profile/ProfileReviewsSection';
import { ProfileReviewsDetailModal } from '../organisms/profile/ProfileReviewsDetailModal';
import { useUserReviews } from '../../hooks/useUserReviews';
import { useSellerFollow } from '../../hooks/useSellerFollow';
import { useSellerNotifications } from '../../hooks/useSellerNotifications';
import { FollowSuccessCelebration } from '../molecules/profile';
import { formatCompactCount } from '../../utils/formatCount';
import {
  BIO_PREVIEW_MAX_GRAPHEMES,
  graphemeCount,
  sliceGraphemes,
} from '../../utils/grapheme';
import { FONT_FAMILY } from '../../theme/typography';
import { themeColors } from '../../theme/colors';
import { isHandle } from '../../utils/handle';
import { useTheme } from '../../context/ThemeContext';
import type { UserShowItem } from '../../api/platformApi';
import { appAlert } from '../../alerts';

const COVER_H = 164;
const H_PAD = 16;
/** Distancia al fondo (px) a la que se pide la página siguiente de Shows/Productos. */
const LOAD_MORE_PX = 320;
const PRIMARY = '#685CF0';
const LAVENDER = '#E7E7FF';
const BORDER_LAVENDER = '#CBCEFF';
type ProfileTab = 'shows' | 'products' | 'reviews' | 'clips';

export interface UserProfileScreenProps {
  userId?: string;
  onBack: () => void;
  onShowPress?: (show: UserShowItem) => void;
  /** Figma 536-20602 — perfil de vendedor visto por otro usuario (p. ej. desde un live). */
  variant?: 'default' | 'sellerPublic';
  /**
   * true cuando la pantalla se monta full-bleed (overlay sobre un stream) y el cover
   * queda debajo del status bar: agrega el safe area inset arriba de los íconos.
   * false (default) cuando el padre ya aplica el safe area (Home).
   */
  underStatusBar?: boolean;
  /** Botón de mensajes en perfil ajeno: inicia (o retoma) el chat con ese usuario. */
  onStartChat?: (peerUserId: string) => void;
  /** Botón de mensajes en el perfil propio: abre la lista de chats. */
  onOpenChats?: () => void;
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  userId,
  onBack,
  onShowPress,
  variant = 'default',
  underStatusBar = false,
  onStartChat,
  onOpenChats,
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const d = themeColors.dark;
  // Overrides oscuros: en claro los estilos estáticos quedan intactos.
  const darkBg = isDark ? { backgroundColor: d.background } : null;
  const darkText = isDark ? { color: d.text } : null;
  const darkMuted = isDark ? { color: d.textSecondary } : null;
  const [tab, setTab] = useState<ProfileTab>('shows');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  // Alto real del body (crece al cargar Shows/Productos): dimensiona el gradiente de fondo.
  const [bodyHeight, setBodyHeight] = useState(0);
  // Detalle de producto y edición
  const [productDetailId, setProductDetailId] = useState<string | null>(null);
  const [editProductValues, setEditProductValues] = useState<ProductInitialValues | null>(null);
  const { profile, loading, error, resolvedId, reload } = useUserProfile(userId);
  const {
    shows,
    loading: showsLoading,
    loadingMore: showsLoadingMore,
    loadMore: loadMoreShows,
  } = useUserShows(resolvedId, tab === 'shows');
  const {
    items: profileProducts,
    loading: productsLoading,
    loadingMore: productsLoadingMore,
    loadMore: loadMoreProducts,
    reload: reloadProducts,
  } = useUserProfileProducts(resolvedId, tab === 'products');
  const { data: reviewsData, loading: reviewsLoading } = useUserReviews(
    resolvedId,
    tab === 'reviews'
  );

  const placeholder = () => appAlert(t('common.appName'), t('home.placeholderScreen'));

  // El botón de mensajes existe en ambas variantes (Figma 698:10969): en un perfil
  // ajeno inicia el chat con ese usuario; en el propio abre la lista de chats.
  const { user: authUser } = useAuth();
  const isOwnProfile = !!resolvedId && resolvedId === authUser?.uuid;
  const handleChatPress = () => {
    if (isOwnProfile) {
      if (onOpenChats) return onOpenChats();
    } else if (resolvedId && onStartChat) {
      return onStartChat(resolvedId);
    }
    placeholder();
  };

  const statSecondaryLabel =
    profile?.user_type === 'seller_user' ? t('profile.sold') : t('profile.purchases');
  const statSecondaryValue =
    profile?.user_type === 'seller_user'
      ? profile?.sold_count ?? 0
      : profile?.purchase_count ?? 0;

  const reviewsRatingText =
    profile?.reviews_avg != null && profile.reviews_avg > 0
      ? String(profile.reviews_avg)
      : '—';

  const reviewsLabelText = `${formatCompactCount(profile?.reviews_count ?? 0)} ${t('profile.reviewsLabel')}`;

  const isSellerType =
    profile?.user_type === 'seller_user' ||
    (profile?.user_type?.toLowerCase().includes('seller') ?? false);

  const showSellerPublicUi =
    Boolean(profile) &&
    !profile!.is_own_profile &&
    (variant === 'sellerPublic' || isSellerType);

  const bioText = profile?.bio?.trim() ?? '';
  const bioOverflows = graphemeCount(bioText) > BIO_PREVIEW_MAX_GRAPHEMES;
  const displayedBio =
    bioExpanded || !bioOverflows
      ? bioText
      : sliceGraphemes(bioText, BIO_PREVIEW_MAX_GRAPHEMES);

  useEffect(() => {
    setBioExpanded(false);
  }, [bioText]);

  const sellerDisplayName =
    profile?.display_name?.trim() ||
    [profile?.name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    '';

  const {
    isFollowing,
    followLoading,
    celebrationVisible,
    toggleFollow,
    dismissCelebration,
  } = useSellerFollow({
    sellerUserId: resolvedId,
    sellerName: sellerDisplayName,
    initialFollowing: profile?.is_following ?? false,
  });

  const handleFollowToggle = async () => {
    await toggleFollow();
    await reload().catch(() => {});
  };

  // Campana de notificaciones del vendedor — Figma 698-8930.
  const {
    isSubscribed: notifSubscribed,
    subscriptionLoading: notifLoading,
    celebrationVisible: notifCelebrationVisible,
    toggleSubscription: toggleNotifSubscription,
    dismissCelebration: dismissNotifCelebration,
  } = useSellerNotifications({
    sellerUserId: resolvedId,
    enabled: showSellerPublicUi,
  });

  // Detalle de reviews — Figma 698-10329.
  const [reviewsDetailVisible, setReviewsDetailVisible] = useState(false);

  // Único camino de edición de producto (perfil propio): lo abren tanto el lápiz
  // de la fila del listado (Figma 636:28640) como "Editar Producto" del detalle.
  // Carga el producto y monta AddProductScreen en modo edición con initialValues.
  const openProductEditor = async (pid: string) => {
    try {
      const detail = await getPublicProduct(pid);
      const initValues: ProductInitialValues = {
        productId: pid,
        title: detail.title,
        description: detail.description ?? '',
        price: String(Math.round(detail.base_price_cents / 100)),
        sku: '',
        imageUrls: detail.image_urls,
        sizes: detail.sizes,
        colors: detail.colors,
        categoryUuid: null,
        saleFormat: null,
        packageTier: null,
        weightKg: null,
        condition: null,
        quantityOnHand: detail.quantity_on_hand,
      };
      setEditProductValues(initValues);
      setProductDetailId(null);
    } catch {
      // Si falla la carga, no se abre el editor (y el detalle, si estaba, sigue abierto).
    }
  };

  const showRows = useMemo(() => {
    const rows: UserShowItem[][] = [];
    for (let i = 0; i < shows.length; i += 2) {
      rows.push(shows.slice(i, i + 2));
    }
    return rows;
  }, [shows]);

  // Scroll infinito de Shows/Productos: cerca del fondo pide la página
  // siguiente. Los guards de doble disparo y de fin de lista viven en el hook.
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (tab !== 'shows' && tab !== 'products') return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height < contentSize.height - LOAD_MORE_PX) {
      return;
    }
    if (tab === 'shows') loadMoreShows();
    else loadMoreProducts();
  };

  if (loading && !profile) {
    return (
      <View style={[styles.centered, darkBg]}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.centered, darkBg]}>
        <RNText style={[styles.errorText, darkMuted]}>{error ?? t('profile.loadError')}</RNText>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <RNText style={styles.backBtnText}>{t('explore.back')}</RNText>
        </TouchableOpacity>
      </View>
    );
  }

  const coverUri = profile.cover_picture;
  const avatarUri = profile.profile_picture;

  return (
    <View style={[styles.root, darkBg]}>
      <FollowSuccessCelebration
        visible={celebrationVisible}
        sellerName={sellerDisplayName}
        onDismiss={dismissCelebration}
      />
      <FollowSuccessCelebration
        visible={notifCelebrationVisible}
        sellerName={sellerDisplayName}
        onDismiss={dismissNotifCelebration}
        title={t('profile.notifSuccessTitle')}
        body={t('profile.notifSuccessBody', { name: sellerDisplayName })}
      />
      {editDrawerOpen ? (
        <EditProfileDrawer
          visible={editDrawerOpen}
          profile={profile}
          coverUri={coverUri}
          avatarUri={avatarUri}
          onClose={() => setEditDrawerOpen(false)}
          onSaved={() => {
            reload().catch(() => {});
          }}
        />
      ) : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Cover 164px — Figma 536:23110 */}
        <View
          style={[
            styles.coverWrap,
            { height: COVER_H },
            isDark ? { backgroundColor: d.surface } : null,
          ]}
        >
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <CoverPlaceholder />
          )}
          <CoverBottomGradient />
          <View
            style={[
              styles.coverInner,
              styles.coverInnerPadBottom,
              // Figma 698:10949 py-16; el inset solo aplica si el cover pasa por debajo del status bar.
              { paddingTop: underStatusBar ? insets.top + 12 : 16 },
            ]}
          >
            <View style={styles.coverTopBar}>
              <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button">
                <IconChevronLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.coverProfileRow}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.coverAvatar} />
              ) : (
                <View style={styles.coverAvatarFallback}>
                  <IconUser size={28} color="#02050F" strokeWidth={2} />
                </View>
              )}
              <View style={styles.coverNameCol}>
                <View style={styles.coverNameRow}>
                  <RNText
                    style={styles.coverName}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {profile.display_name}
                  </RNText>
                  {showSellerPublicUi && profile.is_verified ? (
                    <BadgeCheck
                      size={16}
                      color="#FFFFFF"
                      fill="#FB2C36"
                      style={styles.verifiedBadge}
                    />
                  ) : null}
                </View>
                {isHandle(profile.username) ? (
                  <RNText
                    style={styles.coverHandle}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    @{profile.username}
                  </RNText>
                ) : null}
                {profile.subtitle ? (
                  <RNText
                    style={styles.coverSubtitle}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {profile.subtitle}
                  </RNText>
                ) : null}
              </View>
              {showSellerPublicUi ? (
                <View style={styles.coverSellerActions}>
                  <TouchableOpacity
                    style={[
                      styles.coverActionBtn,
                      notifSubscribed && styles.coverActionBtnActive,
                      notifLoading && styles.coverActionBtnDisabled,
                    ]}
                    onPress={() => {
                      void toggleNotifSubscription();
                    }}
                    disabled={notifLoading}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.notifySeller')}
                    accessibilityState={{ selected: notifSubscribed }}
                  >
                    <IconBell
                      size={24}
                      color={notifSubscribed ? '#FFFFFF' : PRIMARY}
                      strokeWidth={1.75}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.coverActionBtn}
                    onPress={handleChatPress}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.messageSeller')}
                  >
                    <IconChat size={24} color={PRIMARY} strokeWidth={1.75} />
                  </TouchableOpacity>
                </View>
              ) : (
                // Figma 698:10969 — el botón de mensajes también aparece en el perfil propio.
                <TouchableOpacity
                  style={styles.coverActionBtn}
                  onPress={handleChatPress}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.messageSeller')}
                >
                  <IconChat size={24} color={PRIMARY} strokeWidth={1.75} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Body — Figma 536:23142 bg white → #E7E7FF */}
        <View
          style={styles.body}
          onLayout={(e) => {
            const h = Math.ceil(e.nativeEvent.layout.height);
            if (h > 0 && h !== bodyHeight) setBodyHeight(h);
          }}
        >
          <BodyBackground height={bodyHeight} />
          <View style={styles.bodyContent}>
            <View style={styles.sectionBlock}>
              <View style={styles.statsSection}>
                <View style={styles.followRow}>
                  <View style={styles.followItem}>
                    <RNText style={[styles.followBold, darkText]}>
                      {formatCompactCount(profile.followers_count)}
                    </RNText>
                    <RNText style={[styles.followLabel, darkText]}>
                      {t('profile.followers')}
                    </RNText>
                  </View>
                  <View style={styles.followItem}>
                    <RNText style={[styles.followBold, darkText]}>
                      {formatCompactCount(profile.following_count)}
                    </RNText>
                    <RNText style={[styles.followLabel, darkText]}>
                      {t('profile.following')}
                    </RNText>
                  </View>
                </View>

                {bioText ? (
                  <View style={styles.bioBlock}>
                    <RNText style={[styles.bioText, darkMuted]}>{displayedBio}</RNText>
                    {bioOverflows ? (
                      <TouchableOpacity onPress={() => setBioExpanded((v) => !v)}>
                        <RNText style={styles.bioMore}>
                          {bioExpanded ? t('profile.seeLess') : t('profile.seeMore')}
                        </RNText>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.statCardsRow}>
                  <StatCard>
                    <View
                      style={[
                        styles.statIconCircle,
                        isDark ? { backgroundColor: d.surfaceAlt } : null,
                      ]}
                    >
                      <IconStar size={19} color={PRIMARY} />
                    </View>
                    <View style={styles.statCardText}>
                      <RNText style={[styles.statValue, darkText]}>{reviewsRatingText}</RNText>
                      <RNText style={[styles.statLabel, darkMuted]}>{reviewsLabelText}</RNText>
                    </View>
                  </StatCard>
                  <StatCard>
                    <View
                      style={[
                        styles.statIconCircle,
                        isDark ? { backgroundColor: d.surfaceAlt } : null,
                      ]}
                    >
                      <IconTag size={19} color={PRIMARY} />
                    </View>
                    <View style={styles.statCardText}>
                      <RNText style={[styles.statValue, darkText]}>
                        {formatCompactCount(statSecondaryValue)}
                      </RNText>
                      <RNText style={[styles.statLabel, darkMuted]}>{statSecondaryLabel}</RNText>
                    </View>
                  </StatCard>
                </View>
              </View>

              {profile.is_own_profile ? (
                <TouchableOpacity
                  style={styles.primaryCtaBtn}
                  onPress={() => setEditDrawerOpen(true)}
                  activeOpacity={0.88}
                >
                  <RNText style={styles.primaryCtaBtnText}>{t('profile.editProfile')}</RNText>
                </TouchableOpacity>
              ) : !profile.is_own_profile ? (
                <TouchableOpacity
                  style={[
                    styles.primaryCtaBtn,
                    isFollowing && styles.primaryCtaBtnFollowing,
                    isFollowing && isDark ? { backgroundColor: d.surfaceAlt } : null,
                    followLoading && styles.primaryCtaBtnDisabled,
                  ]}
                  onPress={() => {
                    void handleFollowToggle();
                  }}
                  disabled={followLoading}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFollowing ? t('stream.following') : t('stream.follow')
                  }
                >
                  {followLoading ? (
                    <ActivityIndicator
                      color={isFollowing ? (isDark ? d.textSecondary : '#71717B') : '#FFFFFF'}
                    />
                  ) : (
                    <RNText
                      style={[
                        styles.primaryCtaBtnText,
                        isFollowing && styles.primaryCtaBtnTextFollowing,
                        isFollowing && isDark ? { color: d.textSecondary } : null,
                      ]}
                    >
                      {isFollowing ? t('stream.following') : t('stream.follow')}
                    </RNText>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.tabsRow}>
              {(['shows', 'products', 'reviews', 'clips'] as ProfileTab[]).map((key) => {
                const active = tab === key;
                const label =
                  key === 'shows'
                    ? t('profile.tabShows')
                    : key === 'products'
                      ? t('profile.tabProducts')
                      : key === 'reviews'
                        ? t('profile.tabReviews')
                        : t('profile.tabClips');
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => setTab(key)}
                  >
                    <RNText
                      style={[
                        styles.tabLabel,
                        active && styles.tabLabelActive,
                        isDark ? { color: active ? d.text : d.textSecondary } : null,
                      ]}
                    >
                      {label}
                    </RNText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {tab === 'shows' ? (
              showsLoading && shows.length === 0 ? (
                <ActivityIndicator color={PRIMARY} style={styles.showsLoader} />
              ) : showRows.length === 0 ? (
                <RNText style={[styles.emptyShows, darkMuted]}>{t('profile.noShows')}</RNText>
              ) : (
                <View style={styles.showsGrid}>
                  {showRows.map((row, idx) => (
                    <View key={`row-${idx}`} style={styles.showGridRow}>
                      {row.map((show) => (
                        <ProfileShowCard
                          key={show.room_uuid}
                          show={show}
                          onPress={() => onShowPress?.(show)}
                          onNotifyPress={
                            showSellerPublicUi
                              ? () => {
                                  void toggleNotifSubscription();
                                }
                              : undefined
                          }
                          notifySelected={notifSubscribed}
                          notifyLoading={notifLoading}
                        />
                      ))}
                      {row.length === 1 ? (
                        <View style={{ width: (width - H_PAD * 2 - 12) / 2 }} />
                      ) : null}
                    </View>
                  ))}
                  {showsLoadingMore ? (
                    <ActivityIndicator color={PRIMARY} style={styles.showsLoader} />
                  ) : null}
                </View>
              )
            ) : null}

            {tab === 'products' ? (
              productsLoading && profileProducts.length === 0 ? (
                <ActivityIndicator color={PRIMARY} style={styles.showsLoader} />
              ) : profileProducts.length === 0 ? (
                <RNText style={[styles.emptyShows, darkMuted]}>{t('profile.noProducts')}</RNText>
              ) : (
                <View style={styles.productsList}>
                  {profileProducts.map((product) => (
                    <ProfileProductRow
                      key={product.room_uuid}
                      item={product}
                      onPress={
                        product.status === 'live'
                          ? () =>
                              onShowPress?.({
                                room_uuid: product.room_uuid,
                                name: product.title,
                                status: 'live',
                                created_at: product.scheduled_at ?? 0,
                              } as UserShowItem)
                          : product.product_id
                            ? () => setProductDetailId(String(product.product_id))
                            : undefined
                      }
                      // Lápiz de editar (Figma 636:28640): solo en el perfil propio y
                      // sobre productos del catálogo (los "en vivo" abren el stream).
                      onEditPress={
                        isOwnProfile && product.status !== 'live' && product.product_id
                          ? () => {
                              void openProductEditor(String(product.product_id));
                            }
                          : undefined
                      }
                    />
                  ))}
                  {productsLoadingMore ? (
                    <ActivityIndicator color={PRIMARY} style={styles.showsLoader} />
                  ) : null}
                </View>
              )
            ) : null}

            {tab === 'reviews' ? (
              <ProfileReviewsSection
                data={reviewsData}
                loading={reviewsLoading}
                onPressReview={() => setReviewsDetailVisible(true)}
              />
            ) : null}

            {tab === 'clips' ? (
              <RNText style={[styles.emptyShows, darkMuted]}>{t('profile.noClips')}</RNText>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <ProfileReviewsDetailModal
        visible={reviewsDetailVisible}
        reviews={reviewsData?.items ?? []}
        onClose={() => setReviewsDetailVisible(false)}
      />

      {/* Detalle de producto: se monta sobre el perfil como overlay absoluto */}
      {productDetailId ? (
        <View style={StyleSheet.absoluteFill}>
          <ProductDetailScreen
            productId={productDetailId}
            sellerUserId={resolvedId ?? undefined}
            onBack={() => setProductDetailId(null)}
            onEditProduct={isOwnProfile ? openProductEditor : undefined}
          />
        </View>
      ) : null}

      {/* Editar producto: overlay sobre el perfil */}
      {editProductValues ? (
        <View style={StyleSheet.absoluteFill}>
          <AddProductScreen
            initialValues={editProductValues}
            onCancel={() => setEditProductValues(null)}
            onSaved={() => {
              setEditProductValues(null);
              reloadProducts();
            }}
          />
        </View>
      ) : null}
    </View>
  );
};

/** Placeholder cover sin imagen — lavanda Figma (navy en oscuro) */
const CoverPlaceholder: React.FC = () => {
  const gradientId = useId().replace(/:/g, '');
  const { isDark } = useTheme();
  const from = isDark ? themeColors.dark.surface : '#F5F5FF';
  const to = isDark ? themeColors.dark.surfaceAlt : BORDER_LAVENDER;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
  );
};

/** Gradiente inferior del cover para legibilidad del texto */
const CoverBottomGradient: React.FC = () => (
  <Svg pointerEvents="none" style={styles.coverBottomGrad} width="100%" height="100%">
    <Defs>
      <LinearGradient id="profile-cover-bottom" x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0" stopColor="rgba(0,0,0,0.9)" />
        <Stop offset="0.5" stopColor="rgba(0,0,0,0.2)" />
        <Stop offset="1" stopColor="rgba(0,0,0,0)" />
      </LinearGradient>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#profile-cover-bottom)" />
  </Svg>
);

/**
 * Tarjeta de métricas — Figma 698:10992 / 698:11004.
 * Fill transparente (deja ver el gradiente del body) + borde #CBCEFF;
 * icono en círculo #CBCEFF.
 */
const StatCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDark } = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        isDark ? { borderColor: themeColors.dark.surfaceAlt } : null,
      ]}
    >
      <View style={styles.statCardInner}>{children}</View>
    </View>
  );
};

/**
 * Fondo body white → #E7E7FF (plano #050f2f en oscuro).
 *
 * Recibe el alto medido del body (onLayout) en vez de height="100%": el body
 * crece cuando llegan los productos, y con un alto porcentual el SVG quedaba
 * dibujado al alto inicial (viewport) sin redibujarse — de ahí el corte a una
 * altura fija con el gradiente completo comprimido arriba. Con un alto numérico
 * cada cambio de layout re-renderiza el SVG al tamaño real (mismo patrón que
 * StreamGradientButton). Hasta la primera medición no pinta nada: debajo está
 * styles.root con el color de fondo del tema.
 */
const BodyBackground: React.FC<{ height: number }> = ({ height }) => {
  const gradientId = useId().replace(/:/g, '');
  const { isDark } = useTheme();
  const from = isDark ? themeColors.dark.backgroundTop : '#FFFFFF';
  const to = isDark ? themeColors.dark.backgroundBottom : LAVENDER;
  if (height <= 0) return null;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height={height} fill={`url(#${gradientId})`} />
    </Svg>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontFamily: FONT_FAMILY.regular,
    color: '#71717A',
    marginBottom: 16,
  },
  backBtn: { padding: 12 },
  backBtnText: {
    fontFamily: FONT_FAMILY.semibold,
    color: PRIMARY,
  },
  coverWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: LAVENDER,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverBottomGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  coverInner: {
    flex: 1,
    paddingHorizontal: H_PAD,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  coverInnerPadBottom: {
    paddingBottom: 16,
  },
  coverTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.402,
    borderColor: '#3F3F47',
    flexShrink: 0,
  },
  coverAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.402,
    borderColor: '#3F3F47',
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  coverNameCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    justifyContent: 'center',
  },
  coverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  coverName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexShrink: 0,
  },
  coverHandle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themeColors.glass.textSoft,
    includeFontPadding: false,
  },
  coverSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  coverSellerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  coverActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 1000,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  coverActionBtnActive: {
    backgroundColor: PRIMARY,
  },
  coverActionBtnDisabled: {
    opacity: 0.6,
  },
  body: {
    // flexGrow (y no flex: 1, que fija flexBasis 0 = alto del viewport): el body
    // mide lo que mide su contenido y crece hasta el viewport si queda corto, así
    // <BodyBackground /> (absoluteFill) acompaña la lista entera.
    flexGrow: 1,
    minHeight: 400,
    position: 'relative',
    // El respiro inferior va dentro del body para que el gradiente lo cubra.
    paddingBottom: 24,
  },
  bodyContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 24,
    gap: 24,
    zIndex: 1,
  },
  sectionBlock: {
    gap: 16,
  },
  statsSection: {
    gap: 16,
  },
  followRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    height: 16,
  },
  followItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followBold: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: '#27272A',
    includeFontPadding: false,
  },
  followLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 16,
    color: '#27272A',
    includeFontPadding: false,
  },
  bioBlock: {
    gap: 4,
    maxWidth: '100%',
  },
  bioText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 16,
    color: '#535353',
    includeFontPadding: false,
  },
  bioMore: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 16,
    color: PRIMARY,
    includeFontPadding: false,
  },
  statCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_LAVENDER,
    overflow: 'hidden',
    // Figma 698:10992: fill transparente. La sombra (5%) se omite: iOS/Android
    // no renderizan sombras sobre vistas sin fondo.
    backgroundColor: 'transparent',
  },
  statCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    zIndex: 1,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 1000,
    backgroundColor: BORDER_LAVENDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statCardText: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    // Figma usa leading 0.8 (16px), pero RN recorta el glifo si lineHeight < fontSize.
    lineHeight: 20,
    color: '#111928',
    includeFontPadding: false,
  },
  statLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    includeFontPadding: false,
  },
  primaryCtaBtn: {
    width: '100%',
    backgroundColor: PRIMARY,
    height: 40,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  /** Figma 536-21428 */
  primaryCtaBtnFollowing: {
    backgroundColor: '#D7D7D9',
  },
  primaryCtaBtnDisabled: {
    opacity: 0.7,
  },
  primaryCtaBtnText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  primaryCtaBtnTextFollowing: {
    color: '#71717B',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
  },
  tabLabel: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: '#18181B',
    includeFontPadding: false,
  },
  tabLabelActive: {
    fontFamily: FONT_FAMILY.bold,
    color: '#181818',
  },
  showsLoader: {
    marginTop: 8,
  },
  emptyShows: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 8,
  },
  showsGrid: {
    gap: 12,
  },
  productsList: {
    gap: 0,
    width: '100%',
  },
  showGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});
