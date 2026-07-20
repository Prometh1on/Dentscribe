/**
 * Every optional cloud provider's API key lives under one of these names in
 * the encrypted secret store (src/main/security/secretStore.ts). OpenAI uses
 * one key for both its transcription and chat-completion endpoints, so the
 * two OpenAI providers share a name. Shared with the renderer so the Settings
 * UI can reference the same identifiers without duplicating them.
 */
export const CREDENTIAL_NAMES = {
  deepgram: 'deepgram-api-key',
  openai: 'openai-api-key',
  anthropic: 'anthropic-api-key',
} as const;

export type CloudCredentialName = (typeof CREDENTIAL_NAMES)[keyof typeof CREDENTIAL_NAMES];
