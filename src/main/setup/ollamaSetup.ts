import { spawn } from 'node:child_process';
import type { SetupProgressEvent } from '../../common/types/setup';

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

interface OllamaPullLine {
  status?: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export async function checkOllamaRunning(host: string): Promise<boolean> {
  try {
    const res = await fetch(`${host}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

/** Matches on the model family (before the ":") too, since Ollama normalizes tags in ways that don't always round-trip exactly. */
export async function checkModelPulled(host: string, model: string): Promise<boolean> {
  try {
    const res = await fetch(`${host}/api/tags`);
    if (!res.ok) return false;
    const data = (await res.json()) as OllamaTagsResponse;
    const family = model.split(':')[0];
    return data.models.some((m) => m.name === model || m.name.startsWith(`${family}:`));
  } catch {
    return false;
  }
}

/**
 * Shells out to winget rather than downloading/running Ollama's own installer
 * directly — winget already handles silent installation reliably in this
 * environment (proven earlier in this project's own setup), whereas Ollama's
 * raw InnoSetup installer has real reported issues with unattended flags.
 * Requires winget to be present, which ships by default on Windows 10 1809+/11.
 */
export function installOllama(onProgress: (event: SetupProgressEvent) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    onProgress({ step: 'ollama-install', message: 'Installing Ollama…' });

    const proc = spawn('winget', [
      'install',
      '--id',
      'Ollama.Ollama',
      '-e',
      '--silent',
      '--accept-package-agreements',
      '--accept-source-agreements',
    ]);

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        onProgress({ step: 'ollama-install', message: 'Ollama installed.', percent: 100 });
        resolve();
      } else {
        reject(new Error(`Installing Ollama failed (winget exited ${code}): ${stderr}`));
      }
    });
  });
}

/**
 * Verified against Ollama's documented /api/pull contract: request body uses
 * `model` (not `name`), streaming NDJSON lines carry `status`/`total`/`completed`,
 * and `{"status": "success"}` marks completion.
 */
export async function pullModel(
  host: string,
  model: string,
  onProgress: (event: SetupProgressEvent) => void
): Promise<void> {
  const res = await fetch(`${host}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: true }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to start model pull: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line) as OllamaPullLine;
      const percent =
        parsed.completed !== undefined && parsed.total ? Math.round((parsed.completed / parsed.total) * 100) : undefined;
      onProgress({ step: 'ollama-pull-model', message: parsed.status ?? 'Downloading model…', percent });
    }
  }
}
