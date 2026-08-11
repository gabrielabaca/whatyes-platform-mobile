import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RecordScreen, { RecordingResult } from 'react-native-record-screen';
import {
  CLIP_RECORDER_PERMISSION_DENIED,
  isNativeClipRecorderAvailable,
  startNativeClipRecording,
  stopNativeClipRecording,
} from '../native/screenClipRecorder';
import {
  saveRecordingToPreferredFolder,
  shareSavedRecording,
  type SavedRecording,
} from '../native/recordingStorage';
import { appAlert } from '../alerts';

function formatRecordingTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useLiveScreenRecording() {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBusyRef = useRef(false);
  const isRecordingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  }, [clearTimer]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const showSavedDialog = useCallback(
    (saved: SavedRecording) => {
      const message =
        saved.location === 'photos'
          ? t('stream.recordingSavedPhotos')
          : t('stream.recordingSavedMessage', { path: saved.displayPath });
      appAlert(t('stream.recordingSavedTitle'), message, [
        {
          text: t('stream.share'),
          onPress: () => {
            shareSavedRecording(saved).catch(() => {
              appAlert(t('common.appName'), t('stream.recordingShareError'));
            });
          },
        },
        { text: t('common.ok'), style: 'cancel' },
      ]);
    },
    [t]
  );

  /** Frena la captura y devuelve el path del video, o null si no hay archivo. */
  const stopCapture = useCallback(async (): Promise<string | null> => {
    if (isNativeClipRecorderAvailable) {
      return stopNativeClipRecording();
    }
    const res = await RecordScreen.stopRecording();
    return res?.status === 'success' ? res.result?.outputURL ?? null : null;
  }, []);

  /**
   * Frena y guarda. Con `silent` (desmontaje) no muestra ningún alert,
   * pero igual intenta guardar para no descartar la grabación.
   */
  const stopAndSave = useCallback(
    async (silent: boolean) => {
      clearTimer();
      setIsRecording(false);
      setSeconds(0);
      try {
        const outputURL = await stopCapture();
        if (!outputURL) {
          if (!silent) {
            appAlert(t('common.appName'), t('stream.recordingStopError'));
          }
          return;
        }
        let saved: SavedRecording;
        try {
          saved = await saveRecordingToPreferredFolder(outputURL);
        } catch {
          if (!silent) {
            appAlert(t('common.appName'), t('stream.recordingSaveError'));
          }
          return;
        }
        if (!silent) {
          showSavedDialog(saved);
        }
      } catch (e: unknown) {
        if (!silent) {
          const msg = e instanceof Error ? e.message : t('stream.recordingStopError');
          appAlert(t('common.appName'), msg);
        }
      }
    },
    [clearTimer, showSavedDialog, stopCapture, t]
  );

  const stopAndSaveRef = useRef(stopAndSave);
  useEffect(() => {
    stopAndSaveRef.current = stopAndSave;
  }, [stopAndSave]);

  useEffect(() => () => {
    clearTimer();
    if (isRecordingRef.current) {
      // Desmontaje con grabación activa: guardar en silencio en vez de descartar.
      stopAndSaveRef.current(true).catch(() => {});
    }
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    try {
      if (isNativeClipRecorderAvailable) {
        await startNativeClipRecording();
      } else {
        const result = await RecordScreen.startRecording({ mic: true });
        if (result === RecordingResult.PermissionError) {
          appAlert(t('common.appName'), t('stream.recordingPermissionDenied'));
          return;
        }
      }
      setIsRecording(true);
      startTimer();
    } catch (e: unknown) {
      const code = (e as { code?: string } | null)?.code;
      if (code === CLIP_RECORDER_PERMISSION_DENIED) {
        appAlert(t('common.appName'), t('stream.recordingPermissionDenied'));
        return;
      }
      const msg = e instanceof Error ? e.message : t('stream.recordingStartError');
      appAlert(t('common.appName'), msg);
    }
  }, [startTimer, t]);

  const toggleRecording = useCallback(async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    try {
      if (isRecordingRef.current) {
        await stopAndSave(false);
      } else {
        await startRecording();
      }
    } finally {
      isBusyRef.current = false;
    }
  }, [startRecording, stopAndSave]);

  return {
    isRecording,
    recordingTimeLabel: formatRecordingTime(seconds),
    toggleRecording,
  };
}
