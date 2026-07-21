'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type DocumentType } from '../../common/types/document';
import { toFriendlyErrorMessage } from '../lib/ipcError';

interface DocumentGeneratorProps {
  formattedNote: string;
}

/** Generates derived documents (patient letter, referral letter, consent form) from an already-formatted note. */
export function DocumentGenerator({ formattedNote }: DocumentGeneratorProps) {
  const [generating, setGenerating] = useState<DocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<DocumentType, string>>>({});
  const [copiedType, setCopiedType] = useState<DocumentType | null>(null);

  async function handleGenerate(documentType: DocumentType) {
    setGenerating(documentType);
    setError(null);
    try {
      const result = await window.dentiScribe.scribe.generateDocument(formattedNote, documentType);
      setDocuments((prev) => ({ ...prev, [documentType]: result }));
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to generate document'));
    } finally {
      setGenerating(null);
    }
  }

  async function handleCopy(documentType: DocumentType) {
    const content = documents[documentType];
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopiedType(documentType);
    setTimeout(() => setCopiedType(null), 2000);
  }

  if (!formattedNote) return null;

  return (
    <Card title="Documents" className="col-span-2">
      <div className="flex flex-wrap gap-2">
        {DOCUMENT_TYPES.map((documentType) => (
          <button
            key={documentType}
            type="button"
            onClick={() => handleGenerate(documentType)}
            disabled={generating !== null}
            className="rounded-lg border border-panel-border px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-50"
          >
            {generating === documentType ? 'Generating…' : `Generate ${DOCUMENT_TYPE_LABELS[documentType]}`}
          </button>
        ))}
      </div>

      {error ? <p className="mt-2 text-sm text-accent-red">{error}</p> : null}

      {DOCUMENT_TYPES.filter((documentType) => documents[documentType]).map((documentType) => (
        <div key={documentType} className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-300">{DOCUMENT_TYPE_LABELS[documentType]}</h4>
            <button
              type="button"
              onClick={() => handleCopy(documentType)}
              className="text-xs font-medium text-slate-400 transition hover:text-accent-cyan"
            >
              {copiedType === documentType ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-panel-border bg-panel-bg/60 p-3 text-clinical text-slate-200">
            {documents[documentType]}
          </div>
        </div>
      ))}
    </Card>
  );
}
