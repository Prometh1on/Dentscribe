'use client';

import { useState } from 'react';
import { CONVERSATION_CATEGORIES, CONVERSATION_CATEGORY_LABELS, type ConversationCategory } from '../../../common/types/category';
import type { TranscriptionResult } from '../../../common/types/transcription';
import { toFriendlyErrorMessage } from '../../lib/ipcError';

const SAMPLE_TRANSCRIPT =
  "Doctor: Hi Sarah, what brings you in today. Patient: My back tooth has been really sensitive to cold for a few days. Doctor: Let me take a look. I can see some decay on the lower right first molar. We should do a filling.";

function plainTranscriptionResult(text: string): TranscriptionResult {
  return { fullText: text, segments: [{ text, startMs: 0, endMs: 0 }], diarized: false };
}

/** Sandbox: runs the real formatting pipeline (profile + vocabulary + examples) against a sample transcript so a dentist can see how their personalisation settings change the output, without touching any real encounter. */
export function PreviewSection() {
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [category, setCategory] = useState<ConversationCategory>('restorative');
  const [result, setResult] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRunTest() {
    if (!transcript.trim()) return;
    setRunning(true);
    setError(null);
    setResult('');
    try {
      const output = await window.dentiScribe.scribe.formatNote(plainTranscriptionResult(transcript), category);
      setResult(output);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to generate a test note'));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 p-3">
        <p className="text-xs text-slate-300">
          <strong>This is a test.</strong> Nothing here is saved or treated as a real encounter — use it to see how
          your writing style, vocabulary, and example notes change the AI&apos;s output. Feel free to edit the sample
          transcript below, but don&apos;t paste any real patient information here.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400" htmlFor="preview-category">
          Appointment Type
        </label>
        <select
          id="preview-category"
          className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          value={category}
          onChange={(e) => setCategory(e.target.value as ConversationCategory)}
        >
          {CONVERSATION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CONVERSATION_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400" htmlFor="preview-transcript">
          Sample transcript
        </label>
        <textarea
          id="preview-transcript"
          className="h-28 w-full resize-none rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={handleRunTest}
        disabled={running || !transcript.trim()}
        className="rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
      >
        {running ? 'Generating…' : 'Test with example consultation'}
      </button>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      {result ? (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Test output</h4>
          <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-panel-border bg-panel-bg/60 p-3 text-clinical text-slate-200">
            {result}
          </div>
        </div>
      ) : null}
    </div>
  );
}
