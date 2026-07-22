'use client';

import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { CONVERSATION_CATEGORIES, CONVERSATION_CATEGORY_LABELS, type ConversationCategory } from '../../../common/types/category';
import { useStyleExamples } from '../../hooks/useStyleExamples';

export function ExampleLibrarySection() {
  const { examples, loading, saving, error, addExample, removeExample } = useStyleExamples();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<ConversationCategory>('other');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const ok = await addExample({ title, content, category: category === 'other' ? undefined : category });
    if (ok) {
      setTitle('');
      setContent('');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Upload 5-20 of your own previously-written notes (already anonymised — remove any patient-identifying
        details before pasting them here). The AI uses these as style reference when formatting new notes.
      </p>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : examples.length === 0 ? (
          <p className="text-sm text-slate-500">No examples yet. Add your first one below.</p>
        ) : (
          examples.map((example) => (
            <div key={example.id} className="rounded-lg border border-panel-border bg-panel-bg/60 p-3">
              <div className="flex items-center justify-between">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm text-slate-200">{example.title}</span>
                  {example.category ? (
                    <Badge tone="neutral">{CONVERSATION_CATEGORY_LABELS[example.category]}</Badge>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => removeExample(example.id)}
                  className="ml-2 shrink-0 text-xs text-slate-500 transition hover:text-accent-red"
                >
                  Remove
                </button>
              </div>
              {example.extractedStyle ? (
                <div className="mt-2 rounded-md border border-panel-border/60 bg-panel-bg/40 p-2">
                  <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                    What the system noticed
                  </p>
                  <p className="whitespace-pre-wrap text-xs text-slate-400">{example.extractedStyle}</p>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          placeholder="Example title (e.g. Routine checkup note)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="h-24 w-full resize-none rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          placeholder="Paste one of your own already-anonymised formatted notes here…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <select
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
        <button
          type="submit"
          disabled={saving || !title.trim() || !content.trim()}
          className="w-full rounded-lg border border-panel-border py-2 text-sm font-medium text-slate-200 transition hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add Example'}
        </button>
      </form>
    </div>
  );
}
