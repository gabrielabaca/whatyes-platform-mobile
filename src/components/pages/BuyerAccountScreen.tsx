import React, { useId, useState, useCallback } from 'react';
import { ShippingAddressModal } from '../organisms/account/ShippingAddressModal';
import { PreferencesModal } from '../organisms/account/PreferencesModal';
import { NotificationsModal } from '../organisms/account/NotificationsModal';
import { ChangePasswordModal } from '../organisms/account/ChangePasswordModal';
import { ContactModal } from '../organisms/account/ContactModal';
import { WalletFlowDrawers } from '../organisms/stream/wallet';
import { useStreamWalletFlow } from '../../hooks/useStreamWalletFlow';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Text as RNText,
  StyleSheet,
  Platform,
  Alert,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '../atoms/Text';
import { AccountMenuRow } from '../organisms/home/AccountMenuRow';
import { IconUser, IconLogOut } from '../icons';
import AddCardIcon from '../../../assets/icons/account/add-card.svg';
import LocationIcon from '../../../assets/icons/account/location-on.svg';
import NotificationsIcon from '../../../assets/icons/account/notifications.svg';
import SettingsIcon from '../../../assets/icons/account/settings.svg';
import LockIcon from '../../../assets/icons/account/lock.svg';
import ChatIcon from '../../../assets/icons/account/chat.svg';
import ArticleIcon from '../../../assets/icons/account/article.svg';
import HelpIcon from '../../../assets/icons/account/help.svg';
import { FONT_FAMILY } from '../../theme/typography';
import { themeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

/** Figma 536:16099 — Main Content */
const H_PADDING = 16;
const BLOCK_GAP = 24;
const ROW_GAP = 12;

/** Figma 536:16102 — tarjeta perfil */
const PROFILE_PURPLE = '#6153FF';
const PROFILE_GOLD = '#FACA4D';

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  android: { elevation: 2 },
  default: {},
});

export interface BuyerAccountScreenProps {
  profileImageUri?: string | null;
  displayName: string;
  subtitle: string;
  userEmail: string;
  onViewProfile: () => void;
  onLogout: () => void;
}

export const BuyerAccountScreen: React.FC<BuyerAccountScreenProps> = ({
  profileImageUri,
  displayName,
  subtitle,
  userEmail,
  onViewProfile,
  onLogout,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  // Solo se agregan overrides oscuros: en claro los estilos estáticos quedan intactos.
  const darkText = isDark ? { color: themeColors.dark.text } : null;
  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  /** Mismo flujo de drawers que el vivo; acá se entra directo al hub. */
  const wallet = useStreamWalletFlow();

  const showPlaceholder = () => {
    Alert.alert(t('common.appName'), t('home.placeholderScreen'));
  };

  return (
    <View style={styles.screen}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.blocks}>
        <ProfileCard
          profileImageUri={profileImageUri}
          displayName={displayName}
          subtitle={subtitle}
          onViewProfile={onViewProfile}
          viewProfileLabel={t('account.viewProfile')}
        />

        <Text style={[styles.sectionTitle, darkText]}>{t('account.sectionAccount')}</Text>

        <View style={styles.rowList}>
          <AccountMenuRow
            label={t('account.paymentsShipping')}
            icon={AddCardIcon}
            onPress={() => {
              void wallet.goToHub();
            }}
          />
          <AccountMenuRow
            label={t('account.address')}
            icon={LocationIcon}
            onPress={() => setShippingModalVisible(true)}
          />
          <AccountMenuRow
            label={t('account.notifications')}
            icon={NotificationsIcon}
            onPress={() => setNotificationsModalVisible(true)}
          />
          <AccountMenuRow
            label={t('account.preferences')}
            icon={SettingsIcon}
            onPress={() => setPreferencesModalVisible(true)}
          />
          <AccountMenuRow
            label={t('account.changePassword')}
            icon={LockIcon}
            onPress={() => setChangePasswordVisible(true)}
          />
        </View>

        <Text style={[styles.sectionTitle, darkText]}>{t('account.sectionHelp')}</Text>

        <View style={styles.rowList}>
          <AccountMenuRow
            label={t('account.contact')}
            icon={ChatIcon}
            onPress={() => setContactModalVisible(true)}
          />
          <AccountMenuRow label={t('account.terms')} icon={ArticleIcon} onPress={showPlaceholder} />
          <AccountMenuRow label={t('account.privacy')} icon={ArticleIcon} onPress={showPlaceholder} />
          <AccountMenuRow label={t('account.faq')} icon={HelpIcon} onPress={showPlaceholder} />
          <AccountMenuRow
            label={t('account.logout')}
            icon={IconLogOut}
            onPress={onLogout}
            variant="danger"
          />
        </View>
      </View>
    </ScrollView>

    <ShippingAddressModal
      visible={shippingModalVisible}
      defaultFullName={displayName}
      onClose={() => setShippingModalVisible(false)}
    />

    {/* El modal de borrado lo monta PreferencesModal adentro suyo: apilado acá como
        hermano, iOS no lo presentaba mientras Preferencias seguía abierto. */}
    <PreferencesModal
      visible={preferencesModalVisible}
      onClose={() => setPreferencesModalVisible(false)}
      onLogout={onLogout}
      onAccountDeleted={onLogout}
    />

    <NotificationsModal
      visible={notificationsModalVisible}
      onClose={() => setNotificationsModalVisible(false)}
    />

    <ChangePasswordModal
      visible={changePasswordVisible}
      userEmail={userEmail}
      onClose={() => setChangePasswordVisible(false)}
    />

    <ContactModal
      visible={contactModalVisible}
      onClose={() => setContactModalVisible(false)}
    />

    <WalletFlowDrawers wallet={wallet} defaultFullName={displayName} />
    </View>
  );
};

interface ProfileCardProps {
  profileImageUri?: string | null;
  displayName: string;
  subtitle: string;
  viewProfileLabel: string;
  onViewProfile: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profileImageUri,
  displayName,
  subtitle,
  viewProfileLabel,
  onViewProfile,
}) => {
  const gradientId = useId().replace(/:/g, '');
  const { isDark } = useTheme();
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  const onCardLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCardSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    }
  }, []);

  return (
    <View
      style={[
        styles.profileCard,
        isDark
          ? {
              backgroundColor: themeColors.dark.surface,
              borderColor: themeColors.dark.surfaceAlt,
            }
          : null,
      ]}
      onLayout={onCardLayout}
    >
      {cardSize.width > 0 && cardSize.height > 0 ? (
        <ProfileCardGradient
          gradientId={gradientId}
          width={cardSize.width}
          height={cardSize.height}
        />
      ) : null}
      {/* Figma 536:16102 — fila: col izq (flex-1) + botón; gap 12; items-center */}
      <View style={styles.profileRow}>
        <View style={styles.profileLeft}>
          <View style={styles.profileIdentity}>
            {profileImageUri ? (
              <View
                style={[
                  styles.avatarShell,
                  isDark ? { backgroundColor: themeColors.dark.surfaceAlt } : null,
                ]}
              >
                <Image source={{ uri: profileImageUri }} style={styles.avatarImage} resizeMode="cover" />
              </View>
            ) : (
              <View style={styles.avatarFallback}>
                <IconUser size={28} color="#02050F" strokeWidth={2.2} />
              </View>
            )}
            <View style={styles.nameBlock}>
              <RNText
                style={[
                  styles.displayName,
                  isDark ? { color: themeColors.dark.text } : null,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
              </RNText>
              <RNText
                style={[
                  styles.subtitle,
                  isDark ? { color: themeColors.dark.textSecondary } : null,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {subtitle}
              </RNText>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={onViewProfile}
          activeOpacity={0.85}
          style={styles.viewProfileBtn}
          accessibilityRole="button"
        >
          <RNText style={styles.viewProfileText}>{viewProfileLabel}</RNText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/** Coordenadas 0–1 para gradientUnits objectBoundingBox (ángulo CSS 80.35°). */
function profileGradientEnds() {
  const rad = ((80.35219111845896 - 90) * Math.PI) / 180;
  return {
    x1: 0.5 - 0.5 * Math.cos(rad),
    y1: 0.5 - 0.5 * Math.sin(rad),
    x2: 0.5 + 0.5 * Math.cos(rad),
    y2: 0.5 + 0.5 * Math.sin(rad),
  };
}

/**
 * Figma: linear-gradient(80.35deg, rgba(97,83,255,0.1) 71.32%, rgba(250,202,77,0.1) 100%)
 * Dimensiones explícitas: en Android % no cubre toda la tarjeta.
 */
const ProfileCardGradient: React.FC<{
  gradientId: string;
  width: number;
  height: number;
}> = ({ gradientId, width, height }) => {
  const { x1, y1, x2, y2 } = profileGradientEnds();

  return (
    <Svg
      pointerEvents="none"
      style={styles.profileGradientLayer}
      width={width}
      height={height}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient
          id={gradientId}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor={PROFILE_PURPLE} stopOpacity={0.1} />
          <Stop offset="0.7132" stopColor={PROFILE_PURPLE} stopOpacity={0.1} />
          <Stop offset="1" stopColor={PROFILE_GOLD} stopOpacity={0.1} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${gradientId})`} />
    </Svg>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: 24,
    paddingBottom: 24,
  },
  blocks: {
    gap: BLOCK_GAP,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    lineHeight: 28,
    color: '#27272A',
  },
  rowList: {
    gap: ROW_GAP,
  },
  profileCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBCEFF',
    paddingVertical: 24,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    ...CARD_SHADOW,
  },
  profileGradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  profileLeft: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
    minWidth: 0,
  },
  avatarShell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.402,
    borderColor: '#3F3F47',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.402,
    borderColor: '#3F3F47',
    backgroundColor: themeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    gap: 4,
    justifyContent: 'center',
  },
  displayName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 16,
    lineHeight: 20,
    color: '#18181B',
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 12,
    lineHeight: 20,
    color: '#18181B',
    includeFontPadding: false,
  },
  viewProfileBtn: {
    backgroundColor: '#685CF0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 1000,
    flexShrink: 0,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileText: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
