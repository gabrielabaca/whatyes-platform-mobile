/**
 * Punto rojo de la campana del header: notificaciones sin leer del usuario
 * (`GET /me/notifications/unread-count`). Mismo ciclo de vida que el badge de
 * mensajes (useChatUnread): consulta al montar y al volver del background.
 *
 * Expone el setter porque NotificationsScreen conoce el contador real en cada
 * respuesta (listar, leer una, leer todas) y así el punto se apaga al instante,
 * sin esperar el próximo refetch.
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getNotificationsUnreadCount } from '../api/platformApi';
import { storage } from '../utils/storage';

export function useNotificationsUnread(enabled = true) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        setUnreadNotifications(0);
        return;
      }
      const data = await getNotificationsUnreadCount(token);
      setUnreadNotifications(data.unread_count ?? 0);
    } catch {
      // Badge accesorio: si falla la consulta conserva el valor anterior.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnreadNotifications(0);
      return;
    }
    void reload();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reload();
    });
    return () => sub.remove();
  }, [enabled, reload]);

  return { unreadNotifications, setUnreadNotifications, reload };
}
