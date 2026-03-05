import { useCallback, useEffect, useRef, useState } from 'react';
import { PLATFORM_WS_URL } from '../api/config';

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

interface UseStreamChatOptions {
  roomId: string | null;
  accessToken: string | null;
  enabled?: boolean;
  onLike?: (like: LikeEvent) => void;
}

interface WsPayloadMessage {
  id?: string;
  uuid?: string;
  user_id?: string;
  username?: string;
  message?: string;
  created_at?: number;
}

interface LikeEvent {
  count?: number;
  userId?: string;
  username?: string;
}

const formatTimestamp = (createdAt?: number): string => {
  if (!createdAt) return 'ahora';
  const date = new Date(createdAt * 1000);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const toChatMessage = (msg: WsPayloadMessage): ChatMessage => {
  const id = msg.id || msg.uuid || `${msg.user_id || 'user'}-${msg.created_at || Date.now()}`;
  return {
    id,
    username: msg.username || 'Usuario',
    message: msg.message || '',
    timestamp: formatTimestamp(msg.created_at),
  };
};

export function useStreamChat({ roomId, accessToken, enabled = true, onLike }: UseStreamChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const send = useCallback((payload: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message) return;
      send({ type: 'chat', message });
    },
    [send]
  );

  const sendLike = useCallback(() => {
    send({ type: 'like' });
  }, [send]);

  useEffect(() => {
    if (!enabled || !roomId || !accessToken) return;
    setError(null);
    const wsUrl = `${PLATFORM_WS_URL}/ws/rooms/${roomId}?token=${encodeURIComponent(accessToken)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      wsRef.current = null;
      setIsConnected(false);
    };
    ws.onerror = () => setError('Error de conexión');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as any;
        if (msg.type === 'init' && msg.payload) {
          const list = Array.isArray(msg.payload.messages) ? msg.payload.messages : [];
          setMessages(list.map((item: WsPayloadMessage) => toChatMessage(item)));
          if (typeof msg.payload.viewer_count === 'number') {
            setViewerCount(msg.payload.viewer_count);
          }
          if (typeof msg.payload.likes_count === 'number') {
            setLikesCount(msg.payload.likes_count);
          }
          return;
        }
        if (msg.type === 'chat' && msg.payload) {
          setMessages(prev => [...prev, toChatMessage(msg.payload as WsPayloadMessage)]);
          return;
        }
        if (msg.type === 'viewers' && msg.payload && typeof msg.payload.count === 'number') {
          setViewerCount(msg.payload.count);
          return;
        }
        if (msg.type === 'like' && msg.payload) {
          if (typeof msg.payload.count === 'number') {
            setLikesCount(msg.payload.count);
          }
          if (onLike) {
            const user = msg.payload.user || {};
            onLike({
              count: msg.payload.count,
              userId: user.id || msg.payload.user_id,
              username: user.username || msg.payload.username,
            });
          }
        }
      } catch {
        setError('Mensaje inválido');
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [roomId, accessToken, enabled, onLike]);

  return {
    messages,
    viewerCount,
    likesCount,
    isConnected,
    error,
    sendChat,
    sendLike,
  };
}
