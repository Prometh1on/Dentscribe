import type { LlmCompletionOptions, LlmMessage, LlmProvider } from '../../../common/types/llm';

const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export interface OpenAiLlmConfig {
  apiKey: string;
  model?: string; // defaults to 'gpt-4.1'
}

interface OpenAiChatResponse {
  choices: Array<{ message: { content: string } }>;
}

/** Optional cloud provider — disabled by default, requires an API key the user supplies. */
export class OpenAiLlmProvider implements LlmProvider {
  readonly id = 'openai' as const;
  readonly runsLocally = false;
  readonly requiresApiKey = true;

  constructor(private readonly config: OpenAiLlmConfig) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async complete(messages: LlmMessage[], opts?: LlmCompletionOptions): Promise<string> {
    const res = await fetch(OPENAI_CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model ?? 'gpt-4.1',
        messages,
        max_tokens: opts?.maxTokens,
        temperature: opts?.temperature,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as OpenAiChatResponse;
    return data.choices[0]?.message.content ?? '';
  }
}
