import type { LlmMessage } from '../../../common/types/llm';
import type { DocumentType } from '../../../common/types/document';
import { getAiConfig } from '../../config/aiConfig';
import { createLlmProvider } from '../llm/registry';

const DOCUMENT_INSTRUCTIONS: Record<DocumentType, string> = {
  'patient-letter': `Write a patient-friendly letter summarizing the visit and any post-treatment instructions, in plain language a patient (not a clinician) can understand. No clinical jargon or abbreviations. Sign off with a placeholder practice name and address the patient directly.`,
  'referral-letter': `Write a professional referral letter to a specialist. Include: recipient placeholder, patient details placeholder, reason for referral, and relevant clinical history from the note. Professional clinical tone.`,
  'consent-form': `Write a patient consent form for the treatment described in the note. Include: nature of treatment, benefits, risks & complications discussed, alternatives, and a signature line for the patient. Do not invent a specific cost estimate — omit cost entirely unless the note itself states one.`,
};

/**
 * Generates a derived document (patient letter / referral letter / consent form) FROM
 * an already-formatted clinical note — not from the raw transcript again. This keeps
 * the note itself as the single source of truth: the letter/form reflects exactly what
 * was already reviewed and formatted, rather than a second independent interpretation
 * of the raw transcript.
 */
export async function generateDocument(formattedNote: string, documentType: DocumentType): Promise<string> {
  const llm = createLlmProvider(getAiConfig());

  const messages: LlmMessage[] = [
    {
      role: 'system',
      content: `You turn a dental clinical note into a specific derived document. ${DOCUMENT_INSTRUCTIONS[documentType]} Output only the document text. No preamble, no explanation, no markdown code fences.`,
    },
    { role: 'user', content: `Clinical note:\n\n${formattedNote}` },
  ];

  return llm.complete(messages, { maxTokens: 1500, temperature: 0.3 });
}
