'use client';

import { useEffect, useState } from 'react';
import { ScribePanel } from './ScribePanel';
import { SettingsPanel } from './settings/SettingsPanel';
import { SetupWizard } from './setup/SetupWizard';

interface DashboardShellProps {
  username: string;
  onLogout: () => void;
}

export function DashboardShell({ username, onLogout }: DashboardShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [checkedSetupOnLoad, setCheckedSetupOnLoad] = useState(false);

  useEffect(() => {
    window.dentiScribe.setup.checkStatus().then((status) => {
      const ready =
        status.ollama.running && status.ollama.modelPulled && status.whisper.binaryInstalled && status.whisper.modelInstalled;
      if (!ready) setSetupOpen(true);
      setCheckedSetupOnLoad(true);
    });
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-panel-border px-6 py-4">
        <h1 className="text-lg font-bold tracking-tight text-slate-100">DentiScribe AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">Local-first &middot; No cloud connection active</span>
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className="text-xs font-medium text-slate-400 transition hover:text-accent-cyan"
          >
            Setup
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-xs font-medium text-slate-400 transition hover:text-accent-cyan"
          >
            Settings
          </button>
          <span className="rounded-full bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-200">
            {username}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-medium text-slate-400 transition hover:text-accent-red"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <ScribePanel />
      </main>

      {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null}
      {checkedSetupOnLoad && setupOpen ? <SetupWizard onDone={() => setSetupOpen(false)} /> : null}
    </div>
  );
}
