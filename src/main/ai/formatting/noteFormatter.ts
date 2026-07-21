import type { DatabaseInstance } from '../../db/types';
import type { LlmMessage } from '../../../common/types/llm';
import type { TranscriptionResult } from '../../../common/types/transcription';
import type { ConversationCategory } from '../../../common/types/category';
import { CONVERSATION_CATEGORY_HINTS } from '../../../common/types/category';
import { getAiConfig } from '../../config/aiConfig';
import { createLlmProvider } from '../llm/registry';
import { listStyleExamples } from '../../db/repositories/styleExamplesRepo';
import type { StyleExample } from '../../../common/types/styleExample';

const SYSTEM_PROMPT = `You are a clinical note formatter for a dental practice. Given a transcript of a dentist-patient encounter, produce a clean, well-formatted clinical note ready to paste into the practice's EHR.

Rules:
- Resolve self-corrections: if the speaker corrects themselves (e.g. "3 distal decay — oh sorry, I mean 4"), keep only the corrected statement in the output. Never include the retracted version.
- Remove filler, small talk, and false starts that carry no clinical meaning.
- If the transcript has speaker labels (e.g. "Speaker 0:", "Speaker 1:"), use that to distinguish clinician statements from patient statements, but do not include the raw speaker labels in your output — the note should read as a clinical record, not a script.
- Match the formatting style (structure, headings, tone, level of detail) shown in the provided example notes as closely as possible.
- Output only the formatted note. No preamble, no explanation, no markdown code fences.`;

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
 * Prefers examples tagged with the selected category (few-shot context works best when
 * it's actually relevant to the note being formatted), but falls back to every saved
 * example when none match — better to show some style guidance than none, especially
 * early on when a dentist may only have saved one or two examples total.
 */
function selectRelevantExamples(examples: StyleExample[], category: ConversationCategory | undefined): StyleExample[] {
  if (!category) return examples;
  const matching = examples.filter((example) => example.category === category);
  return matching.length > 0 ? matching : examples;
}

/**
 * Few-shot style matching, not fine-tuning: every stored example note is
 * included as prompt context on every call. Adding more examples later is
 * just adding more rows to style_examples — no training step, no model
 * artifacts. This scales fine for "a few examples"; if the example set grows
 * very large, revisit (e.g. cap to the most recent N) rather than assuming
 * unlimited examples fit in context.
 */
export async function formatNote(db: DatabaseInstance, userId: string, input: FormatNoteInput): Promise<string> {
  const allExamples = listStyleExamples(db, userId);
  const examples = selectRelevantExamples(allExamples, input.category);
  const llm = createLlmProvider(getAiConfig());

  // Some LlmProvider implementations (e.g. ClaudeProvider) only read the first
  // 'system'-role message in the array — a second one would be silently dropped.
  // The category hint is merged into this single system message instead of pushed
  // as its own, so it reaches every provider the same way.
  const categoryHint = input.category ? CONVERSATION_CATEGORY_HINTS[input.category] : '';
  const systemContent = categoryHint ? `${SYSTEM_PROMPT}\n\n${categoryHint}` : SYSTEM_PROMPT;
  const messages: LlmMessage[] = [{ role: 'system', content: systemContent }];

  for (const example of examples) {
    messages.push({
      role: 'user',
      content: `Example of my preferred note format (for style reference only, not a transcript to process):\n\n${example.content}`,
    });
    messages.push({ role: 'assistant', content: 'Understood — I will match this style.' });
  }

  const transcriptText = transcriptionResultToPromptText(input.transcriptionResult);
  let userContent = `Format this transcript into a clinical note:\n\n${transcriptText}`;
  if (input.assistingStaff?.trim()) {
    userContent += `\n\n(Assisting staff present: ${input.assistingStaff.trim()} — mention them in the note only if that's consistent with the practice's usual note style.)`;
  }
  messages.push({ role: 'user', content: userContent });

  return llm.complete(messages, { maxTokens: 2000, temperature: 0.2 });
}
