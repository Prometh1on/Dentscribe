'use client';

import { useState } from 'react';
import { Card } from '../ui/Card';
import { WritingStyleSection } from './WritingStyleSection';
import { VocabularySection } from './VocabularySection';
import { ExampleLibrarySection } from './ExampleLibrarySection';
import { SpecialtiesSection } from './SpecialtiesSection';
import { PreviewSection } from './PreviewSection';

const TABS = [
  { id: 'style', label: 'My Writing Style' },
  { id: 'vocabulary', label: 'My Vocabulary' },
  { id: 'examples', label: 'My Example Notes' },
  { id: 'specialties', label: 'My Specialties' },
  { id: 'preview', label: 'Preview' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface PersonalizationPanelProps {
  onClose: () => void;
}

export function PersonalizationPanel({ onClose }: PersonalizationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('style');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto">
        <Card title="AI Personalisation">
          <div className="mb-4 flex flex-wrap gap-2 border-b border-panel-border pb-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-accent-cyan/90 text-panel-bg'
                    : 'border border-panel-border text-slate-400 hover:border-accent-cyan hover:text-accent-cyan'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'style' ? <WritingStyleSection /> : null}
          {activeTab === 'vocabulary' ? <VocabularySection /> : null}
          {activeTab === 'examples' ? <ExampleLibrarySection /> : null}
          {activeTab === 'specialties' ? <SpecialtiesSection /> : null}
          {activeTab === 'preview' ? <PreviewSection /> : null}

          <div className="mt-6 border-t border-panel-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-slate-400 transition hover:text-slate-200"
            >
              Close
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
