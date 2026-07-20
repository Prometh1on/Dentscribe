'use client';

import { useEffect, useState } from 'react';
import { useSession } from './SessionContext';
import { Card } from '../ui/Card';

export function LoginScreen() {
  const { login, bootstrapFirstUser } = useSession();
  const [bootstrapNeeded, setBootstrapNeeded] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.dentiScribe.auth.isBootstrapNeeded().then(setBootstrapNeeded);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (bootstrapNeeded) {
        await bootstrapFirstUser(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (bootstrapNeeded === null) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading&hellip;</div>;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-panel-bg">
      <Card title={bootstrapNeeded ? 'Create Account' : 'Sign In'} className="w-96">
        <form onSubmit={handleSubmit} className="space-y-4">
          {bootstrapNeeded ? (
            <p className="text-sm text-slate-400">No account exists yet. Create one to continue.</p>
          ) : null}

          <div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-clinical outline-none focus:border-accent-cyan"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-panel-border bg-panel-bg/60 p-2 text-clinical outline-none focus:border-accent-cyan"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={bootstrapNeeded ? 'new-password' : 'current-password'}
              minLength={bootstrapNeeded ? 12 : undefined}
              required
            />
          </div>

          {error ? <p className="text-sm text-accent-red">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-accent-cyan/90 py-2 font-semibold text-panel-bg transition hover:bg-accent-cyan disabled:opacity-50"
          >
            {bootstrapNeeded ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </Card>
    </div>
  );
}
