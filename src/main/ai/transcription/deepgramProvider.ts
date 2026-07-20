import { readFile } from 'node:fs/promises';
import type {
  AudioInput,
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionSegment,
} from '../../../common/types/transcription';

const DEEPGRAM_ENDPOINT = 'https://api.deepgram.com/v1/listen';

export interface DeepgramConfig {
  apiKey: string;
  model?: string;
}

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

interface DeepgramResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: DeepgramWord[];
      }>;
    }>;
  };
}

/** Groups consecutive same-speaker words into segments — Deepgram tags each word, not each utterance. */
function wordsToSegments(words: DeepgramWord[]): TranscriptionSegment[] {
  const segments: TranscriptionSegment[] = [];

  for (const word of words) {
    const speaker = word.speaker !== undefined ? String(word.speaker) : undefined;
    const last = segments[segments.length - 1];

    if (last && last.speaker === speaker) {
      last.text += ` ${word.word}`;
      last.endMs = Math.round(word.end * 1000);
    } else {
      segments.push({
        text: word.word,
        startMs: Math.round(word.start * 1000),
        endMs: Math.round(word.end * 1000),
        confidence: word.confidence,
        speaker,
      });
    }
  }

  return segments;
}

/** Optional cloud provider — disabled by default, requires an API key the user supplies. */
export class DeepgramProvider implements TranscriptionProvider {
  readonly id = 'deepgram' as const;
  readonly runsLocally = false;
  readonly requiresApiKey = true;

  constructor(private readonly config: DeepgramConfig) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async transcribe(audio: AudioInput): Promise<TranscriptionResult> {
    const bytes = await readFile(audio.filePath);
    const model = this.config.model ?? 'nova-2';

    const res = await fetch(
      `${DEEPGRAM_ENDPOINT}?model=${encodeURIComponent(model)}&smart_format=true&diarize=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.config.apiKey}`,
          'Content-Type': 'audio/wav',
        },
        body: bytes,
      }
    );

    if (!res.ok) {
      throw new Error(`Deepgram request failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as DeepgramResponse;
    const alt = data.results.channels[0]?.alternatives[0];
    if (!alt) return { fullText: '', segments: [], diarized: false };

    const hasSpeakerTags = alt.words.some((w) => w.speaker !== undefined);

    return {
      fullText: alt.transcript,
      segments: hasSpeakerTags
        ? wordsToSegments(alt.words)
        : [
            {
              text: alt.transcript,
              startMs: alt.words[0] ? Math.round(alt.words[0].start * 1000) : 0,
              endMs: alt.words.length ? Math.round(alt.words[alt.words.length - 1].end * 1000) : 0,
              confidence: alt.confidence,
            },
          ],
      diarized: hasSpeakerTags,
    };
  }
}
