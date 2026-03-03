/**
 * Bridge al módulo nativo de Kinesis Video Streams (Android).
 * En iOS el Producer SDK se puede integrar más adelante; por ahora solo Android envía video.
 */
import { NativeModules, Platform } from 'react-native';

const { KinesisVideo } = NativeModules;

export interface KinesisIngestCredentials {
  access_key_id: string;
  secret_access_key: string;
  session_token: string;
  stream_name: string;
  region: string;
}

export async function startKinesisStream(creds: KinesisIngestCredentials): Promise<void> {
  if (Platform.OS !== 'android' || !KinesisVideo?.startStream) {
    return;
  }
  return KinesisVideo.startStream(
    creds.stream_name,
    creds.region,
    creds.access_key_id,
    creds.secret_access_key,
    creds.session_token || null
  );
}

export async function stopKinesisStream(): Promise<void> {
  if (Platform.OS !== 'android' || !KinesisVideo?.stopStream) {
    return;
  }
  return KinesisVideo.stopStream();
}

export const isKinesisIngestSupported = Platform.OS === 'android' && !!KinesisVideo?.startStream;
