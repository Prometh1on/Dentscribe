import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import type { AudioInput, TranscriptionProvider, TranscriptionResult, TranscriptionSegment } from '../../../common/types/transcription';

export interface LocalWhisperConfig {
  /** Path to a whisper.cpp CLI binary (e.g. whisper-cli.exe / main.exe). */
  binaryPath: string;
  /** Path to a downloaded ggml/gguf Whisper model file (e.g. ggml-large-v3.bin). */
  modelPath: string;
}

interface WhisperCliJsonSegment {
  offsets: { from: number; to: number };
  text: string;
}

interface WhisperCliJsonOutput {
  transcription: WhisperCliJsonSegment[];
}

/**
 * Wraps the whisper.cpp CLI as a subprocess rather than bundling faster-whisper.
 * faster-whisper is Python/CTranslate2-based and would require shipping a Python
 * runtime inside this Electron app; whisper.cpp ships prebuilt Windows binaries
 * and needs no Python, which fits a pure Node/Electron app better.
 *
 * The CLI flags and JSON output shape below are verified against a real binary
 * (whisper.cpp v1.9.1, whisper-cli.exe, `whisper-bin-x64.zip`), not just
 * documented behavior: downloaded the real release, ran `--help` to confirm
 * `-m`/`-f`/`-oj`/`-of`/`-nt` all exist exactly as used here, then ran an actual
 * transcription and confirmed the output JSON is `{ transcription: [{ offsets:
 * { from, to }, text }] }` — matching `WhisperCliJsonOutput` below exactly.
 */
export class LocalWhisperProvider implements TranscriptionProvider {
  readonly id = 'local-whisper' as const;
  readonly runsLocally = true;
  readonly requiresApiKey = false;

  constructor(private readonly config: LocalWhisperConfig) {}

  async isAvailable(): Promise<boolean> {
    return existsSync(this.config.binaryPath) && existsSync(this.config.modelPath);
  }

  async transcribe(audio: AudioInput): Promise<TranscriptionResult> {
    const outputJsonPath = `${audio.filePath}.json`;

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(this.config.binaryPath, [
        '-m', this.config.modelPath,
        '-f', audio.filePath,
        '-oj',
        '-of', audio.filePath,
        '-nt',
      ]);

      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`whisper.cpp exited with code ${code}: ${stderr}`));
      });
    });

    const raw = await readFile(outputJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as WhisperCliJsonOutput;
    await unlink(outputJsonPath).catch(() => {});

    const segments: TranscriptionSegment[] = parsed.transcription.map((seg) => ({
      text: seg.text.trim(),
      startMs: seg.offsets.from,
      endMs: seg.offsets.to,
    }));

    return {
      fullText: segments.map((s) => s.text).join(' ').trim(),
      segments,
      diarized: false,
    };
  }
}
