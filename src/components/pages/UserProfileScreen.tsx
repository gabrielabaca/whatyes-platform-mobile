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
  Alert,
  Text as RNText,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BadgeCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconChevronLeft,
  IconShare,
  IconMoreVertical,
  IconUser,
  IconStar,
  IconTag,
  IconChat,
  IconBell,
} from '../icons';
import { ProfileShowCard } from '../organisms/profile/ProfileShowCard';
import { EditProfileDrawer } from '../organisms/profile/EditProfileDrawer';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUserShows } from '../../hooks/useUserShows';
import { useUserProfileProducts } from '../../hooks/useUserProfileProducts';
import { ProfileProductRow } from '../organisms/profile/ProfileProductRow';
import { ProfileReviewsSection } from '../organisms/profile/ProfileReviewsSection';
import { useUserReviews } from '../../hooks/useUserReviews';
import { useSellerFollow } from '../../hooks/useSellerFollow';
import { FollowSuccessCelebration } from '../molecules/profile';
import { formatCompactCount } from '../../utils/formatCount';
import { FONT_FAMILY } from '../../theme/typography';
import type { UserShowItem } from '../../api/platformApi';

const COVER_H = 164;
const H_PAD = 16;
const PRIMARY = '#685CF0';
const LAVENDER = '#E7E7FF';
const BORDER_LAVENDER = '#CBCEFF';
const BIO_SEE_MORE_MIN_LENGTH = 200;

/** Figma 536:23161 — bg transparente; sombra solo iOS (elevation rompe el fondo en Android). */
const STAT_CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  android: {},
  default: {},
});

type ProfileTab = 'shows' | 'products' | 'reviews' | 'clips';

export interface UserProfileScreenProps {
  userId?: string;
  onBack: () => void;
  onShowPress?: (show: UserShowItem) => void;
  /** Figma 536-20602 — perfil de vendedor visto por otro usuario (p. ej. desde un live). */
  variant?: 'default' | 'sellerPublic';
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  userId,
  onBack,
  onShowPress,
  variant = 'default',
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ProfileTab>('shows');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const { profile, loading, error, resolvedId, reload } = useUserProfile(userId);
  const { shows, loading: showsLoading } = useUserShows(resolvedId, tab === 'shows');
  const { items: profileProducts, loading: productsLoading } = useUserProfileProducts(
    resolvedId,
    tab === 'products'
  );
  const { data: reviewsData, loading: reviewsLoading } = useUserReviews(
    resolvedId,
    tab === 'reviews'
  );

  const placeholder = () => Alert.alert(t('common.appName'), t('home.placeholderScreen'));

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
  const bioIsLong = bioText.length > BIO_SEE_MORE_MIN_LENGTH;
  const bioDisplayText =
    bioIsLong && !bioExpanded ? `${bioText.slice(0, BIO_SEE_MORE_MIN_LENGTH)}…` : bioText;

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

  const showRows = useMemo(() => {
    const rows: UserShowItem[][] = [];
    for (let i = 0; i < shows.length; i += 2) {
      rows.push(shows.slice(i, i + 2));
    }
    return rows;
  }, [shows]);

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <RNText style={styles.errorText}>{error ?? t('profile.loadError')}</RNText>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <RNText style={styles.backBtnText}>{t('explore.back')}</RNText>
        </TouchableOpacity>
      </View>
    );
  }

  const coverUri = profile.cover_picture;
  const avatarUri = profile.profile_picture;

  return (
    <View style={styles.root}>
      <FollowSuccessCelebration
        visible={celebrationVisible}
        sellerName={sellerDisplayName}
        onDismiss={dismissCelebration}
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
      >
        {/* Cover 164px — Figma 536:23110 */}
        <View style={[styles.coverWrap, { height: COVER_H }]}>
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
              { paddingTop: insets.top + 12 },
            ]}
          >
            <View style={styles.coverTopBar}>
              <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button">
                <IconChevronLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.coverActions}>
                <TouchableOpacity onPress={placeholder} hitSlop={8} accessibilityRole="button">
                  <IconShare size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={placeholder} hitSlop={8} accessibilityRole="button">
                  <IconMoreVertical size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
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
                  <RNText style={styles.coverName} numberOfLines={1}>
                    {profile.display_name}
                  </RNText>
                  {showSellerPublicUi && profile.is_verified ? (
                    <BadgeCheck
                      size={16}
                      color="#FB2C36"
                      fill="#FB2C36"
                      style={styles.verifiedBadge}
                    />
                  ) : null}
                </View>
                {profile.subtitle ? (
                  <RNText style={styles.coverSubtitle} numberOfLines={1}>
                    {profile.subtitle}
                  </RNText>
                ) : null}
              </View>
              {showSellerPublicUi ? (
                <View style={styles.coverSellerActions}>
                  <TouchableOpacity
                    style={styles.coverActionBtn}
                    onPress={placeholder}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.notifySeller')}
                  >
                    <IconBell size={24} color={PRIMARY} strokeWidth={1.75} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.coverActionBtn}
                    onPress={placeholder}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.messageSeller')}
                  >
                    <IconChat size={24} color={PRIMARY} strokeWidth={1.75} />
                  </TouchableOpacity>
                </View>
              ) : !profile.is_own_profile ? (
                <TouchableOpacity
                  style={styles.coverActionBtn}
                  onPress={placeholder}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.messageSeller')}
                >
                  <IconChat size={24} color={PRIMARY} strokeWidth={1.75} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Body — Figma 536:23142 bg white → #E7E7FF */}
        <View style={styles.body}>
          <BodyBackground />
          <View style={styles.bodyContent}>
            <View style={styles.sectionBlock}>
              <View style={styles.statsSection}>
                <View style={styles.followRow}>
                  <View style={styles.followItem}>
                    <RNText style={styles.followBold}>
                      {formatCompactCount(profile.followers_count)}
                    </RNText>
                    <RNText style={styles.followLabel}>{t('profile.followers')}</RNText>
                  </View>
                  <View style={styles.followItem}>
                    <RNText style={styles.followBold}>
                      {formatCompactCount(profile.following_count)}
                    </RNText>
                    <RNText style={styles.followLabel}>{t('profile.following')}</RNText>
                  </View>
                </View>

                {bioText ? (
                  <View style={styles.bioBlock}>
                    <RNText style={styles.bioText}>{bioDisplayText}</RNText>
                    {bioIsLong ? (
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
                    <View style={styles.statIconCircle}>
                      <IconStar size={19} color={PRIMARY} />
                    </View>
                    <View style={styles.statCardText}>
                      <RNText style={styles.statValue}>{reviewsRatingText}</RNText>
                      <RNText style={styles.statLabel}>{reviewsLabelText}</RNText>
                    </View>
                  </StatCard>
                  <StatCard>
                    <View style={styles.statIconCircle}>
                      <IconTag size={19} color={PRIMARY} />
                    </View>
                    <View style={styles.statCardText}>
                      <RNText style={styles.statValue}>
                        {formatCompactCount(statSecondaryValue)}
                      </RNText>
                      <RNText style={styles.statLabel}>{statSecondaryLabel}</RNText>
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
                    <ActivityIndicator color={isFollowing ? '#71717B' : '#FFFFFF'} />
                  ) : (
                    <RNText
                      style={[
                        styles.primaryCtaBtnText,
                        isFollowing && styles.primaryCtaBtnTextFollowing,
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
                    onPress={() => {
                      if (key === 'shows' || key === 'products' || key === 'reviews') {
                        setTab(key);
                      } else {
                        placeholder();
                      }
                    }}
                  >
                    <RNText style={[styles.tabLabel, active && styles.tabLabelActive]}>
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
                <RNText style={styles.emptyShows}>{t('profile.noShows')}</RNText>
              ) : (
                <View style={styles.showsGrid}>
                  {showRows.map((row, idx) => (
                    <View key={`row-${idx}`} style={styles.showGridRow}>
                      {row.map((show) => (
                        <ProfileShowCard
                          key={show.room_uuid}
                          show={show}
                          onPress={() => onShowPress?.(show)}
                        />
                      ))}
                      {row.length === 1 ? (
                        <View style={{ width: (width - H_PAD * 2 - 12) / 2 }} />
                      ) : null}
                    </View>
                  ))}
                </View>
              )
            ) : null}

            {tab === 'products' ? (
              productsLoading && profileProducts.length === 0 ? (
                <ActivityIndicator color={PRIMARY} style={styles.showsLoader} />
              ) : profileProducts.length === 0 ? (
                <RNText style={styles.emptyShows}>{t('profile.noProducts')}</RNText>
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
                          : undefined
                      }
                    />
                  ))}
                </View>
              )
            ) : null}

            {tab === 'reviews' ? (
              <ProfileReviewsSection data={reviewsData} loading={reviewsLoading} />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/** Placeholder cover sin imagen — lavanda Figma */
const CoverPlaceholder: React.FC = () => {
  const gradientId = useId().replace(/:/g, '');
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F5F5FF" />
          <Stop offset="1" stopColor={BORDER_LAVENDER} />
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

/** Figma 536:23161 — fill sutil + borde #CBCEFF */
const STAT_CARD_GRADIENT_END = '#F0EEFF';

/**
 * Tarjeta de métricas — Figma 536:23161 / 536:23173.
 * Degradado diagonal #FFF → lavanda suave; icono en círculo #CBCEFF.
 */
const StatCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const gradientId = useId().replace(/:/g, '');
  return (
    <View style={styles.statCard}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor={STAT_CARD_GRADIENT_END} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={8} fill={`url(#${gradientId})`} />
      </Svg>
      <View style={styles.statCardInner}>{children}</View>
    </View>
  );
};

/** Fondo body white → #E7E7FF */
const BodyBackground: React.FC = () => {
  const gradientId = useId().replace(/:/g, '');
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={LAVENDER} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
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
    paddingBottom: 24,
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
  coverActions: {
    flexDirection: 'row',
    gap: 12,
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
  coverSubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 12,
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
  body: {
    flex: 1,
    minHeight: 400,
    position: 'relative',
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
    ...STAT_CARD_SHADOW,
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
    lineHeight: 16,
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
    borderBottomWidth: 2,
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
