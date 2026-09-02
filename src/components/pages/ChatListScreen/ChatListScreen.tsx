/**
 * Chats — lista de conversaciones 1 a 1 (Figma 636-29320).
 *
 * Se abre desde el ícono de mensajes del header; el header de Home queda visible
 * (así lo muestra el diseño) y esta pantalla pone su fila "< Chats" + buscador.
 *
 * Buscador híbrido: el nombre de la contraparte se filtra acá (los peers ya
 * vienen resueltos en la lista) y el contenido de los mensajes lo busca el
 * backend (`GET /conversations?q=`, con debounce); se muestran ambos resultados
 * sin duplicar. Tocar un chat abre ConversationModal (overlay glass).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Text as RNText,
} from 'react-native';
import { AppTextInput } from '../../atoms/AppTextInput';
import { KeyboardDismissScrollView } from '../../atoms/KeyboardDismissScrollView';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react-native';
import { IconChevronLeft, IconSearch } from '../../icons';
import { ConversationModal } from '../../organisms/chat/ConversationModal';
import { getConversations, type ConversationItem } from '../../../api/platformApi';
import { storage } from '../../../utils/storage';
import { FONT_FAMILY } from '../../../theme/typography';
import { themeColors } from '../../../theme/colors';
import { useTheme } from '../../../context/ThemeContext';

const PRIMARY = themeColors.primary;
const TEXT = '#18181B';
const MUTED = '#6B7280';
const SEARCH_DEBOUNCE_MS = 400;

export interface ChatListScreenProps {
  onBack: () => void;
  /** Sincroniza el contador del badge del header (chats con no leídos). */
  onUnreadConversationsChange: (count: number) => void;
  /** Si viene de un push / heads-up, abre este hilo al cargar. */
  initialConversationId?: string;
}

const countUnread = (items: ConversationItem[]) =>
  items.filter((it) => it.unread_count > 0).length;

/** Círculo con foto o inicial del nombre (fallback del diseño). */
const ChatAvatar: React.FC<{ item: ConversationItem; isDark: boolean }> = ({ item, isDark }) => {
  const name = item.peer?.name?.trim() || '';
  const uri = item.peer?.profile_picture;
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }
  return (
    <View
      style={[
        styles.avatar,
        styles.avatarFallback,
        isDark ? { backgroundColor: themeColors.dark.surfaceAlt } : null,
      ]}
    >
      <RNText style={styles.avatarInitial}>{name.charAt(0).toUpperCase() || '?'}</RNText>
    </View>
  );
};

export const ChatListScreen: React.FC<ChatListScreenProps> = ({
  onBack,
  onUnreadConversationsChange,
  initialConversationId,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const d = themeColors.dark;

  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  /** Resultados del backend para la query actual (null = sin búsqueda activa). */
  const [contentMatches, setContentMatches] = useState<ConversationItem[] | null>(null);
  const [openConversation, setOpenConversation] = useState<ConversationItem | null>(null);
  const searchSeqRef = useRef(0);
  const autoOpenedRef = useRef<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      asRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const token = await storage.getAccessToken();
        if (!token) return;
        const data = await getConversations(token, { limit: 100 });
        setItems(data.items);
        onUnreadConversationsChange(countUnread(data.items));
      } catch {
        // Sin red: se conserva lo cargado.
      } finally {
        asRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [onUnreadConversationsChange]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!initialConversationId || items.length === 0) return;
    if (autoOpenedRef.current === initialConversationId) return;
    const match = items.find((it) => it.uuid === initialConversationId);
    if (match) {
      autoOpenedRef.current = initialConversationId;
      setOpenConversation(match);
    }
  }, [initialConversationId, items]);

  // Búsqueda por contenido en el server, con debounce y descarte de respuestas viejas.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setContentMatches(null);
      return;
    }
    const seq = ++searchSeqRef.current;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const token = await storage.getAccessToken();
          if (!token) return;
          const data = await getConversations(token, { limit: 100, q });
          if (searchSeqRef.current === seq) setContentMatches(data.items);
        } catch {
          if (searchSeqRef.current === seq) setContentMatches([]);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const byName = items.filter((it) => (it.peer?.name ?? '').toLowerCase().includes(q));
    const seen = new Set(byName.map((it) => it.uuid));
    const byContent = (contentMatches ?? []).filter((it) => !seen.has(it.uuid));
    return [...byName, ...byContent].sort(
      (a, b) => (b.last_message_at ?? b.created_at) - (a.last_message_at ?? a.created_at)
    );
  }, [items, contentMatches, query]);

  /** La conversación abierta quedó leída: apaga su punto y baja el badge. */
  const handleRead = useCallback(
    (conversationId: string) => {
      setItems((prev) => {
        const next = prev.map((it) =>
          it.uuid === conversationId && it.unread_count > 0 ? { ...it, unread_count: 0 } : it
        );
        onUnreadConversationsChange(countUnread(next));
        return next;
      });
    },
    [onUnreadConversationsChange]
  );

  const darkText = isDark ? { color: d.text } : null;
  const darkMuted = isDark ? { color: d.textSecondary } : null;

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <IconChevronLeft size={24} color={PRIMARY} />
        </TouchableOpacity>
        <RNText style={[styles.title, darkText]}>{t('chat.title')}</RNText>
      </View>

      <View style={[styles.searchBox, isDark ? { backgroundColor: d.surface } : null]}>
        <AppTextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('chat.searchPlaceholder')}
          placeholderTextColor={isDark ? d.textSecondary : '#8B85D8'}
          style={[styles.searchInput, darkText]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <IconSearch size={20} color={PRIMARY} strokeWidth={2} />
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={PRIMARY} style={styles.loader} />
      ) : visibleItems.length === 0 ? (
        <View style={styles.empty}>
          <MessageCircle size={44} color={isDark ? d.textSecondary : MUTED} strokeWidth={1.5} />
          <RNText style={[styles.emptyTitle, darkMuted]}>
            {query.trim() ? t('chat.emptySearch', { query: query.trim() }) : t('chat.empty')}
          </RNText>
        </View>
      ) : (
        <KeyboardDismissScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
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
          {visibleItems.map((item) => (
            <TouchableOpacity
              key={item.uuid}
              style={styles.row}
              onPress={() => setOpenConversation(item)}
              activeOpacity={0.8}
            >
              <ChatAvatar item={item} isDark={isDark} />
              <View style={styles.rowBody}>
                <RNText style={[styles.rowName, darkText]} numberOfLines={1}>
                  {item.peer?.name?.trim() || t('activity.unknownUser')}
                </RNText>
                {item.last_message ? (
                  <RNText style={[styles.rowPreview, darkMuted]} numberOfLines={1}>
                    {item.last_message}
                  </RNText>
                ) : null}
              </View>
              {item.unread_count > 0 ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          ))}
        </KeyboardDismissScrollView>
      )}

      {openConversation ? (
        <ConversationModal
          conversation={openConversation}
          onClose={() => {
            setOpenConversation(null);
            // El hilo pudo sumar mensajes: refresca previews y orden.
            void load(true);
          }}
          onRead={handleRead}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 22,
    lineHeight: 28,
    color: TEXT,
    includeFontPadding: false,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    height: 52,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 1000,
    paddingLeft: 20,
    paddingRight: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: TEXT,
    padding: 0,
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
    paddingTop: 8,
    paddingBottom: 24,
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7E7FF',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    color: PRIMARY,
    includeFontPadding: false,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowName: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: TEXT,
    includeFontPadding: false,
  },
  rowPreview: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 17,
    color: MUTED,
    includeFontPadding: false,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
});
