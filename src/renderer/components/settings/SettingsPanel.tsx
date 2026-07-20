'use client';

import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CREDENTIAL_NAMES, type CloudCredentialName } from '../../../common/types/credentials';
import type { AiConfigSchema } from '../../../common/types/aiConfig';
import type { TranscriptionProviderId } from '../../../common/types/transcription';
import type { LlmProviderId } from '../../../common/types/llm';

const CREDENTIAL_ROWS: Array<{ name: CloudCredentialName; label: string }> = [
  { name: CREDENTIAL_NAMES.deepgram, label: 'Deepgram' },
  { name: CREDENTIAL_NAMES.openai, label: 'OpenAI' },
  { name: CREDENTIAL_NAMES.anthropic, label: 'Anthropic (Claude)' },
];

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<AiConfigSchema | null>(null);
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean>>({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.dentiScribe.settings.getConfig().then(setConfig);
    Promise.all(CREDENTIAL_ROWS.map((row) => window.dentiScribe.settings.hasCloudApiKey(row.name))).then(
      (results) => {
        const status: Record<string, boolean> = {};
        CREDENTIAL_ROWS.forEach((row, i) => {
          status[row.name] = results[i];
        });
        setKeyStatus(status);
      }
    );
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await window.dentiScribe.settings.updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveKey(name: CloudCredentialName) {
    const value = keyInputs[name];
    if (!value?.trim()) return;
    await window.dentiScribe.settings.setCloudApiKey(name, value);
    setKeyStatus((prev) => ({ ...prev, [name]: true }));
    setKeyInputs((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleClearKey(name: CloudCredentialName) {
    await window.dentiScribe.settings.clearCloudApiKey(name);
    setKeyStatus((prev) => ({ ...prev, [name]: false }));
  }

  if (!config) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <p className="text-slate-400">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto">
        <Card title="Settings">
          <div className="space-y-6">
            <section>
              <h4 className="mb-2 text-sm font-semibold text-slate-300">Speech-to-Text Provider</h4>
              <select
                className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
                value={config.transcriptionProvider}
                onChange={(e) =>
                  setConfig({ ...config, transcriptionProvider: e.target.value as TranscriptionProviderId })
                }
              >
                <option value="local-whisper">Local Whisper (free, default)</option>
                <option value="deepgram">Deepgram (cloud, diarization supported)</option>
                <option value="openai-whisper">OpenAI Whisper (cloud)</option>
              </select>

              {config.transcriptionProvider === 'local-whisper' ? (
                <div className="mt-2 space-y-2">
                  <input
                    className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
                    placeholder="Path to whisper.cpp binary"
                    value={config.localWhisper.binaryPath}
                    onChange={(e) =>
                      setConfig({ ...config, localWhisper: { ...config.localWhisper, binaryPath: e.target.value } })
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
                    placeholder="Path to Whisper model file (.bin)"
                    value={config.localWhisper.modelPath}
                    onChange={(e) =>
                      setConfig({ ...config, localWhisper: { ...config.localWhisper, modelPath: e.target.value } })
                    }
                  />
                </div>
              ) : null}
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-slate-300">Note Formatting Provider</h4>
              <select
                className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
                value={config.llmProvider}
                onChange={(e) => setConfig({ ...config, llmProvider: e.target.value as LlmProviderId })}
              >
                <option value="ollama">Ollama (free, default)</option>
                <option value="claude">Claude (cloud)</option>
                <option value="openai">OpenAI (cloud)</option>
              </select>

              {config.llmProvider === 'ollama' ? (
                <div className="mt-2 space-y-2">
                  <input
                    className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
                    placeholder="Ollama host (e.g. http://localhost:11434)"
                    value={config.ollama.host}
                    onChange={(e) => setConfig({ ...config, ollama: { ...config.ollama, host: e.target.value } })}
                  />
                  <input
                    className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
                    placeholder="Model name (e.g. llama3)"
                    value={config.ollama.model}
                    onChange={(e) => setConfig({ ...config, ollama: { ...config.ollama, model: e.target.value } })}
                  />
                </div>
              ) : null}
            </section>

            <section>
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={config.cloudProviderConsentAcknowledged}
                  onChange={(e) => setConfig({ ...config, cloudProviderConsentAcknowledged: e.target.checked })}
                />
                <span>
                  I confirm a signed BAA is in place with any cloud provider enabled above before real patient
                  audio/transcripts are sent to it. Required to use any cloud provider — local providers never
                  need this.
                </span>
              </label>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-slate-300">Cloud API Keys</h4>
              <div className="space-y-2">
                {CREDENTIAL_ROWS.map((row) => (
                  <div key={row.name} className="rounded-lg border border-panel-border bg-panel-bg/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-slate-200">{row.label}</span>
                      {keyStatus[row.name] ? (
                        <Badge tone="green">Configured</Badge>
                      ) : (
                        <Badge tone="neutral">Not set</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="flex-1 rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
                        placeholder="API key"
                        value={keyInputs[row.name] ?? ''}
                        onChange={(e) => setKeyInputs((prev) => ({ ...prev, [row.name]: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveKey(row.name)}
                        className="rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-accent-cyan hover:text-accent-cyan"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClearKey(row.name)}
                        className="rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-accent-red hover:text-accent-red"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {error ? <p className="text-sm text-accent-red">{error}</p> : null}

            <div className="flex items-center gap-3 border-t border-panel-border pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
              {saved ? <Badge tone="green">Saved</Badge> : null}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto text-sm font-medium text-slate-400 transition hover:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
