/**
 * Hook para signaling WebSocket con el servidor de livestream (platform_livestream).
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface SignalingMessage {
  type: string;
  room_id?: string;
  sdp?: string;
  candidate?: string;
  detail?: string;
}

export function useLivestreamSignaling(wsUrl: string | null, onMessage: (msg: SignalingMessage) => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const send = useCallback((msg: SignalingMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const close = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsOpen(false);
    setRoomId(null);
  }, []);

  useEffect(() => {
    if (!wsUrl) return;
    setError(null);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsOpen(true);
    ws.onclose = () => {
      wsRef.current = null;
      setIsOpen(false);
    };
    ws.onerror = () => setError('Error de conexión');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as SignalingMessage;
        if (msg.type === 'joined' && msg.room_id) {
          setRoomId(msg.room_id);
        }
        if (msg.type === 'error') {
          setError(msg.detail || msg.sdp || 'Error');
        }
        onMessageRef.current(msg);
      } catch {
        setError('Mensaje inválido');
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setIsOpen(false);
      setRoomId(null);
    };
  }, [wsUrl]);

  return { isOpen, roomId, error, send, close };
}
