import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { AudioInput, TranscriptionProvider, TranscriptionResult } from '../../../common/types/transcription';

const OPENAI_TRANSCRIPTION_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

export interface OpenAiWhisperConfig {
  apiKey: string;
  model?: string;
}

interface OpenAiVerboseSegment {
  start: number;
  end: number;
  text: string;
}

interface OpenAiVerboseResponse {
  text: string;
  segments: OpenAiVerboseSegment[];
}

/** Optional cloud provider — disabled by default, requires an API key the user supplies. */
export class OpenAiWhisperProvider implements TranscriptionProvider {
  readonly id = 'openai-whisper' as const;
  readonly runsLocally = false;
  readonly requiresApiKey = true;

  constructor(private readonly config: OpenAiWhisperConfig) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async transcribe(audio: AudioInput): Promise<TranscriptionResult> {
    const bytes = await readFile(audio.filePath);
    const form = new FormData();
    form.append('file', new Blob([bytes]), basename(audio.filePath));
    form.append('model', this.config.model ?? 'whisper-1');
    form.append('response_format', 'verbose_json');

    const res = await fetch(OPENAI_TRANSCRIPTION_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      throw new Error(`OpenAI transcription request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as OpenAiVerboseResponse;
    return {
      fullText: data.text,
      segments: data.segments.map((seg) => ({
        text: seg.text.trim(),
        startMs: Math.round(seg.start * 1000),
        endMs: Math.round(seg.end * 1000),
      })),
      diarized: false,
    };
  }
}
