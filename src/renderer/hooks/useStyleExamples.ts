import { useEffect, useState } from 'react';
import type { CreateStyleExampleInput, StyleExample } from '../../common/types/styleExample';
import { toFriendlyErrorMessage } from '../lib/ipcError';

/** Shared style-example CRUD, used by both the quick-add card in ScribePanel and the full library view in Personalisation — same underlying table, one place for the fetch/add/remove logic. */
export function useStyleExamples() {
  const [examples, setExamples] = useState<StyleExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.dentiScribe.styleExamples
      .list()
      .then(setExamples)
      .catch((err) => setError(toFriendlyErrorMessage(err, 'Failed to load style examples')))
      .finally(() => setLoading(false));
  }, []);

  async function addExample(input: CreateStyleExampleInput): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const created = await window.dentiScribe.styleExamples.create(input);
      setExamples((prev) => [...prev, created]);
      return true;
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to add style example'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeExample(id: string): Promise<void> {
    setError(null);
    try {
      await window.dentiScribe.styleExamples.delete(id);
      setExamples((prev) => prev.filter((example) => example.id !== id));
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to remove style example'));
    }
  }

  return { examples, loading, saving, error, addExample, removeExample };
}
