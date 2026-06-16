/**
 * Reproductor HLS para viewers (consume el stream grabado desde Kinesis).
 *
 * Pide la URL firmada a service-platform (GET /stream/url), maneja el caso NO_FRAGMENTS
 * (el broadcaster aún no envía video) reintentando, y refresca la URL si expira o falla.
 *
 * Úsalo cuando viewer_transport === 'hls'. El delay (2-8s) no afecta la subasta: el estado
 * de subasta viaja por WebSocket con reloj de servidor (ver useStreamChat).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Video from 'react-native-video';
import { storage } from '../../../utils/storage';
import { getStreamUrl, NoFragmentsError } from '../../../api/platformApi';

interface HlsStreamPlayerProps {
  roomId: string;
  paused?: boolean;
  muted?: boolean;
  style?: ViewStyle | ViewStyle[];
  /** Se llama cuando empieza a reproducir el primer frame. */
  onReady?: () => void;
  /** Se llama si no se pudo obtener/reproducir el stream tras los reintentos. */
  onError?: (err: Error) => void;
}

const NO_FRAGMENTS_RETRY_MS = 2500;
const MAX_NO_FRAGMENTS_RETRIES = 24; // ~60s esperando a que el broadcaster arranque

export function HlsStreamPlayer({
  roomId,
  paused = false,
  muted = false,
  style,
  onReady,
  onError,
}: HlsStreamPlayerProps) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const clearRetry = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const fetchUrl = useCallback(async () => {
    if (cancelledRef.current) return;
    try {
      const token = await storage.getAccessToken();
      if (!token) {
        onError?.(new Error('No se pudo obtener la sesión'));
        return;
      }
      const { url } = await getStreamUrl(token, roomId);
      if (cancelledRef.current) return;
      retriesRef.current = 0;
      setSourceUrl(url);
    } catch (e) {
      if (cancelledRef.current) return;
      if (e instanceof NoFragmentsError) {
        if (retriesRef.current < MAX_NO_FRAGMENTS_RETRIES) {
          retriesRef.current += 1;
          clearRetry();
          retryTimerRef.current = setTimeout(fetchUrl, NO_FRAGMENTS_RETRY_MS);
          return;
        }
        onError?.(new Error('El broadcaster aún no envía video'));
        return;
      }
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  }, [roomId, onError]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchUrl();
    return () => {
      cancelledRef.current = true;
      clearRetry();
    };
  }, [fetchUrl]);

  const handleVideoError = useCallback(() => {
    // URL HLS expirada o sesión caída: pedir una nueva.
    if (cancelledRef.current) return;
    setSourceUrl(null);
    fetchUrl();
  }, [fetchUrl]);

  if (!sourceUrl) {
    return null; // el contenedor muestra el loading mientras tanto
  }

  return (
    <Video
      source={{ uri: sourceUrl }}
      style={[styles.video, style]}
      resizeMode="cover"
      paused={paused}
      muted={muted}
      playInBackground={false}
      ignoreSilentSwitch="ignore"
      onLoad={() => onReady?.()}
      onError={handleVideoError}
      repeat={false}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});
