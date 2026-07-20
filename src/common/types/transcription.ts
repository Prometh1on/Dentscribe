export type TranscriptionProviderId = 'local-whisper' | 'deepgram' | 'openai-whisper';

export interface TranscriptionSegment {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
  /**
   * Speaker label (e.g. "0", "1"), when the provider supports diarization.
   * `undefined` means the provider didn't attempt speaker separation — the
   * local-whisper default doesn't (whisper.cpp has no speaker-ID model), so
   * every segment from it is unlabeled. Deepgram provides real diarization
   * (`diarize=true`) and populates this. Don't assume it's always present.
   */
  speaker?: string;
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptionSegment[];
  /** True if `segments[].speaker` is meaningful for this result. */
  diarized: boolean;
}

export interface AudioInput {
  /** Path to a local mono WAV file — every provider takes the same shape regardless of where it sends (or doesn't send) the bytes. */
  filePath: string;
  sampleRateHz: number;
}

/**
 * Implemented by every speech-to-text backend (local or cloud) so the Scribe
 * Panel and the sync/audio pipeline never branch on which one is active.
 * `local-whisper` is the default; cloud providers are optional opt-ins that
 * require an API key (see src/main/security/secretStore.ts).
 */
export interface TranscriptionProvider {
  readonly id: TranscriptionProviderId;
  readonly runsLocally: boolean;
  readonly requiresApiKey: boolean;
  isAvailable(): Promise<boolean>;
  transcribe(audio: AudioInput): Promise<TranscriptionResult>;
}
