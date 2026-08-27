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
  /** El vendedor canceló la oferta: llega SOLO el código de motivo (el detalle es interno). */
  onAuctionCancelled?: (info: AuctionCancelledInfo) => void;
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

/** Cómo se resuelve la oferta: puja más alta (subasta) o primero que compra. */
export type LiveOfferSaleMode = 'auction' | 'buy_now';

/**
 * Cuánto sobrevive el estado de la oferta después de `ends_at`.
 *
 * El servidor cierra en el segundo 0, pero una puja aceptada justo antes puede
 * llegar al cliente con retraso de red trayendo el `ends_at` extendido (+3s). Sin
 * esta ventana el estado ya sería `null` y no habría nada que extender: la
 * subasta se vería cerrada aunque el servidor la haya estirado.
 *
 * No afecta a quién gana: el servidor sigue siendo la autoridad y una puja que le
 * llega después de `ends_at` se rechaza igual.
 */
const AUCTION_END_GRACE_MS = 1000;

export interface AuctionState {
  id: string;
  durationSeconds: number;
  startedAt: number;
  endsAt: number;
  /** Backends previos a "Comprar ahora" no lo mandan: se asume subasta. */
  saleMode: LiveOfferSaleMode;
  /** Precio fijo de la compra directa (centavos). null en subasta. */
  priceCents: number | null;
  productId: string | null;
}

export interface AuctionBid {
  id: string;
  username: string;
  amount: number;
  created_at: number;
}

/**
 * Segundos que una puja le sumó al cierre de la subasta. `id` cambia con cada
 * extensión para que la UI pueda re-disparar la animación del "+N".
 */
export interface AuctionExtension {
  id: string;
  seconds: number;
}

export interface AuctionWinner {
  username: string;
  amount: number;
  /** UUID del ganador: permite detectar "ganaste vos" sin depender del nombre. */
  user_id?: string;
  /** Modo con el que se resolvió: cambia el copy ("ganó" vs "lo compró"). */
  saleMode?: LiveOfferSaleMode;
}

/** Códigos de motivo de `auction_cancelled`; se mapean a mensajes genéricos locales. */
export type AuctionCancelReasonCode =
  | 'product_issue'
  | 'listing_error'
  | 'technical_issue';

export interface AuctionCancelledInfo {
  auctionId: string;
  reasonCode: AuctionCancelReasonCode | string;
  saleMode: LiveOfferSaleMode;
}

/**
 * Payload de oferta del WS (`init.auction` / `auction_start`) → estado local.
 * Subasta y compra directa comparten forma: solo cambia cómo se resuelve.
 */
const toAuctionState = (a: any): AuctionState => ({
  id: a.id,
  durationSeconds: a.duration_seconds ?? 10,
  startedAt: a.started_at ?? 0,
  endsAt: a.ends_at,
  saleMode: a.sale_mode === 'buy_now' ? 'buy_now' : 'auction',
  priceCents: typeof a.price_cents === 'number' ? a.price_cents : null,
  productId: typeof a.product_id === 'string' ? a.product_id : null,
});

export function useStreamChat({
  roomId,
  accessToken,
  enabled = true,
  role = 'viewer',
  reconnect = true,
  onLike,
  onStreamEnded,
  onAuctionCancelled,
}: UseStreamChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [auctionBids, setAuctionBids] = useState<AuctionBid[]>([]);
  const [auctionWinner, setAuctionWinner] = useState<AuctionWinner | null>(null);
  const [lastAuctionExtension, setLastAuctionExtension] = useState<AuctionExtension | null>(null);
  /**
   * Restante congelado de la oferta pausada (vendedor decidiendo si cancela).
   * null = corriendo normal. Mientras está seteado, el countdown muestra este
   * valor fijo y la oferta NO se auto-baja de pantalla aunque pase `ends_at`.
   */
  const [auctionPausedRemaining, setAuctionPausedRemaining] = useState<number | null>(null);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  /** Mic del vendedor silenciado. El init lo trae para quien entra tarde. */
  const [isSellerAudioMuted, setIsSellerAudioMuted] = useState(false);
  /**
   * Último CAMBIO de mic recibido por broadcast (no por init): permite mostrar
   * un toast solo cuando el toggle ocurre con el viewer ya adentro, sin que la
   * foto inicial —o una reconexión— dispare avisos.
   */
  const [sellerAudioEvent, setSellerAudioEvent] = useState<{ muted: boolean; id: number } | null>(null);
  const [roomCoverUrl, setRoomCoverUrl] = useState<string | null>(null);
  const [roomIntroVideoUrl, setRoomIntroVideoUrl] = useState<string | null>(null);
  /**
   * Nota del vivo. `undefined` = todavía no llegó nada por el WS (el consumidor cae
   * al valor de live-commerce); `null` = el servidor confirmó que el vivo NO tiene nota.
   * La distinción importa: sin ella, publicar un borrado no podría pisar el valor viejo.
   */
  const [roomNote, setRoomNote] = useState<string | null | undefined>(undefined);
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

  const onAuctionCancelledRef = useRef(onAuctionCancelled);

  useEffect(() => {
    onAuctionCancelledRef.current = onAuctionCancelled;
  }, [onAuctionCancelled]);

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

  /** Seller: publica el estado real del mic después de aplicarlo en el transporte. */
  const sendSellerAudioMuted = useCallback(
    (muted: boolean) => {
      send({ type: muted ? 'seller_audio_mute' : 'seller_audio_unmute' });
    },
    [send]
  );

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
            if (typeof msg.payload.seller_audio_muted === 'boolean') {
              setIsSellerAudioMuted(msg.payload.seller_audio_muted);
            }
            if (typeof msg.payload.cover_url === 'string' && msg.payload.cover_url.trim()) {
              setRoomCoverUrl(msg.payload.cover_url.trim());
            }
            if (typeof msg.payload.intro_video_url === 'string' && msg.payload.intro_video_url.trim()) {
              setRoomIntroVideoUrl(msg.payload.intro_video_url.trim());
            }
            // A diferencia de cover/intro, acá sí se acepta el vacío: es la confirmación
            // de que el vivo no tiene nota.
            if ('note' in msg.payload) {
              const note = msg.payload.note;
              setRoomNote(typeof note === 'string' && note.trim() ? note : null);
            }
            const a = msg.payload.auction;
            // Pausada entra aunque `ends_at` haya quedado atrás en tiempo real:
            // el reloj está congelado y quien se une tarde ve el panel detenido.
            const initPaused = a?.status === 'paused';
            if (
              a && a.id && typeof a.ends_at === 'number' &&
              (initPaused || a.ends_at > serverNow())
            ) {
              if (typeof a.started_at === 'number') syncClock(a.started_at);
              setAuction(toAuctionState(a));
              setAuctionPausedRemaining(
                initPaused && typeof a.paused_seconds_remaining === 'number'
                  ? Math.max(0, a.paused_seconds_remaining)
                  : null
              );
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
              setAuctionPausedRemaining(null);
            }
            return;
          }
          if (msg.type === 'auction_start' && msg.payload) {
            const a = msg.payload;
            // started_at es "ahora" en el reloj del servidor al iniciar la subasta:
            // sirve para corregir el offset del dispositivo aunque el backend no envíe server_time.
            if (typeof a.started_at === 'number') syncClock(a.started_at);
            if (a.id && typeof a.ends_at === 'number') {
              setAuction(toAuctionState(a));
              setAuctionBids([]);
              setLastAuctionExtension(null);
              setAuctionPausedRemaining(null);
            }
            return;
          }
          if (msg.type === 'auction_paused' && msg.payload) {
            // El vendedor abrió el flujo de cancelación: reloj congelado, sin pujas.
            const remaining = msg.payload.seconds_remaining;
            setAuctionPausedRemaining(
              typeof remaining === 'number' ? Math.max(0, remaining) : 0
            );
            return;
          }
          if (msg.type === 'auction_resumed' && msg.payload) {
            // El vendedor desistió: el countdown retoma desde el ends_at
            // recalculado por el servidor (misma mecánica que el anti-sniping).
            const endsAt = msg.payload.ends_at;
            setAuctionPausedRemaining(null);
            if (typeof endsAt === 'number') {
              setAuction(prev => (prev ? { ...prev, endsAt } : prev));
            }
            return;
          }
          if (msg.type === 'auction_cancelled' && msg.payload) {
            const info: AuctionCancelledInfo = {
              auctionId: String(msg.payload.auction_id ?? ''),
              reasonCode: String(msg.payload.reason_code ?? ''),
              saleMode: msg.payload.sale_mode === 'buy_now' ? 'buy_now' : 'auction',
            };
            // Sin ganador ni festejo: la oferta baja de pantalla y el aviso
            // genérico lo muestra la pantalla vía onAuctionCancelled.
            setAuction(null);
            setAuctionBids([]);
            setLastAuctionExtension(null);
            setAuctionPausedRemaining(null);
            onAuctionCancelledRef.current?.(info);
            return;
          }
          if (msg.type === 'auction_end') {
            // Mismo evento para los dos modos: en compra directa el "ganador" es
            // quien llegó primero, y llega apenas compra (no al vencer el tiempo).
            const winner = msg.payload?.winner;
            if (winner?.username) {
              setAuctionWinner({
                username: winner.username,
                amount: winner.amount ?? 0,
                user_id: winner.user_id ?? undefined,
                saleMode: msg.payload?.sale_mode === 'buy_now' ? 'buy_now' : 'auction',
              });
            }
            setAuction(null);
            setAuctionBids([]);
            setLastAuctionExtension(null);
            setAuctionPausedRemaining(null);
            return;
          }
          if (msg.type === 'auction_bid' && msg.payload) {
            const b = msg.payload;
            const bidId = b.id || `${b.username}-${b.created_at}`;
            setAuctionBids(prev => [...prev, {
              id: bidId,
              username: b.username || 'Usuario',
              amount: b.amount ?? 0,
              created_at: b.created_at ?? 0,
            }]);
            // Anti-sniping: la puja corre el cierre. El servidor manda el ends_at
            // resultante, así que todos recalculan el countdown desde ahí en vez
            // de sumar segundos por su cuenta (que divergiría entre dispositivos).
            // Si el mensaje llegó tarde, `prev` sigue vivo gracias a la ventana de
            // gracia y la subasta se reabre en lugar de quedar cerrada de más.
            if (typeof b.ends_at === 'number') {
              setAuction(prev =>
                prev && b.ends_at > prev.endsAt ? { ...prev, endsAt: b.ends_at } : prev
              );
            }
            if (typeof b.extended_by === 'number' && b.extended_by > 0) {
              setLastAuctionExtension({ id: bidId, seconds: b.extended_by });
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
          if (msg.type === 'stream_status' && msg.payload) {
            setIsStreamPaused(Boolean(msg.payload.paused));
            return;
          }
          if (msg.type === 'seller_audio_status' && msg.payload) {
            const muted = Boolean(msg.payload.muted);
            setIsSellerAudioMuted(muted);
            setSellerAudioEvent((prev) => ({ muted, id: (prev?.id ?? 0) + 1 }));
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
          if (msg.type === 'room_note') {
            const note = msg.payload?.note;
            setRoomNote(typeof note === 'string' && note.trim() ? note : null);
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
  /** Oferta congelada por el vendedor (flujo de cancelación): sin reloj ni pujas. */
  const isAuctionPaused = auction !== null && auctionPausedRemaining !== null;
  /**
   * Hay una oferta corriendo (subasta o compra directa): el temporizador es el
   * mismo. Pausada cuenta como activa —sigue en pantalla con el reloj quieto—
   * aunque su `ends_at` haya quedado atrás en tiempo real.
   */
  const isAuctionActive = auction !== null && (isAuctionPaused || auction.endsAt > now);
  /**
   * Hay una oferta en pantalla, incluida la ventana de gracia posterior al cierre.
   * Se usa para decidir si mostrar el panel: durante la gracia el reloj marca 0
   * pero la oferta todavía puede reabrirse (ver AUCTION_END_GRACE_MS).
   */
  const hasLiveOffer = auction !== null;
  const offerSaleMode: LiveOfferSaleMode = auction?.saleMode ?? 'auction';
  const isBuyNowActive = isAuctionActive && offerSaleMode === 'buy_now';

  useEffect(() => {
    if (!auction) {
      setAuctionSecondsRemaining(null);
      return;
    }
    // Pausada: el reloj queda clavado en el restante que congeló el servidor.
    if (auctionPausedRemaining !== null) {
      setAuctionSecondsRemaining(auctionPausedRemaining);
      return;
    }
    // Durante la gracia se muestra 0 (no `null`): el reloj ya llegó al final, pero
    // la oferta sigue en pantalla por si una puja tardía la reabre.
    const update = () => {
      setAuctionSecondsRemaining(Math.max(0, auction.endsAt - serverNow()));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [auction?.id, auction?.endsAt, auctionPausedRemaining, serverNow]);

  /**
   * Único responsable de bajar la oferta de pantalla. Espera `AUCTION_END_GRACE_MS`
   * después del cierre para que una puja del último segundo —aceptada por el
   * servidor antes de `ends_at` pero cuyo broadcast llegó con retraso de red—
   * encuentre el estado vivo y lo reabra con el `ends_at` extendido.
   *
   * El `ends_at` nuevo re-dispara este efecto, así que cada extensión recorre la
   * ventana de gracia desde el nuevo cierre.
   */
  useEffect(() => {
    if (!auction) return;
    // Pausada: la oferta no se auto-baja aunque el tiempo real pase `ends_at`.
    // Sale de pantalla por `auction_cancelled`, o el resume re-arma este timer
    // con el `ends_at` recalculado.
    if (auctionPausedRemaining !== null) return;
    const delay = Math.max(0, (auction.endsAt - now) * 1000 + AUCTION_END_GRACE_MS);
    const t = setTimeout(() => setAuction(null), delay);
    return () => clearTimeout(t);
  }, [auction?.id, auction?.endsAt, auctionPausedRemaining, now]);

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
    sendSellerAudioMuted,
    disconnectPermanently,
    isStreamPaused,
    isSellerAudioMuted,
    sellerAudioEvent,
    roomCoverUrl,
    roomIntroVideoUrl,
    roomNote,
    auction,
    isAuctionActive,
    isAuctionPaused,
    hasLiveOffer,
    offerSaleMode,
    isBuyNowActive,
    auctionSecondsRemaining,
    auctionBids,
    auctionWinner,
    lastAuctionExtension,
    clearAuctionWinner: () => setAuctionWinner(null),
  };
}
