declare module 'react-native-record-screen' {
  export const RecordingResult: {
    readonly Started: 'started';
    readonly PermissionError: 'permission_error';
  };

  export type RecordingStartResponse = 'started' | 'permission_error';

  export type RecordingSuccessResponse = {
    status: 'success';
    result: {
      outputURL: string;
    };
  };

  export type RecordingErrorResponse = {
    status: 'error';
    result: unknown;
  };

  export type RecordingResponse = RecordingSuccessResponse | RecordingErrorResponse;

  export interface StartRecordingOptions {
    mic?: boolean;
    bitrate?: number;
    fps?: number;
  }

  const RecordScreen: {
    startRecording(options?: StartRecordingOptions): Promise<RecordingStartResponse>;
    stopRecording(): Promise<RecordingResponse>;
    clean(): Promise<string>;
  };

  export default RecordScreen;
}
