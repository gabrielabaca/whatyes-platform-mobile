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

export interface AuctionState {
  id: string;
  durationSeconds: number;
  startedAt: number;
  endsAt: number;
}

export interface AuctionBid {
  id: string;
  username: string;
  amount: number;
  created_at: number;
}

export interface AuctionWinner {
  username: string;
  amount: number;
}

export function useStreamChat({ roomId, accessToken, enabled = true, onLike }: UseStreamChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [auctionBids, setAuctionBids] = useState<AuctionBid[]>([]);
  const [auctionWinner, setAuctionWinner] = useState<AuctionWinner | null>(null);
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

  const sendAuctionStart = useCallback(
    (durationSeconds: number) => {
      send({ type: 'auction_start', duration_seconds: durationSeconds });
    },
    [send]
  );

  const sendBid = useCallback(
    (amount: number) => {
      if (amount < 1) return;
      send({ type: 'auction_bid', amount });
    },
    [send]
  );

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
          const a = msg.payload.auction;
          if (a && a.id && typeof a.ends_at === 'number' && a.ends_at > Math.floor(Date.now() / 1000)) {
            setAuction({
              id: a.id,
              durationSeconds: a.duration_seconds ?? 10,
              startedAt: a.started_at ?? 0,
              endsAt: a.ends_at,
            });
            const bids = Array.isArray(a.bids) ? a.bids : [];
            setAuctionBids(bids.map((b: any) => ({
              id: b.id || `${b.username}-${b.created_at}`,
              username: b.username || 'Usuario',
              amount: b.amount ?? 0,
              created_at: b.created_at ?? 0,
            })));
          } else {
            setAuction(null);
            setAuctionBids([]);
          }
          return;
        }
        if (msg.type === 'auction_start' && msg.payload) {
          const a = msg.payload;
          if (a.id && typeof a.ends_at === 'number') {
            setAuction({
              id: a.id,
              durationSeconds: a.duration_seconds ?? 10,
              startedAt: a.started_at ?? 0,
              endsAt: a.ends_at,
            });
            setAuctionBids([]);
          }
          return;
        }
        if (msg.type === 'auction_end') {
          const winner = msg.payload?.winner;
          if (winner?.username) {
            setAuctionWinner({ username: winner.username, amount: winner.amount ?? 0 });
          }
          setAuction(null);
          setAuctionBids([]);
          return;
        }
        if (msg.type === 'auction_bid' && msg.payload) {
          const b = msg.payload;
          setAuctionBids(prev => [...prev, {
            id: b.id || `${b.username}-${b.created_at}`,
            username: b.username || 'Usuario',
            amount: b.amount ?? 0,
            created_at: b.created_at ?? 0,
          }]);
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

  const [auctionSecondsRemaining, setAuctionSecondsRemaining] = useState<number | null>(null);

  const now = Math.floor(Date.now() / 1000);
  const isAuctionActive = auction !== null && auction.endsAt > now;

  useEffect(() => {
    if (!auction || auction.endsAt <= Math.floor(Date.now() / 1000)) {
      setAuctionSecondsRemaining(null);
      return;
    }
    const update = () => {
      const n = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, auction.endsAt - n);
      setAuctionSecondsRemaining(remaining);
      if (remaining <= 0) setAuction(null);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [auction?.id, auction?.endsAt]);

  useEffect(() => {
    if (!auction || auction.endsAt <= now) return;
    const delay = (auction.endsAt - now) * 1000 + 500;
    const t = setTimeout(() => setAuction(null), delay);
    return () => clearTimeout(t);
  }, [auction?.id, auction?.endsAt]);

  useEffect(() => {
    if (!auctionWinner) return;
    const t = setTimeout(() => setAuctionWinner(null), 5000);
    return () => clearTimeout(t);
  }, [auctionWinner]);

  return {
    messages,
    viewerCount,
    likesCount,
    isConnected,
    error,
    sendChat,
    sendLike,
    sendAuctionStart,
    sendBid,
    auction,
    isAuctionActive,
    auctionSecondsRemaining,
    auctionBids,
    auctionWinner,
    clearAuctionWinner: () => setAuctionWinner(null),
  };
}
