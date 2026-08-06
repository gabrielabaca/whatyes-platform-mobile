/**
 * Badge del ícono de mensajes del header: cuántas conversaciones tienen mensajes
 * nuevos (no cuántos mensajes). El número lo calcula el backend en
 * `GET /conversations/unread-count`, así el badge no depende de traer la lista.
 *
 * Se refresca al montar y cada vez que la app vuelve del background. Con la app
 * en primer plano lo mantiene al día `useUserRealtime` (WebSocket de usuario,
 * eventos `chat_message` / `chat_read`), que llama a `reload` en cada evento: el
 * contador siempre lo calcula el backend, así una conversación con varios
 * mensajes sin leer sigue contando una sola vez.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getConversationsUnreadCount } from '../api/platformApi';
import { storage } from '../utils/storage';

export function useChatUnread(enabled = true) {
  const [unreadConversations, setUnreadConversations] = useState(0);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setUnreadConversations(0);
        return;
      }
      const data = await getConversationsUnreadCount(token);
      setUnreadConversations(data.conversations_with_unread ?? 0);
    } catch {
      // El badge es accesorio: si falla la consulta se deja el valor anterior
      // en vez de parpadear a cero.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnreadConversations(0);
      return;
    }
    void reload();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reload();
    });
    return () => sub.remove();
  }, [enabled, reload]);

  // El setter lo usa la pantalla de chats, que conoce el contador real al listar
  // o al abrir una conversación: así el badge baja sin esperar el refetch.
  return { unreadConversations, setUnreadConversations, reload };
}
