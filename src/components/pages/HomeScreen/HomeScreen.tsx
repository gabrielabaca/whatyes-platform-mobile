/**
 * Home Screen — feed de lives en Inicio (comprador y vendedor); hub vendedor en FAB.
 * Navegación interna: home | explore | category | sellerHub | account | profile.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { GeneralLayout } from '../../templates/GeneralLayout';
import { Text } from '../../atoms/Text';
import { StreamData } from '../../molecules/StreamCard';
import { BuyerExploreScreen } from '../BuyerExploreScreen';
import { BuyerCategoryStreamsScreen } from '../BuyerCategoryStreamsScreen';
import { BuyerAccountScreen } from '../BuyerAccountScreen';
import { UserProfileScreen } from '../UserProfileScreen';
import { BuyerKycModal } from '../../organisms/account/BuyerKycModal';
import {
  getMySalesSummary,
  getStreamWatch,
  getUserShows,
  type PurchaseItem,
  type UserShowItem,
} from '../../../api/platformApi';
import {
  setIvsPreviewAudioMuted,
  startIvsStagePreview,
  stopIvsStagePreview,
} from '../../../native/IvsStageNative';
import { LivePeekOverlay } from '../../organisms/home/LivePeekOverlay';
import { ActivityScreen } from '../ActivityScreen/ActivityScreen';
import { PurchaseDetailScreen } from '../PurchaseDetailScreen/PurchaseDetailScreen';
import { getUserPublicProfile } from '../../../api/profileApi';
import { getSellerOnboardingStatus } from '../../../api/sellerOnboardingApi';
import { storage } from '../../../utils/storage';
import { useAuth } from '../../../hooks/useAuth';
import { useBottomNavController } from '../../../context/BottomNavContext';
import { useInterestCategories } from '../../../hooks/useInterestCategories';
import { useBuyerLiveRoomPreviews } from '../../../hooks/useBuyerLiveRoomPreviews';
import { useChatUnread } from '../../../hooks/useChatUnread';
import { useStartChat } from '../../../hooks/useStartChat';
import { ConversationModal } from '../../organisms/chat/ConversationModal';
import { useNotificationsUnread } from '../../../hooks/useNotificationsUnread';
import {
  useUserRealtime,
  type UserRealtimeChatMessage,
  type UserRealtimeNotification,
} from '../../../hooks/useUserRealtime';
import {
  AppHeadsUp,
  useAppHeadsUp,
  type AppHeadsUpMessage,
} from '../../molecules/AppHeadsUp';
import { NotificationsScreen } from '../NotificationsScreen/NotificationsScreen';
import { ChatListScreen } from '../ChatListScreen/ChatListScreen';
import { previewToStreamData } from '../../../utils/streamPreviewToStreamData';
import { themeColors } from '../../../theme/colors';
import type { UserMe } from '../../../api/types';
import type { InterestCategoryItem } from '../../../api/types';
import {
  HomeHeader,
  CategoryExplorerRow,
  SectionHeader,
  BuyerLiveStreamsGrid,
  SellerHomeDashboard,
  ALL_CATEGORIES_ID,
  type LiveStreamPreviewModel,
  type HomeBottomTab,
} from '../../organisms/home';
import { AddProductScreen } from '../AddProductScreen';

interface HomeScreenProps {
  onStreamPress?: (stream: StreamData | any) => void;
  /**
   * Llamado cuando el usuario toca un stream del grid; recibe la lista completa,
   * el índice tocado y la categoría activa (para que el feed de swipe siga el mismo filtro).
   */
  onStreamsSwipePress?: (
    streams: StreamData[],
    index: number,
    categoryUuid?: string
  ) => void;
  onStartNewStream?: () => void;
}

const GRID_GAP = 12;

// El hint de "mantener presionado" se muestra hasta el primer uso del gesto en
// esta sesión de app (vive en el módulo: se resetea al reiniciar la app).
let peekHintUsedThisSession = false;

type HomePath =
  | { name: 'home' }
  | { name: 'explore' }
  | { name: 'category'; category: InterestCategoryItem }
  | { name: 'sellerHub' }
  | { name: 'account' }
  | { name: 'activity'; initialTab?: 'purchases' | 'sales' }
  | { name: 'purchaseDetail'; purchase: PurchaseItem; returnTab?: 'purchases' | 'sales' }
  | { name: 'profile'; userId?: string; returnTo?: 'account' | 'activity' | 'notifications' }
  | { name: 'addProduct'; returnTo?: 'home' | 'sellerHub' }
  /** returnTo: la campana está en varias pantallas; volver regresa a la de origen. */
  | { name: 'notifications'; returnTo: HomePath }
  /** Lista de chats (el ícono de mensajes, visible en las mismas pantallas). */
  | { name: 'chat'; returnTo: HomePath };

/** Debe renderizarse dentro de GeneralLayout (BottomNavProvider). */
const HomeNavBridge: React.FC<{
  activeTab: HomeBottomTab;
  onTabPress: (tab: HomeBottomTab) => void;
  children: React.ReactNode;
}> = ({ activeTab, onTabPress, children }) => {
  useBottomNavController(activeTab, onTabPress);
  return <>{children}</>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStreamPress,
  onStreamsSwipePress,
  onStartNewStream,
}) => {
  const { t } = useTranslation();
  const { user, logout, reloadUser } = useAuth();
  const isSeller = user?.user_type === 'seller_user';
  const isBuyer = user?.user_type === 'buyer_user';

  const { categories, loadOnce } = useInterestCategories();
  const hasHomeTabs = isBuyer || isSeller;
  const { previews, loading, refreshing, onRefresh } = useBuyerLiveRoomPreviews({
    pollIntervalMs: 15000,
    enabled: hasHomeTabs,
  });
  const {
    unreadConversations,
    setUnreadConversations,
    reload: reloadChatUnread,
  } = useChatUnread(hasHomeTabs);
  const { conversation: directChat, startChat, closeChat } = useStartChat();
  const {
    unreadNotifications,
    setUnreadNotifications,
    reload: reloadNotificationsUnread,
  } = useNotificationsUnread(hasHomeTabs);
  const { headsUp, showHeadsUp, dismissHeadsUp } = useAppHeadsUp();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES_ID);
  const [bottomTab, setBottomTab] = useState<HomeBottomTab>('home');
  const [homePath, setHomePath] = useState<HomePath>({ name: 'home' });
  const [soldCount, setSoldCount] = useState(0);
  const [salesTotalCents, setSalesTotalCents] = useState(0);
  const [pastLives, setPastLives] = useState<UserShowItem[]>([]);
  const [showFirstLiveCta, setShowFirstLiveCta] = useState(true);
  const [kycVisible, setKycVisible] = useState(false);

  useEffect(() => {
    if (isBuyer || isSeller) {
      loadOnce().catch(() => {});
    }
  }, [isBuyer, isSeller, loadOnce]);

  // --- Tiempo real de mensajes y notificaciones -----------------------------
  // El WS solo avisa QUÉ pasó; los contadores los vuelve a pedir al backend, que
  // es el que sabe calcularlos: `unreadConversations` cuenta conversaciones (no
  // mensajes), y el evento `chat_message` también llega a los otros dispositivos
  // del remitente. Sumar de a uno en el cliente daría un número equivocado.

  /** El aviso sobra si el usuario ya está mirando esa misma conversación. */
  const isReadingConversation = useCallback(
    (conversationId: string) => directChat?.uuid === conversationId,
    [directChat?.uuid]
  );

  const handleRealtimeNotification = useCallback(
    (notification: UserRealtimeNotification) => {
      void reloadNotificationsUnread();
      if (notification.type === 'new_message') {
        // El chat se anuncia por `chat_message`, que llega siempre (la
        // notificación de mensajes se reusa por conversación y solo se emite la
        // primera vez). Acá alcanza con refrescar el badge para no duplicar.
        void reloadChatUnread();
        return;
      }
      showHeadsUp(
        'notification',
        notification.title?.trim() || t('notifications.defaultTitle'),
        notification.body
      );
    },
    [reloadNotificationsUnread, reloadChatUnread, showHeadsUp, t]
  );

  const handleRealtimeChatMessage = useCallback(
    (message: UserRealtimeChatMessage) => {
      // Solo el badge de chats: la notificación de mensajes se crea una vez por
      // conversación (y ahí llega por `notification`), así que los mensajes
      // siguientes no mueven el contador de la campana.
      void reloadChatUnread();
      // Mensaje propio replicado a mis otros dispositivos: refresca, no avisa.
      if (!message.sender_user_id || message.sender_user_id === user?.uuid) return;
      if (isReadingConversation(message.conversation_id)) return;
      const preview = message.body?.trim()
        ? message.body.trim()
        : message.image_urls?.length
          ? t('chat.photoPreview')
          : '';
      showHeadsUp('chat', t('chat.newMessageTitle'), preview);
    },
    [reloadChatUnread, user?.uuid, isReadingConversation, showHeadsUp, t]
  );

  /** La contraparte leyó, o leí desde otro dispositivo: el badge puede bajar. */
  const handleRealtimeRead = useCallback(() => {
    void reloadChatUnread();
    void reloadNotificationsUnread();
  }, [reloadChatUnread, reloadNotificationsUnread]);

  useUserRealtime({
    enabled: hasHomeTabs,
    onNotification: handleRealtimeNotification,
    onNotificationRead: handleRealtimeRead,
    onChatMessage: handleRealtimeChatMessage,
    onChatRead: handleRealtimeRead,
  });

  const openHeadsUpTarget = useCallback((message: AppHeadsUpMessage) => {
    dismissHeadsUp();
    const target: HomePath['name'] = message.kind === 'chat' ? 'chat' : 'notifications';
    setHomePath((prev) => (prev.name === target ? prev : { name: target, returnTo: prev }));
  }, [dismissHeadsUp]);
  // --- fin tiempo real ------------------------------------------------------

  // Datos del hub del vendedor (Figma 636-30524): total de ventas para la card
  // de pagos, cantidad de vendidos y lives pasados. Se recarga al entrar al hub
  // (homePath) para reflejar ventas de un vivo recién terminado.
  const isSellerHubOpen = isSeller && homePath.name === 'sellerHub';
  useEffect(() => {
    if (!isSeller || !user?.uuid) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [profile, onboarding] = await Promise.all([
          getUserPublicProfile(user.uuid),
          getSellerOnboardingStatus(),
        ]);
        if (cancelled) {
          return;
        }
        setSoldCount(profile.sold_count ?? 0);
        setShowFirstLiveCta(onboarding.is_first_live_auction !== false);
      } catch {
        if (!cancelled) {
          setSoldCount(0);
          setShowFirstLiveCta(true);
        }
      }
      try {
        const token = await storage.getAccessToken();
        if (!token || cancelled) return;
        const [summary, endedShows] = await Promise.all([
          getMySalesSummary(token).catch(() => null),
          getUserShows(token, user.uuid, { status: 'ended', limit: 20 }).catch(
            () => [] as UserShowItem[]
          ),
        ]);
        if (cancelled) return;
        if (summary) {
          // La tabla de ventas es la fuente real: pisa el sold_count estático del perfil.
          setSoldCount(summary.sold_count);
          setSalesTotalCents(summary.total_amount_cents);
        }
        setPastLives(endedShows);
      } catch {
        // Sin red: se mantienen los valores previos.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSeller, user?.uuid, isSellerHubOpen]);

  const filteredPreviews = useMemo(() => {
    if (selectedCategoryId === ALL_CATEGORIES_ID) {
      return previews;
    }
    return previews.filter((p) =>
      (p.interestCategories ?? []).some((c) => c.uuid === selectedCategoryId)
    );
  }, [previews, selectedCategoryId]);

  const profileImageUri =
    (user as UserMe | null)?.profile_picture ?? user?.profile?.picture ?? null;

  const toStreamData = (p: LiveStreamPreviewModel): StreamData =>
    previewToStreamData(p, t('home.liveBadge'));

  // Peek del vivo (mantener presionada la card): overlay con la miniatura al
  // instante y el video real del stage precalentado ~1 s después, con audio.
  // Queda abierto; se cierra con la X, el fondo o el back de Android.
  const [peekStream, setPeekStream] = useState<LiveStreamPreviewModel | null>(null);
  const peekGenRef = useRef(0);
  // El hint del gesto se muestra hasta que el usuario lo usa una vez; vuelve a
  // aparecer al reiniciar la app (flag por sesión, no persistido).
  const [peekHintUsed, setPeekHintUsed] = useState(peekHintUsedThisSession);

  const handleStreamPeek = (p: LiveStreamPreviewModel) => {
    if (!peekHintUsedThisSession) {
      peekHintUsedThisSession = true;
      setPeekHintUsed(true);
    }
    const generation = ++peekGenRef.current;
    setPeekStream(p);
    void (async () => {
      try {
        const token = await storage.getAccessToken();
        if (!token || peekGenRef.current !== generation) return;
        const watch = await getStreamWatch(token, p.id);
        if (peekGenRef.current !== generation) return;
        if (watch.transport === 'ivs' && watch.ivs?.token) {
          await startIvsStagePreview(watch.ivs.token);
          if (peekGenRef.current === generation) {
            await setIvsPreviewAudioMuted(false);
          } else {
            await setIvsPreviewAudioMuted(true);
            await stopIvsStagePreview();
          }
        }
      } catch {
        // Sin video: el peek muestra la miniatura viva igual.
      }
    })();
  };

  const handleClosePeek = () => {
    peekGenRef.current += 1; // invalida cualquier arranque de peek en vuelo
    setPeekStream(null);
    void setIvsPreviewAudioMuted(true);
    void stopIvsStagePreview();
  };

  const handleStreamPress = (p: LiveStreamPreviewModel) => {
    if (onStreamsSwipePress) {
      const allStreams = filteredPreviews.map(toStreamData);
      const index = filteredPreviews.indexOf(p);
      const categoryUuid =
        selectedCategoryId === ALL_CATEGORIES_ID ? undefined : selectedCategoryId;
      onStreamsSwipePress(allStreams, Math.max(0, index), categoryUuid);
      return;
    }
    if (onStreamPress) {
      onStreamPress(toStreamData(p));
    }
  };

  const handleProfileShowPress = (show: UserShowItem) => {
    if (show.status !== 'live' || !onStreamPress) {
      return;
    }
    const seller = show.creator;
    onStreamPress({
      id: show.room_uuid,
      sellerName: seller ? `${seller.name} ${seller.last_name}`.trim() : t('home.defaultRoomName'),
      viewerCount: show.viewer_count ?? 0,
      streamingTime: t('home.liveBadge'),
      thumbnail: show.thumbnail_url ?? undefined,
      title: show.name ?? undefined,
      sellerAvatarUrl: seller?.profile_picture ?? null,
      sellerUserId: seller?.uuid,
      productImageUrl: show.thumbnail_url ?? undefined,
      productCount: 1,
    });
  };

  const handleBottomTab = useCallback(
    (tab: HomeBottomTab) => {
      setBottomTab(tab);
      if (tab === 'home') {
        setHomePath({ name: 'home' });
        return;
      }
      if (tab === 'explore') {
        setHomePath({ name: 'explore' });
        return;
      }
      if (tab === 'account') {
        // Tab "Cuenta": abre el menú de cuenta (el que antes desplegaba el botón
        // de perfil del header); el perfil del usuario se entra desde "Ver perfil".
        setHomePath({ name: 'account' });
        return;
      }
      if (tab === 'create') {
        setHomePath({ name: 'sellerHub' });
        return;
      }
      if (tab === 'activity') {
        setHomePath({ name: 'activity' });
      }
    },
    // Solo setters de estado (estables): la navegación por tab no depende de nada más.
    []
  );

  if (!user) {
    return null;
  }

  if (!isBuyer && !isSeller) {
    return (
      <View className="flex-1 bg-white dark:bg-night-950 p-6">
        <Text variant="h1" className="text-primary-600 mb-2">
          {t('home.welcome')}
        </Text>
        <Text variant="body" className="text-gray-600">
          {user.name} {user.last_name}
        </Text>
      </View>
    );
  }

  const selectedCategoryLabel =
    selectedCategoryId === ALL_CATEGORIES_ID
      ? null
      : categories.find((c) => c.uuid === selectedCategoryId)?.label ?? null;

  const previewWithCategory = (p: LiveStreamPreviewModel): LiveStreamPreviewModel => {
    if (p.interestCategories && p.interestCategories.length > 0) {
      return p;
    }
    if (!selectedCategoryLabel) {
      return { ...p, categoryLabel: p.categoryLabel };
    }
    return { ...p, categoryLabel: selectedCategoryLabel };
  };

  const bottomNavActiveTab: HomeBottomTab =
    homePath.name === 'sellerHub' || homePath.name === 'addProduct'
      ? 'create'
      : homePath.name === 'category'
        ? 'explore'
        : homePath.name === 'activity' || homePath.name === 'purchaseDetail'
          ? 'activity'
          : homePath.name === 'account' || homePath.name === 'profile'
            ? 'account'
            : bottomTab;

  const isSellerDashboard = isSeller && homePath.name === 'sellerHub';

  const showHomeHeader =
    homePath.name === 'home' ||
    homePath.name === 'explore' ||
    homePath.name === 'category' ||
    homePath.name === 'sellerHub' ||
    homePath.name === 'activity' ||
    homePath.name === 'account' ||
    homePath.name === 'addProduct' ||
    homePath.name === 'chat';

  const paymentsAmount = t('sellerHome.paymentsAmount', {
    amount: new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(
      Math.round(salesTotalCents / 100)
    ),
  });

  return (
    <GeneralLayout hideChrome menuOptions={[]} containerStyle={styles.homeRoot}>
      <HomeNavBridge activeTab={bottomNavActiveTab} onTabPress={handleBottomTab}>
        <View style={styles.homeRoot}>
          {/* Aviso de mensaje / notificación en tiempo real: se toca para ir al
              lugar correspondiente y se va solo. */}
          <AppHeadsUp
            message={headsUp}
            onPress={openHeadsUpTarget}
            onDismiss={dismissHeadsUp}
          />

          {showHomeHeader ? (
            <HomeHeader
              onPressNotifications={() =>
                setHomePath((prev) =>
                  prev.name === 'notifications' ? prev : { name: 'notifications', returnTo: prev }
                )
              }
              onPressChat={() =>
                setHomePath((prev) =>
                  prev.name === 'chat' ? prev : { name: 'chat', returnTo: prev }
                )
              }
              hasNotificationDot={unreadNotifications > 0}
              chatUnreadCount={unreadConversations}
            />
          ) : null}

          {isSellerDashboard ? (
            <SellerHomeDashboard
              paymentsAmount={paymentsAmount}
              soldCount={soldCount}
              showVerifyBanner={!(user as UserMe).identity_kyc_verified}
              showFirstLiveCta={showFirstLiveCta}
              onPressVerify={() => setKycVisible(true)}
              onPressSold={() =>
                setHomePath({ name: 'activity', initialTab: 'sales' })
              }
              onPressGoLive={() => onStartNewStream?.()}
              onPressAddProduct={() => setHomePath({ name: 'addProduct', returnTo: 'sellerHub' })}
              onPressFirstLiveCta={() => onStartNewStream?.()}
              pastLives={pastLives}
              onPressPastLive={handleProfileShowPress}
            />
          ) : null}

          {isSeller && homePath.name === 'addProduct' ? (
            <AddProductScreen
              onCancel={() => {
                if (homePath.returnTo === 'sellerHub') {
                  setHomePath({ name: 'sellerHub' });
                } else {
                  setHomePath({ name: 'home' });
                }
              }}
              onSaved={() => {
                if (homePath.returnTo === 'sellerHub') {
                  setHomePath({ name: 'sellerHub' });
                } else {
                  setHomePath({ name: 'home' });
                }
              }}
            />
          ) : null}

          {homePath.name === 'home' ? (
            <ScrollView
              className="flex-1"
              nestedScrollEnabled
              contentContainerStyle={{
                // flexGrow permite que la card del estado vacío llene el alto libre.
                flexGrow: 1,
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 24,
              }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={themeColors.primary}
                  colors={[themeColors.primary]}
                />
              }
            >
              <CategoryExplorerRow
                title={t('home.exploreCategories')}
                categories={categories}
                selectedId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
              />

              <View className="h-8" />

              <BuyerLiveStreamsGrid
                previews={filteredPreviews}
                loading={loading}
                onStreamPress={handleStreamPress}
                onStreamLongPress={handleStreamPeek}
                peekHintFirstCard={!peekHintUsed}
                emptyLabel={t('home.noLiveStreams')}
                emptySubtitle={t('home.noLiveStreamsSubtitle')}
                gap={GRID_GAP}
                previewWithCategory={previewWithCategory}
                sectionHeader={
                  !loading ? <SectionHeader title={t('home.forYou')} /> : undefined
                }
              />
            </ScrollView>
          ) : null}

          {homePath.name === 'explore' ? (
            <BuyerExploreScreen
              onSelectCategory={(c) => setHomePath({ name: 'category', category: c })}
            />
          ) : null}

          {homePath.name === 'category' ? (
            <BuyerCategoryStreamsScreen
              category={homePath.category}
              onBack={() => setHomePath({ name: 'explore' })}
              onStreamPress={handleStreamPress}
            />
          ) : null}

          {homePath.name === 'activity' ? (
            <ActivityScreen
              isSeller={isSeller}
              initialTab={homePath.initialTab}
              onOpenPurchase={(purchase, tab) =>
                setHomePath({ name: 'purchaseDetail', purchase, returnTab: tab })
              }
            />
          ) : null}

          {homePath.name === 'purchaseDetail' ? (
            <PurchaseDetailScreen
              purchase={homePath.purchase}
              onBack={() => setHomePath({ name: 'activity', initialTab: homePath.returnTab })}
              onOpenSellerProfile={(sellerUserId) =>
                setHomePath({ name: 'profile', userId: sellerUserId, returnTo: 'activity' })
              }
              onStartChat={(peerUserId) => {
                void startChat(peerUserId);
              }}
            />
          ) : null}

          {homePath.name === 'account' ? (
            <BuyerAccountScreen
              profileImageUri={profileImageUri}
              displayName={`${user.name ?? ''} ${user.last_name ?? ''}`.trim() || user.username}
              subtitle={user.customer?.name ?? user.email}
              userEmail={user.email}
              onViewProfile={() => setHomePath({ name: 'profile' })}
              onLogout={() => {
                logout().catch(() => {});
              }}
            />
          ) : null}

          {homePath.name === 'chat' ? (
            <ChatListScreen
              onBack={() => setHomePath(homePath.returnTo)}
              onUnreadConversationsChange={setUnreadConversations}
            />
          ) : null}

          {homePath.name === 'notifications' ? (
            <NotificationsScreen
              onBack={() => setHomePath(homePath.returnTo)}
              onUnreadCountChange={setUnreadNotifications}
              onOpenProfile={(userId) =>
                setHomePath({ name: 'profile', userId, returnTo: 'notifications' })
              }
              onOpenPurchase={(purchase) => setHomePath({ name: 'purchaseDetail', purchase })}
              onOpenActivity={() => setHomePath({ name: 'activity' })}
            />
          ) : null}

          {homePath.name === 'profile' ? (
            <View className="flex-1 bg-white dark:bg-night-950">
              <UserProfileScreen
                userId={homePath.userId}
                onBack={() =>
                  setHomePath(
                    homePath.returnTo === 'activity'
                      ? { name: 'activity' }
                      : homePath.returnTo === 'notifications'
                        ? { name: 'notifications', returnTo: { name: 'home' } }
                        : { name: 'account' }
                  )
                }
                onShowPress={handleProfileShowPress}
                onStartChat={(peerUserId) => {
                  void startChat(peerUserId);
                }}
                onOpenChats={() =>
                  setHomePath((prev) => ({ name: 'chat', returnTo: prev }))
                }
              />
            </View>
          ) : null}

          <BuyerKycModal
            visible={kycVisible}
            onClose={() => setKycVisible(false)}
            onVerified={() => {
              setKycVisible(false);
              void reloadUser();
            }}
          />

          {/* Chat abierto desde perfil o detalle de compra/venta. */}
          {directChat ? (
            <ConversationModal
              conversation={directChat}
              onClose={() => {
                closeChat();
                // Abrir el hilo pudo marcarlo leído: refresca el badge del header.
                void reloadChatUnread();
              }}
            />
          ) : null}

          <LivePeekOverlay stream={peekStream} onClose={handleClosePeek} />
        </View>
      </HomeNavBridge>
    </GeneralLayout>
  );
};

const styles = StyleSheet.create({
  homeRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
