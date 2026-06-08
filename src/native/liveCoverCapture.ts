import { NativeModules, Platform } from 'react-native';

type CaptureResult = { uri: string } | string;

const { LiveCoverCapture } = NativeModules as {
  LiveCoverCapture?: {
    captureVideoTrackFrame: (trackId: string, quality: number) => Promise<CaptureResult>;
  };
};

export function isLiveCoverCaptureAvailable(): boolean {
  return Boolean(LiveCoverCapture?.captureVideoTrackFrame);
}

/** Captura un frame JPEG del VideoTrack local de WebRTC (evita RTCView negro en Android). */
export async function captureWebRTCVideoFrame(
  videoTrackId: string,
  quality = 0.72,
): Promise<string> {
  if (!LiveCoverCapture?.captureVideoTrackFrame) {
    throw new Error('LiveCoverCapture no disponible');
  }
  const result = await LiveCoverCapture.captureVideoTrackFrame(videoTrackId, quality);
  const uri = typeof result === 'string' ? result : result?.uri;
  if (!uri?.trim()) {
    throw new Error('Captura sin URI');
  }
  return uri.trim();
}

export const liveCoverCapturePlatform = Platform.OS;
