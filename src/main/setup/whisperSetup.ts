import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';
import type { SetupProgressEvent, WhisperModelSize } from '../../common/types/setup';

/**
 * Points at GitHub's "latest release" redirect rather than a pinned version tag,
 * so this URL stays correct as whisper.cpp ships new releases. Verified by
 * actually resolving it (200, real asset) and downloading/running the binary —
 * see localWhisperProvider.ts's header comment for the full verification trail.
 */
const WHISPER_ZIP_URL = 'https://github.com/ggml-org/whisper.cpp/releases/latest/download/whisper-bin-x64.zip';

/**
 * Deliberately conservative mapping for a typical office PC with no dedicated GPU:
 * whisper.cpp's own "large-v3" model is the most accurate but painfully slow on
 * CPU alone, so "large" here maps to "medium.en" — the most accurate tier that's
 * still practically usable without a GPU, not literally whisper's own "large" model.
 */
const MODEL_FILENAMES: Record<WhisperModelSize, string> = {
  small: 'ggml-base.en.bin',
  medium: 'ggml-small.en.bin',
  large: 'ggml-medium.en.bin',
};

function whisperInstallDir(): string {
  return join(app.getPath('userData'), 'whisper');
}

export function checkWhisperFiles(binaryPath: string, modelPath: string): { binaryInstalled: boolean; modelInstalled: boolean } {
  return {
    binaryInstalled: Boolean(binaryPath) && existsSync(binaryPath),
    modelInstalled: Boolean(modelPath) && existsSync(modelPath),
  };
}

async function downloadFile(url: string, destPath: string, onPercent: (percent: number) => void): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status} ${url}`);
  }

  const total = Number(res.headers.get('content-length') ?? 0);
  let downloaded = 0;
  const fileStream = createWriteStream(destPath);
  const reader = res.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      downloaded += value.length;
      if (total > 0) onPercent(Math.round((downloaded / total) * 100));

      await new Promise<void>((resolve, reject) => {
        fileStream.write(Buffer.from(value), (err) => (err ? reject(err) : resolve()));
      });
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      fileStream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
  }
}

/** Windows ships `tar.exe` (libarchive-based) since 10 1803 / all of 11 — it extracts .zip natively, no extra dependency needed. */
function extractZip(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    mkdirSync(destDir, { recursive: true });
    const proc = spawn('tar', ['-xf', zipPath, '-C', destDir]);

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Extracting Whisper engine failed (tar exited ${code}): ${stderr}`));
    });
  });
}

/** Downloads and extracts the whisper.cpp CLI + its required DLLs; returns the path to whisper-cli.exe. */
export async function installWhisperBinary(onProgress: (event: SetupProgressEvent) => void): Promise<string> {
  const installDir = whisperInstallDir();
  const zipPath = join(app.getPath('temp'), 'whisper-bin-x64.zip');

  onProgress({ step: 'whisper-install', message: 'Downloading Whisper engine…', percent: 0 });
  await downloadFile(WHISPER_ZIP_URL, zipPath, (percent) => {
    onProgress({ step: 'whisper-install', message: 'Downloading Whisper engine…', percent });
  });

  onProgress({ step: 'whisper-install', message: 'Extracting…' });
  await extractZip(zipPath, installDir);
  await unlink(zipPath).catch(() => {});

  const binaryPath = join(installDir, 'Release', 'whisper-cli.exe');
  onProgress({ step: 'whisper-install', message: 'Whisper engine installed.', percent: 100 });
  return binaryPath;
}

/** Downloads a ggml model from its stable Hugging Face URL; returns the local file path. */
export async function downloadWhisperModel(
  size: WhisperModelSize,
  onProgress: (event: SetupProgressEvent) => void
): Promise<string> {
  const filename = MODEL_FILENAMES[size];
  const modelsDir = join(whisperInstallDir(), 'models');
  mkdirSync(modelsDir, { recursive: true });
  const modelPath = join(modelsDir, filename);

  onProgress({ step: 'whisper-model-download', message: `Downloading ${size} model…`, percent: 0 });
  await downloadFile(`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${filename}`, modelPath, (percent) => {
    onProgress({ step: 'whisper-model-download', message: `Downloading ${size} model…`, percent });
  });
  onProgress({ step: 'whisper-model-download', message: 'Model downloaded.', percent: 100 });

  return modelPath;
}
