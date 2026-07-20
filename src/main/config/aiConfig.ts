import Store from 'electron-store';
import type { AiConfigSchema } from '../../common/types/aiConfig';
import type { TranscriptionProviderId } from '../../common/types/transcription';
import type { LlmProviderId } from '../../common/types/llm';

export type { AiConfigSchema };

const DEFAULTS: AiConfigSchema = {
  transcriptionProvider: 'local-whisper',
  llmProvider: 'ollama',
  localWhisper: {
    binaryPath: '',
    modelPath: '',
  },
  ollama: {
    host: 'http://localhost:11434',
    // 8B-parameter tier by default per product decision — meaningfully better note
    // quality than a 3B model, still runs on a normal office PC's CPU (no GPU
    // required, just slower per note). Re-check this tag against Ollama's current
    // model library before shipping the setup wizard (Phase 3) — pin an exact,
    // verified-available tag rather than assuming this one is still current.
    model: 'llama3:8b',
  },
  cloudModelIds: {
    deepgram: 'nova-2',
    openaiTranscription: 'whisper-1',
    openaiLlm: 'gpt-4.1',
    claude: 'claude-sonnet-5',
  },
  cloudProviderConsentAcknowledged: false,
};

let store: Store<AiConfigSchema> | null = null;

function getStore(): Store<AiConfigSchema> {
  if (!store) {
    store = new Store<AiConfigSchema>({ name: 'ai-config', defaults: DEFAULTS });
  }
  return store;
}

export function getAiConfig(): AiConfigSchema {
  return getStore().store;
}

export function setTranscriptionProvider(id: TranscriptionProviderId): void {
  getStore().set('transcriptionProvider', id);
}

export function setLlmProvider(id: LlmProviderId): void {
  getStore().set('llmProvider', id);
}

/** Call only after a human has confirmed a BAA is signed with the vendor being enabled. */
export function setCloudProviderConsent(acknowledged: boolean): void {
  getStore().set('cloudProviderConsentAcknowledged', acknowledged);
}

export function updateAiConfig(patch: Partial<AiConfigSchema>): void {
  getStore().set(patch);
}
