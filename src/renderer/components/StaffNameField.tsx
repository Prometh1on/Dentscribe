'use client';

import { useEffect, useState } from 'react';
import type { StaffName } from '../../common/types/staffName';
import { toFriendlyErrorMessage } from '../lib/ipcError';

interface StaffNameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** Quick-add/select/remove list of remembered staff names, same pattern as style examples. */
export function StaffNameField({ value, onChange }: StaffNameFieldProps) {
  const [names, setNames] = useState<StaffName[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.dentiScribe.staffNames
      .list()
      .then(setNames)
      .catch((err) => setError(toFriendlyErrorMessage(err, 'Failed to load staff names')));
  }, []);

  async function handleRemember() {
    const trimmed = value.trim();
    if (!trimmed || names.some((n) => n.name === trimmed)) return;
    try {
      const created = await window.dentiScribe.staffNames.create({ name: trimmed });
      setNames((prev) => [...prev, created]);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to save staff name'));
    }
  }

  async function handleRemove(id: string) {
    try {
      await window.dentiScribe.staffNames.delete(id);
      setNames((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to remove staff name'));
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-slate-400" htmlFor="assisting-staff">
        Assisting Staff
      </label>
      <div className="flex gap-2">
        <input
          id="assisting-staff"
          list="staff-name-history"
          className="flex-1 rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-sm text-slate-200 outline-none focus:border-accent-cyan"
          placeholder="e.g. Jane Doe"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={handleRemember}
          disabled={!value.trim()}
          className="rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
        >
          Remember
        </button>
      </div>
      <datalist id="staff-name-history">
        {names.map((n) => (
          <option key={n.id} value={n.name} />
        ))}
      </datalist>
      {names.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {names.map((n) => (
            <span
              key={n.id}
              className="flex items-center gap-1 rounded-full border border-panel-border px-2 py-0.5 text-xs text-slate-400"
            >
              <button type="button" onClick={() => onChange(n.name)} className="hover:text-accent-cyan">
                {n.name}
              </button>
              <button type="button" onClick={() => handleRemove(n.id)} className="hover:text-accent-red" aria-label={`Remove ${n.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-accent-red">{error}</p> : null}
    </div>
  );
}
