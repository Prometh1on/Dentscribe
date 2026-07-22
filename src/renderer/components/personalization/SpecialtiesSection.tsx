'use client';

import { useEffect, useState } from 'react';
import { toFriendlyErrorMessage } from '../../lib/ipcError';

export function SpecialtiesSection() {
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.dentiScribe.dentistProfile
      .get()
      .then((profile) => setSpecialty(profile.specialty))
      .catch((err) => setError(toFriendlyErrorMessage(err, 'Failed to load your specialties')))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await window.dentiScribe.dentistProfile.update({ specialty });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to save your specialties'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-slate-400" htmlFor="specialty">
          Specialty
        </label>
        <input
          id="specialty"
          className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          placeholder="e.g. General Dentistry, Orthodontics, Endodontics"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Gives the AI extra context about the kind of care you provide, so it can format notes appropriately.
        </p>
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
