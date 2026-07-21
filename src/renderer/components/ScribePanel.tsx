'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { StaffNameField } from './StaffNameField';
import { DocumentGenerator } from './DocumentGenerator';
import type { StyleExample } from '../../common/types/styleExample';
import type { TranscriptionResult } from '../../common/types/transcription';
import { CONVERSATION_CATEGORIES, CONVERSATION_CATEGORY_LABELS, type ConversationCategory } from '../../common/types/category';
import { AudioRecorder } from '../lib/audioCapture';
import { toFriendlyErrorMessage } from '../lib/ipcError';

function plainTranscriptionResult(text: string): TranscriptionResult {
  return { fullText: text, segments: [{ text, startMs: 0, endMs: 0 }], diarized: false };
}

export function ScribePanel() {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState('');
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);

  const [formattedNote, setFormattedNote] = useState('');
  const [formatting, setFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState<ConversationCategory>('other');
  const [assistingStaff, setAssistingStaff] = useState('');

  const [examples, setExamples] = useState<StyleExample[]>([]);
  const [examplesLoading, setExamplesLoading] = useState(true);
  const [examplesError, setExamplesError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newExampleCategory, setNewExampleCategory] = useState<ConversationCategory>('other');
  const [addingExample, setAddingExample] = useState(false);

  useEffect(() => {
    window.dentiScribe.styleExamples
      .list()
      .then(setExamples)
      .catch((err) => setExamplesError(toFriendlyErrorMessage(err, 'Failed to load style examples')))
      .finally(() => setExamplesLoading(false));
  }, []);

  async function handleToggleRecording() {
    setRecordError(null);

    if (isRecording) {
      setIsRecording(false);
      setTranscribing(true);
      try {
        const recorder = recorderRef.current;
        if (!recorder) return;
        const { wavBytes, sampleRateHz } = await recorder.stop();
        const result = await window.dentiScribe.scribe.transcribeAudio(wavBytes, sampleRateHz);
        setTranscriptionResult(result);
        setTranscript(result.fullText);
      } catch (err) {
        setRecordError(toFriendlyErrorMessage(err, 'Failed to transcribe recording'));
      } finally {
        setTranscribing(false);
      }
      return;
    }

    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setRecordError(toFriendlyErrorMessage(err, 'Could not access the microphone'));
    }
  }

  function handleTranscriptChange(value: string) {
    setTranscript(value);
    // Editing the text invalidates any diarization tied to the original recording.
    if (transcriptionResult && value !== transcriptionResult.fullText) {
      setTranscriptionResult(null);
    }
  }

  async function handleFormat() {
    if (!transcript.trim()) return;
    setFormatting(true);
    setFormatError(null);
    setCopied(false);
    try {
      const effectiveResult =
        transcriptionResult && transcriptionResult.fullText === transcript
          ? transcriptionResult
          : plainTranscriptionResult(transcript);
      const result = await window.dentiScribe.scribe.formatNote(effectiveResult, category, assistingStaff);
      setFormattedNote(result);
    } catch (err) {
      setFormatError(toFriendlyErrorMessage(err, 'Failed to format note'));
    } finally {
      setFormatting(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(formattedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAddExample(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setAddingExample(true);
    setExamplesError(null);
    try {
      const created = await window.dentiScribe.styleExamples.create({
        title: newTitle,
        content: newContent,
        category: newExampleCategory === 'other' ? undefined : newExampleCategory,
      });
      setExamples((prev) => [...prev, created]);
      setNewTitle('');
      setNewContent('');
    } catch (err) {
      setExamplesError(toFriendlyErrorMessage(err, 'Failed to add style example'));
    } finally {
      setAddingExample(false);
    }
  }

  async function handleDeleteExample(id: string) {
    setExamplesError(null);
    try {
      await window.dentiScribe.styleExamples.delete(id);
      setExamples((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setExamplesError(toFriendlyErrorMessage(err, 'Failed to remove style example'));
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="Transcript" className="col-span-2">
        <textarea
          className="h-56 w-full resize-none rounded-lg border border-panel-border bg-panel-bg/60 p-3 text-clinical text-slate-200 outline-none focus:border-accent-cyan"
          placeholder="Record, or paste/type the encounter transcript here…"
          value={transcript}
          onChange={(e) => handleTranscriptChange(e.target.value)}
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="conversation-category">
              Appointment Type
            </label>
            <select
              id="conversation-category"
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
          <StaffNameField value={assistingStaff} onChange={setAssistingStaff} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleFormat}
            disabled={formatting || !transcript.trim()}
            className="rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
          >
            {formatting ? 'Formatting…' : 'Format Note'}
          </button>
          {formatError ? <span className="text-sm text-accent-red">{formatError}</span> : null}
        </div>
      </Card>

      <Card title="Recording">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isRecording ? (
              <Badge tone="red">Recording</Badge>
            ) : transcribing ? (
              <Badge tone="amber">Transcribing…</Badge>
            ) : (
              <Badge tone="neutral">Idle</Badge>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleRecording}
            disabled={transcribing}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              isRecording
                ? 'bg-accent-red/90 text-panel-bg hover:bg-accent-red'
                : 'bg-accent-cyan/90 text-panel-bg hover:bg-accent-cyan'
            }`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          {recordError ? <p className="text-sm text-accent-red">{recordError}</p> : null}
          <p className="text-xs text-slate-500">
            Speaker labels appear automatically only if a diarization-capable provider (e.g. Deepgram) is
            configured — the local default doesn&apos;t separate speakers.
          </p>
        </div>
      </Card>

      <Card title="Formatted Note" className="col-span-2">
        <div className="h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-panel-border bg-panel-bg/60 p-3 text-clinical text-slate-200">
          {formattedNote || <span className="text-slate-500">Formatted note will appear here.</span>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!formattedNote}
            className="rounded-lg border border-panel-border px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
          >
            Copy
          </button>
          {copied ? <Badge tone="green">Copied</Badge> : null}
        </div>
      </Card>

      <DocumentGenerator formattedNote={formattedNote} />

      <Card title="My Style Examples">
        <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
          {examplesLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : examples.length === 0 ? (
            <p className="text-sm text-slate-500">
              No examples yet. Add one of your own formatted notes below so the AI can match your style.
            </p>
          ) : (
            examples.map((example) => (
              <div
                key={example.id}
                className="flex items-center justify-between rounded-lg border border-panel-border bg-panel-bg/60 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-slate-200">{example.title}</span>
                  {example.category ? (
                    <Badge tone="neutral">{CONVERSATION_CATEGORY_LABELS[example.category]}</Badge>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteExample(example.id)}
                  className="ml-2 shrink-0 text-xs text-slate-500 transition hover:text-accent-red"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {examplesError ? <p className="mb-2 text-sm text-accent-red">{examplesError}</p> : null}

        <form onSubmit={handleAddExample} className="space-y-2">
          <input
            className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
            placeholder="Example title (e.g. Routine checkup note)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="h-20 w-full resize-none rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
            placeholder="Paste one of your own formatted notes here…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <select
            className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
            value={newExampleCategory}
            onChange={(e) => setNewExampleCategory(e.target.value as ConversationCategory)}
          >
            {CONVERSATION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CONVERSATION_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={addingExample || !newTitle.trim() || !newContent.trim()}
            className="w-full rounded-lg border border-panel-border py-2 text-sm font-medium text-slate-200 transition hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
          >
            {addingExample ? 'Adding…' : 'Add Example'}
          </button>
        </form>
      </Card>
    </div>
  );
}
