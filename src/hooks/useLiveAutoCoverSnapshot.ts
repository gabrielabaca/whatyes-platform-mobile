import { useEffect, useRef } from 'react';
import { getKinesisWebRTCMasterVideoTrackId } from '../native/KinesisWebRTCNative';
import { captureWebRTCVideoFrame, isLiveCoverCaptureAvailable } from '../native/liveCoverCapture';
import { uploadLiveRoomCover } from '../api/platformApi';

const LIVE_COVER_INTERVAL_MS = 10_000;

export interface UseLiveAutoCoverSnapshotOptions {
  roomId: string | null;
  enabled: boolean;
  onCoverUploaded?: (coverUrl: string) => void;
}

/** Captura un frame del VideoTrack WebRTC cada 10 s y lo sube como cover de la room. */
export function useLiveAutoCoverSnapshot({
  roomId,
  enabled,
  onCoverUploaded,
}: UseLiveAutoCoverSnapshotOptions) {
  const uploadingRef = useRef(false);
  const onCoverUploadedRef = useRef(onCoverUploaded);
  onCoverUploadedRef.current = onCoverUploaded;

  useEffect(() => {
    if (!enabled || !roomId || !isLiveCoverCaptureAvailable()) return;

    // Toda la función está en un único try/catch para que ningún error
    // escape como unhandled rejection y cierre el screen.
    const captureAndUpload = () => {
      (async () => {
        if (uploadingRef.current) return;

        let trackId: string | null = null;
        try {
          trackId = await getKinesisWebRTCMasterVideoTrackId();
        } catch {
          return;
        }
        if (!trackId) return;

        uploadingRef.current = true;
        try {
          const uri = await captureWebRTCVideoFrame(trackId, 0.72);
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
  }, [enabled, roomId]);
}
