import { useEffect, useRef } from 'react';
import { captureRef } from 'react-native-view-shot';
import { uploadLiveRoomCover } from '../api/platformApi';

const LIVE_COVER_INTERVAL_MS = 10_000;

export interface UseLiveAutoCoverSnapshotOptions {
  roomId: string | null;
  /** Ref de la View/RTCView que contiene el stream del seller. */
  videoViewRef: React.RefObject<unknown>;
  enabled: boolean;
  onCoverUploaded?: (coverUrl: string) => void;
}

/** Captura un screenshot del view del stream cada 10 s y lo sube como cover de la room. */
export function useLiveAutoCoverSnapshot({
  roomId,
  videoViewRef,
  enabled,
  onCoverUploaded,
}: UseLiveAutoCoverSnapshotOptions) {
  const uploadingRef = useRef(false);
  const onCoverUploadedRef = useRef(onCoverUploaded);
  onCoverUploadedRef.current = onCoverUploaded;

  useEffect(() => {
    if (!enabled || !roomId) return;

    const captureAndUpload = () => {
      (async () => {
        if (uploadingRef.current) return;
        if (!videoViewRef.current) return;

        uploadingRef.current = true;
        try {
          const uri = await captureRef(videoViewRef, {
            format: 'jpg',
            quality: 0.72,
            result: 'tmpfile',
          });
          if (!roomId) return;
          const coverUrl = await uploadLiveRoomCover(roomId, {
            uri,
            type: 'image/jpeg',
            name: `live-snapshot-${Date.now()}.jpg`,
          });
          onCoverUploadedRef.current?.(coverUrl);
        } catch (err) {
          console.warn('[useLiveAutoCoverSnapshot] Error capturando/subiendo cover:', err);
        } finally {
          uploadingRef.current = false;
        }
      })().catch((err) => {
        console.warn('[useLiveAutoCoverSnapshot] Error inesperado:', err);
        uploadingRef.current = false;
      });
    };

    const initial = setTimeout(captureAndUpload, LIVE_COVER_INTERVAL_MS);
    const interval = setInterval(captureAndUpload, LIVE_COVER_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [enabled, roomId, videoViewRef]);
}
