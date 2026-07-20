'use client';

import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { SetupStatus, WhisperModelSize } from '../../../common/types/setup';

interface SetupWizardProps {
  onDone: () => void;
}

const MODEL_SIZE_LABELS: Record<WhisperModelSize, string> = {
  small: 'Small — fastest, lower accuracy',
  medium: 'Medium — balanced',
  large: 'Large — most accurate, slower without a GPU',
};

export function SetupWizard({ onDone }: SetupWizardProps) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelSize, setModelSize] = useState<WhisperModelSize>('medium');

  function refreshStatus() {
    setLoadingStatus(true);
    return window.dentiScribe.setup
      .checkStatus()
      .then(setStatus)
      .finally(() => setLoadingStatus(false));
  }

  useEffect(() => {
    refreshStatus();
    const unsubscribe = window.dentiScribe.setup.onProgress((event) => {
      setProgressMessage(event.message);
      setProgressPercent(event.percent ?? null);
    });
    return unsubscribe;
  }, []);

  async function runAction(name: string, action: () => Promise<void>) {
    setRunningAction(name);
    setError(null);
    setProgressMessage(null);
    setProgressPercent(null);
    try {
      await action();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRunningAction(null);
      setProgressMessage(null);
      setProgressPercent(null);
    }
  }

  const ollamaReady = status?.ollama.running && status.ollama.modelPulled;
  const whisperReady = status?.whisper.binaryInstalled && status?.whisper.modelInstalled;
  const allReady = ollamaReady && whisperReady;
  const busy = runningAction !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto">
        <Card title="First-Time Setup">
          <div className="space-y-6">
            <p className="text-sm text-slate-400">
              DentiScribe AI runs its AI locally on this computer — nothing ever leaves the machine. That needs two
              free pieces of software installed once. Click through the steps below; each one runs in the
              background.
            </p>

            {loadingStatus ? (
              <p className="text-sm text-slate-500">Checking what&apos;s already installed…</p>
            ) : (
              <>
                <section className="rounded-lg border border-panel-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-200">Note Formatting Engine (Ollama)</h4>
                    {ollamaReady ? <Badge tone="green">Ready</Badge> : <Badge tone="neutral">Not set up</Badge>}
                  </div>

                  {!status?.ollama.running ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runAction('ollama-install', () => window.dentiScribe.setup.installOllama())}
                      className="w-full rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
                    >
                      {runningAction === 'ollama-install' ? 'Installing…' : 'Install Ollama'}
                    </button>
                  ) : !status.ollama.modelPulled ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runAction('ollama-model', () => window.dentiScribe.setup.pullOllamaModel())}
                      className="w-full rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
                    >
                      {runningAction === 'ollama-model' ? 'Downloading model…' : 'Download AI Model'}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-500">Installed and ready.</p>
                  )}
                </section>

                <section className="rounded-lg border border-panel-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-200">Transcription Engine (Whisper)</h4>
                    {whisperReady ? <Badge tone="green">Ready</Badge> : <Badge tone="neutral">Not set up</Badge>}
                  </div>

                  {!status?.whisper.binaryInstalled ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runAction('whisper-install', () => window.dentiScribe.setup.installWhisper())}
                      className="w-full rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
                    >
                      {runningAction === 'whisper-install' ? 'Installing…' : 'Install Whisper Engine'}
                    </button>
                  ) : !status?.whisper.modelInstalled ? (
                    <div className="space-y-2">
                      <select
                        className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
                        value={modelSize}
                        onChange={(e) => setModelSize(e.target.value as WhisperModelSize)}
                        disabled={busy}
                      >
                        {(Object.keys(MODEL_SIZE_LABELS) as WhisperModelSize[]).map((size) => (
                          <option key={size} value={size}>
                            {MODEL_SIZE_LABELS[size]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction('whisper-model', () => window.dentiScribe.setup.downloadWhisperModel(modelSize))
                        }
                        className="w-full rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
                      >
                        {runningAction === 'whisper-model' ? 'Downloading…' : 'Download Transcription Model'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Installed and ready.</p>
                  )}
                </section>
              </>
            )}

            {busy && progressMessage ? (
              <div className="rounded-lg border border-panel-border bg-panel-bg/60 p-3">
                <p className="mb-2 text-sm text-slate-300">{progressMessage}</p>
                {progressPercent !== null ? (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
                    <div
                      className="h-full bg-accent-cyan transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="text-sm text-accent-red">{error}</p> : null}

            <div className="flex items-center gap-3 border-t border-panel-border pt-4">
              <button
                type="button"
                onClick={onDone}
                disabled={busy}
                className="rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
              >
                {allReady ? 'Continue' : 'Skip for now'}
              </button>
              <span className="text-xs text-slate-500">You can finish this later from Settings.</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
