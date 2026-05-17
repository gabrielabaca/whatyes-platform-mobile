import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import RecordScreen, { RecordingResult } from 'react-native-record-screen';
import {
  isRecordingStorageAvailable,
  saveRecordingToPreferredFolder,
} from '../native/recordingStorage';

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

  useEffect(() => () => {
    clearTimer();
    if (isRecordingRef.current) {
      RecordScreen.stopRecording().catch(() => {});
    }
  }, [clearTimer]);

  const stopRecording = useCallback(async () => {
    clearTimer();
    setIsRecording(false);
    setSeconds(0);
    try {
      const res = await RecordScreen.stopRecording();
      if (!res || res.status !== 'success') {
        return;
      }
      const outputURL = res.result?.outputURL;
      if (!outputURL) {
        return;
      }
      let savedPath = outputURL;
      if (isRecordingStorageAvailable) {
        try {
          savedPath = await saveRecordingToPreferredFolder(outputURL);
        } catch {
          savedPath = outputURL;
        }
      }
      Alert.alert(
        t('stream.recordingSavedTitle'),
        t('stream.recordingSavedMessage', { path: savedPath })
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('stream.recordingStopError');
      Alert.alert(t('common.appName'), msg);
    }
  }, [clearTimer, t]);

  const startRecording = useCallback(async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    try {
      const result = await RecordScreen.startRecording({ mic: true });
      if (result === RecordingResult.PermissionError || result === 'permission_error') {
        Alert.alert(t('common.appName'), t('stream.recordingPermissionDenied'));
        return;
      }
      setIsRecording(true);
      startTimer();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('stream.recordingStartError');
      Alert.alert(t('common.appName'), msg);
    } finally {
      isBusyRef.current = false;
    }
  }, [startTimer, t]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    recordingTimeLabel: formatRecordingTime(seconds),
    toggleRecording,
  };
}
