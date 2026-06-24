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
  /** Broadcaster: envía master_ping y puede registrar presencia en el servidor. */
  role?: 'master' | 'viewer';
  /** Si false, no reconecta al cerrar el WS (salida intencional del vivo). Default true. */
  reconnect?: boolean;
  onLike?: (like: LikeEvent) => void;
  onStreamEnded?: (reason?: string) => void;
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

export function useStreamChat({
  roomId,
  accessToken,
  enabled = true,
  role = 'viewer',
  reconnect = true,
  onLike,
  onStreamEnded,
}: UseStreamChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [auctionBids, setAuctionBids] = useState<AuctionBid[]>([]);
  const [auctionWinner, setAuctionWinner] = useState<AuctionWinner | null>(null);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [roomCoverUrl, setRoomCoverUrl] = useState<string | null>(null);
  const [roomIntroVideoUrl, setRoomIntroVideoUrl] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectEnabledRef = useRef(reconnect);
  const onStreamEndedRef = useRef(onStreamEnded);

  useEffect(() => {
    reconnectEnabledRef.current = reconnect;
  }, [reconnect]);

  useEffect(() => {
    onStreamEndedRef.current = onStreamEnded;
  }, [onStreamEnded]);

  // Offset (segundos) entre el reloj del servidor y el del dispositivo.
  // serverNow() = reloj local + offset. Imprescindible para que la cuenta regresiva
  // de la subasta sea JUSTA entre dispositivos con la hora corrida.
  const serverClockOffsetRef = useRef(0);
  const [, setClockSynced] = useState(0); // fuerza recálculo del countdown al sincronizar

  const serverNow = useCallback(
    () => Math.floor(Date.now() / 1000) + serverClockOffsetRef.current,
    []
  );

  /** Ajusta el offset a partir de un timestamp de servidor muestreado "alrededor de ahora". */
  const syncClock = useCallback((serverEpochSec?: number) => {
    if (typeof serverEpochSec !== 'number' || !Number.isFinite(serverEpochSec) || serverEpochSec <= 0) {
      return;
    }
    const localNow = Math.floor(Date.now() / 1000);
    const nextOffset = serverEpochSec - localNow;
    // Solo actualizar si el cambio es significativo (>1s) para no rerenderizar de más.
    if (Math.abs(nextOffset - serverClockOffsetRef.current) >= 1) {
      serverClockOffsetRef.current = nextOffset;
      setClockSynced((v) => v + 1);
    }
  }, []);

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
    (durationSeconds: number, productId?: string) => {
      send({
        type: 'auction_start',
        duration_seconds: durationSeconds,
        ...(productId ? { product_id: productId } : {}),
      });
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

  const sendStreamPause = useCallback(() => {
    send({ type: 'stream_pause' });
  }, [send]);

  const sendStreamResume = useCallback(() => {
    send({ type: 'stream_resume' });
  }, [send]);

  const disconnectPermanently = useCallback(() => {
    reconnectEnabledRef.current = false;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled || !roomId || !accessToken) return;

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      setError(null);
      const wsUrl = `${PLATFORM_WS_URL}/ws/rooms/${roomId}?token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => { if (!destroyed) setIsConnected(true); };
      ws.onclose = () => {
        wsRef.current = null;
        if (!destroyed) {
          setIsConnected(false);
          if (reconnectEnabledRef.current) {
            reconnectTimer.current = setTimeout(connect, 3000);
          }
        }
      };
      ws.onerror = () => { if (!destroyed) setError('Error de conexión'); };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as any;
          // Sincronizar reloj con cualquier timestamp de servidor disponible.
          if (msg?.payload && typeof msg.payload.server_time === 'number') {
            syncClock(msg.payload.server_time);
          }
          if (msg.type === 'init' && msg.payload) {
            const list = Array.isArray(msg.payload.messages) ? msg.payload.messages : [];
            setMessages(list.map((item: WsPayloadMessage) => toChatMessage(item)));
            if (typeof msg.payload.viewer_count === 'number') {
              setViewerCount(msg.payload.viewer_count);
            }
            if (typeof msg.payload.likes_count === 'number') {
              setLikesCount(msg.payload.likes_count);
            }
            if (typeof msg.payload.stream_paused === 'boolean') {
              setIsStreamPaused(msg.payload.stream_paused);
            }
            if (typeof msg.payload.cover_url === 'string' && msg.payload.cover_url.trim()) {
              setRoomCoverUrl(msg.payload.cover_url.trim());
            }
            if (typeof msg.payload.intro_video_url === 'string' && msg.payload.intro_video_url.trim()) {
              setRoomIntroVideoUrl(msg.payload.intro_video_url.trim());
            }
            const a = msg.payload.auction;
            if (a && a.id && typeof a.ends_at === 'number' && a.ends_at > serverNow()) {
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
            // started_at es "ahora" en el reloj del servidor al iniciar la subasta:
            // sirve para corregir el offset del dispositivo aunque el backend no envíe server_time.
            if (typeof a.started_at === 'number') syncClock(a.started_at);
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
          if (msg.type === 'stream_status' && msg.payload) {
            setIsStreamPaused(Boolean(msg.payload.paused));
            return;
          }
          if (msg.type === 'stream_ended') {
            const reason =
              typeof msg.payload?.reason === 'string' ? msg.payload.reason : undefined;
            onStreamEndedRef.current?.(reason);
            return;
          }
          if (msg.type === 'cover_updated' && msg.payload) {
            const url = msg.payload.cover_url;
            if (typeof url === 'string' && url.trim()) {
              setRoomCoverUrl(url.trim());
            }
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
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [roomId, accessToken, enabled, onLike, syncClock, serverNow]);

  useEffect(() => {
    if (role !== 'master' || !isConnected) return;
    const ping = () => send({ type: 'master_ping' });
    ping();
    const id = setInterval(ping, 20_000);
    return () => clearInterval(id);
  }, [role, isConnected, send]);

  const [auctionSecondsRemaining, setAuctionSecondsRemaining] = useState<number | null>(null);

  const now = serverNow();
  const isAuctionActive = auction !== null && auction.endsAt > now;

  useEffect(() => {
    if (!auction || auction.endsAt <= serverNow()) {
      setAuctionSecondsRemaining(null);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, auction.endsAt - serverNow());
      setAuctionSecondsRemaining(remaining);
      if (remaining <= 0) setAuction(null);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [auction?.id, auction?.endsAt, serverNow]);

  useEffect(() => {
    if (!auction || auction.endsAt <= now) return;
    const delay = (auction.endsAt - now) * 1000 + 500;
    const t = setTimeout(() => setAuction(null), delay);
    return () => clearTimeout(t);
  }, [auction?.id, auction?.endsAt, now]);

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
    sendStreamPause,
    sendStreamResume,
    disconnectPermanently,
    isStreamPaused,
    roomCoverUrl,
    roomIntroVideoUrl,
    auction,
    isAuctionActive,
    auctionSecondsRemaining,
    auctionBids,
    auctionWinner,
    clearAuctionWinner: () => setAuctionWinner(null),
  };
}
