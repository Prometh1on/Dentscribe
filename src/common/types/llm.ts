export type LlmProviderId = 'ollama' | 'claude' | 'openai';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Implemented by every note-drafting/charting-parsing backend (local or cloud).
 * `ollama` is the default and runs entirely on the practice's machine; `claude`
 * and `openai` are optional opt-ins that require an API key (see
 * src/main/security/secretStore.ts). Callers (SOAP drafting, referral letters,
 * charting parser) code against this interface only, never a specific vendor SDK.
 */
export interface LlmProvider {
  readonly id: LlmProviderId;
  readonly runsLocally: boolean;
  readonly requiresApiKey: boolean;
  isAvailable(): Promise<boolean>;
  complete(messages: LlmMessage[], opts?: LlmCompletionOptions): Promise<string>;
}
