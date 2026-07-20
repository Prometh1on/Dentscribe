import type { TranscriptionProviderId } from './transcription';
import type { LlmProviderId } from './llm';

/**
 * Which STT/LLM backend is active, plus the non-secret settings each backend
 * needs. Deliberately separate from src/main/security/secretStore.ts — API
 * keys are secrets and live encrypted there; this shape is plain JSON
 * (electron-store) and is safe for the renderer's Settings UI to read/write
 * directly over IPC.
 */
export interface AiConfigSchema {
  transcriptionProvider: TranscriptionProviderId;
  llmProvider: LlmProviderId;
  localWhisper: {
    binaryPath: string;
    modelPath: string;
  };
  ollama: {
    host: string;
    model: string;
  };
  cloudModelIds: {
    deepgram: string;
    openaiTranscription: string;
    openaiLlm: string;
    claude: string;
  };
  /**
   * Must be explicitly set to true before either registry (src/main/ai/transcription/registry.ts,
   * src/main/ai/llm/registry.ts) will construct a cloud provider. This exists so switching a
   * provider id to a cloud value is never by itself enough to send PHI off the machine — a human
   * has to separately confirm a BAA is signed with that vendor. Defaults to false.
   */
  cloudProviderConsentAcknowledged: boolean;
}
