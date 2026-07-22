'use client';

import { useEffect, useState } from 'react';
import {
  ABBREVIATION_POLICIES,
  ABBREVIATION_POLICY_LABELS,
  TOOTH_NUMBERING_LABELS,
  TOOTH_NUMBERING_SYSTEMS,
  type AbbreviationPolicy,
  type ToothNumberingSystem,
} from '../../../common/types/dentistProfile';
import { toFriendlyErrorMessage } from '../../lib/ipcError';

export function WritingStyleSection() {
  const [styleNotes, setStyleNotes] = useState('');
  const [toothNumbering, setToothNumbering] = useState<ToothNumberingSystem>('universal');
  const [abbreviationPolicy, setAbbreviationPolicy] = useState<AbbreviationPolicy>('preserve');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.dentiScribe.dentistProfile
      .get()
      .then((profile) => {
        setStyleNotes(profile.styleNotes);
        setToothNumbering(profile.toothNumbering);
        setAbbreviationPolicy(profile.abbreviationPolicy);
      })
      .catch((err) => setError(toFriendlyErrorMessage(err, 'Failed to load your writing style')))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await window.dentiScribe.dentistProfile.update({ styleNotes, toothNumbering, abbreviationPolicy });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to save your writing style'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-slate-400" htmlFor="style-notes">
          Describe your preferred writing style
        </label>
        <textarea
          id="style-notes"
          className="h-28 w-full resize-none rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          placeholder='e.g. "Use concise clinical language" or "Prefer restoration over filling"'
          value={styleNotes}
          onChange={(e) => setStyleNotes(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Free text — describe anything about how you like notes written. This gets included every time a note is
          formatted.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400" htmlFor="tooth-numbering">
          Tooth numbering system
        </label>
        <select
          id="tooth-numbering"
          className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          value={toothNumbering}
          onChange={(e) => setToothNumbering(e.target.value as ToothNumberingSystem)}
        >
          {TOOTH_NUMBERING_SYSTEMS.map((system) => (
            <option key={system} value={system}>
              {TOOTH_NUMBERING_LABELS[system]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400" htmlFor="abbreviation-policy">
          Abbreviations
        </label>
        <select
          id="abbreviation-policy"
          className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          value={abbreviationPolicy}
          onChange={(e) => setAbbreviationPolicy(e.target.value as AbbreviationPolicy)}
        >
          {ABBREVIATION_POLICIES.map((policy) => (
            <option key={policy} value={policy}>
              {ABBREVIATION_POLICY_LABELS[policy]}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-accent-cyan/90 px-4 py-2 text-sm font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
      </button>
    </div>
  );
}
