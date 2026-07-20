import type { AuthResult } from '../../common/types/auth';
import type { CreateStyleExampleInput, StyleExample } from '../../common/types/styleExample';
import type { TranscriptionResult } from '../../common/types/transcription';
import type { AiConfigSchema } from '../../common/types/aiConfig';
import type { SetupProgressEvent, SetupStatus, WhisperModelSize } from '../../common/types/setup';

export {};

declare global {
  interface Window {
    dentiScribe: {
      version: string;
      auth: {
        isBootstrapNeeded: () => Promise<boolean>;
        bootstrapFirstUser: (username: string, password: string) => Promise<AuthResult>;
        login: (username: string, password: string) => Promise<AuthResult>;
        logout: () => Promise<void>;
        isAuthenticated: () => boolean;
      };
      styleExamples: {
        list: () => Promise<StyleExample[]>;
        create: (input: CreateStyleExampleInput) => Promise<StyleExample>;
        delete: (id: string) => Promise<void>;
      };
      scribe: {
        formatNote: (transcriptionResult: TranscriptionResult) => Promise<string>;
        transcribeAudio: (wavBytes: ArrayBuffer, sampleRateHz: number) => Promise<TranscriptionResult>;
      };
      settings: {
        getConfig: () => Promise<AiConfigSchema>;
        updateConfig: (patch: Partial<AiConfigSchema>) => Promise<void>;
        setCloudApiKey: (name: string, value: string) => Promise<void>;
        clearCloudApiKey: (name: string) => Promise<void>;
        hasCloudApiKey: (name: string) => Promise<boolean>;
      };
      setup: {
        checkStatus: () => Promise<SetupStatus>;
        installOllama: () => Promise<void>;
        pullOllamaModel: () => Promise<void>;
        installWhisper: () => Promise<void>;
        downloadWhisperModel: (size: WhisperModelSize) => Promise<void>;
        onProgress: (callback: (event: SetupProgressEvent) => void) => () => void;
      };
    };
  }
}
