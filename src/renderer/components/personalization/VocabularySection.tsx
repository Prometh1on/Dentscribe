'use client';

import { useEffect, useState } from 'react';
import type { AbbreviationPreference, TerminologyPreference } from '../../../common/types/dentistProfile';
import { toFriendlyErrorMessage } from '../../lib/ipcError';

export function VocabularySection() {
  const [terminology, setTerminology] = useState<TerminologyPreference[]>([]);
  const [abbreviations, setAbbreviations] = useState<AbbreviationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [avoidTerm, setAvoidTerm] = useState('');
  const [preferTerm, setPreferTerm] = useState('');
  const [addingTerm, setAddingTerm] = useState(false);

  const [abbreviation, setAbbreviation] = useState('');
  const [expansion, setExpansion] = useState('');
  const [addingAbbreviation, setAddingAbbreviation] = useState(false);

  useEffect(() => {
    Promise.all([window.dentiScribe.terminologyPreferences.list(), window.dentiScribe.abbreviationPreferences.list()])
      .then(([terminologyList, abbreviationList]) => {
        setTerminology(terminologyList);
        setAbbreviations(abbreviationList);
      })
      .catch((err) => setError(toFriendlyErrorMessage(err, 'Failed to load your vocabulary preferences')))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddTerm(e: React.FormEvent) {
    e.preventDefault();
    if (!avoidTerm.trim() || !preferTerm.trim()) return;
    setAddingTerm(true);
    setError(null);
    try {
      const created = await window.dentiScribe.terminologyPreferences.create({
        avoidTerm: avoidTerm.trim(),
        preferTerm: preferTerm.trim(),
      });
      setTerminology((prev) => [...prev, created]);
      setAvoidTerm('');
      setPreferTerm('');
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to add term preference'));
    } finally {
      setAddingTerm(false);
    }
  }

  async function handleRemoveTerm(id: string) {
    setError(null);
    try {
      await window.dentiScribe.terminologyPreferences.delete(id);
      setTerminology((prev) => prev.filter((pref) => pref.id !== id));
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to remove term preference'));
    }
  }

  async function handleAddAbbreviation(e: React.FormEvent) {
    e.preventDefault();
    if (!abbreviation.trim() || !expansion.trim()) return;
    setAddingAbbreviation(true);
    setError(null);
    try {
      const created = await window.dentiScribe.abbreviationPreferences.create({
        abbreviation: abbreviation.trim(),
        expansion: expansion.trim(),
      });
      setAbbreviations((prev) => [...prev, created]);
      setAbbreviation('');
      setExpansion('');
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to add abbreviation'));
    } finally {
      setAddingAbbreviation(false);
    }
  }

  async function handleRemoveAbbreviation(id: string) {
    setError(null);
    try {
      await window.dentiScribe.abbreviationPreferences.delete(id);
      setAbbreviations((prev) => prev.filter((pref) => pref.id !== id));
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to remove abbreviation'));
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <section>
        <h4 className="mb-2 text-sm font-semibold text-slate-300">Preferred terms</h4>
        <div className="mb-2 space-y-1">
          {terminology.length === 0 ? (
            <p className="text-sm text-slate-500">None yet — e.g. &quot;restoration&quot; instead of &quot;filling&quot;.</p>
          ) : (
            terminology.map((pref) => (
              <div
                key={pref.id}
                className="flex items-center justify-between rounded-lg border border-panel-border bg-panel-bg/60 px-3 py-2 text-sm text-slate-200"
              >
                <span>
                  Use <strong>{pref.preferTerm}</strong> instead of <strong>{pref.avoidTerm}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveTerm(pref.id)}
                  className="ml-2 text-xs text-slate-500 transition hover:text-accent-red"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleAddTerm} className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
            placeholder="Avoid (e.g. filling)"
            value={avoidTerm}
            onChange={(e) => setAvoidTerm(e.target.value)}
          />
          <input
            className="flex-1 rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
            placeholder="Prefer (e.g. restoration)"
            value={preferTerm}
            onChange={(e) => setPreferTerm(e.target.value)}
          />
          <button
            type="submit"
            disabled={addingTerm || !avoidTerm.trim() || !preferTerm.trim()}
            className="rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>

      <section>
        <h4 className="mb-2 text-sm font-semibold text-slate-300">Abbreviations to always expand</h4>
        <div className="mb-2 space-y-1">
          {abbreviations.length === 0 ? (
            <p className="text-sm text-slate-500">None yet — e.g. &quot;RCT&quot; → &quot;root canal treatment&quot;.</p>
          ) : (
            abbreviations.map((pref) => (
              <div
                key={pref.id}
                className="flex items-center justify-between rounded-lg border border-panel-border bg-panel-bg/60 px-3 py-2 text-sm text-slate-200"
              >
                <span>
                  <strong>{pref.abbreviation}</strong> → {pref.expansion}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAbbreviation(pref.id)}
                  className="ml-2 text-xs text-slate-500 transition hover:text-accent-red"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleAddAbbreviation} className="flex gap-2">
          <input
            className="w-32 rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
            placeholder="RCT"
            value={abbreviation}
            onChange={(e) => setAbbreviation(e.target.value)}
          />
          <input
            className="flex-1 rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
            placeholder="root canal treatment"
            value={expansion}
            onChange={(e) => setExpansion(e.target.value)}
          />
          <button
            type="submit"
            disabled={addingAbbreviation || !abbreviation.trim() || !expansion.trim()}
            className="rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </section>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
    </div>
  );
}
