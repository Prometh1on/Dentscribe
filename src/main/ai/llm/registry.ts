import type { LlmProvider } from '../../../common/types/llm';
import type { AiConfigSchema } from '../../config/aiConfig';
import { CREDENTIAL_NAMES, getCloudApiKey } from '../credentials';
import { assertCloudProviderConsent } from '../cloudConsent';
import { OllamaProvider } from './ollamaProvider';
import { ClaudeProvider } from './claudeProvider';
import { OpenAiLlmProvider } from './openaiProvider';

/** The only place that knows every concrete LLM backend — callers just get an LlmProvider. */
export function createLlmProvider(config: AiConfigSchema): LlmProvider {
  switch (config.llmProvider) {
    case 'ollama':
      return new OllamaProvider(config.ollama);

    case 'claude': {
      assertCloudProviderConsent(config, 'Claude');
      const apiKey = getCloudApiKey(CREDENTIAL_NAMES.anthropic);
      if (!apiKey) {
        throw new Error('Claude is the selected LLM provider but no API key is stored yet.');
      }
      return new ClaudeProvider({ apiKey, model: config.cloudModelIds.claude });
    }

    case 'openai': {
      assertCloudProviderConsent(config, 'OpenAI');
      const apiKey = getCloudApiKey(CREDENTIAL_NAMES.openai);
      if (!apiKey) {
        throw new Error('OpenAI is the selected LLM provider but no API key is stored yet.');
      }
      return new OpenAiLlmProvider({ apiKey, model: config.cloudModelIds.openaiLlm });
    }
  }
}
