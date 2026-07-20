import type { LlmCompletionOptions, LlmMessage, LlmProvider } from '../../../common/types/llm';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export interface ClaudeConfig {
  apiKey: string;
  model?: string; // defaults to 'claude-sonnet-5'
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

/** Optional cloud provider — disabled by default, requires an API key the user supplies. */
export class ClaudeProvider implements LlmProvider {
  readonly id = 'claude' as const;
  readonly runsLocally = false;
  readonly requiresApiKey = true;

  constructor(private readonly config: ClaudeConfig) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async complete(messages: LlmMessage[], opts?: LlmCompletionOptions): Promise<string> {
    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const conversation = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model ?? 'claude-sonnet-5',
        max_tokens: opts?.maxTokens ?? 1024,
        temperature: opts?.temperature,
        system: systemMessage,
        messages: conversation,
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    return data.content.find((block) => block.type === 'text')?.text ?? '';
  }
}
