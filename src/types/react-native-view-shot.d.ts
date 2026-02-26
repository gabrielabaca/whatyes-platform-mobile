declare module 'react-native-view-shot' {
  export function captureRef(
    viewRef: any,
    options?: {
      format?: 'jpg' | 'png' | 'webm';
      quality?: number;
      result?: 'tmpfile' | 'base64' | 'data-uri';
    },
  ): Promise<string>;
}
