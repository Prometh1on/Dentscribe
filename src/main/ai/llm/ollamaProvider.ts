import type { LlmCompletionOptions, LlmMessage, LlmProvider } from '../../../common/types/llm';

export interface OllamaConfig {
  host: string;
  model: string;
}

interface OllamaChatResponse {
  message: { role: string; content: string };
}

/** Default provider — talks to a local Ollama server (localhost only, no network egress). */
export class OllamaProvider implements LlmProvider {
  readonly id = 'ollama' as const;
  readonly runsLocally = true;
  readonly requiresApiKey = false;

  constructor(private readonly config: OllamaConfig) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.host}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(messages: LlmMessage[], opts?: LlmCompletionOptions): Promise<string> {
    const res = await fetch(`${this.config.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: false,
        options: {
          temperature: opts?.temperature,
          num_predict: opts?.maxTokens,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as OllamaChatResponse;
    return data.message.content;
  }
}
