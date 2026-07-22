import type { DatabaseInstance } from '../../db/types';
import type { LlmMessage } from '../../../common/types/llm';
import type { TranscriptionResult } from '../../../common/types/transcription';
import type { ConversationCategory } from '../../../common/types/category';
import { CONVERSATION_CATEGORY_HINTS } from '../../../common/types/category';
import type { AbbreviationPreference, DentistProfile, TerminologyPreference } from '../../../common/types/dentistProfile';
import { getAiConfig } from '../../config/aiConfig';
import { createLlmProvider } from '../llm/registry';
import { listStyleExamples } from '../../db/repositories/styleExamplesRepo';
import { getDentistProfile } from '../../db/repositories/dentistProfileRepo';
import { listTerminologyPreferences } from '../../db/repositories/terminologyRepo';
import { listAbbreviationPreferences } from '../../db/repositories/abbreviationRepo';
import { selectRelevantExamples } from '../retrieval/exampleRetrieval';

const SYSTEM_PROMPT = `You are a clinical note formatter for a dental practice. Given a transcript of a dentist-patient encounter, produce a clean, well-formatted clinical note ready to paste into the practice's EHR.

Rules:
- Resolve self-corrections: if the speaker corrects themselves (e.g. "3 distal decay — oh sorry, I mean 4"), keep only the corrected statement in the output. Never include the retracted version.
- Remove filler, small talk, and false starts that carry no clinical meaning.
- If the transcript has speaker labels (e.g. "Speaker 0:", "Speaker 1:"), use that to distinguish clinician statements from patient statements, but do not include the raw speaker labels in your output — the note should read as a clinical record, not a script.
- Match the formatting style (structure, headings, tone, level of detail) shown in the provided example notes as closely as possible.
- Output only the formatted note. No preamble, no explanation, no markdown code fences.`;

const TOOTH_NUMBERING_INSTRUCTIONS: Record<DentistProfile['toothNumbering'], string> = {
  universal: 'Use the Universal Numbering System (1-32) for teeth.',
  fdi: 'Use FDI two-digit tooth numbering (e.g. 36, 47).',
  palmer: 'Use Palmer notation (quadrant symbol + tooth number) for teeth.',
};

const ABBREVIATION_POLICY_INSTRUCTIONS: Record<DentistProfile['abbreviationPolicy'], string> = {
  preserve: 'Keep clinical abbreviations as spoken in the transcript (e.g. "MOD", "RCT") rather than expanding them.',
  'expand-all': 'Expand clinical abbreviations into full terms (e.g. "MOD" → "mesial-occlusal-distal").',
};

export interface FormatNoteInput {
  transcriptionResult: TranscriptionResult;
  category?: ConversationCategory;
  assistingStaff?: string;
}

/** Builds a speaker-labeled transcript when diarization data is available, plain text otherwise. */
function transcriptionResultToPromptText(result: TranscriptionResult): string {
  if (!result.diarized) return result.fullText;
  return result.segments.map((segment) => `Speaker ${segment.speaker ?? '?'}: ${segment.text}`).join('\n');
}

/**
 * Folds the dentist's saved preferences into prompt instructions rather than any kind
 * of deterministic text-rewriting pass — keeps this a pure prompt-augmentation layer
 * (no fine-tuning, no separate NLP correction step) that every LlmProvider sees the
 * same way, and degrades gracefully to "no extra instructions" for a dentist who
 * hasn't set any of this up yet.
 */
function buildPersonalizationSection(
  profile: DentistProfile,
  terminologyPrefs: TerminologyPreference[],
  abbreviationPrefs: AbbreviationPreference[]
): string {
  const lines: string[] = [];

  if (profile.styleNotes.trim()) lines.push(profile.styleNotes.trim());
  if (profile.specialty.trim()) lines.push(`This dentist's specialty context: ${profile.specialty.trim()}.`);
  lines.push(TOOTH_NUMBERING_INSTRUCTIONS[profile.toothNumbering]);
  lines.push(ABBREVIATION_POLICY_INSTRUCTIONS[profile.abbreviationPolicy]);

  for (const pref of abbreviationPrefs) {
    lines.push(`Always expand "${pref.abbreviation}" to "${pref.expansion}".`);
  }
  for (const pref of terminologyPrefs) {
    lines.push(`Prefer the term "${pref.preferTerm}" instead of "${pref.avoidTerm}".`);
  }

  return lines.length > 0 ? `Dentist's formatting preferences:\n${lines.map((line) => `- ${line}`).join('\n')}` : '';
}

/**
 * Few-shot style matching, not fine-tuning: every stored example note is included as
 * prompt context on every call (subject to selectRelevantExamples' category-then-keyword
 * filtering as the example set grows). Adding more examples later is just adding more
 * rows to style_examples — no training step, no model artifacts.
 */
export async function formatNote(db: DatabaseInstance, userId: string, input: FormatNoteInput): Promise<string> {
  const allExamples = listStyleExamples(db, userId);
  const transcriptText = transcriptionResultToPromptText(input.transcriptionResult);
  const examples = selectRelevantExamples(allExamples, input.category, transcriptText);

  const profile = getDentistProfile(db, userId);
  const terminologyPrefs = listTerminologyPreferences(db, userId);
  const abbreviationPrefs = listAbbreviationPreferences(db, userId);

  const llm = createLlmProvider(getAiConfig());

  // Some LlmProvider implementations (e.g. ClaudeProvider) only read the first
  // 'system'-role message in the array — a second one would be silently dropped.
  // Every piece of steering (base rules, category hint, personalization) is merged
  // into this single system message so it reaches every provider the same way.
  const categoryHint = input.category ? CONVERSATION_CATEGORY_HINTS[input.category] : '';
  const personalizationSection = buildPersonalizationSection(profile, terminologyPrefs, abbreviationPrefs);
  const systemContent = [SYSTEM_PROMPT, categoryHint, personalizationSection].filter(Boolean).join('\n\n');
  const messages: LlmMessage[] = [{ role: 'system', content: systemContent }];

  for (const example of examples) {
    messages.push({
      role: 'user',
      content: `Example of my preferred note format (for style reference only, not a transcript to process):\n\n${example.content}`,
    });
    messages.push({ role: 'assistant', content: 'Understood — I will match this style.' });
  }

  let userContent = `Format this transcript into a clinical note:\n\n${transcriptText}`;
  if (input.assistingStaff?.trim()) {
    userContent += `\n\n(Assisting staff present: ${input.assistingStaff.trim()} — mention them in the note only if that's consistent with the practice's usual note style.)`;
  }
  messages.push({ role: 'user', content: userContent });

  return llm.complete(messages, { maxTokens: 2000, temperature: 0.2 });
}
