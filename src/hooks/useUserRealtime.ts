/**
 * WebSocket de usuario (`/ws/notifications`): entera a la app en el acto de que
 * llegó una notificación o un mensaje de chat.
 *
 * Sin esto los badges del header solo se actualizaban al montar la pantalla o al
 * volver del background: con la app abierta el usuario no se enteraba de nada
 * hasta entrar a Chat o a Notificaciones.
 *
 * El socket es uno solo por usuario y lo comparten los dos dominios (el backend
 * los distingue por el campo `type`), así que acá no hay que abrir dos
 * conexiones. Eventos del servidor:
 *   - `init`              → {unread_count}
 *   - `notification`      → notificación nueva
 *   - `notification_read` → cambió el estado de lectura (otro dispositivo)
 *   - `chat_message`      → mensaje nuevo (también llega a los otros dispositivos
 *                           del remitente, por eso hay que filtrar por sender)
 *   - `chat_read`         → la contraparte leyó la conversación
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { PLATFORM_WS_URL } from '../api/config';
import { storage } from '../utils/storage';

/** Notificación tal como la manda el backend (`NotificationItem`). */
export interface UserRealtimeNotification {
  uuid: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  actor_user_id?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  created_at?: number;
  data?: Record<string, unknown> | null;
}

/** Mensaje de chat (payload neutro: el cliente deriva si es propio). */
export interface UserRealtimeChatMessage {
  uuid: string;
  conversation_id: string;
  sender_user_id: string;
  body?: string | null;
  image_urls?: string[];
  created_at?: number;
}

export interface UserRealtimeChatRead {
  conversation_id: string;
  user_id: string;
  last_read_at: number;
}

interface UseUserRealtimeOptions {
  enabled?: boolean;
  onNotification?: (notification: UserRealtimeNotification) => void;
  /** Cambió el estado de lectura de una notificación (sync entre dispositivos). */
  onNotificationRead?: () => void;
  onChatMessage?: (message: UserRealtimeChatMessage) => void;
  onChatRead?: (read: UserRealtimeChatRead) => void;
}

/** Keep-alive: el backend responde `pong`. Evita que un proxy corte el socket. */
const PING_INTERVAL_MS = 25_000;
/**
 * Backoff de reconexión. A diferencia del WS de la sala (reintento fijo de 3s),
 * este socket vive toda la sesión: si el backend está caído, reintentar cada 3s
 * durante horas gasta batería sin ganar nada.
 */
const RECONNECT_BASE_MS = 3_000;
const RECONNECT_MAX_MS = 30_000;

export function useUserRealtime({
  enabled = true,
  onNotification,
  onNotificationRead,
  onChatMessage,
  onChatRead,
}: UseUserRealtimeOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  /** Contador que manda el `init`: la fuente de verdad al (re)conectar. */
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  // Los handlers viven en refs: así cambiarlos no reabre la conexión.
  const handlersRef = useRef({
    onNotification,
    onNotificationRead,
    onChatMessage,
    onChatRead,
  });
  useEffect(() => {
    handlersRef.current = {
      onNotification,
      onNotificationRead,
      onChatMessage,
      onChatRead,
    };
  }, [onNotification, onNotificationRead, onChatMessage, onChatRead]);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      setUnreadCount(null);
      return;
    }

    let destroyed = false;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const clearReconnect = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    const clearPing = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (destroyed) return;
      clearReconnect();
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * 2 ** Math.min(attemptRef.current, 4)
      );
      attemptRef.current += 1;
      reconnectTimer.current = setTimeout(() => {
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (destroyed) return;
      // Ya hay un socket vivo o negociando: no abrir otro.
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }
      // El token se relee en cada intento: pudo refrescarse desde el último.
      const token = await storage.getAccessToken();
      if (destroyed) return;
      if (!token) {
        scheduleReconnect();
        return;
      }

      const url = `${PLATFORM_WS_URL}/ws/notifications?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyed) return;
        attemptRef.current = 0;
        setIsConnected(true);
        clearPing();
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        clearPing();
        if (destroyed) return;
        setIsConnected(false);
        scheduleReconnect();
      };

      // `onerror` no cierra por sí solo en todas las plataformas: el close
      // posterior es el que dispara la reconexión.
      ws.onerror = () => {
        if (!destroyed) setIsConnected(false);
      };

      ws.onmessage = (event) => {
        if (destroyed) return;
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        const payload = msg?.payload ?? {};
        switch (msg?.type) {
          case 'init':
            if (typeof payload.unread_count === 'number') {
              setUnreadCount(payload.unread_count);
            }
            return;
          case 'notification':
            handlersRef.current.onNotification?.(payload as UserRealtimeNotification);
            return;
          case 'notification_read':
            handlersRef.current.onNotificationRead?.();
            return;
          case 'chat_message':
            handlersRef.current.onChatMessage?.(payload as UserRealtimeChatMessage);
            return;
          case 'chat_read':
            handlersRef.current.onChatRead?.(payload as UserRealtimeChatRead);
            return;
          default:
        }
      };
    };

    void connect();

    // Al volver del background el socket suele venir muerto: se reconecta ya
    // (sin esperar el backoff) para que los badges queden al día enseguida.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || destroyed) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      attemptRef.current = 0;
      clearReconnect();
      void connect();
    });

    return () => {
      destroyed = true;
      sub.remove();
      clearReconnect();
      clearPing();
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [enabled]);

  /** Fuerza un intento inmediato (p. ej. tras loguearse). */
  const reconnect = useCallback(() => {
    attemptRef.current = 0;
    wsRef.current?.close();
  }, []);

  return { isConnected, unreadCount, reconnect };
}
